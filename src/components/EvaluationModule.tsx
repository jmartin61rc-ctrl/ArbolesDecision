import React, { useState } from 'react';
import { TrainedTreeModel } from '../types/analytics';

interface EvaluationModuleProps {
  currentModel: TrainedTreeModel;
  optimizedModel: TrainedTreeModel | null;
  onNextStep: () => void;
}

export const EvaluationModule: React.FC<EvaluationModuleProps> = ({
  currentModel,
  optimizedModel,
  onNextStep,
}) => {
  const [selectedSource, setSelectedSource] = useState<'current' | 'optimized'>(
    optimizedModel ? 'optimized' : 'current'
  );

  const model =
    selectedSource === 'optimized' && optimizedModel ? optimizedModel : currentModel;
  const metrics = model.testMetrics;
  const cm = metrics.confusionMatrix;

  const rocPath = metrics.rocCurve
    .map((pt, idx) => {
      const x = 44 + pt.fpr * 220;
      const y = 240 - pt.tpr * 210;
      return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const rocAreaPath = `${rocPath} L 264 240 L 44 240 Z`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 10 y Módulo 11 · Validación en Prueba e Importancia Predictiva
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            Evaluación del Modelo e Importancia de Variables
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Resultados calculados exclusivamente sobre el conjunto de prueba ({model.testCount.toLocaleString('es-ES')} registros no vistos durante el entrenamiento).
          </p>
        </div>

        <div className="flex items-center gap-3">
          {optimizedModel && (
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-md">
              <button
                type="button"
                onClick={() => setSelectedSource('current')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  selectedSource === 'current'
                    ? 'bg-white text-[#0F2A4A]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Modelo Actual
              </button>
              <button
                type="button"
                onClick={() => setSelectedSource('optimized')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors ${
                  selectedSource === 'optimized'
                    ? 'bg-white text-[#0D9488]'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Modelo Optimizado
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onNextStep}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <span>Ver Negocio e Insights IA</span>
          </button>
        </div>
      </div>

      {/* 6 Evaluation Metrics KPI Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: 'Accuracy', value: `${metrics.accuracy}%`, sub: 'Exactitud global' },
          { label: 'Precision', value: `${metrics.precision}%`, sub: 'Valor pred. positivo' },
          { label: 'Recall / Sensib.', value: `${metrics.recall}%`, sub: 'Tasa verd. positivos' },
          { label: 'Especificidad', value: `${metrics.specificity}%`, sub: 'Tasa verd. negativos' },
          { label: 'F1 Score', value: `${metrics.f1Score}%`, sub: 'Media armónica' },
          { label: 'AUC-ROC', value: `${metrics.aucRoc}`, sub: 'Área bajo curva ROC' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-slate-200 rounded-lg p-4">
            <div className="text-xs text-slate-500">{kpi.label}</div>
            <div className="font-mono tabular-nums text-xl font-bold text-[#0F2A4A] mt-1">
              {kpi.value}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Confusion Matrix + ROC Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                Matriz de Confusión (Datos de Prueba)
              </h2>
              <p className="text-xs text-slate-500">
                Clase Positiva: "{cm.positiveClass}" · Clase Negativa: "{cm.negativeClass}"
              </p>
            </div>
            <span className="font-mono text-xs text-slate-600 tabular-nums">
              n = {cm.total}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center items-stretch">
            <div />
            <div className="text-xs font-semibold text-slate-600 py-1.5 bg-slate-50 rounded">
              Predicho: {cm.positiveClass}
            </div>
            <div className="text-xs font-semibold text-slate-600 py-1.5 bg-slate-50 rounded">
              Predicho: {cm.negativeClass}
            </div>

            <div className="text-xs font-semibold text-slate-600 flex items-center justify-center bg-slate-50 rounded px-2">
              Real: {cm.positiveClass}
            </div>
            <div className="p-4 rounded-lg bg-[#0D9488]/12 border border-[#0D9488]/40">
              <div className="text-[11px] font-semibold text-[#0F766E]">
                VP (Verdadero Positivo)
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0F2A4A] mt-1">
                {cm.vp}
              </div>
              <div className="text-[11px] text-slate-600 tabular-nums">
                {((cm.vp / Math.max(1, cm.total)) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="text-[11px] font-semibold text-amber-800">
                FN (Falso Negativo)
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-amber-900 mt-1">
                {cm.fn}
              </div>
              <div className="text-[11px] text-amber-700 tabular-nums">
                {((cm.fn / Math.max(1, cm.total)) * 100).toFixed(1)}%
              </div>
            </div>

            <div className="text-xs font-semibold text-slate-600 flex items-center justify-center bg-slate-50 rounded px-2">
              Real: {cm.negativeClass}
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-200">
              <div className="text-[11px] font-semibold text-red-800">
                FP (Falso Positivo)
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-red-900 mt-1">
                {cm.fp}
              </div>
              <div className="text-[11px] text-red-700 tabular-nums">
                {((cm.fp / Math.max(1, cm.total)) * 100).toFixed(1)}%
              </div>
            </div>
            <div className="p-4 rounded-lg bg-[#0F2A4A]/8 border border-[#0F2A4A]/25">
              <div className="text-[11px] font-semibold text-[#0F2A4A]">
                VN (Verdadero Negativo)
              </div>
              <div className="font-mono tabular-nums text-2xl font-bold text-[#0F2A4A] mt-1">
                {cm.vn}
              </div>
              <div className="text-[11px] text-slate-600 tabular-nums">
                {((cm.vn / Math.max(1, cm.total)) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>

        {/* ROC Curve SVG */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                Curva ROC y Capacidad Discriminativa
              </h2>
              <p className="text-xs text-slate-500">
                Relación Sensibilidad (TPR) vs Tasa de Falsos Positivos (FPR)
              </p>
            </div>
            <div className="font-mono tabular-nums text-sm font-bold text-[#0D9488]">
              AUC = {metrics.aucRoc}
            </div>
          </div>

          <svg viewBox="0 0 300 270" className="w-full max-w-md mx-auto h-60">
            {/* Axes & Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((v) => {
              const x = 44 + v * 220;
              const y = 240 - v * 210;
              return (
                <g key={v}>
                  <line x1={44} y1={y} x2={264} y2={y} stroke="#E2E8F0" strokeDasharray="2 2" />
                  <line x1={x} y1={30} x2={x} y2={240} stroke="#E2E8F0" strokeDasharray="2 2" />
                  <text
                    x={38}
                    y={y + 3}
                    textAnchor="end"
                    fontSize={9}
                    fontFamily="IBM Plex Mono, monospace"
                    fill="#64748B"
                  >
                    {v.toFixed(2)}
                  </text>
                  <text
                    x={x}
                    y={254}
                    textAnchor="middle"
                    fontSize={9}
                    fontFamily="IBM Plex Mono, monospace"
                    fill="#64748B"
                  >
                    {v.toFixed(2)}
                  </text>
                </g>
              );
            })}

            {/* Random Baseline */}
            <line
              x1={44}
              y1={240}
              x2={264}
              y2={30}
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth={1.5}
            />

            {/* Area & Curve */}
            <path d={rocAreaPath} fill="#0D9488" fillOpacity={0.14} />
            <path d={rocPath} fill="none" stroke="#0D9488" strokeWidth={2.5} />

            <text x={154} y={268} textAnchor="middle" fontSize={10} fill="#475569">
              1 − Especificidad (FPR)
            </text>
          </svg>
        </div>
      </div>

      {/* Automatic Metric Interpretations */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200">
          <h2 className="font-display text-sm font-bold text-[#0F2A4A]">
            Interpretación Automática de Métricas de Evaluación
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Métrica</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Valor</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Diagnóstico</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Interpretación Ejecutiva</th>
              </tr>
            </thead>
            <tbody>
              {metrics.interpretations.map((item) => (
                <tr key={item.metric} className="border-b border-slate-100">
                  <td className="py-2.5 px-4 text-xs font-semibold text-[#0F2A4A] whitespace-nowrap">
                    {item.metric}
                  </td>
                  <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-right font-bold text-slate-900">
                    {item.valueLabel}
                  </td>
                  <td className="py-2.5 px-4 text-xs font-semibold whitespace-nowrap">
                    <span
                      className={
                        item.status === 'Óptimo'
                          ? 'text-emerald-700'
                          : item.status === 'Aceptable'
                          ? 'text-amber-700'
                          : 'text-red-700'
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-slate-700">{item.explanation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Module 11: Feature Importance Ranking */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="mb-4">
          <h2 className="font-display text-base font-bold text-[#0F2A4A]">
            Módulo 11 · Ranking de Importancia de Variables
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Contribución porcentual de cada variable en la reducción acumulada de impureza del árbol
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Interactive Horizontal Bars */}
          <div className="space-y-3">
            {model.featureImportance.map((item, idx) => (
              <div key={item.variable}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800">
                    {idx + 1}. {item.variable}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-[#0F2A4A]">
                    {item.importancePct}%
                  </span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${item.importancePct}%`,
                      backgroundColor: idx === 0 ? '#0D9488' : '#0F2A4A',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Ranking Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Variable</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Importancia</th>
                  <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Cortes en Árbol</th>
                </tr>
              </thead>
              <tbody>
                {model.featureImportance.map((item) => (
                  <tr key={item.variable} className="border-b border-slate-100">
                    <td className="py-2 px-4 text-xs font-medium text-slate-800">
                      {item.variable}
                    </td>
                    <td className="py-2 px-4 text-xs font-mono tabular-nums text-right font-bold text-[#0D9488]">
                      {item.importancePct}%
                    </td>
                    <td className="py-2 px-4 text-xs font-mono tabular-nums text-right text-slate-600">
                      {item.splitsCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
