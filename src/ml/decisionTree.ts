import {
  ColumnProfile,
  ConfusionMatrix,
  DataRow,
  DecisionTreeNode,
  EvaluationMetrics,
  FeatureImportanceItem,
  OptimizationResult,
  PruningSweepPoint,
  TrainedTreeModel,
  TreeCriterion,
  TreeHyperparams,
  TreeRule,
} from '../types/analytics';
import { shuffleIndices } from './prng';

interface PreparedRow {
  features: Record<string, string | number | null>;
  target: string;
}

interface FeatureInfo {
  name: string;
  isNumeric: boolean;
}

function computeImpurity(counts: Record<string, number>, total: number, criterion: TreeCriterion): number {
  if (total <= 0) return 0;
  if (criterion === 'gini') {
    let sumSq = 0;
    for (const c of Object.values(counts)) {
      const p = c / total;
      sumSq += p * p;
    }
    return 1 - sumSq;
  } else {
    let entropy = 0;
    for (const c of Object.values(counts)) {
      if (c > 0) {
        const p = c / total;
        entropy -= p * Math.log2(p);
      }
    }
    return entropy;
  }
}

function majorityClass(counts: Record<string, number>, classes: string[]): string {
  let best = classes[0];
  let max = -1;
  for (const cls of classes) {
    const c = counts[cls] || 0;
    if (c > max) {
      max = c;
      best = cls;
    }
  }
  return best;
}

function countClasses(rows: PreparedRow[], classes: string[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of classes) counts[c] = 0;
  for (const r of rows) {
    counts[r.target] = (counts[r.target] || 0) + 1;
  }
  return counts;
}

export function splitTrainTest(
  rows: DataRow[],
  targetColumn: string,
  trainRatio = 0.7,
  seed = 42
): { trainRows: DataRow[]; testRows: DataRow[] } {
  const validRows = rows.filter((r) => {
    const t = r[targetColumn];
    return t !== null && t !== undefined && t !== '';
  });

  // Stratified split by target value
  const byClass = new Map<string, DataRow[]>();
  for (const r of validRows) {
    const key = String(r[targetColumn]);
    if (!byClass.has(key)) byClass.set(key, []);
    byClass.get(key)!.push(r);
  }

  const trainRows: DataRow[] = [];
  const testRows: DataRow[] = [];
  let classIdx = 0;

  for (const group of byClass.values()) {
    const indices = shuffleIndices(group.length, seed + classIdx * 97);
    const splitPoint = Math.max(1, Math.min(group.length - 1, Math.round(group.length * trainRatio)));
    for (let i = 0; i < indices.length; i++) {
      if (i < splitPoint) trainRows.push(group[indices[i]]);
      else testRows.push(group[indices[i]]);
    }
    classIdx++;
  }

  return { trainRows, testRows };
}

function prepareData(
  rows: DataRow[],
  features: FeatureInfo[],
  targetColumn: string
): PreparedRow[] {
  // Compute medians / modes on the provided subset for missing predictor imputation during tree building
  const medians: Record<string, number> = {};
  const modes: Record<string, string> = {};

  for (const f of features) {
    if (f.isNumeric) {
      const nums = rows
        .map((r) => r[f.name])
        .filter((v): v is number => typeof v === 'number' && Number.isFinite(v))
        .sort((a, b) => a - b);
      medians[f.name] = nums.length > 0 ? nums[Math.floor(nums.length / 2)] : 0;
    } else {
      const counts = new Map<string, number>();
      for (const r of rows) {
        const v = r[f.name];
        if (v !== null && v !== undefined && v !== '') {
          const s = String(v);
          counts.set(s, (counts.get(s) || 0) + 1);
        }
      }
      let best = 'Desconocido';
      let maxC = -1;
      for (const [k, c] of counts.entries()) {
        if (c > maxC) {
          maxC = c;
          best = k;
        }
      }
      modes[f.name] = best;
    }
  }

  return rows
    .filter((r) => r[targetColumn] !== null && r[targetColumn] !== undefined && r[targetColumn] !== '')
    .map((r) => {
      const featObj: Record<string, string | number | null> = {};
      for (const f of features) {
        const raw = r[f.name];
        if (f.isNumeric) {
          featObj[f.name] =
            typeof raw === 'number' && Number.isFinite(raw) ? raw : medians[f.name];
        } else {
          featObj[f.name] =
            raw !== null && raw !== undefined && raw !== '' ? String(raw) : modes[f.name];
        }
      }
      return {
        features: featObj,
        target: String(r[targetColumn]),
      };
    });
}

function findBestSplit(
  rows: PreparedRow[],
  features: FeatureInfo[],
  classes: string[],
  criterion: TreeCriterion,
  minSamplesLeaf: number,
  parentImpurity: number
): {
  feature: string;
  isNumeric: boolean;
  threshold?: number;
  category?: string;
  gain: number;
  leftRows: PreparedRow[];
  rightRows: PreparedRow[];
} | null {
  const n = rows.length;
  let bestGain = 1e-7;
  let bestSplit: {
    feature: string;
    isNumeric: boolean;
    threshold?: number;
    category?: string;
    gain: number;
    leftRows: PreparedRow[];
    rightRows: PreparedRow[];
  } | null = null;

  for (const feat of features) {
    if (feat.isNumeric) {
      // Sort rows by numeric value
      const sorted = [...rows].sort(
        (a, b) => (a.features[feat.name] as number) - (b.features[feat.name] as number)
      );
      const leftCounts: Record<string, number> = {};
      const rightCounts: Record<string, number> = countClasses(sorted, classes);
      for (const c of classes) leftCounts[c] = 0;

      // Candidate thresholds: limit to ~32 quantile steps if very large to stay ultra fast
      const step = sorted.length > 350 ? Math.floor(sorted.length / 100) : 1;

      for (let i = 0; i < sorted.length - 1; i++) {
        const row = sorted[i];
        leftCounts[row.target] = (leftCounts[row.target] || 0) + 1;
        rightCounts[row.target] = (rightCounts[row.target] || 0) - 1;

        const leftN = i + 1;
        const rightN = n - leftN;

        const valCurr = row.features[feat.name] as number;
        const valNext = sorted[i + 1].features[feat.name] as number;

        if (valCurr === valNext) continue;
        if (leftN < minSamplesLeaf || rightN < minSamplesLeaf) continue;
        if (step > 1 && i % step !== 0 && i < sorted.length - 2) continue;

        const impLeft = computeImpurity(leftCounts, leftN, criterion);
        const impRight = computeImpurity(rightCounts, rightN, criterion);
        const weightedImp = (leftN / n) * impLeft + (rightN / n) * impRight;
        const gain = parentImpurity - weightedImp;

        if (gain > bestGain) {
          bestGain = gain;
          const threshold = Number(((valCurr + valNext) / 2).toFixed(4));
          bestSplit = {
            feature: feat.name,
            isNumeric: true,
            threshold,
            gain,
            leftRows: sorted.slice(0, leftN),
            rightRows: sorted.slice(leftN),
          };
        }
      }
    } else {
      // Categorical equality split (category == X vs != X)
      const uniqueCats = Array.from(new Set(rows.map((r) => String(r.features[feat.name]))));
      if (uniqueCats.length <= 1) continue;

      const totalCounts = countClasses(rows, classes);
      for (const cat of uniqueCats.slice(0, 15)) {
        const leftRows: PreparedRow[] = [];
        const rightRows: PreparedRow[] = [];
        const leftCounts: Record<string, number> = {};
        const rightCounts: Record<string, number> = { ...totalCounts };
        for (const c of classes) leftCounts[c] = 0;

        for (const r of rows) {
          if (String(r.features[feat.name]) === cat) {
            leftRows.push(r);
            leftCounts[r.target] = (leftCounts[r.target] || 0) + 1;
            rightCounts[r.target] = (rightCounts[r.target] || 0) - 1;
          } else {
            rightRows.push(r);
          }
        }

        if (leftRows.length < minSamplesLeaf || rightRows.length < minSamplesLeaf) continue;

        const impLeft = computeImpurity(leftCounts, leftRows.length, criterion);
        const impRight = computeImpurity(rightCounts, rightRows.length, criterion);
        const weightedImp =
          (leftRows.length / n) * impLeft + (rightRows.length / n) * impRight;
        const gain = parentImpurity - weightedImp;

        if (gain > bestGain) {
          bestGain = gain;
          bestSplit = {
            feature: feat.name,
            isNumeric: false,
            category: cat,
            gain,
            leftRows,
            rightRows,
          };
        }
      }
    }
  }

  return bestSplit;
}

function buildTreeRecursive(
  rows: PreparedRow[],
  features: FeatureInfo[],
  classes: string[],
  positiveClass: string,
  params: TreeHyperparams,
  depth: number,
  nodeId: string
): DecisionTreeNode {
  const n = rows.length;
  const counts = countClasses(rows, classes);
  const impurity = computeImpurity(counts, n, params.criterion);
  const pred = majorityClass(counts, classes);
  const posProb = (counts[positiveClass] || 0) / Math.max(1, n);

  const canSplit =
    depth < params.maxDepth &&
    n >= params.minSamplesSplit &&
    impurity > 1e-6;

  if (!canSplit) {
    return {
      id: nodeId,
      depth,
      isLeaf: true,
      samples: n,
      impurity: Number(impurity.toFixed(4)),
      classCounts: counts,
      predictedClass: pred,
      positiveProbability: Number(posProb.toFixed(4)),
    };
  }

  const split = findBestSplit(
    rows,
    features,
    classes,
    params.criterion,
    params.minSamplesLeaf,
    impurity
  );

  if (!split) {
    return {
      id: nodeId,
      depth,
      isLeaf: true,
      samples: n,
      impurity: Number(impurity.toFixed(4)),
      classCounts: counts,
      predictedClass: pred,
      positiveProbability: Number(posProb.toFixed(4)),
    };
  }

  const leftNode = buildTreeRecursive(
    split.leftRows,
    features,
    classes,
    positiveClass,
    params,
    depth + 1,
    `${nodeId}L`
  );
  const rightNode = buildTreeRecursive(
    split.rightRows,
    features,
    classes,
    positiveClass,
    params,
    depth + 1,
    `${nodeId}R`
  );

  const splitLabel = split.isNumeric
    ? `${split.feature} ≤ ${formatThreshold(split.threshold!)}`
    : `${split.feature} = ${split.category}`;

  return {
    id: nodeId,
    depth,
    isLeaf: false,
    samples: n,
    impurity: Number(impurity.toFixed(4)),
    classCounts: counts,
    predictedClass: pred,
    positiveProbability: Number(posProb.toFixed(4)),
    splitFeature: split.feature,
    splitType: split.isNumeric ? 'numeric' : 'categorical',
    splitThreshold: split.threshold,
    splitCategory: split.category,
    splitLabel,
    impurityDecrease: Number((split.gain * n).toFixed(4)),
    left: leftNode,
    right: rightNode,
  };
}

function formatThreshold(val: number): string {
  if (Math.abs(val) >= 100) return String(Math.round(val));
  if (Number.isInteger(val)) return String(val);
  return val.toFixed(2);
}

/**
 * Cost-Complexity Pruning (CART Minimal Cost-Complexity Pruning).
 * Prunes subtrees whose effective alpha <= ccpAlpha.
 */
function cloneNode(node: DecisionTreeNode): DecisionTreeNode {
  return {
    ...node,
    classCounts: { ...node.classCounts },
    left: node.left ? cloneNode(node.left) : undefined,
    right: node.right ? cloneNode(node.right) : undefined,
  };
}

function computeSubtreeStats(
  node: DecisionTreeNode,
  totalTrainSamples: number
): { leaves: number; subtreeMisclass: number } {
  const nodeMisclass =
    (node.samples - Math.max(...Object.values(node.classCounts))) / Math.max(1, totalTrainSamples);

  if (node.isLeaf || !node.left || !node.right) {
    node.subtreeLeaves = 1;
    node.effectiveAlpha = Infinity;
    return { leaves: 1, subtreeMisclass: nodeMisclass };
  }

  const leftStats = computeSubtreeStats(node.left, totalTrainSamples);
  const rightStats = computeSubtreeStats(node.right, totalTrainSamples);
  const leaves = leftStats.leaves + rightStats.leaves;
  const subtreeMisclass = leftStats.subtreeMisclass + rightStats.subtreeMisclass;

  const alpha = (nodeMisclass - subtreeMisclass) / Math.max(1, leaves - 1);
  node.subtreeLeaves = leaves;
  node.effectiveAlpha = Number(Math.max(0, alpha).toFixed(6));

  return { leaves, subtreeMisclass };
}

export function pruneTreeByAlpha(
  root: DecisionTreeNode,
  ccpAlpha: number,
  totalTrainSamples: number
): DecisionTreeNode {
  const cloned = cloneNode(root);
  if (ccpAlpha <= 0) {
    computeSubtreeStats(cloned, totalTrainSamples);
    return cloned;
  }

  let changed = true;
  while (changed) {
    changed = false;
    computeSubtreeStats(cloned, totalTrainSamples);

    const prunePass = (node: DecisionTreeNode) => {
      if (node.isLeaf || !node.left || !node.right) return;
      if ((node.effectiveAlpha ?? Infinity) <= ccpAlpha) {
        node.isLeaf = true;
        node.left = undefined;
        node.right = undefined;
        node.splitFeature = undefined;
        node.splitLabel = undefined;
        changed = true;
        return;
      }
      prunePass(node.left);
      prunePass(node.right);
    };
    prunePass(cloned);
  }
  return cloned;
}

export function predictSingleRow(
  root: DecisionTreeNode,
  row: DataRow
): { predictedClass: string; positiveProbability: number; path: string[] } {
  let curr = root;
  const path: string[] = [];

  while (!curr.isLeaf && curr.left && curr.right && curr.splitFeature) {
    const rawVal = row[curr.splitFeature];
    let goLeft = false;

    if (curr.splitType === 'numeric' && curr.splitThreshold !== undefined) {
      const numVal = typeof rawVal === 'number' && Number.isFinite(rawVal) ? rawVal : 0;
      goLeft = numVal <= curr.splitThreshold;
      path.push(
        goLeft
          ? `${curr.splitFeature} (${numVal}) ≤ ${formatThreshold(curr.splitThreshold)}`
          : `${curr.splitFeature} (${numVal}) > ${formatThreshold(curr.splitThreshold)}`
      );
    } else if (curr.splitType === 'categorical' && curr.splitCategory !== undefined) {
      const strVal = rawVal !== null && rawVal !== undefined ? String(rawVal) : '';
      goLeft = strVal === curr.splitCategory;
      path.push(
        goLeft
          ? `${curr.splitFeature} = ${curr.splitCategory}`
          : `${curr.splitFeature} ≠ ${curr.splitCategory}`
      );
    }

    curr = goLeft ? curr.left : curr.right;
  }

  return {
    predictedClass: curr.predictedClass,
    positiveProbability: curr.positiveProbability,
    path,
  };
}

export function evaluateTreeOnRows(
  root: DecisionTreeNode,
  rows: DataRow[],
  targetColumn: string,
  positiveClass: string,
  negativeClass: string
): EvaluationMetrics {
  let vp = 0;
  let vn = 0;
  let fp = 0;
  let fn = 0;

  const scored: { isPos: boolean; prob: number }[] = [];

  for (const r of rows) {
    const actualRaw = r[targetColumn];
    if (actualRaw === null || actualRaw === undefined || actualRaw === '') continue;
    const actual = String(actualRaw);
    const pred = predictSingleRow(root, r);

    const actualPos = actual === positiveClass;
    const predPos = pred.predictedClass === positiveClass;

    if (actualPos && predPos) vp++;
    else if (!actualPos && !predPos) vn++;
    else if (!actualPos && predPos) fp++;
    else fn++;

    scored.push({ isPos: actualPos, prob: pred.positiveProbability });
  }

  const total = Math.max(1, vp + vn + fp + fn);
  const accuracy = (vp + vn) / total;
  const precision = vp + fp > 0 ? vp / (vp + fp) : 0;
  const recall = vp + fn > 0 ? vp / (vp + fn) : 0;
  const specificity = vn + fp > 0 ? vn / (vn + fp) : 0;
  const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  // ROC Curve & AUC via thresholds
  const thresholds = Array.from(
    new Set([1.01, ...scored.map((s) => s.prob), -0.01])
  ).sort((a, b) => b - a);
  const totalPos = Math.max(1, vp + fn);
  const totalNeg = Math.max(1, vn + fp);

  const rocCurve: { fpr: number; tpr: number }[] = [];
  for (const th of thresholds) {
    let tpT = 0;
    let fpT = 0;
    for (const s of scored) {
      if (s.prob >= th) {
        if (s.isPos) tpT++;
        else fpT++;
      }
    }
    rocCurve.push({
      fpr: Number((fpT / totalNeg).toFixed(4)),
      tpr: Number((tpT / totalPos).toFixed(4)),
    });
  }

  rocCurve.sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
  let aucRoc = 0;
  for (let i = 1; i < rocCurve.length; i++) {
    const dx = rocCurve[i].fpr - rocCurve[i - 1].fpr;
    const avgY = (rocCurve[i].tpr + rocCurve[i - 1].tpr) / 2;
    aucRoc += dx * avgY;
  }

  const cm: ConfusionMatrix = {
    positiveClass,
    negativeClass,
    vp,
    vn,
    fp,
    fn,
    total: vp + vn + fp + fn,
  };

  const toPct = (v: number) => Number((v * 100).toFixed(2));
  const accPct = toPct(accuracy);
  const precPct = toPct(precision);
  const recPct = toPct(recall);
  const specPct = toPct(specificity);
  const f1Pct = toPct(f1Score);
  const aucVal = Number(aucRoc.toFixed(3));

  const interpretations: EvaluationMetrics['interpretations'] = [
    {
      metric: 'Accuracy (Exactitud)',
      valueLabel: `${accPct}%`,
      status: accPct >= 80 ? 'Óptimo' : accPct >= 70 ? 'Aceptable' : 'Atención',
      explanation: `El modelo clasifica correctamente el ${accPct}% de los ${cm.total} registros de prueba (${vp + vn} aciertos totales).`,
    },
    {
      metric: 'Precision (Precisión)',
      valueLabel: `${precPct}%`,
      status: precPct >= 75 ? 'Óptimo' : precPct >= 60 ? 'Aceptable' : 'Atención',
      explanation: `De cada 100 casos predichos como "${positiveClass}", ${Math.round(precPct)} pertenecen realmente a esa clase (${fp} falsas alarmas).`,
    },
    {
      metric: 'Recall / Sensibilidad',
      valueLabel: `${recPct}%`,
      status: recPct >= 75 ? 'Óptimo' : recPct >= 60 ? 'Aceptable' : 'Atención',
      explanation: `Capacidad de captura: detecta el ${recPct}% de los casos reales "${positiveClass}" (${fn} casos no detectados).`,
    },
    {
      metric: 'Especificidad',
      valueLabel: `${specPct}%`,
      status: specPct >= 75 ? 'Óptimo' : specPct >= 60 ? 'Aceptable' : 'Atención',
      explanation: `Identifica correctamente el ${specPct}% de los casos negativos ("${negativeClass}"), evitando intervenciones innecesarias.`,
    },
    {
      metric: 'F1 Score',
      valueLabel: `${f1Pct}%`,
      status: f1Pct >= 74 ? 'Óptimo' : f1Pct >= 60 ? 'Aceptable' : 'Atención',
      explanation: `Media armónica entre precisión y sensibilidad (${f1Pct}%), ideal para evaluar equilibrio cuando existe desbalance de clases.`,
    },
    {
      metric: 'AUC-ROC',
      valueLabel: `${aucVal}`,
      status: aucVal >= 0.8 ? 'Óptimo' : aucVal >= 0.7 ? 'Aceptable' : 'Atención',
      explanation: `Poder discriminativo global de ${aucVal}: ${aucVal >= 0.8 ? 'excelente capacidad' : aucVal >= 0.7 ? 'buena capacidad' : 'capacidad moderada'} para ordenar casos positivos por encima de negativos.`,
    },
  ];

  return {
    accuracy: accPct,
    precision: precPct,
    recall: recPct,
    specificity: specPct,
    f1Score: f1Pct,
    aucRoc: aucVal,
    rocCurve,
    confusionMatrix: cm,
    interpretations,
  };
}

function summarizeTree(
  root: DecisionTreeNode,
  totalTrainSamples: number,
  featureNames: string[]
): {
  nodeCount: number;
  leafCount: number;
  actualDepth: number;
  featureImportance: FeatureImportanceItem[];
  rules: TreeRule[];
} {
  let nodeCount = 0;
  let leafCount = 0;
  let actualDepth = 0;
  const importanceAcc: Record<string, number> = {};
  const splitCounts: Record<string, number> = {};
  for (const f of featureNames) {
    importanceAcc[f] = 0;
    splitCounts[f] = 0;
  }

  const rules: TreeRule[] = [];

  const traverse = (node: DecisionTreeNode, pathConds: string[]) => {
    nodeCount++;
    actualDepth = Math.max(actualDepth, node.depth);

    if (node.isLeaf || !node.left || !node.right) {
      leafCount++;
      const total = Math.max(1, node.samples);
      const predCount = node.classCounts[node.predictedClass] || 0;
      rules.push({
        id: node.id,
        condition: pathConds.length > 0 ? pathConds.join(' Y ') : 'Todos los registros (Nodo Raíz)',
        prediction: node.predictedClass,
        support: node.samples,
        supportPct: Number(((node.samples / Math.max(1, totalTrainSamples)) * 100).toFixed(1)),
        confidencePct: Number(((predCount / total) * 100).toFixed(1)),
        depth: node.depth,
      });
      return;
    }

    if (node.splitFeature && node.impurityDecrease !== undefined) {
      importanceAcc[node.splitFeature] =
        (importanceAcc[node.splitFeature] || 0) + node.impurityDecrease;
      splitCounts[node.splitFeature] = (splitCounts[node.splitFeature] || 0) + 1;
    }

    if (node.splitType === 'numeric' && node.splitThreshold !== undefined) {
      const th = formatThreshold(node.splitThreshold);
      traverse(node.left, [...pathConds, `${node.splitFeature} ≤ ${th}`]);
      traverse(node.right, [...pathConds, `${node.splitFeature} > ${th}`]);
    } else if (node.splitCategory !== undefined) {
      traverse(node.left, [...pathConds, `${node.splitFeature} = ${node.splitCategory}`]);
      traverse(node.right, [...pathConds, `${node.splitFeature} ≠ ${node.splitCategory}`]);
    }
  };

  traverse(root, []);

  const totalImp = Object.values(importanceAcc).reduce((a, b) => a + b, 0);
  const featureImportance: FeatureImportanceItem[] = Object.entries(importanceAcc)
    .map(([variable, val]) => ({
      variable,
      importance: Number(val.toFixed(4)),
      importancePct: totalImp > 0 ? Number(((val / totalImp) * 100).toFixed(1)) : 0,
      splitsCount: splitCounts[variable] || 0,
    }))
    .sort((a, b) => b.importancePct - a.importancePct);

  rules.sort((a, b) => b.confidencePct * b.support - a.confidencePct * a.support);

  return {
    nodeCount,
    leafCount,
    actualDepth,
    featureImportance,
    rules,
  };
}

export function trainDecisionTree(
  trainRows: DataRow[],
  testRows: DataRow[],
  columns: ColumnProfile[],
  targetColumn: string,
  positiveClass: string,
  params: TreeHyperparams
): TrainedTreeModel {
  const predictorCols = columns.filter((c) => c.name !== targetColumn);
  const features: FeatureInfo[] = predictorCols.map((c) => ({
    name: c.name,
    isNumeric: c.type === 'numeric',
  }));

  const preparedTrain = prepareData(trainRows, features, targetColumn);
  const classes = Array.from(new Set(preparedTrain.map((r) => r.target))).sort();
  const effectivePos = classes.includes(positiveClass) ? positiveClass : classes[0];
  const negativeClass = classes.find((c) => c !== effectivePos) || effectivePos;

  const fullRoot = buildTreeRecursive(
    preparedTrain,
    features,
    classes,
    effectivePos,
    params,
    0,
    'N0'
  );

  const prunedRoot = pruneTreeByAlpha(fullRoot, params.ccpAlpha, preparedTrain.length);
  const summary = summarizeTree(
    prunedRoot,
    preparedTrain.length,
    features.map((f) => f.name)
  );

  const trainMetrics = evaluateTreeOnRows(
    prunedRoot,
    trainRows,
    targetColumn,
    effectivePos,
    negativeClass
  );
  const testMetrics = evaluateTreeOnRows(
    prunedRoot,
    testRows,
    targetColumn,
    effectivePos,
    negativeClass
  );

  return {
    params,
    targetColumn,
    positiveClass: effectivePos,
    negativeClass,
    root: prunedRoot,
    nodeCount: summary.nodeCount,
    leafCount: summary.leafCount,
    actualDepth: summary.actualDepth,
    trainCount: preparedTrain.length,
    testCount: testRows.length,
    featureImportance: summary.featureImportance,
    rules: summary.rules,
    trainMetrics,
    testMetrics,
  };
}

/**
 * Module 8 & 9: Cross-Validation + Hyperparameter Grid Search + Cost-Complexity Pruning
 */
export function optimizeDecisionTree(
  trainRows: DataRow[],
  testRows: DataRow[],
  columns: ColumnProfile[],
  targetColumn: string,
  positiveClass: string,
  originalModel: TrainedTreeModel
): OptimizationResult {
  const cvFolds = 5;
  const predictorCols = columns.filter((c) => c.name !== targetColumn);
  const features: FeatureInfo[] = predictorCols.map((c) => ({
    name: c.name,
    isNumeric: c.type === 'numeric',
  }));

  const shuffled = shuffleIndices(trainRows.length, 2026);
  const folds: DataRow[][] = Array.from({ length: cvFolds }, () => []);
  for (let i = 0; i < shuffled.length; i++) {
    folds[i % cvFolds].push(trainRows[shuffled[i]]);
  }

  const evalCvAccuracy = (params: TreeHyperparams): number => {
    let accSum = 0;
    for (let f = 0; f < cvFolds; f++) {
      const valFold = folds[f];
      const trFold: DataRow[] = [];
      for (let k = 0; k < cvFolds; k++) {
        if (k !== f) trFold.push(...folds[k]);
      }
      const prep = prepareData(trFold, features, targetColumn);
      const classes = Array.from(new Set(prep.map((r) => r.target))).sort();
      const effPos = classes.includes(positiveClass) ? positiveClass : classes[0];
      const effNeg = classes.find((c) => c !== effPos) || effPos;
      const rawTree = buildTreeRecursive(prep, features, classes, effPos, params, 0, 'N0');
      const pruned = pruneTreeByAlpha(rawTree, params.ccpAlpha, prep.length);
      const metrics = evaluateTreeOnRows(pruned, valFold, targetColumn, effPos, effNeg);
      accSum += metrics.accuracy;
    }
    return Number((accSum / cvFolds).toFixed(2));
  };

  const cvOriginalAccuracy = evalCvAccuracy(originalModel.params);

  // Hyperparameter Grid Search
  const candidateDepths = [3, 4, 5, 6];
  const candidateMinLeaf = [8, 15, 25];
  const candidateCriteria: TreeCriterion[] = ['gini', 'entropy'];

  let bestParams: TreeHyperparams = { ...originalModel.params };
  let cvBestAccuracy = -1;
  let candidatesEvaluated = 0;

  for (const criterion of candidateCriteria) {
    for (const maxDepth of candidateDepths) {
      for (const minSamplesLeaf of candidateMinLeaf) {
        candidatesEvaluated++;
        const cand: TreeHyperparams = {
          algorithm: criterion === 'gini' ? 'Gini' : 'Entropía',
          criterion,
          maxDepth,
          minSamplesSplit: minSamplesLeaf * 2,
          minSamplesLeaf,
          ccpAlpha: 0,
        };
        const cvAcc = evalCvAccuracy(cand);
        // Prefer slightly simpler tree on ties
        if (
          cvAcc > cvBestAccuracy + 0.1 ||
          (Math.abs(cvAcc - cvBestAccuracy) <= 0.1 && cand.maxDepth < bestParams.maxDepth)
        ) {
          cvBestAccuracy = cvAcc;
          bestParams = cand;
        }
      }
    }
  }

  // Cost Complexity Pruning Sweep on best base structure
  const alphas = [0, 0.002, 0.005, 0.01, 0.015, 0.025, 0.04];
  const sweepRaw: Omit<PruningSweepPoint, 'isRecommended'>[] = [];

  for (const alpha of alphas) {
    const p: TreeHyperparams = { ...bestParams, ccpAlpha: alpha };
    const m = trainDecisionTree(trainRows, testRows, columns, targetColumn, positiveClass, p);
    const cvAcc = evalCvAccuracy(p);
    sweepRaw.push({
      ccpAlpha: alpha,
      nodeCount: m.nodeCount,
      leafCount: m.leafCount,
      trainAccuracy: m.trainMetrics.accuracy,
      testAccuracy: m.testMetrics.accuracy,
      cvAccuracy: cvAcc,
    });
  }

  // Pick alpha maximizing CV accuracy with parsimony preference
  let bestAlphaIdx = 0;
  let bestSweepScore = -1;
  for (let i = 0; i < sweepRaw.length; i++) {
    const pt = sweepRaw[i];
    const score = pt.cvAccuracy - pt.nodeCount * 0.04;
    if (score > bestSweepScore) {
      bestSweepScore = score;
      bestAlphaIdx = i;
    }
  }

  const pruningSweep: PruningSweepPoint[] = sweepRaw.map((pt, idx) => ({
    ...pt,
    isRecommended: idx === bestAlphaIdx,
  }));

  bestParams = { ...bestParams, ccpAlpha: pruningSweep[bestAlphaIdx].ccpAlpha };
  cvBestAccuracy = pruningSweep[bestAlphaIdx].cvAccuracy;

  const optimizedModel = trainDecisionTree(
    trainRows,
    testRows,
    columns,
    targetColumn,
    positiveClass,
    bestParams
  );

  const deltaAcc = Number(
    (optimizedModel.testMetrics.accuracy - originalModel.testMetrics.accuracy).toFixed(2)
  );
  const deltaNodes = originalModel.nodeCount - optimizedModel.nodeCount;

  const summary =
    deltaAcc >= 0
      ? `Validación cruzada (${cvFolds}-Fold) evaluó ${candidatesEvaluated} configuraciones y poda CCP. El árbol optimizado logra ${optimizedModel.testMetrics.accuracy}% de exactitud en prueba (${deltaAcc >= 0 ? '+' : ''}${deltaAcc} pts) con ${optimizedModel.nodeCount} nodos (${deltaNodes >= 0 ? `${deltaNodes} nodos menos` : `${Math.abs(deltaNodes)} nodos adicionales`}).`
      : `La optimización con ${cvFolds}-Fold CV priorizó reducir sobreajuste: el árbol podado reduce la complejidad a ${optimizedModel.nodeCount} nodos (CV: ${cvBestAccuracy}% vs ${cvOriginalAccuracy}% original) manteniendo alta capacidad de generalización.`;

  return {
    originalModel,
    optimizedModel,
    bestParams,
    cvFolds,
    cvBestAccuracy,
    cvOriginalAccuracy,
    candidatesEvaluated,
    pruningSweep,
    summary,
  };
}
