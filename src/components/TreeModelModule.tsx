import React, { useMemo, useState } from 'react';
import { Calculator, Play, SlidersHorizontal } from 'lucide-react';
import {
  DataRow,
  Dataset,
  TrainedTreeModel,
  TreeAlgorithm,
  TreeHyperparams,
} from '../types/analytics';
import { predictSingleRow } from '../ml/decisionTree';
import { DecisionTreeCanvas } from './DecisionTreeCanvas';

interface TreeModelModuleProps {
  dataset: Dataset;
  targetColumn: string;
  positiveClass: string;
  trainRatio: number;
  onChangeTrainRatio: (ratio: number) => void;
  trainCount: number;
  testCount: number;
  params: TreeHyperparams;
  onChangeParams: (next: TreeHyperparams) => void;
  model: TrainedTreeModel;
  onNextStep: () => void;
}

export const TreeModelModule: React.FC<TreeModelModuleProps> = ({
  dataset,
  targetColumn,
  positiveClass,
  trainRatio,
  onChangeTrainRatio,
  trainCount,
  testCount,
  params,
  onChangeParams,
  model,
  onNextStep,
}) => {
  const predictorCols = useMemo(
    () => dataset.columns.filter((c) => c.name !== targetColumn),
    [dataset.columns, targetColumn]
  );

  // Initialize What-If simulator from first dataset row
  const [simRow, setSimRow] = useState<DataRow>(() => {
    const initial: DataRow = {};
    const sample = dataset.rows[0] || {};
    for (const col of predictorCols) {
      initial[col.name] = sample[col.name] ?? (col.type === 'numeric' ? 0 : col.levels?.[0] || '');
    }
    return initial;
  });

  const simPrediction = useMemo(
    () => predictSingleRow(model.root, simRow),
    [model.root, simRow]
  );

  const handleAlgorithmChange = (alg: TreeAlgorithm) => {
    const criterion = alg === 'Entropía' ? 'entropy' : 'gini';
    onChangeParams({ ...params, algorithm: alg, criterion });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 6 y Módulo 7 · Partición y Entrenamiento Supervisado
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            División de Datos y Construcción del Árbol de Decisión
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Configure la partición estratificada entrenamiento/prueba y ajuste los hiperparámetros CART (Gini o Entropía) para generar reglas interpretables.
          </p>
        </div>

        <button
          type="button"
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <span>Continuar a Optimización y Poda</span>
        </button>
      </div>

      {/* Module 6 & 7 Configuration Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Module 6: Data Split */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
          <div>
            <h2 className="font-display text-sm font-bold text-[#0F2A4A]">
              División Estratificada de Datos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Mantiene la proporción de "{positiveClass}" en ambos conjuntos
            </p>

            <div className="mt-4">
              <div className="flex justify-between text-xs font-semibold mb-1.5 tabular-nums">
                <span className="text-[#0F2A4A]">
                  Entrenamiento: {Math.round(trainRatio * 100)}%
                </span>
                <span className="text-[#0D9488]">
                  Prueba: {Math.round((1 - trainRatio) * 100)}%
                </span>
              </div>
              <input
                aria-label="Porcentaje de entrenamiento"
                type="range"
                min={50}
                max={90}
                step={5}
                value={Math.round(trainRatio * 100)}
                onChange={(e) => onChangeTrainRatio(Number(e.target.value) / 100)}
                className="w-full accent-[#0D9488] cursor-pointer"
              />
              {/* Visual split bar */}
              <div className="h-3 rounded-full overflow-hidden flex mt-2 bg-slate-100">
                <div
                  className="bg-[#0F2A4A] transition-all"
                  style={{ width: `${trainRatio * 100}%` }}
                />
                <div
                  className="bg-[#0D9488] transition-all"
                  style={{ width: `${(1 - trainRatio) * 100}%` }}
                />
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3 tabular-nums">
            <div>
              <div className="text-[11px] text-slate-500">Registros Entrenamiento</div>
              <div className="font-mono text-lg font-bold text-[#0F2A4A]">
                {trainCount.toLocaleString('es-ES')}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Registros Prueba</div>
              <div className="font-mono text-lg font-bold text-[#0D9488]">
                {testCount.toLocaleString('es-ES')}
              </div>
            </div>
          </div>
        </div>

        {/* Module 7: Hyperparameters */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0D9488]" />
              <h2 className="font-display text-sm font-bold text-[#0F2A4A]">
                Configuración de Hiperparámetros del Árbol
              </h2>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              {model.nodeCount} nodos · {model.leafCount} hojas · Prof. real {model.actualDepth}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Algorithm & Split Criterion */}
            <div>
              <div className="text-xs font-medium text-slate-700 mb-1.5">
                Algoritmo y Criterio de División
              </div>
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-md">
                {(['CART', 'Gini', 'Entropía'] as TreeAlgorithm[]).map((alg) => (
                  <button
                    key={alg}
                    type="button"
                    onClick={() => handleAlgorithmChange(alg)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded transition-colors ${
                      params.algorithm === alg
                        ? 'bg-[#0F2A4A] text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {alg}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Criterio activo:{' '}
                <span className="font-semibold text-slate-700">
                  {params.criterion === 'gini' ? 'Índice de Gini (Impureza)' : 'Entropía / Ganancia de Información'}
                </span>
              </p>
            </div>

            {/* Max Depth */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <label htmlFor="param-max-depth">Profundidad Máxima</label>
                <span className="font-mono font-bold text-[#0F2A4A]">{params.maxDepth}</span>
              </div>
              <input
                id="param-max-depth"
                type="range"
                min={2}
                max={8}
                step={1}
                value={params.maxDepth}
                onChange={(e) =>
                  onChangeParams({ ...params, maxDepth: Number(e.target.value) })
                }
                className="w-full accent-[#0D9488] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Controla cuántos niveles de reglas encadenadas puede generar el árbol.
              </p>
            </div>

            {/* Min Split */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <label htmlFor="param-min-split">Min Split (Mín. para dividir nodo)</label>
                <span className="font-mono font-bold text-[#0F2A4A]">
                  {params.minSamplesSplit}
                </span>
              </div>
              <input
                id="param-min-split"
                type="range"
                min={4}
                max={80}
                step={2}
                value={params.minSamplesSplit}
                onChange={(e) =>
                  onChangeParams({ ...params, minSamplesSplit: Number(e.target.value) })
                }
                className="w-full accent-[#0D9488] cursor-pointer"
              />
            </div>

            {/* Min Bucket (Leaf) */}
            <div>
              <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
                <label htmlFor="param-min-bucket">Min Bucket (Mín. en hoja terminal)</label>
                <span className="font-mono font-bold text-[#0F2A4A]">
                  {params.minSamplesLeaf}
                </span>
              </div>
              <input
                id="param-min-bucket"
                type="range"
                min={2}
                max={50}
                step={2}
                value={params.minSamplesLeaf}
                onChange={(e) =>
                  onChangeParams({ ...params, minSamplesLeaf: Number(e.target.value) })
                }
                className="w-full accent-[#0D9488] cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tree Visualizer */}
      <DecisionTreeCanvas
        root={model.root}
        positiveClass={model.positiveClass}
        title={`Árbol de Decisión (${params.algorithm} · ${params.criterion.toUpperCase()}) — Exactitud Prueba: ${model.testMetrics.accuracy}%`}
      />

      {/* Rules Table + What-If Simulator */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Extracted Rules */}
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F2A4A]">
                Reglas de Decisión Extraídas del Árbol
              </h3>
              <p className="text-xs text-slate-500">
                Rutas lógicas desde el nodo raíz hasta cada hoja terminal ordenadas por impacto
              </p>
            </div>
            <span className="text-xs font-mono text-slate-600">
              {model.rules.length} reglas
            </span>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 sticky top-0">
                  <th className="py-2 px-4 text-xs font-semibold text-slate-700">Regla (SI...)</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-700">Predicción</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-700 text-right">Confianza</th>
                  <th className="py-2 px-3 text-xs font-semibold text-slate-700 text-right">Soporte</th>
                </tr>
              </thead>
              <tbody>
                {model.rules.slice(0, 14).map((rule) => {
                  const isPos = rule.prediction === model.positiveClass;
                  return (
                    <tr key={rule.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-4 text-xs font-mono text-slate-800">
                        {rule.condition}
                      </td>
                      <td className="py-2.5 px-3 text-xs font-semibold whitespace-nowrap">
                        <span className={isPos ? 'text-[#0D9488]' : 'text-[#0F2A4A]'}>
                          {rule.prediction}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono tabular-nums text-right font-semibold text-slate-900">
                        {rule.confidencePct}%
                      </td>
                      <td className="py-2.5 px-3 text-xs font-mono tabular-nums text-right text-slate-600">
                        {rule.support} ({rule.supportPct}%)
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Single-Case Simulator */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#0D9488]" />
            <h3 className="font-display text-sm font-bold text-[#0F2A4A]">
              Simulador de Predicción en Vivo
            </h3>
          </div>
          <p className="text-xs text-slate-600">
            Ajuste los atributos de un registro hipotético para evaluar qué ruta y hoja del árbol se activa.
          </p>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {predictorCols.slice(0, 8).map((col) => (
              <div key={col.name} className="flex items-center justify-between gap-3">
                <label
                  htmlFor={`sim_${col.name}`}
                  className="text-xs font-medium text-slate-700 truncate"
                  title={col.name}
                >
                  {col.name}
                </label>
                {col.type === 'numeric' ? (
                  <input
                    id={`sim_${col.name}`}
                    type="number"
                    value={Number(simRow[col.name] ?? 0)}
                    onChange={(e) =>
                      setSimRow((prev) => ({
                        ...prev,
                        [col.name]: Number(e.target.value),
                      }))
                    }
                    className="w-28 px-2 py-1 text-xs font-mono text-right bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  />
                ) : (
                  <select
                    id={`sim_${col.name}`}
                    value={String(simRow[col.name] ?? col.levels?.[0] ?? '')}
                    onChange={(e) =>
                      setSimRow((prev) => ({
                        ...prev,
                        [col.name]: e.target.value,
                      }))
                    }
                    className="w-32 px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  >
                    {(col.levels || []).map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-500">Predicción ({targetColumn})</span>
              <span
                className={`text-sm font-bold ${
                  simPrediction.predictedClass === model.positiveClass
                    ? 'text-[#0D9488]'
                    : 'text-[#0F2A4A]'
                }`}
              >
                {simPrediction.predictedClass}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs tabular-nums">
              <span className="text-slate-500">Probabilidad "{model.positiveClass}"</span>
              <span className="font-mono font-semibold text-slate-900">
                {(simPrediction.positiveProbability * 100).toFixed(1)}%
              </span>
            </div>
            <div className="pt-2 border-t border-slate-200">
              <div className="text-[11px] font-semibold text-slate-600 mb-1 flex items-center gap-1">
                <Play className="w-3 h-3 text-[#0D9488]" />
                Ruta de decisión activada:
              </div>
              <div className="text-[11px] font-mono text-slate-700 space-y-0.5">
                {simPrediction.path.map((step, idx) => (
                  <div key={idx}>
                    {idx + 1}. {step}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
