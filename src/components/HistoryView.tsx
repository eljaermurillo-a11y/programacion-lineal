import React from 'react';
import { LPModel } from '../types/lp';
import { CASE_STUDIES } from '../utils/presets';

interface HistoryViewProps {
  currentModel: LPModel;
  savedModels: LPModel[];
  onLoadModel: (model: LPModel) => void;
  onSaveCurrentModel: () => void;
  onDeleteSavedModel: (id: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  currentModel,
  savedModels,
  onLoadModel,
  onSaveCurrentModel,
  onDeleteSavedModel
}) => {
  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-28 gap-5">
      {/* Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#adc6ff] uppercase tracking-widest font-mono">
              Biblioteca y Repositorio
            </span>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#dbe1ff] tracking-tight">
              Casos de Estudio e Historial
            </h1>
          </div>

          <button
            onClick={onSaveCurrentModel}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#4edea3] text-[#003824] font-bold text-[12px] hover:bg-[#6ffbbe] transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
            <span>Guardar Actual</span>
          </button>
        </div>

        <p className="text-[13px] text-[#c2c6d6] leading-relaxed">
          Accede a modelos emblemáticos de optimización lineal o recupera formulaciones guardadas en
          esta sesión.
        </p>
      </section>

      {/* Case Studies Library */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">
              auto_stories
            </span>
            <h2 className="text-[17px] font-semibold text-[#dbe1ff]">
              Biblioteca de Problemas Canónicos
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[#8c909f]">
            {CASE_STUDIES.length} Casos Disponibles
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {CASE_STUDIES.map((cs) => {
            const isCurrent = currentModel.id === cs.id;

            return (
              <div
                key={cs.id}
                className="flex flex-col p-4 rounded-xl bg-[#171e37] border border-[#212942] shadow-md gap-2.5 transition-all hover:border-[#4c8eff]/50"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                          cs.type === 'MAX'
                            ? 'bg-[#ffb95f]/20 text-[#ffb95f]'
                            : 'bg-[#4c8eff]/20 text-[#4c8eff]'
                        }`}
                      >
                        {cs.type} Z
                      </span>
                      <h3 className="text-[14px] font-bold text-[#dbe1ff] truncate">{cs.title}</h3>
                    </div>
                    <p className="text-[12px] text-[#c2c6d6] mt-1 line-clamp-2">
                      {cs.description}
                    </p>
                  </div>

                  <button
                    onClick={() => onLoadModel(cs)}
                    type="button"
                    className={`px-3 py-1.5 rounded-lg font-semibold text-[12px] transition-all flex items-center gap-1 ${
                      isCurrent
                        ? 'bg-[#212942] text-[#4edea3] cursor-default'
                        : 'bg-[#4c8eff] hover:bg-[#adc6ff] text-[#00285d]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isCurrent ? 'check' : 'open_in_browser'}
                    </span>
                    <span>{isCurrent ? 'Cargado' : 'Cargar'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-4 text-[11px] font-mono text-[#8c909f] pt-2 border-t border-[#212942]/60">
                  <span>{cs.variables.length} Variables</span>
                  <span>•</span>
                  <span>{cs.constraints.length} Restricciones</span>
                  <span>•</span>
                  <span className="text-[#adc6ff]">{cs.unit}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Saved Models in Local Session */}
      <section className="flex flex-col gap-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#adc6ff] text-[20px]">
              history
            </span>
            <h2 className="text-[17px] font-semibold text-[#dbe1ff]">
              Historial de Formulaciones del Usuario
            </h2>
          </div>
          <span className="font-mono text-[11px] text-[#8c909f]">
            {savedModels.length} Guardados
          </span>
        </div>

        {savedModels.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 rounded-xl bg-[#131a33] border border-dashed border-[#212942] text-center gap-2">
            <span className="material-symbols-outlined text-[32px] text-[#8c909f]">
              bookmark_border
            </span>
            <span className="text-[13px] text-[#c2c6d6]">
              Aún no has guardado snapshots en esta sesión.
            </span>
            <button
              onClick={onSaveCurrentModel}
              type="button"
              className="text-[12px] text-[#4edea3] font-semibold hover:underline"
            >
              Guardar el modelo actual ahora
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {savedModels.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between p-3 rounded-xl bg-[#171e37] border border-[#212942] shadow-sm hover:border-[#adc6ff]/40 transition-all"
              >
                <div className="flex flex-col min-w-0 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[11px] text-[#4edea3] font-bold">
                      {m.type} Z
                    </span>
                    <span className="text-[13px] font-semibold text-[#dbe1ff] truncate">
                      {m.title}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8c909f] font-mono mt-0.5">
                    {new Date(m.createdAt).toLocaleDateString()} — {m.variables.length} vars,{' '}
                    {m.constraints.length} rest.
                  </span>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => onLoadModel(m)}
                    title="Cargar este modelo"
                    type="button"
                    className="px-2.5 py-1.5 rounded-lg bg-[#212942] hover:bg-[#2c344d] text-[#adc6ff] text-[12px] font-semibold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">file_open</span>
                    <span>Cargar</span>
                  </button>

                  <button
                    onClick={() => onDeleteSavedModel(m.id)}
                    title="Eliminar snapshot"
                    type="button"
                    className="w-8 h-8 rounded-lg bg-[#212942] hover:bg-[#ffb4ab]/20 text-[#c2c6d6] hover:text-[#ffb4ab] flex items-center justify-center transition-colors"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
