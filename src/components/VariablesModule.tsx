import React from 'react';
import { CheckCircle2, Info, Target } from 'lucide-react';
import { ColumnType, Dataset } from '../types/analytics';

interface VariablesModuleProps {
  dataset: Dataset;
  targetColumn: string;
  positiveClass: string;
  onReclassifyColumn: (colName: string, newType: ColumnType) => void;
  onSelectTarget: (colName: string, positiveClass: string) => void;
  onNextStep: () => void;
}

export const VariablesModule: React.FC<VariablesModuleProps> = ({
  dataset,
  targetColumn,
  positiveClass,
  onReclassifyColumn,
  onSelectTarget,
  onNextStep,
}) => {
  const selectedCandidate =
    dataset.targetCandidates.find((c) => c.column === targetColumn) ||
    dataset.targetCandidates[0];

  const targetColProfile = dataset.columns.find((c) => c.name === targetColumn);
  const availableLevels = targetColProfile?.levels || selectedCandidate?.uniqueValues || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 3 y Módulo 4 · Tipificación y Variable Dependiente
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            Identificación de Variables y Selección de Variable Objetivo
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Revise la clasificación automática entre variables numéricas, categóricas y factores, reclasifique manualmente si lo requiere y defina la variable objetivo del árbol de decisión.
          </p>
        </div>

        <button
          type="button"
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <span>Continuar a Análisis Exploratorio</span>
        </button>
      </div>

      {/* Module 4: Target Selection */}
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-[#0D9488] shrink-0 mt-0.5" />
          <div className="flex-1">
            <h2 className="font-display text-base font-bold text-[#0F2A4A]">
              ¿Cuál será la variable objetivo para el análisis?
            </h2>
            <p className="text-xs text-slate-600 mt-1">
              El sistema evaluó la cardinalidad y estructura de todas las variables para identificar candidatas óptimas de clasificación supervisada.
            </p>

            <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Target Selector List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-slate-700">
                  Opciones de Variable Objetivo
                </div>
                {dataset.targetCandidates.map((cand) => {
                  const isSelected = cand.column === targetColumn;
                  return (
                    <button
                      key={cand.column}
                      type="button"
                      onClick={() => onSelectTarget(cand.column, cand.positiveClass)}
                      className={`w-full text-left p-3 rounded-md border transition-colors ${
                        isSelected
                          ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">{cand.column}</span>
                        {cand.isRecommended && (
                          <span
                            className={`text-[11px] font-semibold ${
                              isSelected ? 'text-[#2DD4BF]' : 'text-[#0D9488]'
                            }`}
                          >
                            Sugerida
                          </span>
                        )}
                      </div>
                      <div
                        className={`text-[11px] mt-1 tabular-nums ${
                          isSelected ? 'text-slate-300' : 'text-slate-500'
                        }`}
                      >
                        Clases: {cand.uniqueValues.slice(0, 3).join(', ')} · Positiva:{' '}
                        {cand.positivePct}%
                      </div>
                    </button>
                  );
                })}

                {/* Manual override dropdown for any column */}
                <div className="pt-2">
                  <label
                    htmlFor="manual-target-select"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    O elegir otra columna manualmente:
                  </label>
                  <select
                    id="manual-target-select"
                    value={targetColumn}
                    onChange={(e) => {
                      const col = dataset.columns.find((c) => c.name === e.target.value);
                      const firstPos = col?.levels?.[0] || 'Sí';
                      onSelectTarget(e.target.value, firstPos);
                    }}
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                  >
                    {dataset.columns
                      .filter((c) => c.uniqueCount >= 2 && c.uniqueCount <= 15)
                      .map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name} ({c.uniqueCount} niveles)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Target Rationale, Advantages & Business Impact */}
              <div className="lg:col-span-2 bg-slate-50 border border-slate-200 rounded-lg p-5 flex flex-col justify-between">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">Variable Seleccionada</div>
                      <div className="font-display text-lg font-bold text-[#0F2A4A]">
                        {targetColumn}
                      </div>
                    </div>

                    {availableLevels.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label
                          htmlFor="positive-class-select"
                          className="text-xs font-medium text-slate-700"
                        >
                          Clase Positiva (Evento de Interés):
                        </label>
                        <select
                          id="positive-class-select"
                          value={positiveClass}
                          onChange={(e) => onSelectTarget(targetColumn, e.target.value)}
                          className="px-2.5 py-1.5 text-xs font-semibold bg-white border border-slate-300 rounded-md text-[#0F2A4A] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                        >
                          {availableLevels.map((lvl) => (
                            <option key={lvl} value={lvl}>
                              {lvl}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  {selectedCandidate && (
                    <div className="mt-4 space-y-4">
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {selectedCandidate.reason}
                      </p>

                      <div>
                        <div className="text-xs font-semibold text-slate-900 mb-1.5">
                          Ventajas Técnicas y Analíticas
                        </div>
                        <ul className="space-y-1.5">
                          {selectedCandidate.advantages.map((adv, idx) => (
                            <li
                              key={idx}
                              className="flex items-start gap-2 text-xs text-slate-700"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0D9488] shrink-0 mt-0.5" />
                              <span>{adv}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-3 border-t border-slate-200">
                        <div className="text-xs font-semibold text-[#0F2A4A] mb-1">
                          Impacto en el Negocio
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">
                          {selectedCandidate.businessImpact}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Module 3: Variable Classification & Manual Reclassification */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base font-bold text-[#0F2A4A]">
              Clasificación Automática y Reclasificación Manual de Variables
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Numéricas ({dataset.columns.filter((c) => c.type === 'numeric').length}) · Factores ({dataset.columns.filter((c) => c.type === 'factor').length}) · Categóricas ({dataset.columns.filter((c) => c.type === 'categorical').length})
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="w-3.5 h-3.5" />
            <span>Cambiar el tipo recalcula EDA y reglas del árbol</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Variable</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Rol</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Tipo Detectado</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Reclasificar Tipo</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Únicos</th>
                <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Niveles Detectados / Muestra</th>
              </tr>
            </thead>
            <tbody>
              {dataset.columns.map((col) => {
                const isTarget = col.name === targetColumn;
                return (
                  <tr
                    key={col.name}
                    className={`border-b border-slate-100 hover:bg-slate-50/70 transition-colors ${
                      isTarget ? 'bg-[#0D9488]/5' : ''
                    }`}
                  >
                    <td className="py-2.5 px-4 text-xs font-semibold text-[#0F2A4A] whitespace-nowrap">
                      {col.name}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      {isTarget ? (
                        <span className="font-semibold text-[#0D9488]">Variable Objetivo</span>
                      ) : (
                        <span className="text-slate-500">Predictora</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                      {col.detectedType === 'numeric'
                        ? 'Numérica'
                        : col.detectedType === 'factor'
                        ? 'Factor'
                        : 'Categórica'}
                    </td>
                    <td className="py-2.5 px-4 text-xs whitespace-nowrap">
                      <select
                        aria-label={`Tipo de ${col.name}`}
                        value={col.type}
                        onChange={(e) =>
                          onReclassifyColumn(col.name, e.target.value as ColumnType)
                        }
                        className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
                      >
                        <option value="numeric">Numérica</option>
                        <option value="factor">Factor</option>
                        <option value="categorical">Categórica</option>
                      </select>
                    </td>
                    <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-right text-slate-700">
                      {col.uniqueCount}
                    </td>
                    <td className="py-2.5 px-4 text-xs text-slate-600 max-w-md truncate">
                      {col.levels && col.levels.length > 0
                        ? col.levels.slice(0, 6).join(' · ') +
                          (col.levels.length > 6 ? ` (+${col.levels.length - 6})` : '')
                        : col.sampleValues.join(' · ')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
