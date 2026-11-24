import {
  CategoricalStats,
  ColumnProfile,
  CorrelationMatrix,
  DataRow,
  NumericStats,
} from '../types/analytics';

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] !== undefined) {
    return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
  }
  return sorted[base];
}

export function computeNumericStats(rows: DataRow[], column: string): NumericStats {
  const values: number[] = [];
  let missing = 0;

  for (const r of rows) {
    const v = r[column];
    if (typeof v === 'number' && Number.isFinite(v)) {
      values.push(v);
    } else if (v === null || v === undefined || v === '') {
      missing++;
    } else {
      const parsed = Number(v);
      if (Number.isFinite(parsed)) values.push(parsed);
      else missing++;
    }
  }

  if (values.length === 0) {
    return {
      column,
      count: 0,
      missing,
      mean: 0,
      median: 0,
      mode: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      range: 0,
      q1: 0,
      q2: 0,
      q3: 0,
      iqr: 0,
      lowerWhisker: 0,
      upperWhisker: 0,
      outliersCount: 0,
      histogram: [],
      densityCurve: [],
    };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const variance =
    sorted.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / Math.max(1, n - 1);
  const stdDev = Math.sqrt(variance);
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);
  const iqr = q3 - q1;

  // Mode via rounded buckets or exact frequencies
  const freqMap = new Map<number, number>();
  const stepRound = range > 20 ? Math.max(1, Math.round(range / 30)) : 0;
  for (const v of sorted) {
    const key = stepRound > 0 ? Math.round(v / stepRound) * stepRound : Number(v.toFixed(2));
    freqMap.set(key, (freqMap.get(key) || 0) + 1);
  }
  let mode = q2;
  let maxFreq = -1;
  for (const [k, c] of freqMap.entries()) {
    if (c > maxFreq) {
      maxFreq = c;
      mode = k;
    }
  }

  const lowerFence = q1 - 1.5 * iqr;
  const upperFence = q3 + 1.5 * iqr;
  const nonOutliers = sorted.filter((v) => v >= lowerFence && v <= upperFence);
  const lowerWhisker = nonOutliers.length > 0 ? nonOutliers[0] : min;
  const upperWhisker = nonOutliers.length > 0 ? nonOutliers[nonOutliers.length - 1] : max;
  const outliersCount = n - nonOutliers.length;

  // Histogram (Sturges / Freedman-Diaconis bounded 10-16 bins)
  const binCount = Math.min(16, Math.max(8, Math.ceil(Math.log2(n) + 1)));
  const effectiveRange = range > 0 ? range : 1;
  const binWidth = effectiveRange / binCount;
  const bins = Array.from({ length: binCount }, (_, idx) => {
    const binStart = min + idx * binWidth;
    const binEnd = min + (idx + 1) * binWidth;
    return {
      binStart,
      binEnd,
      label: `${binStart >= 100 ? Math.round(binStart) : binStart.toFixed(1)}`,
      count: 0,
      density: 0,
    };
  });

  for (const v of sorted) {
    let idx = Math.floor((v - min) / binWidth);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  }
  for (const b of bins) {
    b.density = b.count / (n * binWidth);
  }

  // Gaussian KDE density curve (40 points)
  const bandwidth = Math.max(
    1e-4,
    1.06 * (stdDev > 0 ? stdDev : effectiveRange / 4) * Math.pow(n, -0.2)
  );
  const densityCurve: { x: number; y: number }[] = [];
  const curvePoints = 42;
  // Subsample values if huge for fast KDE
  const kdeSample =
    n > 600
      ? sorted.filter((_, i) => i % Math.ceil(n / 600) === 0)
      : sorted;

  for (let i = 0; i < curvePoints; i++) {
    const x = min + (effectiveRange * i) / (curvePoints - 1);
    let sumK = 0;
    for (const v of kdeSample) {
      const z = (x - v) / bandwidth;
      sumK += Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    }
    const y = sumK / (kdeSample.length * bandwidth);
    densityCurve.push({ x, y });
  }

  return {
    column,
    count: n,
    missing,
    mean,
    median: q2,
    mode,
    stdDev,
    min,
    max,
    range,
    q1,
    q2,
    q3,
    iqr,
    lowerWhisker,
    upperWhisker,
    outliersCount,
    histogram: bins,
    densityCurve,
  };
}

export function computeCategoricalStats(rows: DataRow[], column: string): CategoricalStats {
  const counts = new Map<string, number>();
  let count = 0;
  let missing = 0;

  for (const r of rows) {
    const v = r[column];
    if (v === null || v === undefined || v === '') {
      missing++;
    } else {
      const s = String(v);
      counts.set(s, (counts.get(s) || 0) + 1);
      count++;
    }
  }

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  let cumulative = 0;

  const frequencies = sorted.map(([category, c]) => {
    const rel = c / Math.max(1, count);
    const pct = rel * 100;
    cumulative += pct;
    return {
      category,
      count: c,
      relativeFreq: Number(rel.toFixed(4)),
      percentage: Number(pct.toFixed(2)),
      cumulativePct: Number(Math.min(100, cumulative).toFixed(2)),
    };
  });

  return {
    column,
    count,
    missing,
    uniqueCount: sorted.length,
    frequencies,
  };
}

export function computeCorrelationMatrix(
  rows: DataRow[],
  columns: ColumnProfile[],
  targetColumn?: string,
  positiveClass?: string
): CorrelationMatrix {
  const numericCols = columns.filter((c) => c.type === 'numeric').map((c) => c.name);
  const selectedCols = numericCols.slice(0, 10);

  // Also include target as binary 0/1 if binary
  const includeTarget =
    targetColumn &&
    positiveClass &&
    !selectedCols.includes(targetColumn) &&
    columns.find((c) => c.name === targetColumn)?.uniqueCount === 2;

  const allCols = includeTarget && targetColumn ? [...selectedCols, targetColumn] : selectedCols;

  const vectors: Record<string, (number | null)[]> = {};
  for (const col of allCols) {
    vectors[col] = rows.map((r) => {
      const v = r[col];
      if (col === targetColumn && positiveClass) {
        if (v === null || v === undefined || v === '') return null;
        return String(v) === positiveClass ? 1 : 0;
      }
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      return null;
    });
  }

  const m = allCols.length;
  const matrix: number[][] = Array.from({ length: m }, () => Array(m).fill(0));
  const pairs: { colA: string; colB: string; r: number; interpretation: string }[] = [];

  for (let i = 0; i < m; i++) {
    matrix[i][i] = 1;
    for (let j = i + 1; j < m; j++) {
      const vecA = vectors[allCols[i]];
      const vecB = vectors[allCols[j]];
      const paired: [number, number][] = [];
      for (let k = 0; k < rows.length; k++) {
        const a = vecA[k];
        const b = vecB[k];
        if (a !== null && b !== null) paired.push([a, b]);
      }

      let r = 0;
      if (paired.length >= 3) {
        const n = paired.length;
        let sumA = 0;
        let sumB = 0;
        for (const [a, b] of paired) {
          sumA += a;
          sumB += b;
        }
        const meanA = sumA / n;
        const meanB = sumB / n;
        let num = 0;
        let denA = 0;
        let denB = 0;
        for (const [a, b] of paired) {
          const da = a - meanA;
          const db = b - meanB;
          num += da * db;
          denA += da * da;
          denB += db * db;
        }
        const den = Math.sqrt(denA * denB);
        r = den > 1e-9 ? num / den : 0;
      }

      const roundedR = Number(r.toFixed(3));
      matrix[i][j] = roundedR;
      matrix[j][i] = roundedR;

      const absR = Math.abs(roundedR);
      const strength =
        absR >= 0.65
          ? 'fuerte'
          : absR >= 0.35
          ? 'moderada'
          : absR >= 0.15
          ? 'débil'
          : 'muy baja o nula';
      const dir = roundedR >= 0 ? 'positiva' : 'negativa';

      pairs.push({
        colA: allCols[i],
        colB: allCols[j],
        r: roundedR,
        interpretation: `Correlación ${strength} ${dir} (r = ${roundedR.toFixed(2)}): cuando aumenta ${allCols[i]}, ${allCols[j]} tiende a ${roundedR >= 0 ? 'incrementarse' : 'disminuir'}.`,
      });
    }
  }

  pairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

  return {
    columns: allCols,
    matrix,
    strongestPairs: pairs.slice(0, 6),
  };
}
