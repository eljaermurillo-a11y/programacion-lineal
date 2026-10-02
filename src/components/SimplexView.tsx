import React, { useState } from 'react';
import { LPModel, LPSolution, SimplexTableau } from '../types/lp';

interface SimplexViewProps {
  model: LPModel;
  solution: LPSolution;
  onNavigateToGraph: () => void;
  onNavigateToEditor: () => void;
}

export const SimplexView: React.FC<SimplexViewProps> = ({
  model,
  solution,
  onNavigateToGraph,
  onNavigateToEditor
}) => {
  const [subTab, setSubTab] = useState<'tableau' | 'sensitivity'>('tableau');
  const [currentIterIdx, setCurrentIterIdx] = useState<number>(0);

  const tableaus = solution.tableaus || [];
  const currentTableau: SimplexTableau | undefined =
    tableaus[currentIterIdx] || tableaus[tableaus.length - 1];

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-28 gap-5">
      {/* Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#adc6ff] uppercase tracking-widest font-mono">
              Paso 3 • Tabular y Sensibilidad
            </span>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#dbe1ff] tracking-tight">
              Simplex y Post-Optimalidad
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131a33] text-[#4edea3] border border-[#4edea3]/30 shadow-sm">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            <span className="text-[12px] font-mono font-bold">
              {tableaus.length} {tableaus.length === 1 ? 'Iteración' : 'Iteraciones'}
            </span>
          </div>
        </div>

        <p className="text-[13px] text-[#c2c6d6] leading-relaxed">
          Traza matemática detallada de operaciones de pivoteo Gauss-Jordan y análisis de rangos
          de estabilidad económica.
        </p>

        {/* Sub-tab segmented control */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#050d25] border border-[#212942] gap-1 mt-1 shadow-inner">
          <button
            type="button"
            onClick={() => setSubTab('tableau')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${
              subTab === 'tableau'
                ? 'bg-[#4c8eff] text-[#00285d] font-bold shadow-md shadow-[#4c8eff]/25'
                : 'text-[#c2c6d6] hover:text-[#dbe1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">table_rows</span>
            <span>Tablas Simplex (Tableau)</span>
          </button>

          <button
            type="button"
            onClick={() => setSubTab('sensitivity')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${
              subTab === 'sensitivity'
                ? 'bg-[#4c8eff] text-[#00285d] font-bold shadow-md shadow-[#4c8eff]/25'
                : 'text-[#c2c6d6] hover:text-[#dbe1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Análisis de Sensibilidad</span>
          </button>
        </div>
      </section>

      {subTab === 'tableau' && (
        <>
          {/* Iteration Selector Bar */}
          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider font-mono">
                Pasos de Iteración Simplex
              </span>
              <span className="text-[11px] font-mono text-[#4edea3]">
                {currentTableau?.isOptimal ? '★ Tabla Óptima Final' : 'Paso Intermedio'}
              </span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {tableaus.map((tab, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setCurrentIterIdx(idx)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-mono text-[12px] font-semibold transition-all whitespace-nowrap border ${
                    currentIterIdx === idx
                      ? 'bg-[#171e37] text-[#4edea3] border-[#4edea3]/50 shadow-md'
                      : 'bg-[#131a33] text-[#c2c6d6] border-[#212942] hover:bg-[#171e37]'
                  }`}
                >
                  <span>{idx === 0 ? 'Iter. 0 (Inicial)' : `Iteración ${idx}`}</span>
                  {tab.isOptimal && (
                    <span className="w-2 h-2 rounded-full bg-[#4edea3]"></span>
                  )}
                </button>
              ))}
            </div>
          </section>

          {/* Formatted Simplex Tableau */}
          {currentTableau && (
            <section className="flex flex-col rounded-2xl bg-[#050d25] border border-[#212942] p-4 shadow-xl overflow-hidden gap-3">
              <div className="flex items-center justify-between border-b border-[#212942] pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#adc6ff] text-[18px]">grid_on</span>
                  <span className="text-[13px] font-bold text-[#dbe1ff] font-mono">
                    Tableau Simplex — Iteración {currentTableau.iteration}
                  </span>
                </div>
                <div className="font-mono text-[13px] font-bold text-[#4edea3]">
                  Z = ${currentTableau.currentZ}
                </div>
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto">
                <table className="w-full text-center font-mono text-[12px] border-collapse min-w-[500px]">
                  <thead>
                    {/* C_j row */}
                    <tr className="text-[10px] text-[#8c909f] border-b border-[#212942]/60">
                      <th className="py-1"></th>
                      <th className="py-1">Cⱼ</th>
                      {currentTableau.c_j.map((cj, i) => (
                        <th key={`cj-${i}`} className="py-1">
                          {cj}
                        </th>
                      ))}
                      <th className="py-1"></th>
                      <th className="py-1"></th>
                    </tr>

                    {/* Column labels */}
                    <tr className="border-b border-[#212942] text-[#adc6ff] bg-[#131a33]/60">
                      <th className="py-2 px-2 text-left">Base</th>
                      <th className="py-2 px-2">C_B</th>
                      {model.variables.map((v) => (
                        <th key={v.id} className="py-2 px-2 font-bold">
                          {v.symbol}
                        </th>
                      ))}
                      {model.constraints.map((_, i) => (
                        <th key={`s-${i}`} className="py-2 px-2 text-[#4edea3]">
                          S{i + 1}
                        </th>
                      ))}
                      <th className="py-2 px-2 text-[#ffb95f]">Solución (b)</th>
                      <th className="py-2 px-2 text-[#c2c6d6]">θ (Cociente)</th>
                    </tr>
                  </thead>

                  <tbody>
                    {currentTableau.rows.map((row, rIdx) => {
                      const isPivotRow = currentTableau.pivotRowIndex === rIdx;

                      return (
                        <tr
                          key={rIdx}
                          className={`border-b border-[#212942]/50 transition-colors ${
                            isPivotRow ? 'bg-[#ffb95f]/10 text-[#dbe1ff]' : 'hover:bg-[#131a33]/40'
                          }`}
                        >
                          <td className="py-2.5 px-2 text-left font-bold text-[#4edea3]">
                            {row.basicVar}
                          </td>
                          <td className="py-2.5 px-2 text-[#8c909f]">{row.cb}</td>

                          {row.coefficients.map((val, cIdx) => {
                            const isPivotCol = currentTableau.pivotColIndex === cIdx;
                            const isPivotCell = isPivotRow && isPivotCol;

                            return (
                              <td
                                key={cIdx}
                                className={`py-2.5 px-2 font-semibold ${
                                  isPivotCell
                                    ? 'bg-[#4edea3] text-[#003824] rounded-md font-bold ring-2 ring-[#4edea3]'
                                    : isPivotCol
                                    ? 'bg-[#4c8eff]/10 text-[#adc6ff]'
                                    : 'text-[#c2c6d6]'
                                }`}
                              >
                                {val}
                              </td>
                            );
                          })}

                          <td className="py-2.5 px-2 font-bold text-[#ffb95f]">{row.rhs}</td>
                          <td className="py-2.5 px-2 text-[#8c909f]">
                            {row.ratio !== null && row.ratio !== undefined ? row.ratio : '—'}
                          </td>
                        </tr>
                      );
                    })}

                    {/* Z_j Row */}
                    <tr className="border-t border-[#212942] bg-[#131a33]/80 text-[#8c909f]">
                      <td className="py-2 px-2 text-left font-bold">Zⱼ</td>
                      <td className="py-2 px-2">—</td>
                      {currentTableau.z_row.map((zj, i) => (
                        <td key={`zj-${i}`} className="py-2 px-2">
                          {zj}
                        </td>
                      ))}
                      <td className="py-2 px-2 font-bold text-[#4edea3]">
                        {currentTableau.currentZ}
                      </td>
                      <td className="py-2 px-2">—</td>
                    </tr>

                    {/* Reduced Costs (Z_j - C_j) Row */}
                    <tr className="bg-[#171e37] font-bold">
                      <td className="py-2 px-2 text-left text-[#adc6ff]">Zⱼ - Cⱼ</td>
                      <td className="py-2 px-2">—</td>
                      {currentTableau.reducedCosts.map((rc, i) => (
                        <td
                          key={`rc-${i}`}
                          className={`py-2 px-2 ${
                            rc < 0 ? 'text-[#ffb95f]' : 'text-[#4edea3]'
                          }`}
                        >
                          {rc}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-[#4edea3]">{currentTableau.currentZ}</td>
                      <td className="py-2 px-2">—</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Explanatory Narrative Box */}
              <div className="p-3 rounded-xl bg-[#131a33] border border-[#212942] flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#4edea3] text-[20px] flex-shrink-0 mt-0.5">
                  lightbulb
                </span>
                <div className="flex flex-col text-[12px] text-[#c2c6d6] leading-relaxed">
                  <span className="font-semibold text-[#dbe1ff]">Interpretación del Paso:</span>
                  <span>{currentTableau.explanation}</span>
                </div>
              </div>
            </section>
          )}
        </>
      )}

      {subTab === 'sensitivity' && (
        <>
          {/* Objective Function Coefficients Sensitivity */}
          <section className="flex flex-col rounded-xl bg-[#131a33] border border-[#212942] p-4 shadow-md gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#adc6ff] text-[20px]">
                  calculate
                </span>
                <h3 className="text-[15px] font-semibold text-[#dbe1ff]">
                  Rangos de Optimalidad de Coeficientes ($C_j$)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#8c909f]">Función Objetivo</span>
            </div>

            <p className="text-[12px] text-[#c2c6d6]">
              Límites en los que el margen unitario puede fluctuar sin alterar la base óptima actual:
            </p>

            <div className="flex flex-col gap-2.5">
              {solution.sensitivity.coefficients.map((item) => (
                <div
                  key={item.varId}
                  className="p-3 rounded-lg bg-[#171e37] border border-[#212942] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] font-mono text-[12px] font-bold">
                        {item.varSymbol}
                      </span>
                      <span className="text-[13px] font-semibold text-[#dbe1ff]">
                        {item.varName}
                      </span>
                    </div>
                    <span className="font-mono text-[13px] font-bold text-[#4edea3]">
                      Actual: ${item.currentValue}
                    </span>
                  </div>

                  {/* Range visual bar */}
                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8c909f] pt-1 border-t border-[#212942]/60">
                    <span>
                      Cota Inferior: <strong className="text-[#dbe1ff]">${item.allowableMin}</strong>
                    </span>
                    <span className="text-[#4edea3]">
                      Rango: [${item.allowableMin} — ${item.allowableMax}]
                    </span>
                    <span>
                      Cota Superior: <strong className="text-[#dbe1ff]">${item.allowableMax}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* RHS Resource Availability & Shadow Prices */}
          <section className="flex flex-col rounded-xl bg-[#131a33] border border-[#212942] p-4 shadow-md gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">
                  inventory
                </span>
                <h3 className="text-[15px] font-semibold text-[#dbe1ff]">
                  Precios Sombra y Factibilidad de Recursos ($b_i$)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#8c909f]">Lado Derecho (RHS)</span>
            </div>

            <p className="text-[12px] text-[#c2c6d6]">
              El precio sombra representa el incremento en la utilidad total ($Z$) al disponer de una
              unidad adicional del recurso:
            </p>

            <div className="flex flex-col gap-2.5">
              {solution.sensitivity.rhs.map((item) => (
                <div
                  key={item.constraintId}
                  className="p-3 rounded-lg bg-[#171e37] border border-[#212942] flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] font-bold text-[#ffb95f]">
                        R{item.constraintNumber}
                      </span>
                      <span className="text-[13px] font-semibold text-[#dbe1ff] truncate">
                        {item.constraintName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold ${
                          item.isBinding
                            ? 'bg-[#ffb95f]/20 text-[#ffb95f]'
                            : 'bg-[#4edea3]/20 text-[#4edea3]'
                        }`}
                      >
                        {item.isBinding ? 'Cuello de Botella' : 'Holgura Disponible'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[12px] bg-[#050d25] p-2 rounded-lg border border-[#212942]/60">
                    <div>
                      <span className="text-[#8c909f] block text-[10px]">Precio Sombra (Dual)</span>
                      <span className="font-mono font-bold text-[#4edea3] text-[13px]">
                        ${item.shadowPrice} / unidad
                      </span>
                    </div>

                    <div>
                      <span className="text-[#8c909f] block text-[10px]">Disponibilidad Actual</span>
                      <span className="font-mono font-bold text-[#dbe1ff] text-[13px]">
                        {item.currentValue} unidades
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8c909f]">
                    <span>
                      Mínimo factible: <strong className="text-[#dbe1ff]">{item.allowableMin}</strong>
                    </span>
                    <span>
                      Máximo factible: <strong className="text-[#dbe1ff]">{item.allowableMax}</strong>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* Action Navigation */}
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={onNavigateToGraph}
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] border border-[#212942] font-semibold text-[13px] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">show_chart</span>
          <span>Volver al Gráfico 2D</span>
        </button>

        <button
          onClick={onNavigateToEditor}
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#212942] hover:bg-[#2c344d] text-[#adc6ff] font-bold text-[13px] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">tune</span>
          <span>Modificar Formulación</span>
        </button>
      </div>
    </div>
  );
};
