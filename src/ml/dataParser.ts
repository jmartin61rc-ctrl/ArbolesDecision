import * as XLSX from 'xlsx';
import {
  ColumnProfile,
  ColumnType,
  DataQualityReport,
  DataRow,
  DataValue,
  Dataset,
  SectorKey,
  TargetCandidate,
} from '../types/analytics';
import { getSectorInfo } from './syntheticDatasets';

function normalizeCellValue(val: unknown): DataValue {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return Number.isFinite(val) ? val : null;
  }
  if (typeof val === 'boolean') {
    return val ? 'Sí' : 'No';
  }
  const str = String(val).trim();
  if (
    str === '' ||
    str.toLowerCase() === 'null' ||
    str.toLowerCase() === 'na' ||
    str.toLowerCase() === 'n/a' ||
    str.toLowerCase() === 'nan' ||
    str === '-'
  ) {
    return null;
  }
  // Check strict numeric parsing (including comma decimals or currency symbols if clean)
  const cleanedNum = str.replace(/[$€£%\s]/g, '');
  if (/^-?\d+(\.\d+)?$/.test(cleanedNum)) {
    const num = Number(cleanedNum);
    if (Number.isFinite(num)) return num;
  }
  return str;
}

function detectDelimiter(text: string): string {
  const sampleLines = text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .slice(0, 10);
  const candidates = [',', ';', '\t', '|'];
  let bestDelim = ',';
  let bestScore = -1;

  for (const delim of candidates) {
    const counts = sampleLines.map((line) => line.split(delim).length - 1);
    const avg = counts.reduce((a, b) => a + b, 0) / Math.max(1, counts.length);
    if (avg > 0) {
      const variance =
        counts.reduce((acc, c) => acc + Math.pow(c - avg, 2), 0) / Math.max(1, counts.length);
      const score = avg / (1 + variance);
      if (score > bestScore) {
        bestScore = score;
        bestDelim = delim;
      }
    }
  }
  return bestDelim;
}

function parseDelimitedLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

export async function parseUploadedFile(file: File): Promise<{ rows: DataRow[]; format: string }> {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new Error('El libro de Excel no contiene hojas válidas.');
    }
    const worksheet = workbook.Sheets[firstSheetName];
    const rawObjects = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: null,
      raw: true,
    });
    const rows: DataRow[] = rawObjects.map((obj) => {
      const normalized: DataRow = {};
      for (const [k, v] of Object.entries(obj)) {
        normalized[k.trim()] = normalizeCellValue(v);
      }
      return normalized;
    });
    return { rows, format: ext.toUpperCase() };
  }

  // CSV, TSV, TXT delimited
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    throw new Error('El archivo debe incluir una fila de encabezados y al menos una fila de datos.');
  }
  const delimiter = ext === 'tsv' ? '\t' : detectDelimiter(text);
  const headers = parseDelimitedLine(lines[0], delimiter).map((h, idx) => {
    const clean = h.replace(/^\uFEFF/, '').trim();
    return clean || `Variable_${idx + 1}`;
  });

  const rows: DataRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseDelimitedLine(lines[i], delimiter);
    if (cells.every((c) => c.trim() === '')) continue;
    const row: DataRow = {};
    for (let c = 0; c < headers.length; c++) {
      row[headers[c]] = normalizeCellValue(cells[c] ?? null);
    }
    rows.push(row);
  }

  const formatMap: Record<string, string> = {
    csv: 'CSV',
    tsv: 'TSV',
    txt: 'TXT Delimitado',
  };
  return { rows, format: formatMap[ext] || 'Texto Delimitado' };
}

export function profileDataset(
  rows: DataRow[],
  options: {
    name: string;
    source: 'upload' | 'synthetic';
    sector: SectorKey;
    fileFormat?: string;
    existingColumnTypes?: Record<string, ColumnType>;
  }
): Dataset {
  if (rows.length === 0) {
    throw new Error('El conjunto de datos no contiene registros válidos.');
  }

  const sectorInfo = getSectorInfo(options.sector);
  const columnNames = Object.keys(rows[0]);
  const totalRows = rows.length;

  // Duplicate detection via row signature
  const seenSignatures = new Set<string>();
  let duplicateRows = 0;
  for (const row of rows) {
    const sig = columnNames.map((col) => String(row[col] ?? '__NULL__')).join('||');
    if (seenSignatures.has(sig)) {
      duplicateRows++;
    } else {
      seenSignatures.add(sig);
    }
  }

  let totalNulls = 0;
  const qualityInconsistencies: { column: string; issue: string; count: number }[] = [];

  const columns: ColumnProfile[] = columnNames.map((colName) => {
    let nullCount = 0;
    let numericCount = 0;
    let stringCount = 0;
    const nonNullValues: DataValue[] = [];
    const uniqueSet = new Set<string>();
    const numericValues: number[] = [];

    for (const row of rows) {
      const val = row[colName];
      if (val === null || val === undefined || val === '') {
        nullCount++;
      } else {
        nonNullValues.push(val);
        uniqueSet.add(String(val));
        if (typeof val === 'number' && Number.isFinite(val)) {
          numericCount++;
          numericValues.push(val);
        } else {
          stringCount++;
        }
      }
    }

    totalNulls += nullCount;

    const colInconsistencies: string[] = [];
    // Detect mixed types (e.g., mostly numeric but some text tokens)
    if (numericCount > 0 && stringCount > 0) {
      const minority = Math.min(numericCount, stringCount);
      colInconsistencies.push(`Tipos mixtos detectados (${minority} registros no numéricos)`);
      qualityInconsistencies.push({
        column: colName,
        issue: 'Mezcla de valores numéricos y texto',
        count: minority,
      });
    }

    // Detect type: Numeric vs Factor vs Categorical
    let detectedType: ColumnType = 'categorical';
    const nonNullCount = nonNullValues.length;
    const isMostlyNumeric = nonNullCount > 0 && numericCount / nonNullCount >= 0.85;

    if (isMostlyNumeric) {
      // Binary 0/1 or very small integer codes (<= 2 unique) could be factor, otherwise numeric
      if (uniqueSet.size <= 2 && numericValues.every((v) => v === 0 || v === 1)) {
        detectedType = 'factor';
      } else {
        detectedType = 'numeric';
      }
    } else if (uniqueSet.size <= 12) {
      detectedType = 'factor';
    } else {
      detectedType = 'categorical';
    }

    // Check extreme outliers in numeric columns (> 3 IQR)
    if (detectedType === 'numeric' && numericValues.length >= 20) {
      const sorted = [...numericValues].sort((a, b) => a - b);
      const q1 = sorted[Math.floor(sorted.length * 0.25)];
      const q3 = sorted[Math.floor(sorted.length * 0.75)];
      const iqr = q3 - q1;
      if (iqr > 0) {
        const lower = q1 - 3 * iqr;
        const upper = q3 + 3 * iqr;
        const extremeOutliers = numericValues.filter((v) => v < lower || v > upper).length;
        if (extremeOutliers > 0) {
          colInconsistencies.push(`${extremeOutliers} valores atípicos extremos (> 3 IQR)`);
          qualityInconsistencies.push({
            column: colName,
            issue: 'Valores atípicos extremos (> 3 IQR)',
            count: extremeOutliers,
          });
        }
      }
    }

    // Check case variations in categorical/factor columns
    if (detectedType !== 'numeric') {
      const lowerMap = new Map<string, Set<string>>();
      for (const u of uniqueSet) {
        const low = u.toLowerCase();
        if (!lowerMap.has(low)) lowerMap.set(low, new Set());
        lowerMap.get(low)!.add(u);
      }
      let caseVariants = 0;
      for (const variants of lowerMap.values()) {
        if (variants.size > 1) caseVariants++;
      }
      if (caseVariants > 0) {
        colInconsistencies.push(`${caseVariants} inconsistencias de mayúsculas/minúsculas`);
        qualityInconsistencies.push({
          column: colName,
          issue: 'Variantes tipográficas de la misma categoría',
          count: caseVariants,
        });
      }
    }

    const levels =
      detectedType !== 'numeric' || uniqueSet.size <= 15
        ? Array.from(uniqueSet).sort()
        : undefined;

    const assignedType = options.existingColumnTypes?.[colName] || detectedType;

    return {
      name: colName,
      detectedType,
      type: assignedType,
      nullCount,
      nullPct: Number(((nullCount / totalRows) * 100).toFixed(2)),
      uniqueCount: uniqueSet.size,
      levels,
      sampleValues: nonNullValues.slice(0, 4).map(String),
      description: sectorInfo.dictionary[colName],
      inconsistencies: colInconsistencies,
    };
  });

  const totalCells = totalRows * columnNames.length;
  const nullPct = Number(((totalNulls / Math.max(1, totalCells)) * 100).toFixed(2));
  const completenessScore = Number(Math.max(0, 100 - nullPct - (duplicateRows / totalRows) * 50).toFixed(1));

  const quality: DataQualityReport = {
    totalRows,
    totalColumns: columnNames.length,
    totalNulls,
    nullPct,
    duplicateRows,
    inconsistencyCount: qualityInconsistencies.reduce((acc, i) => acc + i.count, 0),
    inconsistencies: qualityInconsistencies,
    completenessScore,
  };

  const targetCandidates = identifyTargetCandidates(rows, columns, options.sector);

  return {
    id: `${options.source}_${Date.now()}`,
    name: options.name,
    source: options.source,
    fileFormat: options.fileFormat,
    sector: options.sector,
    rows,
    columns,
    quality,
    targetCandidates,
    createdAt: new Date().toISOString(),
  };
}

export function identifyTargetCandidates(
  rows: DataRow[],
  columns: ColumnProfile[],
  sector: SectorKey
): TargetCandidate[] {
  const targetKeywords = [
    'compra',
    'renuncia',
    'mora',
    'aprobacion',
    'aprobación',
    'abandono',
    'churn',
    'cierre',
    'reingreso',
    'error',
    'tardia',
    'target',
    'objetivo',
    'clase',
    'resultado',
    'estado',
    'fraude',
    'riesgo',
    'exitoso',
    'conversion',
  ];

  const candidates: TargetCandidate[] = [];

  for (const col of columns) {
    if (col.uniqueCount >= 2 && col.uniqueCount <= 5 && col.nullPct < 30) {
      const freq = new Map<string, number>();
      let valid = 0;
      for (const r of rows) {
        const v = r[col.name];
        if (v !== null && v !== undefined && v !== '') {
          const s = String(v);
          freq.set(s, (freq.get(s) || 0) + 1);
          valid++;
        }
      }

      const sortedVals = Array.from(freq.entries()).sort((a, b) => b[1] - a[1]);
      if (sortedVals.length < 2) continue;

      // Determine positive class intelligently
      const positiveKeywords = ['sí', 'si', 'yes', '1', 'true', 'aprobado', 'positivo', 'alta', 'alto'];
      let positiveClass = sortedVals[sortedVals.length - 1][0];
      for (const [val] of sortedVals) {
        if (positiveKeywords.includes(val.toLowerCase())) {
          positiveClass = val;
          break;
        }
      }

      const posCount = freq.get(positiveClass) || 0;
      const positivePct = Number(((posCount / Math.max(1, valid)) * 100).toFixed(1));

      let score = 50;
      if (col.uniqueCount === 2) score += 25;
      const lowerName = col.name.toLowerCase();
      if (targetKeywords.some((kw) => lowerName.includes(kw))) score += 20;
      if (col.name === getSectorInfo(sector).defaultTarget) score += 15;
      if (positivePct >= 10 && positivePct <= 90) score += 10;

      const reason =
        col.uniqueCount === 2
          ? `Variable binaria (${sortedVals.map((s) => s[0]).join(' / ')}) con ${positivePct}% en la clase positiva "${positiveClass}".`
          : `Variable discreta de ${col.uniqueCount} categorías adecuada para clasificación supervisada.`;

      candidates.push({
        column: col.name,
        uniqueValues: sortedVals.map((s) => s[0]),
        positiveClass,
        positivePct,
        suitabilityScore: Math.min(100, score),
        isRecommended: false,
        reason,
        advantages: [
          'Permite entrenar un Árbol de Decisión supervisado con reglas interpretables.',
          col.uniqueCount === 2
            ? 'Habilita evaluación completa con Matriz de Confusión (VP, VN, FP, FN) y curva AUC-ROC.'
            : 'Permite segmentar múltiples perfiles de resultado en un solo árbol.',
          `Mantiene un balance estadístico suficiente (${positivePct}% clase objetivo) para evitar sesgos extremos.`,
        ],
        businessImpact: `Predecir "${col.name}" permite anticipar eventos críticos del sector y priorizar acciones preventivas o comerciales con mayor retorno.`,
      });
    }
  }

  // Fallback: if no low-cardinality categorical/factor target exists, suggest discretizing the best numeric column or pick lowest-cardinality column
  if (candidates.length === 0 && columns.length > 0) {
    const sortedByCard = [...columns].sort((a, b) => a.uniqueCount - b.uniqueCount);
    const fallbackCol = sortedByCard[0];
    candidates.push({
      column: fallbackCol.name,
      uniqueValues: fallbackCol.levels || ['Alto', 'Bajo'],
      positiveClass: fallbackCol.levels?.[0] || 'Alto',
      positivePct: 50,
      suitabilityScore: 45,
      isRecommended: true,
      reason: `No se detectó una variable binaria clásica. Se sugiere "${fallbackCol.name}" (o crear una columna objetivo binaria) como variable de salida.`,
      advantages: [
        'Posee la menor cardinalidad relativa del dataset.',
        'Permite identificar qué predictores explican sus variaciones principales.',
      ],
      businessImpact:
        'Establecer una variable objetivo clara transforma el análisis exploratorio en decisiones operativas medibles.',
    });
  }

  candidates.sort((a, b) => b.suitabilityScore - a.suitabilityScore);
  if (candidates.length > 0) {
    candidates[0].isRecommended = true;
  }
  return candidates;
}

export function cleanDatasetRows(rows: DataRow[], columns: ColumnProfile[]): DataRow[] {
  // 1. Remove exact duplicates
  const seen = new Set<string>();
  const deduped: DataRow[] = [];
  const colNames = columns.map((c) => c.name);

  for (const r of rows) {
    const sig = colNames.map((c) => String(r[c] ?? '__NULL__')).join('||');
    if (!seen.has(sig)) {
      seen.add(sig);
      deduped.push({ ...r });
    }
  }

  // 2. Compute median for numeric and mode for categorical/factor
  const imputers: Record<string, DataValue> = {};
  for (const col of columns) {
    if (col.type === 'numeric') {
      const nums = deduped
        .map((r) => r[col.name])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => a - b);
      imputers[col.name] = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;
    } else {
      const counts = new Map<string, number>();
      for (const r of deduped) {
        const v = r[col.name];
        if (v !== null && v !== undefined && v !== '') {
          const s = String(v);
          counts.set(s, (counts.get(s) || 0) + 1);
        }
      }
      let mode = '';
      let maxC = -1;
      for (const [k, c] of counts.entries()) {
        if (c > maxC) {
          maxC = c;
          mode = k;
        }
      }
      imputers[col.name] = mode || 'Desconocido';
    }
  }

  // 3. Impute nulls
  for (const r of deduped) {
    for (const col of columns) {
      if (r[col.name] === null || r[col.name] === undefined || r[col.name] === '') {
        r[col.name] = imputers[col.name];
      }
    }
  }

  return deduped;
}
