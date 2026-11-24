export type ColumnType = 'numeric' | 'categorical' | 'factor';

export type SectorKey =
  | 'marketing'
  | 'ventas'
  | 'rrhh'
  | 'banca'
  | 'salud'
  | 'gestion_documental'
  | 'servicio_cliente'
  | 'logistica'
  | 'personalizado';

export type DataValue = string | number | null;
export type DataRow = Record<string, DataValue>;

export interface ColumnProfile {
  name: string;
  detectedType: ColumnType;
  type: ColumnType; // Allows manual reclassification
  nullCount: number;
  nullPct: number;
  uniqueCount: number;
  levels?: string[]; // Detected levels for categorical/factor
  sampleValues: string[];
  description?: string;
  inconsistencies: string[];
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  totalNulls: number;
  nullPct: number;
  duplicateRows: number;
  inconsistencyCount: number;
  inconsistencies: {
    column: string;
    issue: string;
    count: number;
  }[];
  completenessScore: number;
}

export interface TargetCandidate {
  column: string;
  uniqueValues: string[];
  positiveClass: string;
  positivePct: number;
  suitabilityScore: number;
  isRecommended: boolean;
  reason: string;
  advantages: string[];
  businessImpact: string;
}

export interface Dataset {
  id: string;
  name: string;
  source: 'upload' | 'synthetic';
  fileFormat?: string;
  sector: SectorKey;
  rows: DataRow[];
  columns: ColumnProfile[];
  quality: DataQualityReport;
  targetCandidates: TargetCandidate[];
  createdAt: string;
}

export interface NumericStats {
  column: string;
  count: number;
  missing: number;
  mean: number;
  median: number;
  mode: number;
  stdDev: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q2: number;
  q3: number;
  iqr: number;
  lowerWhisker: number;
  upperWhisker: number;
  outliersCount: number;
  histogram: {
    binStart: number;
    binEnd: number;
    label: string;
    count: number;
    density: number;
  }[];
  densityCurve: {
    x: number;
    y: number;
  }[];
}

export interface CategoricalFrequency {
  category: string;
  count: number;
  relativeFreq: number;
  percentage: number;
  cumulativePct: number;
}

export interface CategoricalStats {
  column: string;
  count: number;
  missing: number;
  uniqueCount: number;
  frequencies: CategoricalFrequency[];
}

export interface CorrelationMatrix {
  columns: string[];
  matrix: number[][];
  strongestPairs: {
    colA: string;
    colB: string;
    r: number;
    interpretation: string;
  }[];
}

export type TreeCriterion = 'gini' | 'entropy';
export type TreeAlgorithm = 'CART' | 'Gini' | 'Entropía';

export interface TreeHyperparams {
  algorithm: TreeAlgorithm;
  criterion: TreeCriterion;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  ccpAlpha: number;
}

export interface DecisionTreeNode {
  id: string;
  depth: number;
  isLeaf: boolean;
  samples: number;
  impurity: number;
  classCounts: Record<string, number>;
  predictedClass: string;
  positiveProbability: number;
  splitFeature?: string;
  splitType?: 'numeric' | 'categorical';
  splitThreshold?: number;
  splitCategory?: string;
  splitLabel?: string;
  impurityDecrease?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  // Weakest-link pruning metadata
  effectiveAlpha?: number;
  subtreeLeaves?: number;
}

export interface TreeRule {
  id: string;
  condition: string;
  prediction: string;
  support: number;
  supportPct: number;
  confidencePct: number;
  depth: number;
}

export interface FeatureImportanceItem {
  variable: string;
  importance: number;
  importancePct: number;
  splitsCount: number;
}

export interface ConfusionMatrix {
  positiveClass: string;
  negativeClass: string;
  vp: number; // Verdaderos Positivos
  vn: number; // Verdaderos Negativos
  fp: number; // Falsos Positivos
  fn: number; // Falsos Negativos
  total: number;
}

export interface EvaluationMetrics {
  accuracy: number;
  precision: number;
  recall: number; // Sensibilidad
  specificity: number; // Especificidad
  f1Score: number;
  aucRoc: number;
  rocCurve: { fpr: number; tpr: number }[];
  confusionMatrix: ConfusionMatrix;
  interpretations: {
    metric: string;
    valueLabel: string;
    status: 'Óptimo' | 'Aceptable' | 'Atención';
    explanation: string;
  }[];
}

export interface TrainedTreeModel {
  params: TreeHyperparams;
  targetColumn: string;
  positiveClass: string;
  negativeClass: string;
  root: DecisionTreeNode;
  nodeCount: number;
  leafCount: number;
  actualDepth: number;
  trainCount: number;
  testCount: number;
  featureImportance: FeatureImportanceItem[];
  rules: TreeRule[];
  trainMetrics: EvaluationMetrics;
  testMetrics: EvaluationMetrics;
}

export interface PruningSweepPoint {
  ccpAlpha: number;
  nodeCount: number;
  leafCount: number;
  trainAccuracy: number;
  testAccuracy: number;
  cvAccuracy: number;
  isRecommended: boolean;
}

export interface OptimizationResult {
  originalModel: TrainedTreeModel;
  optimizedModel: TrainedTreeModel;
  bestParams: TreeHyperparams;
  cvFolds: number;
  cvBestAccuracy: number;
  cvOriginalAccuracy: number;
  candidatesEvaluated: number;
  pruningSweep: PruningSweepPoint[];
  summary: string;
}

export interface BusinessDecisionCard {
  category: string;
  title: string;
  description: string;
  metricHighlight: string;
  priority: 'Alta' | 'Media' | 'Estratégica';
}

export interface AIInsightsResult {
  resumenEjecutivo: string;
  hallazgos: {
    titulo: string;
    detalle: string;
    impacto: string;
  }[];
  recomendaciones: {
    titulo: string;
    accion: string;
    area: string;
  }[];
  riesgos: {
    titulo: string;
    detalle: string;
    mitigacion: string;
  }[];
  generatedAt: string;
  source: 'gemini' | 'local';
}
