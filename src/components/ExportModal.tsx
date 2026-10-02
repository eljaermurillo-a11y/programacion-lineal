import React, { useState } from 'react';
import { LPModel, LPSolution } from '../types/lp';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  model: LPModel;
  solution: LPSolution;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  model,
  solution
}) => {
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const v1 = model.variables[0];
  const v2 = model.variables[1];

  const generateLatex = () => {
    let text = `\\begin{aligned}\n`;
    text += `\\text{${model.type === 'MAX' ? 'Maximizar' : 'Minimizar'}} \\quad Z &= `;
    text += model.variables.map((v) => `${v.cost} X_{${v.id}}`).join(' + ');
    text += `\\\\\n\\text{sujeto a:} \\quad &\\\\\n`;
    model.constraints.forEach((c) => {
      const expr = model.variables
        .map((v) => `${c.coefficients[v.id] ?? 0} X_{${v.id}}`)
        .join(' + ');
      const op = c.operator === '<=' ? '\\le' : c.operator === '>=' ? '\\ge' : '=';
      text += `&${expr} ${op} ${c.rhs} \\\\\n`;
    });
    text += `&X_j \\ge 0 \\quad \\forall j\n`;
    text += `\\end{aligned}`;
    return text;
  };

  const generateSummaryText = () => {
    let t = `INFORME DE OPTIMIZACIÓN LINEAL — OPTILINEAR\n`;
    t += `=================================================\n`;
    t += `Modelo: ${model.title}\n`;
    t += `Objetivo: ${model.type} Z (${model.targetName})\n`;
    t += `Función: Z = ${model.variables.map((v) => `${v.cost}·${v.symbol}`).join(' + ')}\n\n`;
    t += `RESULTADOS ÓPTIMOS:\n`;
    t += `Z* Óptimo = $${solution.optimalZ} ${model.unit}\n`;
    model.variables.forEach((v) => {
      t += `${v.symbol} (${v.name}): ${solution.variables[v.id] ?? 0} ${v.unit}\n`;
    });
    t += `\nESTADO DE RESTRICCIONES:\n`;
    model.constraints.forEach((c) => {
      const slack = solution.slacks[c.id] ?? 0;
      const sp = solution.shadowPrices[c.id] ?? 0;
      const isBinding = solution.bindingConstraints.includes(c.id);
      t += `- R${c.number} (${c.name}): ${
        isBinding ? 'SATURADA (Holgura = 0)' : `Holgura = ${slack} ${c.unit}`
      }, Precio Sombra = $${sp}\n`;
    });
    return t;
  };

  const handleCopy = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleDownloadJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(model, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `${model.id || 'modelo-optilinear'}.json`);
    dlAnchor.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-[#131a33] border border-[#212942] rounded-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#212942]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#4edea3] text-[22px]">
              description
            </span>
            <h2 className="text-[17px] font-bold text-[#dbe1ff]">
              Exportar Informe Técnico
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
        <div className="p-4 overflow-y-auto flex flex-col gap-4">
          {/* Quick Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleCopy(generateLatex(), 'latex')}
              type="button"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171e37] hover:bg-[#212942] border border-[#212942] text-center transition-all group"
            >
              <span className="material-symbols-outlined text-[20px] text-[#adc6ff] mb-1 group-hover:scale-110 transition-transform">
                functions
              </span>
              <span className="text-[11px] font-bold text-[#dbe1ff]">
                {copiedType === 'latex' ? '¡Copiado!' : 'Copiar LaTeX'}
              </span>
            </button>

            <button
              onClick={() => handleCopy(generateSummaryText(), 'summary')}
              type="button"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171e37] hover:bg-[#212942] border border-[#212942] text-center transition-all group"
            >
              <span className="material-symbols-outlined text-[20px] text-[#4edea3] mb-1 group-hover:scale-110 transition-transform">
                content_copy
              </span>
              <span className="text-[11px] font-bold text-[#dbe1ff]">
                {copiedType === 'summary' ? '¡Copiado!' : 'Copiar Texto'}
              </span>
            </button>

            <button
              onClick={handleDownloadJSON}
              type="button"
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#171e37] hover:bg-[#212942] border border-[#212942] text-center transition-all group"
            >
              <span className="material-symbols-outlined text-[20px] text-[#ffb95f] mb-1 group-hover:scale-110 transition-transform">
                download
              </span>
              <span className="text-[11px] font-bold text-[#dbe1ff]">Descargar JSON</span>
            </button>
          </div>

          {/* Preview box */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider font-mono">
              Vista Previa del Dictamen Analítico
            </span>
            <pre className="p-3 rounded-xl bg-[#050d25] border border-[#212942] text-[12px] font-mono text-[#c2c6d6] overflow-x-auto whitespace-pre-wrap leading-relaxed select-all">
              {generateSummaryText()}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#212942] flex items-center justify-end gap-2 bg-[#050d25]/60">
          <button
            onClick={onClose}
            type="button"
            className="px-4 py-2 rounded-xl bg-[#171e37] text-[#c2c6d6] hover:text-[#dbe1ff] text-[13px] font-medium"
          >
            Cerrar
          </button>
          <button
            onClick={handlePrint}
            type="button"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#4edea3] text-[#003824] font-bold text-[13px] hover:bg-[#6ffbbe] shadow-md"
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            <span>Imprimir Informe</span>
          </button>
        </div>
      </div>
    </div>
  );
};
