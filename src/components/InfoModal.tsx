import React from 'react';

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[#131a33] border border-[#212942] rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#212942]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4c8eff] text-[22px]">
              tune
            </span>
            <h2 className="text-[17px] font-bold text-[#dbe1ff]">
              Motor de Cálculo y Parámetros
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg bg-[#171e37] text-[#8c909f] hover:text-[#dbe1ff] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex flex-col gap-4 text-[13px] text-[#c2c6d6] leading-relaxed">
          <div className="p-3.5 rounded-xl bg-[#171e37] border border-[#212942] flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
              <span className="font-bold text-[#dbe1ff]">OptiLinear Solver Engine v2.4</span>
            </div>
            <p className="text-[12px] text-[#8c909f]">
              Algoritmo Simplex Primal en Forma Estándar con normalización de holguras, método de las Dos Fases (Big-M) y resolución geométrica analítica en 2D.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider font-mono">
              Parámetros de Tolerancia Numérica
            </span>
            <div className="grid grid-cols-2 gap-2 text-[12px] font-mono">
              <div className="p-2.5 rounded-lg bg-[#050d25] border border-[#212942]">
                <span className="text-[#8c909f] block text-[10px]">Tolerancia Epsilon (ε)</span>
                <span className="text-[#4edea3] font-bold">1e-7</span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#050d25] border border-[#212942]">
                <span className="text-[#8c909f] block text-[10px]">Criterio de Parada</span>
                <span className="text-[#4edea3] font-bold">Zⱼ - Cⱼ ≥ 0 (Max)</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider font-mono">
              Teoría de Dualidad y Precios Sombra
            </span>
            <p className="text-[12px]">
              Cada restricción activa con holgura cero (Sᵢ = 0) genera un valor marginal positivo (yᵢ* &gt; 0), indicando que expandir la capacidad del recurso en 1 unidad incrementa directamente la función objetivo.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#212942] flex items-center justify-end bg-[#050d25]/60">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-xl bg-[#4c8eff] hover:bg-[#adc6ff] text-[#00285d] font-bold text-[13px]"
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};
