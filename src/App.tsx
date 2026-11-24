import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AIInsightsResult,
  ColumnType,
  Dataset,
  OptimizationResult,
  SectorKey,
  TreeHyperparams,
} from './types/analytics';
import {
  cleanDatasetRows,
  parseUploadedFile,
  profileDataset,
} from './ml/dataParser';
import { generateSyntheticDataset, getSectorInfo } from './ml/syntheticDatasets';
import {
  optimizeDecisionTree,
  splitTrainTest,
  trainDecisionTree,
} from './ml/decisionTree';
import {
  buildLocalFallbackInsights,
  generateSectorBusinessDecisions,
} from './ml/businessEngine';
import { NavSection, TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { DataModule } from './components/DataModule';
import { VariablesModule } from './components/VariablesModule';
import { EdaModule } from './components/EdaModule';
import { TreeModelModule } from './components/TreeModelModule';
import { OptimizePruneModule } from './components/OptimizePruneModule';
import { EvaluationModule } from './components/EvaluationModule';
import { BusinessInsightsModule } from './components/BusinessInsightsModule';

const DEFAULT_PARAMS: TreeHyperparams = {
  algorithm: 'CART',
  criterion: 'gini',
  maxDepth: 4,
  minSamplesSplit: 20,
  minSamplesLeaf: 10,
  ccpAlpha: 0,
};

function createSyntheticDatasetObject(sector: SectorKey, rowCount = 1200): Dataset {
  const info = getSectorInfo(sector);
  const rows = generateSyntheticDataset(sector, rowCount, 202611, true);
  return profileDataset(rows, {
    name: `Dataset Sintético — ${info.label}`,
    source: 'synthetic',
    sector,
    fileFormat: 'Sintético',
  });
}

export default function App() {
  const [activeSection, setActiveSection] = useState<NavSection>('datos');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [selectedSector, setSelectedSector] = useState<SectorKey>('marketing');
  const [dataset, setDataset] = useState<Dataset>(() =>
    createSyntheticDatasetObject('marketing', 1200)
  );

  const [targetColumn, setTargetColumn] = useState<string>(() => {
    const initDs = createSyntheticDatasetObject('marketing', 1200);
    return initDs.targetCandidates[0]?.column || 'Compra';
  });
  const [positiveClass, setPositiveClass] = useState<string>(() => {
    const initDs = createSyntheticDatasetObject('marketing', 1200);
    return initDs.targetCandidates[0]?.positiveClass || 'Sí';
  });

  const [trainRatio, setTrainRatio] = useState<number>(0.7);
  const [treeParams, setTreeParams] = useState<TreeHyperparams>(DEFAULT_PARAMS);

  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [geminiInsights, setGeminiInsights] = useState<AIInsightsResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // Train/Test Split (Module 6)
  const { trainRows, testRows } = useMemo(
    () => splitTrainTest(dataset.rows, targetColumn, trainRatio, 42),
    [dataset.rows, targetColumn, trainRatio]
  );

  // Decision Tree Model (Module 7)
  const trainedModel = useMemo(
    () =>
      trainDecisionTree(
        trainRows,
        testRows,
        dataset.columns,
        targetColumn,
        positiveClass,
        treeParams
      ),
    [trainRows, testRows, dataset.columns, targetColumn, positiveClass, treeParams]
  );

  // Business Recommendations (Module 12)
  const businessCards = useMemo(
    () => generateSectorBusinessDecisions(selectedSector, trainedModel),
    [selectedSector, trainedModel]
  );

  // Statistical Baseline Insights when Gemini hasn't been invoked yet
  const localInsights = useMemo(
    () =>
      buildLocalFallbackInsights(
        dataset,
        optimization ? optimization.optimizedModel : trainedModel,
        getSectorInfo(selectedSector).label
      ),
    [dataset, optimization, trainedModel, selectedSector]
  );

  // Clear stale optimization & Gemini results when data/target/split changes
  useEffect(() => {
    setOptimization(null);
    setGeminiInsights(null);
    setAiError(null);
  }, [dataset.id, targetColumn, positiveClass, trainRatio]);

  const applyNewDataset = (ds: Dataset) => {
    setDataset(ds);
    const bestTarget = ds.targetCandidates[0];
    if (bestTarget) {
      setTargetColumn(bestTarget.column);
      setPositiveClass(bestTarget.positiveClass);
    } else if (ds.columns.length > 0) {
      const lastCol = ds.columns[ds.columns.length - 1];
      setTargetColumn(lastCol.name);
      setPositiveClass(lastCol.levels?.[0] || 'Sí');
    }
    setTreeParams(DEFAULT_PARAMS);
    setOptimization(null);
    setGeminiInsights(null);
    setAiError(null);
  };

  const handleUploadFile = async (file: File) => {
    const { rows, format } = await parseUploadedFile(file);
    const profiled = profileDataset(rows, {
      name: file.name,
      source: 'upload',
      sector: selectedSector,
      fileFormat: format,
    });
    applyNewDataset(profiled);
  };

  const handleGenerateSynthetic = (sector: SectorKey, rowCount: number) => {
    setSelectedSector(sector);
    const ds = createSyntheticDatasetObject(sector, rowCount);
    applyNewDataset(ds);
  };

  const handleSelectSector = (sector: SectorKey) => {
    setSelectedSector(sector);
    if (dataset.source === 'synthetic') {
      const ds = createSyntheticDatasetObject(sector, dataset.rows.length);
      applyNewDataset(ds);
    }
  };

  const handleCleanDataset = () => {
    const cleaned = cleanDatasetRows(dataset.rows, dataset.columns);
    const existingTypes: Record<string, ColumnType> = {};
    for (const c of dataset.columns) existingTypes[c.name] = c.type;
    const reprofiled = profileDataset(cleaned, {
      name: dataset.name,
      source: dataset.source,
      sector: selectedSector,
      fileFormat: dataset.fileFormat,
      existingColumnTypes: existingTypes,
    });
    setDataset(reprofiled);
  };

  const handleReclassifyColumn = (colName: string, newType: ColumnType) => {
    setDataset((prev) => ({
      ...prev,
      columns: prev.columns.map((c) =>
        c.name === colName ? { ...c, type: newType } : c
      ),
    }));
  };

  const handleSelectTarget = (colName: string, posClass: string) => {
    setTargetColumn(colName);
    setPositiveClass(posClass);
  };

  const handleRunOptimization = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      try {
        const result = optimizeDecisionTree(
          trainRows,
          testRows,
          dataset.columns,
          targetColumn,
          positiveClass,
          trainedModel
        );
        setOptimization(result);
      } finally {
        setIsOptimizing(false);
      }
    }, 30);
  };

  const handleApplyOptimizedParams = () => {
    if (optimization) {
      setTreeParams(optimization.bestParams);
    }
  };

  const handleGenerateGeminiInsights = async () => {
    setAiLoading(true);
    setAiError(null);
    const activeModel = optimization ? optimization.optimizedModel : trainedModel;
    const cm = activeModel.testMetrics.confusionMatrix;
    const posRatePct = Number(
      (((cm.vp + cm.fn) / Math.max(1, cm.total)) * 100).toFixed(1)
    );

    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sector: selectedSector,
          sectorLabel: getSectorInfo(selectedSector).label,
          datasetName: dataset.name,
          totalRows: dataset.quality.totalRows,
          trainRows: activeModel.trainCount,
          testRows: activeModel.testCount,
          targetColumn: activeModel.targetColumn,
          positiveClass: activeModel.positiveClass,
          algorithm: activeModel.params.algorithm,
          maxDepth: activeModel.actualDepth,
          nodeCount: activeModel.nodeCount,
          leafCount: activeModel.leafCount,
          nullCount: dataset.quality.totalNulls,
          duplicateCount: dataset.quality.duplicateRows,
          positiveRatePct: posRatePct,
          metrics: {
            accuracy: activeModel.testMetrics.accuracy,
            precision: activeModel.testMetrics.precision,
            recall: activeModel.testMetrics.recall,
            specificity: activeModel.testMetrics.specificity,
            f1Score: activeModel.testMetrics.f1Score,
            aucRoc: activeModel.testMetrics.aucRoc,
            vp: cm.vp,
            vn: cm.vn,
            fp: cm.fp,
            fn: cm.fn,
          },
          featureImportance: activeModel.featureImportance,
          topRules: activeModel.rules.slice(0, 6),
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Error en el servidor al generar insights con IA.');
      }

      setGeminiInsights({
        resumenEjecutivo: data.resumenEjecutivo || '',
        hallazgos: Array.isArray(data.hallazgos) ? data.hallazgos : [],
        recomendaciones: Array.isArray(data.recomendaciones) ? data.recomendaciones : [],
        riesgos: Array.isArray(data.riesgos) ? data.riesgos : [],
        generatedAt: new Date().toISOString(),
        source: 'gemini',
      });
    } catch (err: unknown) {
      setAiError(
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al consultar el motor de Gemini API.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  const handleTopBarUpload = () => {
    setActiveSection('datos');
    setTimeout(() => {
      uploadInputRef.current?.click();
    }, 50);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      <TopBar
        activeSection={activeSection}
        onNavigate={setActiveSection}
        onTriggerUpload={handleTopBarUpload}
        onToggleMobileNav={() => setMobileNavOpen(true)}
      />

      <div className="flex flex-1 min-h-0">
        <Sidebar
          activeSection={activeSection}
          onNavigate={setActiveSection}
          dataset={dataset}
          targetColumn={targetColumn}
          model={optimization ? optimization.optimizedModel : trainedModel}
          selectedSector={selectedSector}
          onSelectSector={handleSelectSector}
          trainRatio={trainRatio}
          onChangeTrainRatio={setTrainRatio}
          mobileOpen={mobileNavOpen}
          onCloseMobile={() => setMobileNavOpen(false)}
        />

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-[1440px]">
          {activeSection === 'datos' && (
            <DataModule
              dataset={dataset}
              selectedSector={selectedSector}
              onSelectSector={handleSelectSector}
              onUploadFile={handleUploadFile}
              onGenerateSynthetic={handleGenerateSynthetic}
              onCleanDataset={handleCleanDataset}
              onNextStep={() => setActiveSection('variables')}
              uploadInputRef={uploadInputRef}
            />
          )}

          {activeSection === 'variables' && (
            <VariablesModule
              dataset={dataset}
              targetColumn={targetColumn}
              positiveClass={positiveClass}
              onReclassifyColumn={handleReclassifyColumn}
              onSelectTarget={handleSelectTarget}
              onNextStep={() => setActiveSection('eda')}
            />
          )}

          {activeSection === 'eda' && (
            <EdaModule
              dataset={dataset}
              targetColumn={targetColumn}
              positiveClass={positiveClass}
              onNextStep={() => setActiveSection('modelo')}
            />
          )}

          {activeSection === 'modelo' && (
            <TreeModelModule
              dataset={dataset}
              targetColumn={targetColumn}
              positiveClass={positiveClass}
              trainRatio={trainRatio}
              onChangeTrainRatio={setTrainRatio}
              trainCount={trainRows.length}
              testCount={testRows.length}
              params={treeParams}
              onChangeParams={setTreeParams}
              model={trainedModel}
              onNextStep={() => setActiveSection('optimizacion')}
            />
          )}

          {activeSection === 'optimizacion' && (
            <OptimizePruneModule
              baseModel={trainedModel}
              optimization={optimization}
              isOptimizing={isOptimizing}
              onRunOptimization={handleRunOptimization}
              params={treeParams}
              onChangeParams={setTreeParams}
              onApplyOptimizedParams={handleApplyOptimizedParams}
              onNextStep={() => setActiveSection('evaluacion')}
            />
          )}

          {activeSection === 'evaluacion' && (
            <EvaluationModule
              currentModel={trainedModel}
              optimizedModel={optimization ? optimization.optimizedModel : null}
              onNextStep={() => setActiveSection('negocio')}
            />
          )}

          {activeSection === 'negocio' && (
            <BusinessInsightsModule
              dataset={dataset}
              sector={selectedSector}
              model={optimization ? optimization.optimizedModel : trainedModel}
              businessCards={businessCards}
              aiInsights={geminiInsights || localInsights}
              aiLoading={aiLoading}
              aiError={aiError}
              onGenerateGeminiInsights={handleGenerateGeminiInsights}
            />
          )}
        </main>
      </div>
    </div>
  );
}
