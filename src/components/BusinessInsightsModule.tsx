import React from 'react';
import {
  AlertCircle,
  Briefcase,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import {
  AIInsightsResult,
  BusinessDecisionCard,
  Dataset,
  SectorKey,
  TrainedTreeModel,
} from '../types/analytics';
import { getSectorInfo } from '../ml/syntheticDatasets';

interface BusinessInsightsModuleProps {
  dataset: Dataset;
  sector: SectorKey;
  model: TrainedTreeModel;
  businessCards: BusinessDecisionCard[];
  aiInsights: AIInsightsResult | null;
  aiLoading: boolean;
  aiError: string | null;
  onGenerateGeminiInsights: () => void;
}

export const BusinessInsightsModule: React.FC<BusinessInsightsModuleProps> = ({
  dataset,
  sector,
  model,
  businessCards,
  aiInsights,
  aiLoading,
  aiError,
  onGenerateGeminiInsights,
}) => {
  const sectorInfo = getSectorInfo(sector);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-slate-500">
            Módulo 12 y Módulo 13 · Traducción Estratégica e Inteligencia Ejecutiva
          </div>
          <h1 className="font-display text-2xl font-bold text-[#0F2A4A] mt-0.5 text-balance">
            Aplicación al Negocio y Motor de Insights con IA
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-3xl">
            Traduce las reglas estadísticas del árbol de decisión en decisiones concretas para el sector{' '}
            <span className="font-semibold text-[#0F2A4A]">{sectorInfo.label}</span> y genera hallazgos, recomendaciones y riesgos con Gemini IA.
          </p>
        </div>

        <button
          type="button"
          disabled={aiLoading}
          onClick={onGenerateGeminiInsights}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173A63] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          {aiLoading ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Sparkles className="w-3.5 h-3.5 text-[#2DD4BF]" />
          )}
          <span>
            {aiLoading
              ? 'Analizando con Gemini...'
              : 'Generar Insights Ejecutivos con IA'}
          </span>
        </button>
      </div>

      {/* Module 12: Sector Business Decisions */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-4 h-4 text-[#0D9488]" />
          <h2 className="font-display text-base font-bold text-[#0F2A4A]">
            Módulo 12 · Decisiones Empresariales para {sectorInfo.label}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {businessCards.map((card, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-[#0D9488]">{card.category}</span>
                  <span className="font-mono text-slate-500">Prioridad {card.priority}</span>
                </div>
                <h3 className="font-display text-sm font-bold text-[#0F2A4A] mt-2">
                  {card.title}
                </h3>
                <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
                  {card.description}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-500">Evidencia del Árbol</span>
                <span className="font-mono tabular-nums font-bold text-[#0F2A4A]">
                  {card.metricHighlight}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Module 13: AI Insights Engine */}
      <section className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
          <div>
            <h2 className="font-display text-base font-bold text-[#0F2A4A]">
              Módulo 13 · Motor de Insights con IA
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Síntesis ejecutiva sobre {dataset.name} · Objetivo: {model.targetColumn} ({model.testMetrics.accuracy}% exactitud)
            </p>
          </div>
          {aiInsights && (
            <div className="text-xs text-slate-500">
              Fuente:{' '}
              <span className="font-semibold text-[#0F2A4A]">
                {aiInsights.source === 'gemini'
                  ? 'Gemini API (Servidor)'
                  : 'Motor Estadístico Local'}
              </span>
            </div>
          )}
        </div>

        {aiError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md text-xs text-red-800 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
            <div>
              <div className="font-semibold">No se pudo completar el análisis con Gemini API</div>
              <div className="mt-0.5">{aiError}</div>
            </div>
          </div>
        )}

        {aiLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3].map((k) => (
              <div key={k} className="h-44 bg-slate-100 rounded-lg border border-slate-200" />
            ))}
          </div>
        ) : aiInsights ? (
          <div className="space-y-5">
            {/* Executive Summary */}
            <div className="bg-[#0F2A4A] text-white rounded-lg p-5">
              <div className="text-xs font-semibold text-[#2DD4BF]">
                Resumen Ejecutivo del Modelo
              </div>
              <p className="text-sm leading-relaxed mt-1.5 text-slate-100">
                {aiInsights.resumenEjecutivo}
              </p>
            </div>

            {/* 3 Pillars: Hallazgos, Recomendaciones, Riesgos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Hallazgos Clave */}
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F2A4A]">
                  <Lightbulb className="w-4 h-4 text-[#0D9488]" />
                  <span>Hallazgos Clave</span>
                </div>
                <div className="space-y-3">
                  {aiInsights.hallazgos.map((h, i) => (
                    <div
                      key={i}
                      className="pb-3 border-b border-slate-200 last:border-b-0 last:pb-0"
                    >
                      <div className="text-xs font-bold text-slate-900">{h.titulo}</div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{h.detalle}</p>
                      <div className="text-[11px] font-mono font-semibold text-[#0D9488] mt-1">
                        Impacto: {h.impacto}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recomendaciones */}
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F2A4A]">
                  <Sparkles className="w-4 h-4 text-[#0D9488]" />
                  <span>Recomendaciones</span>
                </div>
                <div className="space-y-3">
                  {aiInsights.recomendaciones.map((r, i) => (
                    <div
                      key={i}
                      className="pb-3 border-b border-slate-200 last:border-b-0 last:pb-0"
                    >
                      <div className="text-xs font-bold text-slate-900">{r.titulo}</div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{r.accion}</p>
                      <div className="text-[11px] font-semibold text-[#0F2A4A] mt-1">
                        Área: {r.area}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Riesgos */}
              <div className="border border-slate-200 rounded-lg p-5 bg-slate-50/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-[#0F2A4A]">
                  <ShieldAlert className="w-4 h-4 text-amber-600" />
                  <span>Riesgos y Mitigación</span>
                </div>
                <div className="space-y-3">
                  {aiInsights.riesgos.map((rk, i) => (
                    <div
                      key={i}
                      className="pb-3 border-b border-slate-200 last:border-b-0 last:pb-0"
                    >
                      <div className="text-xs font-bold text-slate-900">{rk.titulo}</div>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{rk.detalle}</p>
                      <div className="text-[11px] text-slate-700 mt-1">
                        <span className="font-semibold">Mitigación:</span> {rk.mitigacion}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
};
