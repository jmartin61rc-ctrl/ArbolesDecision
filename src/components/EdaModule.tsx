import React, { useMemo, useState } from 'react';
import { Dataset } from '../types/analytics';
import {
  computeCategoricalStats,
  computeCorrelationMatrix,
  computeNumericStats,
} from '../ml/edaEngine';

interface EdaModuleProps {
  dataset: Dataset;
  targetColumn: string;
  positiveClass: string;
  onNextStep: () => void;
}

const CHART_COLORS = ['#0F2A4A', '#0D9488', '#2563EB', '#475569', '#0EA5E9', '#64748B', '#14B8A6'];

export const EdaModule: React.FC<EdaModuleProps> = ({
  dataset,
  targetColumn,
  positiveClass,
  onNextStep,
}) => {
  const numericCols = useMemo(
    () => dataset.columns.filter((c) => c.type === 'numeric'),
    [dataset.columns]
  );
  const categoricalCols = useMemo(
    () => dataset.columns.filter((c) => c.type !== 'numeric'),
    [dataset.columns]
  );

  const [selectedNumCol, setSelectedNumCol] = useState<string>(
    numericCols[0]?.name || ''
  );
  const [selectedCatCol, setSelectedCatCol] = useState<string>(
    categoricalCols[0]?.name || ''
  );
  const [catChartType, setCatChartType] = useState<'bar' | 'pie' | 'pareto'>('bar');
  const [hoverBinIdx, setHoverBinIdx] = useState<number | null>(null);
  const [hoverCorr, setHoverCorr] = useState<{ i: number; j: number; r: number } | null>(null);

  const activeNumCol = numericCols.some((c) => c.name === selectedNumCol)
    ? selectedNumCol
    : numericCols[0]?.name || '';
  const activeCatCol = categoricalCols.some((c) => c.name === selectedCatCol)
    ? selectedCatCol
    : categoricalCols[0]?.name || '';

  const numStats = useMemo(
    () => (activeNumCol ? computeNumericStats(dataset.rows, activeNumCol) : null),
    [dataset.rows, activeNumCol]
  );

  const catStats = useMemo(
    () => (activeCatCol ? computeCategoricalStats(dataset.rows, activeCatCol) : null),
    [dataset.rows, activeCatCol]
  );

  const corrMatrix = useMemo(
    () =>
      computeCorrelationMatrix(
        dataset.rows,
        dataset.columns,
        targetColumn,
        positiveClass
      ),
    [dataset.rows, dataset.columns, targetColumn, positiveClass]
  );

  const fmt = (n: number) =>
    Math.abs(n) >= 100
      ? n.toLocaleString('es-ES', { maximumFractionDigits: 1 })
      : n.toLocaleString('es-ES', { maximumFractionDigits: 2 });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 5 · Estadística Descriptiva y Distribuciones
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            Análisis Exploratorio de Datos (EDA)
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Inspeccione medidas de tendencia central, dispersión, cuartiles, histogramas con curvas de densidad, boxplots, diagramas de Pareto y matriz de correlación.
          </p>
        </div>

        <button
          type="button"
          onClick={onNextStep}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0D9488] hover:bg-[#0F766E] rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          <span>Continuar a Entrenamiento del Árbol</span>
        </button>
      </div>

      {/* SECTION A: Numeric Variables EDA */}
      {numericCols.length > 0 && numStats && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                Variables Numéricas: Distribución y Dispersión
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Histograma de frecuencias, curva de densidad gaussiana (KDE) y diagrama de caja (Boxplot)
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="eda-num-select" className="text-xs font-medium text-slate-600">
                Variable:
              </label>
              <select
                id="eda-num-select"
                value={activeNumCol}
                onChange={(e) => setSelectedNumCol(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-[#0F2A4A] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              >
                {numericCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 10 Descriptive Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Media', value: fmt(numStats.mean) },
              { label: 'Mediana (Q2)', value: fmt(numStats.median) },
              { label: 'Moda', value: fmt(numStats.mode) },
              { label: 'Desv. Estándar', value: fmt(numStats.stdDev) },
              { label: 'Rango', value: fmt(numStats.range) },
              { label: 'Mínimo', value: fmt(numStats.min) },
              { label: 'Cuartil 1 (Q1)', value: fmt(numStats.q1) },
              { label: 'Cuartil 3 (Q3)', value: fmt(numStats.q3) },
              { label: 'Máximo', value: fmt(numStats.max) },
              { label: 'Atípicos (1.5 IQR)', value: String(numStats.outliersCount) },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-slate-50 border border-slate-200/80 rounded-md px-3 py-2.5"
              >
                <div className="text-[11px] text-slate-500">{stat.label}</div>
                <div className="font-mono tabular-nums text-sm font-bold text-[#0F2A4A] mt-0.5">
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Visualizations: Histogram + Density & Boxplot */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Histogram + KDE Density SVG */}
            <div className="lg:col-span-2 border border-slate-200 rounded-lg p-4 bg-[#F8FAFC]">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs font-semibold text-slate-800">
                  Histograma y Curva de Densidad — {numStats.column}
                </div>
                {hoverBinIdx !== null && numStats.histogram[hoverBinIdx] && (
                  <div className="text-xs font-mono tabular-nums text-[#0F2A4A]">
                    [{fmt(numStats.histogram[hoverBinIdx].binStart)} –{' '}
                    {fmt(numStats.histogram[hoverBinIdx].binEnd)}]:{' '}
                    {numStats.histogram[hoverBinIdx].count} reg.
                  </div>
                )}
              </div>

              <svg viewBox="0 0 600 220" className="w-full h-52 overflow-visible">
                {/* Grid lines */}
                {[0.25, 0.5, 0.75, 1].map((g) => (
                  <line
                    key={g}
                    x1={42}
                    y1={185 - g * 155}
                    x2={585}
                    y2={185 - g * 155}
                    stroke="#E2E8F0"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Bars */}
                {(() => {
                  const maxCount = Math.max(
                    1,
                    ...numStats.histogram.map((b) => b.count)
                  );
                  const barAreaW = 540;
                  const barW = barAreaW / Math.max(1, numStats.histogram.length);

                  const maxDens = Math.max(
                    1e-6,
                    ...numStats.densityCurve.map((d) => d.y)
                  );
                  const minX = numStats.min;
                  const rangeX = Math.max(1e-6, numStats.max - numStats.min);

                  const densityPath = numStats.densityCurve
                    .map((pt, idx) => {
                      const px = 42 + ((pt.x - minX) / rangeX) * barAreaW;
                      const py = 185 - (pt.y / maxDens) * 145;
                      return `${idx === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`;
                    })
                    .join(' ');

                  return (
                    <>
                      {numStats.histogram.map((b, idx) => {
                        const h = (b.count / maxCount) * 150;
                        const x = 42 + idx * barW + 2;
                        const y = 185 - h;
                        const isHover = hoverBinIdx === idx;
                        return (
                          <g
                            key={idx}
                            onMouseEnter={() => setHoverBinIdx(idx)}
                            onMouseLeave={() => setHoverBinIdx(null)}
                            className="cursor-pointer"
                          >
                            <rect
                              x={x}
                              y={y}
                              width={Math.max(4, barW - 4)}
                              height={h}
                              rx={2}
                              fill={isHover ? '#0D9488' : '#0F2A4A'}
                              fillOpacity={isHover ? 0.9 : 0.78}
                            />
                            {idx % 2 === 0 && (
                              <text
                                x={x + barW / 2}
                                y={202}
                                textAnchor="middle"
                                fontSize={9.5}
                                fontFamily="IBM Plex Mono, monospace"
                                fill="#64748B"
                              >
                                {b.label}
                              </text>
                            )}
                          </g>
                        );
                      })}
                      {/* KDE Overlay */}
                      <path
                        d={densityPath}
                        fill="none"
                        stroke="#0D9488"
                        strokeWidth={2.5}
                      />
                      {/* Y axis labels */}
                      <text
                        x={36}
                        y={188}
                        textAnchor="end"
                        fontSize={9.5}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#64748B"
                      >
                        0
                      </text>
                      <text
                        x={36}
                        y={38}
                        textAnchor="end"
                        fontSize={9.5}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#64748B"
                      >
                        {maxCount}
                      </text>
                    </>
                  );
                })()}
              </svg>
              <div className="flex items-center gap-4 text-[11px] text-slate-600 mt-1">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-2.5 bg-[#0F2A4A] inline-block rounded-xs" />
                  Histograma (Frecuencia)
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#0D9488] inline-block" />
                  Densidad KDE
                </span>
              </div>
            </div>

            {/* Boxplot SVG */}
            <div className="border border-slate-200 rounded-lg p-4 bg-[#F8FAFC] flex flex-col justify-between">
              <div className="text-xs font-semibold text-slate-800">
                Diagrama de Caja (Boxplot)
              </div>
              <svg viewBox="0 0 280 180" className="w-full h-44">
                {(() => {
                  const span = Math.max(1e-6, numStats.max - numStats.min);
                  const mapX = (val: number) => 24 + ((val - numStats.min) / span) * 232;
                  const xLw = mapX(numStats.lowerWhisker);
                  const xQ1 = mapX(numStats.q1);
                  const xMed = mapX(numStats.median);
                  const xQ3 = mapX(numStats.q3);
                  const xUw = mapX(numStats.upperWhisker);
                  const xMean = mapX(numStats.mean);

                  return (
                    <>
                      {/* Axis line */}
                      <line x1={24} y1={142} x2={256} y2={142} stroke="#CBD5E1" />
                      {/* Whiskers */}
                      <line
                        x1={xLw}
                        y1={82}
                        x2={xQ1}
                        y2={82}
                        stroke="#0F2A4A"
                        strokeWidth={2}
                      />
                      <line
                        x1={xQ3}
                        y1={82}
                        x2={xUw}
                        y2={82}
                        stroke="#0F2A4A"
                        strokeWidth={2}
                      />
                      <line x1={xLw} y1={66} x2={xLw} y2={98} stroke="#0F2A4A" strokeWidth={2} />
                      <line x1={xUw} y1={66} x2={xUw} y2={98} stroke="#0F2A4A" strokeWidth={2} />

                      {/* IQR Box */}
                      <rect
                        x={xQ1}
                        y={52}
                        width={Math.max(4, xQ3 - xQ1)}
                        height={60}
                        rx={3}
                        fill="#0D9488"
                        fillOpacity={0.2}
                        stroke="#0D9488"
                        strokeWidth={2}
                      />
                      {/* Median line */}
                      <line x1={xMed} y1={52} x2={xMed} y2={112} stroke="#0F2A4A" strokeWidth={2.5} />
                      {/* Mean diamond */}
                      <circle cx={xMean} cy={82} r={4} fill="#D97706" />

                      {/* Labels */}
                      <text
                        x={xLw}
                        y={158}
                        textAnchor="middle"
                        fontSize={9}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#64748B"
                      >
                        {fmt(numStats.lowerWhisker)}
                      </text>
                      <text
                        x={xMed}
                        y={42}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontWeight={600}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#0F2A4A"
                      >
                        Med: {fmt(numStats.median)}
                      </text>
                      <text
                        x={xUw}
                        y={158}
                        textAnchor="middle"
                        fontSize={9}
                        fontFamily="IBM Plex Mono, monospace"
                        fill="#64748B"
                      >
                        {fmt(numStats.upperWhisker)}
                      </text>
                    </>
                  );
                })()}
              </svg>
              <div className="text-[11px] text-slate-600 tabular-nums space-y-0.5">
                <div>
                  Rango Intercuartílico (IQR):{' '}
                  <span className="font-mono font-semibold text-slate-900">{fmt(numStats.iqr)}</span>
                </div>
                <div>
                  Punto ámbar: Media ({fmt(numStats.mean)}) · Línea central: Mediana
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* SECTION B: Categorical Variables EDA */}
      {categoricalCols.length > 0 && catStats && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                Variables Categóricas y Factores: Frecuencias y Pareto
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Frecuencia absoluta, relativa, participación porcentual y curva acumulada
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                aria-label="Variable categórica"
                value={activeCatCol}
                onChange={(e) => setSelectedCatCol(e.target.value)}
                className="px-3 py-1.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-md text-[#0F2A4A] focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
              >
                {categoricalCols.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-md">
                {(
                  [
                    { id: 'bar', label: 'Barras' },
                    { id: 'pie', label: 'Circular' },
                    { id: 'pareto', label: 'Pareto' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCatChartType(tab.id)}
                    className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                      catChartType === tab.id
                        ? 'bg-white text-[#0F2A4A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Frequency Table */}
            <div className="overflow-x-auto border border-slate-200 rounded-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700">Categoría</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700 text-right">Frec. Abs.</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700 text-right">Frec. Rel.</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700 text-right">Part. %</th>
                    <th className="py-2.5 px-3 text-xs font-semibold text-slate-700 text-right">Acum. %</th>
                  </tr>
                </thead>
                <tbody>
                  {catStats.frequencies.slice(0, 10).map((f, idx) => (
                    <tr key={f.category} className="border-b border-slate-100">
                      <td className="py-2 px-3 text-xs font-medium text-slate-800 flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="truncate max-w-[160px]">{f.category}</span>
                      </td>
                      <td className="py-2 px-3 text-xs font-mono tabular-nums text-right text-slate-700">
                        {f.count.toLocaleString('es-ES')}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono tabular-nums text-right text-slate-600">
                        {f.relativeFreq.toFixed(3)}
                      </td>
                      <td className="py-2 px-3 text-xs font-mono tabular-nums text-right font-semibold text-[#0F2A4A]">
                        {f.percentage}%
                      </td>
                      <td className="py-2 px-3 text-xs font-mono tabular-nums text-right text-[#0D9488]">
                        {f.cumulativePct}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chart View: Bar / Pie / Pareto */}
            <div className="border border-slate-200 rounded-lg p-4 bg-[#F8FAFC]">
              {catChartType === 'bar' && (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-slate-800">
                    Distribución por Categoría — {catStats.column}
                  </div>
                  <div className="space-y-2.5">
                    {catStats.frequencies.slice(0, 8).map((f, idx) => (
                      <div key={f.category}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium text-slate-800 truncate">
                            {f.category}
                          </span>
                          <span className="font-mono tabular-nums text-slate-700">
                            {f.count} ({f.percentage}%)
                          </span>
                        </div>
                        <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${f.percentage}%`,
                              backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catChartType === 'pie' && (
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
                  <svg viewBox="0 0 200 200" className="w-48 h-48 shrink-0">
                    {(() => {
                      let startAngle = -Math.PI / 2;
                      const slices = catStats.frequencies.slice(0, 7);
                      return slices.map((f, idx) => {
                        const angle = (f.percentage / 100) * Math.PI * 2;
                        const endAngle = startAngle + angle;
                        const x1 = 100 + 82 * Math.cos(startAngle);
                        const y1 = 100 + 82 * Math.sin(startAngle);
                        const x2 = 100 + 82 * Math.cos(endAngle);
                        const y2 = 100 + 82 * Math.sin(endAngle);
                        const largeArc = angle > Math.PI ? 1 : 0;
                        const d =
                          slices.length === 1
                            ? 'M 100 18 A 82 82 0 1 1 99.9 18 Z'
                            : `M 100 100 L ${x1} ${y1} A 82 82 0 ${largeArc} 1 ${x2} ${y2} Z`;
                        startAngle = endAngle;
                        return (
                          <path
                            key={f.category}
                            d={d}
                            fill={CHART_COLORS[idx % CHART_COLORS.length]}
                            stroke="#FFFFFF"
                            strokeWidth={2}
                          />
                        );
                      });
                    })()}
                    <circle cx={100} cy={100} r={42} fill="#F8FAFC" />
                    <text
                      x={100}
                      y={96}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={700}
                      fill="#0F2A4A"
                    >
                      {catStats.count}
                    </text>
                    <text x={100} y={112} textAnchor="middle" fontSize={9.5} fill="#64748B">
                      registros
                    </text>
                  </svg>
                  <div className="space-y-1.5 text-xs">
                    {catStats.frequencies.slice(0, 7).map((f, idx) => (
                      <div key={f.category} className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-xs shrink-0"
                          style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                        />
                        <span className="text-slate-700">{f.category}:</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {f.percentage}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {catChartType === 'pareto' && (
                <div>
                  <div className="text-xs font-semibold text-slate-800 mb-2">
                    Diagrama de Pareto (Frecuencia + % Acumulado)
                  </div>
                  <svg viewBox="0 0 460 220" className="w-full h-52 overflow-visible">
                    {(() => {
                      const items = catStats.frequencies.slice(0, 8);
                      const maxC = Math.max(1, ...items.map((i) => i.count));
                      const plotW = 370;
                      const barW = plotW / Math.max(1, items.length);

                      const linePath = items
                        .map((item, idx) => {
                          const x = 44 + idx * barW + barW / 2;
                          const y = 180 - (item.cumulativePct / 100) * 145;
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        })
                        .join(' ');

                      return (
                        <>
                          {/* 80% Pareto reference line */}
                          <line
                            x1={44}
                            y1={180 - 0.8 * 145}
                            x2={414}
                            y2={180 - 0.8 * 145}
                            stroke="#D97706"
                            strokeDasharray="4 3"
                          />
                          <text x={418} y={180 - 0.8 * 145 + 3} fontSize={9} fill="#D97706">
                            80%
                          </text>

                          {items.map((item, idx) => {
                            const h = (item.count / maxC) * 145;
                            const x = 44 + idx * barW + 6;
                            const y = 180 - h;
                            return (
                              <g key={item.category}>
                                <rect
                                  x={x}
                                  y={y}
                                  width={Math.max(10, barW - 12)}
                                  height={h}
                                  rx={2}
                                  fill="#0F2A4A"
                                />
                                <text
                                  x={x + Math.max(10, barW - 12) / 2}
                                  y={196}
                                  textAnchor="middle"
                                  fontSize={9}
                                  fill="#475569"
                                >
                                  {item.category.length > 9
                                    ? item.category.slice(0, 8) + '…'
                                    : item.category}
                                </text>
                              </g>
                            );
                          })}
                          <path
                            d={linePath}
                            fill="none"
                            stroke="#0D9488"
                            strokeWidth={2.2}
                          />
                          {items.map((item, idx) => {
                            const x = 44 + idx * barW + barW / 2;
                            const y = 180 - (item.cumulativePct / 100) * 145;
                            return (
                              <circle
                                key={`pt_${idx}`}
                                cx={x}
                                cy={y}
                                r={3.5}
                                fill="#0D9488"
                                stroke="#FFFFFF"
                                strokeWidth={1.5}
                              />
                            );
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* SECTION C: Correlation Matrix & Heatmap */}
      {corrMatrix.columns.length >= 2 && (
        <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-base font-bold text-[#0F2A4A]">
                Matriz de Correlación y Heatmap
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Coeficiente de correlación de Pearson (r) entre variables numéricas y objetivo binario
              </p>
            </div>
            {hoverCorr && (
              <div className="text-xs font-mono tabular-nums text-[#0F2A4A] bg-slate-100 px-3 py-1 rounded">
                {corrMatrix.columns[hoverCorr.i]} × {corrMatrix.columns[hoverCorr.j]}: r ={' '}
                {hoverCorr.r.toFixed(3)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            {/* Heatmap */}
            <div className="xl:col-span-2 overflow-x-auto">
              <div className="inline-block min-w-full">
                <table className="border-collapse">
                  <thead>
                    <tr>
                      <th className="p-1.5" />
                      {corrMatrix.columns.map((col) => (
                        <th
                          key={col}
                          className="p-1.5 text-[10px] font-semibold text-slate-700 text-center max-w-[74px] truncate"
                          title={col}
                        >
                          {col.length > 10 ? col.slice(0, 9) + '…' : col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrMatrix.columns.map((rowCol, i) => (
                      <tr key={rowCol}>
                        <td
                          className="p-1.5 text-[10px] font-semibold text-slate-700 text-right pr-2.5 whitespace-nowrap"
                          title={rowCol}
                        >
                          {rowCol.length > 14 ? rowCol.slice(0, 13) + '…' : rowCol}
                        </td>
                        {corrMatrix.matrix[i].map((r, j) => {
                          const absR = Math.abs(r);
                          const bg =
                            i === j
                              ? '#0F2A4A'
                              : r > 0
                              ? `rgba(13, 148, 136, ${0.12 + absR * 0.85})`
                              : `rgba(220, 38, 38, ${0.12 + absR * 0.78})`;
                          const textColor = absR > 0.48 || i === j ? '#FFFFFF' : '#0F172A';

                          return (
                            <td
                              key={`${i}_${j}`}
                              onMouseEnter={() => setHoverCorr({ i, j, r })}
                              onMouseLeave={() => setHoverCorr(null)}
                              className="p-1.5 text-center font-mono tabular-nums text-[10px] font-medium border border-white cursor-default"
                              style={{ backgroundColor: bg, color: textColor, minWidth: 46 }}
                            >
                              {r.toFixed(2)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Automatic Interpretation */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
              <h3 className="text-xs font-bold text-[#0F2A4A]">
                Interpretación Automática de Correlaciones
              </h3>
              <div className="space-y-2.5">
                {corrMatrix.strongestPairs.slice(0, 4).map((pair, idx) => (
                  <div
                    key={idx}
                    className="text-xs text-slate-700 pb-2 border-b border-slate-200 last:border-b-0 last:pb-0"
                  >
                    <div className="font-semibold text-slate-900 flex justify-between tabular-nums">
                      <span className="truncate">
                        {pair.colA} ↔ {pair.colB}
                      </span>
                      <span
                        className={`font-mono ml-2 ${
                          pair.r >= 0 ? 'text-[#0D9488]' : 'text-red-600'
                        }`}
                      >
                        {pair.r.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                      {pair.interpretation}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
