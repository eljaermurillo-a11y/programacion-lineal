import React, { useState } from 'react';
import { LPModel, StructuralConstraint, DecisionVariable } from '../types/lp';

interface MatrixEditorProps {
  model: LPModel;
  onUpdateModel: (newModel: LPModel) => void;
  onSolveAndNavigate: () => void;
}

export const MatrixEditor: React.FC<MatrixEditorProps> = ({
  model,
  onUpdateModel,
  onSolveAndNavigate
}) => {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  const m = model.constraints.length;
  const n = model.variables.length;

  // Handle cell edit in matrix A: A[rowIdx][varId]
  const handleMatrixCellChange = (constraintId: string, varId: string, value: string) => {
    const num = parseFloat(value);
    const updatedConstraints = model.constraints.map((c) => {
      if (c.id === constraintId) {
        return {
          ...c,
          coefficients: {
            ...c.coefficients,
            [varId]: isNaN(num) ? 0 : num
          }
        };
      }
      return c;
    });
    onUpdateModel({ ...model, constraints: updatedConstraints });
  };

  // Handle RHS limit change (vector b)
  const handleRhsChange = (constraintId: string, value: string) => {
    const num = parseFloat(value);
    const updatedConstraints = model.constraints.map((c) => {
      if (c.id === constraintId) {
        return {
          ...c,
          rhs: isNaN(num) ? 0 : num
        };
      }
      return c;
    });
    onUpdateModel({ ...model, constraints: updatedConstraints });
  };

  // Handle operator change
  const handleOpChange = (constraintId: string, op: '<=' | '>=' | '=') => {
    const updatedConstraints = model.constraints.map((c) => {
      if (c.id === constraintId) {
        return { ...c, operator: op };
      }
      return c;
    });
    onUpdateModel({ ...model, constraints: updatedConstraints });
  };

  // Handle objective cost change (vector c)
  const handleCostChange = (varId: string, value: string) => {
    const num = parseFloat(value);
    const updatedVars = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, cost: isNaN(num) ? 0 : num };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updatedVars });
  };

  // Handle variable lower bound change (restricción inferior)
  const handleLowerBoundChange = (varId: string, value: string) => {
    const num = parseFloat(value);
    const updatedVars = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, lowerBound: isNaN(num) ? 0 : Math.max(0, num) };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updatedVars });
  };

  // Handle variable upper bound change (restricción superior / cota)
  const handleUpperBoundChange = (varId: string, value: string) => {
    const num = parseFloat(value);
    const updatedVars = model.variables.map((v) => {
      if (v.id === varId) {
        return {
          ...v,
          upperBound: isNaN(num) || value.trim() === '' ? undefined : num
        };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updatedVars });
  };

  // Handle variable name change
  const handleVarNameChange = (varId: string, name: string) => {
    const updatedVars = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, name };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updatedVars });
  };

  // Handle constraint name change
  const handleConstraintNameChange = (constraintId: string, name: string) => {
    const updatedConstraints = model.constraints.map((c) => {
      if (c.id === constraintId) {
        return { ...c, name };
      }
      return c;
    });
    onUpdateModel({ ...model, constraints: updatedConstraints });
  };

  // Add new column (Variable) to matrix
  const handleAddColumn = () => {
    const newIdx = model.variables.length + 1;
    const newVarId = `x${newIdx}`;
    const newSymbol = `X${newIdx === 3 ? '₃' : newIdx === 4 ? '₄' : newIdx}`;

    const newVar: DecisionVariable = {
      id: newVarId,
      symbol: newSymbol,
      name: `Variable ${newIdx}`,
      unit: 'unidades',
      cost: 10,
      lowerBound: 0
    };

    const updatedConstraints = model.constraints.map((c) => ({
      ...c,
      coefficients: {
        ...c.coefficients,
        [newVarId]: 1
      }
    }));

    onUpdateModel({
      ...model,
      dimension: model.variables.length + 1 === 2 ? '2d' : 'nd',
      variables: [...model.variables, newVar],
      constraints: updatedConstraints
    });
  };

  // Delete column (Variable)
  const handleDeleteColumn = (varId: string) => {
    if (model.variables.length <= 2) {
      alert('Se requieren al menos 2 variables en el modelo.');
      return;
    }
    const updatedVars = model.variables.filter((v) => v.id !== varId);
    const updatedConstraints = model.constraints.map((c) => {
      const copy = { ...c.coefficients };
      delete copy[varId];
      return { ...c, coefficients: copy };
    });

    onUpdateModel({
      ...model,
      dimension: updatedVars.length === 2 ? '2d' : 'nd',
      variables: updatedVars,
      constraints: updatedConstraints
    });
  };

  // Add new row (Constraint) to matrix
  const handleAddRow = () => {
    const newNumber = model.constraints.length + 1;
    const newId = `r${Date.now()}`;
    const defaultCoeffs: Record<string, number> = {};
    model.variables.forEach((v) => {
      defaultCoeffs[v.id] = 1;
    });

    const newConstraint: StructuralConstraint = {
      id: newId,
      number: newNumber,
      name: `Restricción R${newNumber}`,
      description: 'Límite operativo de recursos',
      coefficients: defaultCoeffs,
      operator: '<=',
      rhs: 100,
      unit: 'unidades',
      consumptionFormula: `R${newNumber}`,
      slackLabel: `HOLGURA S${newNumber}`,
      statusType: 'slack'
    };

    onUpdateModel({
      ...model,
      constraints: [...model.constraints, newConstraint]
    });
  };

  // Delete row (Constraint)
  const handleDeleteRow = (constraintId: string) => {
    if (model.constraints.length <= 1) {
      alert('El problema debe contener al menos 1 restricción.');
      return;
    }
    const updatedConstraints = model.constraints
      .filter((c) => c.id !== constraintId)
      .map((c, idx) => ({ ...c, number: idx + 1 }));
    onUpdateModel({ ...model, constraints: updatedConstraints });
  };

  // Duplicate a constraint row
  const handleDuplicateRow = (constraint: StructuralConstraint) => {
    const newNumber = model.constraints.length + 1;
    const newId = `r${Date.now()}`;
    const duplicated: StructuralConstraint = {
      ...constraint,
      id: newId,
      number: newNumber,
      name: `${constraint.name} (Copia)`,
      coefficients: { ...constraint.coefficients }
    };
    onUpdateModel({
      ...model,
      constraints: [...model.constraints, duplicated]
    });
  };

  // Parse pasted matrix from CSV/Excel or plain text
  const handleImportMatrixSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setImportError(null);

    try {
      const lines = importText
        .trim()
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (lines.length === 0) {
        setImportError('Ingresa al menos una fila con números.');
        return;
      }

      // Check if first line is objective or constraints
      // Format example:
      // Line 1 (optional C vector): 50, 40 (or with MAX)
      // Next lines: 2, 1, <=, 100
      const parsedRows: { coeffs: number[]; op: '<=' | '>=' | '='; rhs: number }[] = [];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].replace(/;/g, ',').replace(/\t/g, ' ');
        const tokens = line.split(/[\s,]+/).filter(Boolean);

        // Find operator if any
        let opIdx = tokens.findIndex((t) => ['<=', '>=', '=', '<', '>', '=<', '=>'].includes(t));
        let op: '<=' | '>=' | '=' = '<=';
        let rhs = 100;
        let coeffs: number[] = [];

        if (opIdx !== -1) {
          const rawOp = tokens[opIdx];
          if (rawOp.includes('>')) op = '>=';
          else if (rawOp === '=') op = '=';
          else op = '<=';

          coeffs = tokens.slice(0, opIdx).map((t) => parseFloat(t));
          rhs = parseFloat(tokens[opIdx + 1]) || 0;
        } else {
          // If no operator, treat last number as RHS
          const nums = tokens.map((t) => parseFloat(t)).filter((n) => !isNaN(n));
          if (nums.length >= 2) {
            rhs = nums[nums.length - 1];
            coeffs = nums.slice(0, nums.length - 1);
          }
        }

        if (coeffs.length > 0) {
          parsedRows.push({ coeffs, op, rhs });
        }
      }

      if (parsedRows.length === 0) {
        setImportError('No se pudieron reconocer filas de coeficientes válidas.');
        return;
      }

      // Determine number of variables from maximum columns found
      const numVars = Math.max(...parsedRows.map((r) => r.coeffs.length), 2);
      const newVars: DecisionVariable[] = Array.from({ length: numVars }, (_, i) => {
        const existing = model.variables[i];
        return {
          id: `x${i + 1}`,
          symbol: `X${i === 0 ? '₁' : i === 1 ? '₂' : i === 2 ? '₃' : i + 1}`,
          name: existing ? existing.name : `Variable ${i + 1}`,
          unit: existing ? existing.unit : 'unidades',
          cost: existing ? existing.cost : 20 + i * 10,
          lowerBound: 0
        };
      });

      const newConstraints: StructuralConstraint[] = parsedRows.map((row, i) => {
        const coeffMap: Record<string, number> = {};
        newVars.forEach((v, vIdx) => {
          coeffMap[v.id] = row.coeffs[vIdx] ?? 0;
        });

        return {
          id: `r${Date.now()}_${i}`,
          number: i + 1,
          name: `Restricción R${i + 1}`,
          description: `Frontera estructural importada`,
          coefficients: coeffMap,
          operator: row.op,
          rhs: row.rhs,
          unit: 'unidades',
          slackLabel: `HOLGURA S${i + 1}`,
          statusType: 'slack'
        };
      });

      onUpdateModel({
        ...model,
        dimension: numVars === 2 ? '2d' : 'nd',
        variables: newVars,
        constraints: newConstraints
      });

      setShowImportModal(false);
      setImportText('');
    } catch {
      setImportError('Error de formato. Asegúrate de separar los números con espacios o comas.');
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header Info & Matrix Dimensions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#050d25] border border-[#212942] shadow-inner">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#4c8eff]/20 text-[#adc6ff] flex items-center justify-center font-mono font-bold text-[14px]">
            A
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-[#dbe1ff]">
                Matriz Canónica de Coeficientes
              </span>
              <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#171e37] text-[#4edea3] font-bold border border-[#4edea3]/30">
                A ∈ ℝ^{m}ˣ^{n}
              </span>
            </div>
            <span className="text-[11px] text-[#8c909f] font-mono mt-0.5">
              Sistema canónico: A · x {'{≤, ≥, =}'} b | Vector c^T · x
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImportModal(true)}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#adc6ff] font-semibold text-[12px] border border-[#2c344d] transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">file_upload</span>
            <span>Importar / Pegar Matriz</span>
          </button>
        </div>
      </div>

      {/* Spreadsheet / Matrix Table Container */}
      <div className="overflow-x-auto rounded-xl border border-[#212942] bg-[#050d25] shadow-xl">
        <table className="w-full text-center font-mono text-[12px] border-collapse min-w-[650px]">
          <thead>
            {/* Columns header */}
            <tr className="border-b border-[#212942] bg-[#131a33] text-[#adc6ff]">
              <th className="py-2.5 px-3 text-left w-48 min-w-[190px]">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Ecuación / Recurso</span>
                  <span className="text-[10px] text-[#8c909f]">Fila</span>
                </div>
              </th>

              {model.variables.map((v, vIdx) => (
                <th key={v.id} className="py-2.5 px-2 min-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-[#4edea3] text-[13px]">{v.symbol}</span>
                      {model.variables.length > 2 && (
                        <button
                          onClick={() => handleDeleteColumn(v.id)}
                          title={`Eliminar columna ${v.symbol}`}
                          type="button"
                          className="w-4 h-4 rounded text-[#8c909f] hover:text-[#ffb4ab] flex items-center justify-center text-[10px]"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => handleVarNameChange(v.id, e.target.value)}
                      className="w-full bg-[#171e37] border border-[#2c344d] rounded px-1.5 py-0.5 text-center text-[10px] text-[#dbe1ff] focus:outline-none"
                    />
                  </div>
                </th>
              ))}

              <th className="py-2.5 px-2 w-16 text-center text-[#8c909f]">Op.</th>
              <th className="py-2.5 px-2 min-w-[100px] text-center text-[#ffb95f]">
                Límite (b)
              </th>
              <th className="py-2.5 px-2 w-20 text-center text-[#8c909f]">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {/* Row: Objective Function (Vector c^T) */}
            <tr className="border-b-2 border-[#4c8eff]/50 bg-[#171e37]/70 text-[#dbe1ff]">
              <td className="py-3 px-3 text-left font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[#ffb95f]"></span>
                  <span className="text-[#ffb95f]">
                    {model.type === 'MAX' ? 'Max Z' : 'Min Z'} (Vector c)
                  </span>
                </div>
                <span className="text-[10px] text-[#8c909f] block">
                  {model.targetName} ({model.unit})
                </span>
              </td>

              {model.variables.map((v) => (
                <td key={`c-${v.id}`} className="py-3 px-2">
                  <div className="flex flex-col items-center gap-0.5">
                    <input
                      type="number"
                      value={v.cost}
                      onChange={(e) => handleCostChange(v.id, e.target.value)}
                      className="w-20 bg-[#050d25] border border-[#ffb95f]/40 text-center rounded py-1 font-bold text-[#ffb95f] text-[14px] focus:outline-none focus:border-[#ffb95f]"
                    />
                    <span className="text-[9px] text-[#8c909f] font-sans">Margen ($)</span>
                  </div>
                </td>
              ))}

              <td className="py-3 px-2 text-[#8c909f] font-bold">=</td>
              <td className="py-3 px-2 font-bold text-[#4edea3]">Z*</td>
              <td className="py-3 px-2">
                <span className="text-[10px] text-[#8c909f]">Objetivo</span>
              </td>
            </tr>

            {/* Matrix A Rows: Constraints */}
            {model.constraints.map((c, rIdx) => (
              <tr
                key={c.id}
                className="border-b border-[#212942]/60 hover:bg-[#131a33]/60 transition-colors"
              >
                {/* Constraint Name & Number */}
                <td className="py-2.5 px-3 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#adc6ff] font-bold text-[12px]">R{c.number}:</span>
                    <input
                      type="text"
                      value={c.name}
                      onChange={(e) => handleConstraintNameChange(c.id, e.target.value)}
                      className="bg-transparent hover:bg-[#171e37] border border-transparent hover:border-[#2c344d] rounded px-1 text-[12px] text-[#dbe1ff] focus:outline-none focus:bg-[#171e37] focus:border-[#4c8eff] w-full"
                    />
                  </div>
                </td>

                {/* Matrix Coefficients A[i][j] */}
                {model.variables.map((v) => {
                  const val = c.coefficients[v.id] ?? 0;
                  return (
                    <td key={`cell-${c.id}-${v.id}`} className="py-2.5 px-2">
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleMatrixCellChange(c.id, v.id, e.target.value)}
                        className="w-20 bg-[#171e37] border border-[#2c344d] text-center rounded py-1 font-bold text-[#adc6ff] text-[13px] focus:outline-none focus:border-[#4c8eff] hover:border-[#adc6ff]/50"
                      />
                    </td>
                  );
                })}

                {/* Operator Selector */}
                <td className="py-2.5 px-2">
                  <select
                    value={c.operator}
                    onChange={(e) => handleOpChange(c.id, e.target.value as '<=' | '>=' | '=')}
                    className="bg-[#171e37] border border-[#2c344d] text-center rounded py-1 px-1 font-bold text-[#4edea3] focus:outline-none cursor-pointer"
                  >
                    <option value="<=">≤</option>
                    <option value=">=">≥</option>
                    <option value="=">=</option>
                  </select>
                </td>

                {/* RHS (vector b) */}
                <td className="py-2.5 px-2">
                  <input
                    type="number"
                    value={c.rhs}
                    onChange={(e) => handleRhsChange(c.id, e.target.value)}
                    className="w-20 bg-[#171e37] border border-[#ffb95f]/40 text-center rounded py-1 font-bold text-[#ffb95f] text-[13px] focus:outline-none focus:border-[#ffb95f]"
                  />
                </td>

                {/* Row Actions */}
                <td className="py-2.5 px-2">
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => handleDuplicateRow(c)}
                      title="Duplicar fila"
                      type="button"
                      className="w-6 h-6 rounded bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] flex items-center justify-center text-[13px]"
                    >
                      <span className="material-symbols-outlined text-[14px]">content_copy</span>
                    </button>
                    <button
                      onClick={() => handleDeleteRow(c.id)}
                      title="Eliminar fila"
                      type="button"
                      className="w-6 h-6 rounded bg-[#171e37] hover:bg-[#ffb4ab]/20 text-[#c2c6d6] hover:text-[#ffb4ab] flex items-center justify-center text-[13px]"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {/* Variable Direct Bounds Row (Restricciones a los coeficientes y cotas) */}
            <tr className="bg-[#131a33]/80 border-t-2 border-[#212942] text-[#c2c6d6]">
              <td className="py-3 px-3 text-left font-semibold">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#4edea3] text-[16px]">
                    tune
                  </span>
                  <span>Cotas de Variables</span>
                </div>
                <span className="text-[10px] text-[#8c909f]">Lⱼ ≤ Xⱼ ≤ Uⱼ</span>
              </td>

              {model.variables.map((v) => (
                <td key={`bounds-${v.id}`} className="py-3 px-2">
                  <div className="flex flex-col items-center gap-1">
                    {/* Lower Bound */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#8c909f]">Mín:</span>
                      <input
                        type="number"
                        placeholder="0"
                        value={v.lowerBound}
                        onChange={(e) => handleLowerBoundChange(v.id, e.target.value)}
                        className="w-14 bg-[#050d25] border border-[#2c344d] text-center rounded py-0.5 text-[11px] text-[#4edea3]"
                      />
                    </div>
                    {/* Upper Bound */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-[#8c909f]">Máx:</span>
                      <input
                        type="number"
                        placeholder="∞"
                        value={v.upperBound ?? ''}
                        onChange={(e) => handleUpperBoundChange(v.id, e.target.value)}
                        className="w-14 bg-[#050d25] border border-[#2c344d] text-center rounded py-0.5 text-[11px] text-[#adc6ff]"
                      />
                    </div>
                  </div>
                </td>
              ))}

              <td className="py-3 px-2 text-[#8c909f]">—</td>
              <td className="py-3 px-2 text-[11px] font-mono text-[#4edea3]">Xⱼ ≥ 0</td>
              <td className="py-3 px-2 text-[10px] text-[#8c909f]">Límites</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Matrix Controls & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddRow}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#dbe1ff] border border-[#2c344d] text-[12px] font-semibold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px] text-[#4edea3]">add_circle</span>
            <span>+ Fila (Restricción R{model.constraints.length + 1})</span>
          </button>

          <button
            onClick={handleAddColumn}
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#dbe1ff] border border-[#2c344d] text-[12px] font-semibold transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px] text-[#adc6ff]">view_column</span>
            <span>+ Columna (Variable X{model.variables.length + 1})</span>
          </button>
        </div>

        <button
          onClick={onSolveAndNavigate}
          type="button"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] font-bold text-[13px] shadow-lg shadow-[#4edea3]/20 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-[18px]">calculate</span>
          <span>Calcular con esta Matriz</span>
        </button>
      </div>

      {/* Modal: Import / Paste Raw Matrix */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleImportMatrixSubmit}
            className="w-full max-w-lg bg-[#131a33] border border-[#212942] rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#212942] pb-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4c8eff] text-[20px]">
                  content_paste
                </span>
                <h3 className="text-[16px] font-bold text-[#dbe1ff]">
                  Pegar / Importar Matriz de Coeficientes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-[#8c909f] hover:text-[#dbe1ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <p className="text-[12px] text-[#c2c6d6] leading-relaxed">
              Pega aquí las filas de tu problema desde Excel o texto. Cada fila representa una
              restricción con sus coeficientes, operador y lado derecho:
            </p>

            <div className="p-2.5 rounded-lg bg-[#050d25] border border-[#212942] text-[11px] font-mono text-[#8c909f]">
              <span className="text-[#4edea3] font-bold block mb-1">Ejemplo de entrada:</span>
              2 1 &lt;= 100<br />
              1 1 &lt;= 80<br />
              1 3 &lt;= 180
            </div>

            <textarea
              rows={6}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`2 1 <= 100\n1 1 <= 80\n1 3 <= 180`}
              className="w-full bg-[#050d25] border border-[#2c344d] rounded-xl p-3 font-mono text-[13px] text-[#dbe1ff] focus:outline-none focus:border-[#4c8eff] leading-relaxed"
              required
            />

            {importError && (
              <span className="text-[12px] text-[#ffb4ab] font-mono">{importError}</span>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#212942]">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:bg-[#212942] text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#4edea3] text-[#003824] font-bold text-[13px] hover:bg-[#6ffbbe]"
              >
                Cargar en la Matriz
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
