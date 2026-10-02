import React from 'react';
import { LPModel } from '../types/lp';

interface HeaderProps {
  model: LPModel;
  activeTab: string;
  onResetModel: () => void;
  onOpenExport: () => void;
  onOpenInfo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  model,
  activeTab,
  onResetModel,
  onOpenExport,
  onOpenInfo
}) => {
  const getSubheaderTitle = () => {
    switch (activeTab) {
      case 'editor':
        return 'Editor Y Restricciones';
      case 'graph':
        return 'Solución y Gráfica 2D';
      case 'simplex':
        return 'Sensibilidad y Tabla Simplex';
      case 'history':
        return 'Biblioteca y Casos de Estudio';
      default:
        return 'Optimización Lineal';
    }
  };

  const modelStatusText = model.type === 'MAX'
    ? 'Modelo: Maximizador de Utilidad'
    : 'Modelo: Minimizador de Costos';

  return (
    <header className="fixed top-0 w-full z-50 bg-[#0a122a]/90 backdrop-blur-xl border-b border-[#212942]/60 pt-safe shadow-[0_4px_20px_rgba(0,0,0,0.35)]">
      <div className="h-20 px-4 sm:px-6 flex items-center justify-between gap-2 max-w-7xl mx-auto">
        {/* Left Brand Zone */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#4c8eff] to-[#005ac2] p-0.5 flex-shrink-0 flex items-center justify-center shadow-lg shadow-[#4c8eff]/20">
            <img
              alt="OptiLinear Brand Icon"
              className="h-7 w-7 object-contain"
              referrerPolicy="no-referrer"
              src="https://lh3.googleusercontent.com/aida/AEtjO1XHx9w7RQoHMTGoDBja8QQMx4PbefTvMw_QUXRUCi0rAWcjiPZkIBFvJi-9oaaxv4oPATHReHuE1UOvJjNMNC_uGeqioN-Gn4_V4FXIUb90ihpwsmUbn1gvDVp5meZ70Vigo_4vtaC7YmX-7rvxbOFuR3bMnz5zXdCMIwfpmwVwYhNko6Ml6_pqQTR07RNQIxRMIVgV03-vba6FgnD5m5oIZTRoWCfZxVUnqIldiV4lSg7fa81qCnz1aHed"
              onError={(e) => {
                // Graceful fallback if image unavailable
                const target = e.currentTarget;
                target.style.display = 'none';
              }}
            />
            <span className="material-symbols-outlined text-white text-[20px] hidden" id="fallback-logo">
              analytics
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[20px] font-bold tracking-tight text-[#dbe1ff] truncate">
                OptiLinear
              </span>
              <span className="hidden sm:inline-block text-[#414754] font-mono text-[14px]">/</span>
              <span className="hidden sm:inline-block text-[11px] font-semibold text-[#adc6ff] uppercase tracking-wider truncate">
                {getSubheaderTitle()}
              </span>
            </div>

            <div className="flex items-center gap-1.5 mt-0.5">
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#212942] text-[#4edea3] font-mono text-[11px] font-semibold truncate max-w-[240px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse"></span>
                <span className="truncate">{modelStatusText}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onResetModel}
            aria-label="Limpiar modelo"
            title="Restablecer valores originales"
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#131a33] hover:bg-[#171e37] text-[#c2c6d6] hover:text-[#ffb4ab] border border-[#2c344d]/50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">restart_alt</span>
          </button>

          <button
            onClick={onOpenExport}
            aria-label="Exportar informe"
            title="Exportar informe técnico"
            type="button"
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-[#131a33] hover:bg-[#171e37] text-[#c2c6d6] hover:text-[#adc6ff] border border-[#2c344d]/50 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
          </button>

          <button
            onClick={onOpenInfo}
            aria-label="Información y Parámetros"
            title="Parámetros del Solver"
            type="button"
            className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#005ac2] to-[#4c8eff] flex items-center justify-center ml-1 text-white shadow-md shadow-[#4c8eff]/20 hover:ring-2 hover:ring-[#adc6ff]/50 transition-all"
          >
            <span className="material-symbols-outlined text-[19px]">person</span>
          </button>
        </div>
      </div>
    </header>
  );
};
