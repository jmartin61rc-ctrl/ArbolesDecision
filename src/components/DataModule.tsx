import React, { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { Dataset, SectorKey } from '../types/analytics';
import { SECTORS } from '../ml/syntheticDatasets';

interface DataModuleProps {
  dataset: Dataset | null;
  selectedSector: SectorKey;
  onSelectSector: (sector: SectorKey) => void;
  onUploadFile: (file: File) => Promise<void>;
  onGenerateSynthetic: (sector: SectorKey, rowCount: number) => void;
  onCleanDataset: () => void;
  onNextStep: () => void;
  uploadInputRef: React.RefObject<HTMLInputElement | null>;
}

export const DataModule: React.FC<DataModuleProps> = ({
  dataset,
  selectedSector,
  onSelectSector,
  onUploadFile,
  onGenerateSynthetic,
  onCleanDataset,
  onNextStep,
  uploadInputRef,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syntheticRows, setSyntheticRows] = useState<number>(1200);
  const localInputRef = useRef<HTMLInputElement | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    setLoading(true);
    try {
      await onUploadFile(files[0]);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error ? err.message : 'No fue posible procesar el archivo cargado.'
      );
    } finally {
      setLoading(false);
    }
  };

  const activeInputRef = uploadInputRef || localInputRef;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 1 y Módulo 2 · Ingesta y Calidad
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            Carga de Datos y Generación de Dataset de Prueba
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Cargue su archivo empresarial (CSV, Excel, TXT o TSV) para auditoría automática de calidad, o genere un dataset sintético sectorial con más de 1.000 registros.
          </p>
        </div>
        {dataset && (
          <button
            type="button"
            onClick={onNextStep}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <span>Continuar a Variables y Objetivo</span>
          </button>
        )}
      </div>

      {/* Two-Column Input Panel: Upload + Synthetic Sector Prompt */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        {/* Module 1: File Upload */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                1. Cargar Archivo de Datos
              </h2>
              <span className="text-xs text-slate-500 font-mono">
                CSV · XLSX · XLS · TXT · TSV
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1">
              Detección automática de delimitadores, tipos de variable, valores nulos, duplicados e inconsistencias.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => activeInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') activeInputRef.current?.click();
              }}
              className={`mt-4 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragging
                  ? 'border-[#0D9488] bg-[#0D9488]/5'
                  : 'border-slate-300 hover:border-[#0F2A4A] bg-slate-50/70'
              }`}
            >
              <UploadCloud className="w-8 h-8 text-[#0F2A4A] mx-auto mb-3" />
              <div className="text-sm font-semibold text-slate-900">
                {loading
                  ? 'Procesando archivo y auditando calidad...'
                  : 'Arrastre su archivo aquí o haga clic para seleccionar'}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Formatos admitidos: .csv, .xlsx, .xls, .txt, .tsv
              </div>
              <input
                ref={activeInputRef}
                type="file"
                accept=".csv,.xlsx,.xls,.txt,.tsv"
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>

            {errorMsg && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Procesamiento local seguro en memoria</span>
            <FileSpreadsheet className="w-4 h-4 text-slate-400" />
          </div>
        </div>

        {/* Module 2: Synthetic Dataset Question & Generator */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                2. Dataset de Prueba Sintético
              </h2>
              <span className="text-xs text-[#0D9488] font-semibold">
                Mínimo 1.000 registros
              </span>
            </div>
            <p className="text-sm font-semibold text-slate-800 mt-3">
              ¿A qué sector pertenece el análisis?
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              Seleccione el dominio empresarial para generar variables numéricas, categóricas y variable objetivo correlacionadas.
            </p>

            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {SECTORS.map((sec) => {
                const active = selectedSector === sec.key;
                return (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => onSelectSector(sec.key)}
                    className={`px-3 py-2 text-xs font-medium rounded-md border text-left transition-colors truncate ${
                      active
                        ? 'bg-[#0F2A4A] text-white border-[#0F2A4A]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sec.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-700 mb-1">
                  <span className="font-medium">Tamaño del dataset</span>
                  <span className="font-mono tabular-nums font-semibold">
                    {syntheticRows.toLocaleString('es-ES')} registros
                  </span>
                </div>
                <input
                  type="range"
                  min={1000}
                  max={5000}
                  step={200}
                  value={syntheticRows}
                  onChange={(e) => setSyntheticRows(Number(e.target.value))}
                  className="w-full accent-[#0D9488] cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={() => onGenerateSynthetic(selectedSector, syntheticRows)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generar Dataset</span>
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            {SECTORS.find((s) => s.key === selectedSector)?.shortDesc}
          </div>
        </div>
      </div>

      {/* Dataset Overview & Quality Audit */}
      {dataset && (
        <>
          {/* KPI Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Registros Totales</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#0F2A4A] mt-1">
                {dataset.quality.totalRows.toLocaleString('es-ES')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {dataset.fileFormat || 'Sintético'}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Variables</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#0F2A4A] mt-1">
                {dataset.quality.totalColumns}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {dataset.columns.filter((c) => c.type === 'numeric').length} num ·{' '}
                {dataset.columns.filter((c) => c.type !== 'numeric').length} cat/factor
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Valores Nulos</div>
              <div
                className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                  dataset.quality.totalNulls > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                {dataset.quality.totalNulls.toLocaleString('es-ES')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1 tabular-nums">
                {dataset.quality.nullPct}% de celdas
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Filas Duplicadas</div>
              <div
                className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                  dataset.quality.duplicateRows > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                {dataset.quality.duplicateRows.toLocaleString('es-ES')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Registros idénticos
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Inconsistencias</div>
              <div
                className={`font-mono tabular-nums text-xl font-bold mt-1 ${
                  dataset.quality.inconsistencyCount > 0 ? 'text-amber-600' : 'text-emerald-700'
                }`}
              >
                {dataset.quality.inconsistencyCount.toLocaleString('es-ES')}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Tipos / Atípicos / Caso
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="text-xs text-slate-500">Calidad Global</div>
              <div className="font-mono tabular-nums text-xl font-bold text-[#0D9488] mt-1">
                {dataset.quality.completenessScore}%
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Índice de integridad
              </div>
            </div>
          </div>

          {/* Quality Action & Inconsistency Details */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              {dataset.quality.totalNulls > 0 || dataset.quality.duplicateRows > 0 ? (
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Validación de Calidad de Datos
                </h3>
                <p className="text-xs text-slate-600 mt-0.5">
                  {dataset.quality.totalNulls > 0 || dataset.quality.duplicateRows > 0
                    ? `Se detectaron ${dataset.quality.totalNulls} valores nulos y ${dataset.quality.duplicateRows} duplicados. Puede limpiarlos automáticamente (mediana/moda y deduplicación) antes de modelar.`
                    : 'El dataset está libre de valores nulos y registros duplicados, listo para análisis exploratorio y modelado.'}
                </p>
                {dataset.quality.inconsistencies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                    {dataset.quality.inconsistencies.slice(0, 4).map((inc, idx) => (
                      <span key={idx} className="font-mono">
                        {inc.column}: {inc.issue} ({inc.count})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {(dataset.quality.totalNulls > 0 || dataset.quality.duplicateRows > 0) && (
              <button
                type="button"
                onClick={onCleanDataset}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#0F2A4A] bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpiar Duplicados e Imputar Nulos</span>
              </button>
            )}
          </div>

          {/* First 5 Records Table */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-display text-sm font-bold text-[#0F2A4A]">
                  Vista Previa: Primeros 5 Registros
                </h3>
                <p className="text-xs text-slate-500">
                  {dataset.name} · Mostrando 5 de {dataset.quality.totalRows.toLocaleString('es-ES')} filas
                </p>
              </div>
              <Database className="w-4 h-4 text-slate-400" />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-600 w-10">#</th>
                    {dataset.columns.map((col) => (
                      <th
                        key={col.name}
                        className={`py-2.5 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap ${
                          col.type === 'numeric' ? 'text-right' : 'text-left'
                        }`}
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dataset.rows.slice(0, 5).map((row, idx) => (
                    <tr
                      key={idx}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2 px-3 text-xs font-mono text-slate-400 tabular-nums">
                        {idx + 1}
                      </td>
                      {dataset.columns.map((col) => {
                        const val = row[col.name];
                        const isNull = val === null || val === undefined || val === '';
                        return (
                          <td
                            key={col.name}
                            className={`py-2 px-3 text-xs whitespace-nowrap ${
                              col.type === 'numeric'
                                ? 'text-right font-mono tabular-nums'
                                : 'text-left'
                            } ${isNull ? 'text-amber-600 italic' : 'text-slate-800'}`}
                          >
                            {isNull ? 'Nulo' : String(val)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Data Dictionary */}
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200">
              <h3 className="font-display text-sm font-bold text-[#0F2A4A]">
                Diccionario de Datos
              </h3>
              <p className="text-xs text-slate-500">
                Definición estructural, tipo detectado y cobertura de cada variable
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Variable</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Tipo Detectado</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Valores Únicos</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700 text-right">Nulos</th>
                    <th className="py-2.5 px-4 text-xs font-semibold text-slate-700">Descripción y Ejemplos</th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.columns.map((col) => (
                    <tr
                      key={col.name}
                      className="border-b border-slate-100 hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-4 text-xs font-semibold text-[#0F2A4A] whitespace-nowrap">
                        {col.name}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-700 whitespace-nowrap">
                        {col.type === 'numeric'
                          ? 'Numérica'
                          : col.type === 'factor'
                          ? 'Factor'
                          : 'Categórica'}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-right text-slate-700">
                        {col.uniqueCount}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-mono tabular-nums text-right text-slate-700">
                        {col.nullCount} ({col.nullPct}%)
                      </td>
                      <td className="py-2.5 px-4 text-xs text-slate-600">
                        {col.description || `Ejemplos: ${col.sampleValues.join(', ')}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
