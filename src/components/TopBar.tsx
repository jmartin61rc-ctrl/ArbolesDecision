import React from 'react';
import { Menu, Upload } from 'lucide-react';

export type NavSection =
  | 'datos'
  | 'variables'
  | 'eda'
  | 'modelo'
  | 'optimizacion'
  | 'evaluacion'
  | 'negocio';

interface TopBarProps {
  activeSection: NavSection;
  onNavigate: (section: NavSection) => void;
  onTriggerUpload: () => void;
  onToggleMobileNav: () => void;
}

const TOP_LINKS: { id: NavSection; label: string }[] = [
  { id: 'datos', label: 'Datos' },
  { id: 'eda', label: 'Exploratorio' },
  { id: 'modelo', label: 'Árbol' },
  { id: 'evaluacion', label: 'Evaluación' },
  { id: 'negocio', label: 'Negocio e IA' },
];

export const TopBar: React.FC<TopBarProps> = ({
  activeSection,
  onNavigate,
  onTriggerUpload,
  onToggleMobileNav,
}) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 lg:px-8 flex items-center justify-between gap-8">
      {/* Zone 1: Single-element Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleMobileNav}
          aria-label="Abrir menú de navegación"
          className="lg:hidden p-2 -ml-2 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={() => onNavigate('datos')}
          className="font-display text-lg font-bold tracking-tight text-[#0F2A4A] whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] rounded"
        >
          Arboris Analytics
        </button>
      </div>

      {/* Zone 2: 5 concise single-line navigation links */}
      <nav className="hidden md:flex items-center gap-6" aria-label="Navegación principal">
        {TOP_LINKS.map((link) => {
          const isActive = activeSection === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => onNavigate(link.id)}
              className={`text-sm font-medium whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488] ${
                isActive
                  ? 'text-[#0F2A4A] border-[#0D9488]'
                  : 'text-slate-600 border-transparent hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>

      {/* Zone 3: 1 Primary CTA */}
      <div className="shrink-0">
        <button
          type="button"
          onClick={onTriggerUpload}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173A63] rounded-md transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0D9488]"
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Cargar Dataset</span>
        </button>
      </div>
    </header>
  );
};
