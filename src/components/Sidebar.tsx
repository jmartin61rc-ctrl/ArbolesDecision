import React from 'react';
import {
  BarChart3,
  Briefcase,
  CheckSquare,
  Database,
  GitBranch,
  Layers,
  Sliders,
  X,
} from 'lucide-react';
import { Dataset, SectorKey, TrainedTreeModel } from '../types/analytics';
import { SECTORS } from '../ml/syntheticDatasets';
import { NavSection } from './TopBar';

interface SidebarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  dataset: Dataset | null;
  targetColumn: string;
  model: TrainedTreeModel | null;
  selectedSector: SectorKey;
  onSelectSector: (sector: SectorKey) => void;
  trainRatio: number;
  onChangeTrainRatio: (ratio: number) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const NAV_ITEMS: {
  id: NavSection;
  step: string;
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'datos',
    step: '01',
    label: 'Carga y Calidad',
    sublabel: 'Módulos 1 y 2',
    icon: Database,
  },
  {
    id: 'variables',
    step: '02',
    label: 'Variables y Objetivo',
    sublabel: 'Módulos 3 y 4',
    icon: Layers,
  },
  {
    id: 'eda',
    step: '03',
    label: 'Análisis Exploratorio',
    sublabel: 'Módulo 5',
    icon: BarChart3,
  },
  {
    id: 'modelo',
    step: '04',
    label: 'División y Árbol',
    sublabel: 'Módulos 6 y 7',
    icon: GitBranch,
  },
  {
    id: 'optimizacion',
    step: '05',
    label: 'Optimización y Poda',
    sublabel: 'Módulos 8 y 9',
    icon: Sliders,
  },
  {
    id: 'evaluacion',
    step: '06',
    label: 'Evaluación e Importancia',
    sublabel: 'Módulos 10 y 11',
    icon: CheckSquare,
  },
  {
    id: 'negocio',
    step: '07',
    label: 'Negocio e Insights IA',
    sublabel: 'Módulos 12 y 13',
    icon: Briefcase,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  dataset,
  targetColumn,
  model,
  selectedSector,
  onSelectSector,
  trainRatio,
  onChangeTrainRatio,
  mobileOpen,
  onCloseMobile,
}) => {
  const sidebarBody = (
    <div className="h-full flex flex-col bg-white border-r border-slate-200 w-[264px]">
      <div className="lg:hidden flex items-center justify-between px-5 h-16 border-b border-slate-200">
        <span className="font-display font-bold text-[#0F2A4A]">Flujo Analítico</span>
        <button
          type="button"
          onClick={onCloseMobile}
          className="p-1.5 text-slate-500 hover:text-slate-900 rounded"
          aria-label="Cerrar menú"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Modules */}
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 px-2 mb-2">
          Flujo de Analítica
        </div>
        <nav className="space-y-1" aria-label="Módulos analíticos">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onNavigate(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                  active
                    ? 'bg-[#0F2A4A] text-white'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 ${
                    active ? 'text-[#2DD4BF]' : 'text-slate-400'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold leading-tight truncate">
                    {item.step}. {item.label}
                  </div>
                  <div
                    className={`text-[11px] leading-tight mt-0.5 ${
                      active ? 'text-slate-300' : 'text-slate-500'
                    }`}
                  >
                    {item.sublabel}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Lateral Filter Panel */}
        <div className="mt-6 pt-5 border-t border-slate-200 space-y-4 px-1">
          <div className="text-xs font-semibold text-slate-500">
            Filtros de Sesión
          </div>

          <div>
            <label
              htmlFor="sidebar-sector-select"
              className="block text-xs font-medium text-slate-700 mb-1"
            >
              Sector Empresarial
            </label>
            <select
              id="sidebar-sector-select"
              value={selectedSector}
              onChange={(e) => onSelectSector(e.target.value as SectorKey)}
              className="w-full px-2.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0D9488]"
            >
              {SECTORS.map((sec) => (
                <option key={sec.key} value={sec.key}>
                  {sec.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
              <label htmlFor="sidebar-split-range">División Train / Test</label>
              <span className="font-mono tabular-nums text-[#0F2A4A] font-semibold">
                {Math.round(trainRatio * 100)}% / {Math.round((1 - trainRatio) * 100)}%
              </span>
            </div>
            <input
              id="sidebar-split-range"
              type="range"
              min={50}
              max={90}
              step={5}
              value={Math.round(trainRatio * 100)}
              onChange={(e) => onChangeTrainRatio(Number(e.target.value) / 100)}
              className="w-full accent-[#0D9488] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* Active Dataset Summary */}
      {dataset && (
        <div className="p-4 border-t border-slate-200 bg-slate-50/70">
          <div className="text-xs font-semibold text-slate-900 truncate">
            {dataset.name}
          </div>
          <div className="mt-1 text-xs text-slate-600 tabular-nums space-y-0.5">
            <div>
              {dataset.quality.totalRows.toLocaleString('es-ES')} registros ·{' '}
              {dataset.quality.totalColumns} variables
            </div>
            <div>
              Objetivo:{' '}
              <span className="font-semibold text-[#0F2A4A]">
                {targetColumn || 'Sin definir'}
              </span>
            </div>
            {model && (
              <div>
                Exactitud Prueba:{' '}
                <span className="font-mono font-semibold text-[#0D9488]">
                  {model.testMetrics.accuracy}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop persistent sidebar */}
      <aside className="hidden lg:block shrink-0">{sidebarBody}</aside>

      {/* Mobile slide-over drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          <div className="relative z-10 h-full">{sidebarBody}</div>
        </div>
      )}
    </>
  );
};
