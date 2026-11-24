import React from 'react';
import { CheckCircle2, Cpu, GitCompare, Scissors } from 'lucide-react';
import {
  OptimizationResult,
  TrainedTreeModel,
  TreeHyperparams,
} from '../types/analytics';
import { DecisionTreeCanvas } from './DecisionTreeCanvas';

interface OptimizePruneModuleProps {
  baseModel: TrainedTreeModel;
  optimization: OptimizationResult | null;
  isOptimizing: boolean;
  onRunOptimization: () => void;
  params: TreeHyperparams;
  onChangeParams: (next: TreeHyperparams) => void;
  onApplyOptimizedParams: () => void;
  onNextStep: () => void;
}

export const OptimizePruneModule: React.FC<OptimizePruneModuleProps> = ({
  baseModel,
  optimization,
  isOptimizing,
  onRunOptimization,
  params,
  onChangeParams,
  onApplyOptimizedParams,
  onNextStep,
}) => {
  const recommendedPoint = optimization?.pruningSweep.find((p) => p.isRecommended);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 8 y Módulo 9 · Validación Cruzada y Poda Cost-Complexity
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            Optimización Automática y Poda del Árbol
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Ejecute validación cruzada de 5 pliegues (Cross Validation), búsqueda de hiperparámetros y poda por complejidad de costo (CCP) para equilibrar exactitud y simplicidad.
          </p>
        </div>

        <button
          type="button"
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <span>Continuar a Evaluación e Importancia</span>
        </button>
      </div>

      {/* Module 8: Auto-Optimization Trigger & Summary */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Cpu className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
            <div>
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                Motor de Optimización Automática (CV + Grid Search + CCP)
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                Evalúa combinaciones de criterio (Gini/Entropía), profundidad, Min Bucket y alfa de poda mediante 5-Fold Cross Validation.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isOptimizing}
              onClick={onRunOptimization}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173A63] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap"
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>
                {isOptimizing
                  ? 'Optimizando con 5-Fold CV...'
                  : optimization
                  ? 'Recalcular Optimización'
                  : 'Ejecutar Optimización Automática'}
              </span>
            </button>

            {optimization && (
              <button
                type="button"
                onClick={onApplyOptimizedParams}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Aplicar Poda Recomendada</span>
              </button>
            )}
          </div>
        </div>

        {optimization && (
          <div className="mt-5 pt-5 border-t border-slate-100 space-y-4">
            <p className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-md p-3.5 leading-relaxed">
              {optimization.summary}
            </p>

            {/* Comparison KPI table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Métrica Comparativa</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Árbol Original</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-[#0D9488] text-right">Árbol Optimizado</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Diferencia</th>
                  </tr>
                </thead>
                <tbody className="tabular-nums text-xs">
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-medium text-slate-800">Exactitud Validación Cruzada (5-Fold CV)</td>
                    <td className="py-2.5 px-4 text-right font-mono">{optimization.cvOriginalAccuracy}%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0D9488]">{optimization.cvBestAccuracy}%</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {(optimization.cvBestAccuracy - optimization.cvOriginalAccuracy >= 0 ? '+' : '')}
                      {(optimization.cvBestAccuracy - optimization.cvOriginalAccuracy).toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-medium text-slate-800">Exactitud en Datos de Prueba</td>
                    <td className="py-2.5 px-4 text-right font-mono">{optimization.originalModel.testMetrics.accuracy}%</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0D9488]">{optimization.optimizedModel.testMetrics.accuracy}%</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {(optimization.optimizedModel.testMetrics.accuracy - optimization.originalModel.testMetrics.accuracy >= 0 ? '+' : '')}
                      {(optimization.optimizedModel.testMetrics.accuracy - optimization.originalModel.testMetrics.accuracy).toFixed(2)}%
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-medium text-slate-800">AUC-ROC en Prueba</td>
                    <td className="py-2.5 px-4 text-right font-mono">{optimization.originalModel.testMetrics.aucRoc}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0D9488]">{optimization.optimizedModel.testMetrics.aucRoc}</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {(optimization.optimizedModel.testMetrics.aucRoc - optimization.originalModel.testMetrics.aucRoc >= 0 ? '+' : '')}
                      {(optimization.optimizedModel.testMetrics.aucRoc - optimization.originalModel.testMetrics.aucRoc).toFixed(3)}
                    </td>
                  </tr>
                  <tr className="border-b border-slate-100">
                    <td className="py-2.5 px-4 font-medium text-slate-800">Complejidad (Número de Nodos / Hojas)</td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {optimization.originalModel.nodeCount} / {optimization.originalModel.leafCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0F2A4A]">
                      {optimization.optimizedModel.nodeCount} / {optimization.optimizedModel.leafCount}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono">
                      {optimization.optimizedModel.nodeCount - optimization.originalModel.nodeCount} nodos
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-4 font-medium text-slate-800">Hiperparámetros</td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {optimization.originalModel.params.algorithm} · Prof {optimization.originalModel.params.maxDepth} · α={optimization.originalModel.params.ccpAlpha}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-semibold text-[#0F2A4A]">
                      {optimization.bestParams.algorithm} · Prof {optimization.bestParams.maxDepth} · α={optimization.bestParams.ccpAlpha}
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-500">
                      {optimization.candidatesEvaluated} evaluados
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Side-by-Side Visual Comparison */}
      {optimization && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DecisionTreeCanvas
            root={optimization.originalModel.root}
            positiveClass={optimization.originalModel.positiveClass}
            compact
            title={`Árbol Original (${optimization.originalModel.nodeCount} nodos · Acc: ${optimization.originalModel.testMetrics.accuracy}%)`}
          />
          <DecisionTreeCanvas
            root={optimization.optimizedModel.root}
            positiveClass={optimization.optimizedModel.positiveClass}
            compact
            title={`Árbol Optimizado (${optimization.optimizedModel.nodeCount} nodos · Acc: ${optimization.optimizedModel.testMetrics.accuracy}%)`}
          />
        </div>
      )}

      {/* Module 9: Manual & Automatic Pruning Controls + Complexity Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-[#0D9488]" />
            <h2 className="font-display text-base font-bold text-[#0F2A4A]">
              Poda Manual y Complejidad
            </h2>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
              <label htmlFor="prune-alpha">Complejidad Cost-Complexity (ccp_alpha)</label>
              <span className="font-mono font-bold text-[#0F2A4A]">{params.ccpAlpha.toFixed(3)}</span>
            </div>
            <input
              id="prune-alpha"
              type="range"
              min={0}
              max={0.04}
              step={0.002}
              value={params.ccpAlpha}
              onChange={(e) =>
                onChangeParams({ ...params, ccpAlpha: Number(e.target.value) })
              }
              className="w-full accent-[#0D9488] cursor-pointer"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Aumentar α poda ramas débiles para prevenir sobreajuste y simplificar reglas.
            </p>
          </div>

          <div>
            <div className="flex justify-between text-xs font-medium text-slate-700 mb-1.5">
              <label htmlFor="prune-depth">Límite de Profundidad Máxima</label>
              <span className="font-mono font-bold text-[#0F2A4A]">{params.maxDepth}</span>
            </div>
            <input
              id="prune-depth"
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
          </div>

          <div className="pt-4 border-t border-slate-100 grid grid-cols-3 gap-2 text-center tabular-nums">
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
              <div className="text-[11px] text-slate-500">Complejidad α</div>
              <div className="font-mono text-sm font-bold text-[#0F2A4A]">
                {params.ccpAlpha.toFixed(3)}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
              <div className="text-[11px] text-slate-500">Nodos Activos</div>
              <div className="font-mono text-sm font-bold text-[#0F2A4A]">
                {baseModel.nodeCount}
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded p-2.5">
              <div className="text-[11px] text-slate-500">Precisión Test</div>
              <div className="font-mono text-sm font-bold text-[#0D9488]">
                {baseModel.testMetrics.accuracy}%
              </div>
            </div>
          </div>

          {recommendedPoint && (
            <div className="p-3 bg-[#0D9488]/10 border border-[#0D9488]/30 rounded-md text-xs text-slate-800">
              <span className="font-semibold text-[#0F2A4A]">Recomendación del sistema: </span>
              Podar con α = <span className="font-mono font-bold">{recommendedPoint.ccpAlpha}</span> ({recommendedPoint.nodeCount} nodos, CV {recommendedPoint.cvAccuracy}%).
            </div>
          )}
        </div>

        {/* Complexity vs Accuracy Curve */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-display text-sm font-bold text-[#0F2A4A]">
                Curva Complejidad (α) vs Exactitud y Número de Nodos
              </h3>
              <p className="text-xs text-slate-500">
                Trayectoria de poda CCP mostrando el equilibrio óptimo entre sesgo y varianza
              </p>
            </div>
          </div>

          {optimization ? (
            <>
              <svg viewBox="0 0 580 230" className="w-full h-56 overflow-visible">
                {(() => {
                  const pts = optimization.pruningSweep;
                  const minAcc = Math.max(
                    40,
                    Math.floor(Math.min(...pts.map((p) => p.testAccuracy)) - 6)
                  );
                  const maxAcc = Math.min(
                    100,
                    Math.ceil(Math.max(...pts.map((p) => Math.max(p.trainAccuracy, p.testAccuracy))) + 4)
                  );
                  const accSpan = Math.max(10, maxAcc - minAcc);
                  const plotW = 480;
                  const mapX = (idx: number) =>
                    54 + (idx / Math.max(1, pts.length - 1)) * plotW;
                  const mapY = (acc: number) =>
                    185 - ((acc - minAcc) / accSpan) * 145;

                  const trainPath = pts
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(p.trainAccuracy)}`)
                    .join(' ');
                  const cvPath = pts
                    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(i)} ${mapY(p.cvAccuracy)}`)
                    .join(' ');

                  return (
                    <>
                      {[0, 0.25, 0.5, 0.75, 1].map((g) => {
                        const y = 185 - g * 145;
                        const label = (minAcc + g * accSpan).toFixed(0);
                        return (
                          <g key={g}>
                            <line
                              x1={54}
                              y1={y}
                              x2={534}
                              y2={y}
                              stroke="#E2E8F0"
                              strokeDasharray="3 3"
                            />
                            <text
                              x={46}
                              y={y + 3}
                              textAnchor="end"
                              fontSize={9.5}
                              fontFamily="IBM Plex Mono, monospace"
                              fill="#64748B"
                            >
                              {label}%
                            </text>
                          </g>
                        );
                      })}

                      <path d={trainPath} fill="none" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 3" />
                      <path d={cvPath} fill="none" stroke="#0D9488" strokeWidth={2.5} />

                      {pts.map((p, i) => {
                        const x = mapX(i);
                        const yCv = mapY(p.cvAccuracy);
                        return (
                          <g key={i}>
                            {p.isRecommended && (
                              <line
                                x1={x}
                                y1={32}
                                x2={x}
                                y2={185}
                                stroke="#0F2A4A"
                                strokeDasharray="3 2"
                              />
                            )}
                            <circle
                              cx={x}
                              cy={yCv}
                              r={p.isRecommended ? 5.5 : 3.5}
                              fill={p.isRecommended ? '#0F2A4A' : '#0D9488'}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                            />
                            <text
                              x={x}
                              y={202}
                              textAnchor="middle"
                              fontSize={9}
                              fontFamily="IBM Plex Mono, monospace"
                              fill="#475569"
                            >
                              α={p.ccpAlpha}
                            </text>
                            <text
                              x={x}
                              y={216}
                              textAnchor="middle"
                              fontSize={8.5}
                              fontFamily="IBM Plex Mono, monospace"
                              fill="#94A3B8"
                            >
                              ({p.nodeCount}n)
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
              <div className="flex flex-wrap items-center gap-5 text-[11px] text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#0D9488] inline-block" />
                  Exactitud Validación Cruzada (5-Fold CV)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block" />
                  Exactitud Entrenamiento
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0F2A4A] inline-block" />
                  Punto de Poda Recomendado
                </span>
              </div>
            </>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center bg-slate-50 border border-dashed border-slate-200 rounded-md p-6 text-center">
              <p className="text-xs text-slate-600 max-w-md">
                Haga clic en <span className="font-semibold text-[#0F2A4A]">Ejecutar Optimización Automática</span> para calcular la curva completa de validación cruzada y encontrar el alfa de poda óptimo.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
