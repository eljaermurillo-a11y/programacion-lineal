import React, { useState, useEffect } from 'react';
import { LPModel, StructuralConstraint, DecisionVariable } from '../types/lp';
import { MatrixEditor } from './MatrixEditor';
import { parseObjectiveFormula, buildFormulaString, normalizeVarSymbol } from '../utils/formulaParser';

interface EditorViewProps {
  model: LPModel;
  onUpdateModel: (newModel: LPModel) => void;
  onSolveAndNavigate: () => void;
  onLoadCase: (id: string) => void;
  onOpenLibrary: () => void;
}

export const EditorView: React.FC<EditorViewProps> = ({
  model,
  onUpdateModel,
  onSolveAndNavigate,
  onLoadCase,
  onOpenLibrary
}) => {
  const [viewMode, setViewMode] = useState<'cards' | 'matrix'>('cards');
  const [isSolving, setIsSolving] = useState(false);
  const [editingVar, setEditingVar] = useState<DecisionVariable | null>(null);
  const [isAddingVar, setIsAddingVar] = useState(false);
  const [isAddingConstraint, setIsAddingConstraint] = useState(false);

  // New variable form
  const [newVarName, setNewVarName] = useState('');
  const [newVarUnit, setNewVarUnit] = useState('unidades / mes');
  const [newVarCost, setNewVarCost] = useState(30);

  // New constraint form
  const [newConsName, setNewConsName] = useState('');
  const [newConsDesc, setNewConsDesc] = useState('');
  const [newConsRhs, setNewConsRhs] = useState(100);
  const [newConsOp, setNewConsOp] = useState<'<=' | '>=' | '='>('<=');
  const [newConsCoeffs, setNewConsCoeffs] = useState<Record<string, number>>({ x1: 1, x2: 1 });

  // Direct formula text editing state
  const [formulaInput, setFormulaInput] = useState(() =>
    buildFormulaString(model.type, model.variables)
  );
  const [formulaError, setFormulaError] = useState<string | null>(null);
  const [isFormulaInputFocused, setIsFormulaInputFocused] = useState(false);

  // Sync formula text whenever model variables change from other sources
  useEffect(() => {
    if (!isFormulaInputFocused) {
      setFormulaInput(buildFormulaString(model.type, model.variables));
      setFormulaError(null);
    }
  }, [model.type, model.variables, isFormulaInputFocused]);

  const is2D = model.variables.length === 2;
  const v1 = model.variables[0];
  const v2 = model.variables[1];

  // Direct text formula editing handler
  const handleFormulaInputChange = (text: string) => {
    setFormulaInput(text);
    const parsed = parseObjectiveFormula(text);

    if (parsed.isValid && parsed.terms.length > 0) {
      setFormulaError(null);

      // Match terms to existing variables or create new ones
      const existingVars = [...model.variables];
      const newVars: DecisionVariable[] = [];
      const updatedConstraints = model.constraints.map((c) => ({
        ...c,
        coefficients: { ...c.coefficients }
      }));

      parsed.terms.forEach((term, idx) => {
        const normSym = term.varSymbol;
        let matched = existingVars.find((v) => {
          const vSym = normalizeVarSymbol(v.symbol || v.id);
          return vSym === normSym || v.id.toUpperCase() === normSym;
        });

        if (matched) {
          newVars.push({
            ...matched,
            cost: term.coeff
          });
        } else {
          // Create new variable seamlessly
          const newIdx = newVars.length + 1;
          const newVarId = `x${newIdx}`;
          const subscriptNumber =
            newIdx === 1 ? '₁' : newIdx === 2 ? '₂' : newIdx === 3 ? '₃' : newIdx === 4 ? '₄' : `${newIdx}`;
          const createdVar: DecisionVariable = {
            id: newVarId,
            symbol: `X${subscriptNumber}`,
            name: `Variable ${normSym}`,
            unit: 'unidades',
            cost: term.coeff,
            lowerBound: 0
          };
          newVars.push(createdVar);

          // Update constraints with default coefficient 1
          updatedConstraints.forEach((c) => {
            if (c.coefficients[newVarId] === undefined) {
              c.coefficients[newVarId] = 1;
            }
          });
        }
      });

      if (newVars.length >= 2) {
        onUpdateModel({
          ...model,
          type: parsed.type || model.type,
          dimension: newVars.length === 2 ? '2d' : 'nd',
          variables: newVars,
          constraints: updatedConstraints
        });
      } else if (newVars.length === 1) {
        const secondVar = existingVars[1] || {
          id: 'x2',
          symbol: 'X₂',
          name: 'Producto B',
          unit: 'unidades',
          cost: 40,
          lowerBound: 0
        };
        onUpdateModel({
          ...model,
          type: parsed.type || model.type,
          variables: [newVars[0], secondVar],
          constraints: updatedConstraints
        });
      }
    } else {
      if (text.trim().length > 3) {
        setFormulaError(parsed.errorMessage || 'Sintaxis de fórmula incompleta...');
      }
    }
  };

  // Add a new term (+ or -) to formula text
  const handleAddFormulaTerm = (sign: '+' | '-') => {
    const nextIdx = model.variables.length + 1;
    const defaultCoeff = 20;
    const nextVarSymbol = `X${nextIdx}`;
    const appendStr = ` ${sign} ${defaultCoeff}*${nextVarSymbol}`;
    const newFormula = formulaInput + appendStr;
    handleFormulaInputChange(newFormula);
  };

  // Scale all coefficients in the formula (x2 or /2)
  const handleScaleFormula = (factor: number) => {
    const updatedVars = model.variables.map((v) => ({
      ...v,
      cost: Math.round(v.cost * factor * 100) / 100
    }));
    onUpdateModel({ ...model, variables: updatedVars });
  };

  // Invert signs (+ <-> -)
  const handleInvertFormulaSigns = () => {
    const updatedVars = model.variables.map((v) => ({
      ...v,
      cost: -v.cost
    }));
    onUpdateModel({ ...model, variables: updatedVars });
  };

  const handleSetType = (type: 'MAX' | 'MIN') => {
    onUpdateModel({
      ...model,
      type
    });
  };

  const handleUpdateCost = (varId: string, delta: number) => {
    const updated = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, cost: Math.max(0, v.cost + delta) };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updated });
  };

  const handleSetCostInput = (varId: string, val: number) => {
    const updated = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, cost: isNaN(val) ? 0 : Math.max(0, val) };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updated });
  };

  // Variable bounds update (cotas y restricciones a los coeficientes)
  const handleUpdateLowerBound = (varId: string, val: number) => {
    const updated = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, lowerBound: isNaN(val) ? 0 : Math.max(0, val) };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updated });
  };

  const handleUpdateUpperBound = (varId: string, val: string) => {
    const num = parseFloat(val);
    const updated = model.variables.map((v) => {
      if (v.id === varId) {
        return { ...v, upperBound: isNaN(num) || val.trim() === '' ? undefined : num };
      }
      return v;
    });
    onUpdateModel({ ...model, variables: updated });
  };

  const handleUpdateConstraintCoeff = (cId: string, varId: string, val: number) => {
    const updated = model.constraints.map((c) => {
      if (c.id === cId) {
        return {
          ...c,
          coefficients: {
            ...c.coefficients,
            [varId]: isNaN(val) ? 0 : val
          }
        };
      }
      return c;
    });
    onUpdateModel({ ...model, constraints: updated });
  };

  const handleUpdateConstraintOp = (cId: string, op: '<=' | '>=' | '=') => {
    const updated = model.constraints.map((c) => (c.id === cId ? { ...c, operator: op } : c));
    onUpdateModel({ ...model, constraints: updated });
  };

  const handleUpdateConstraintRhs = (cId: string, rhs: number) => {
    const updated = model.constraints.map((c) =>
      c.id === cId ? { ...c, rhs: isNaN(rhs) ? 0 : rhs } : c
    );
    onUpdateModel({ ...model, constraints: updated });
  };

  const handleDeleteConstraint = (cId: string) => {
    if (model.constraints.length <= 1) {
      alert('Se requiere al menos 1 restricción.');
      return;
    }
    const updated = model.constraints
      .filter((c) => c.id !== cId)
      .map((c, i) => ({ ...c, number: i + 1 }));
    onUpdateModel({ ...model, constraints: updated });
  };

  const handleDuplicateConstraint = (c: StructuralConstraint) => {
    const newNumber = model.constraints.length + 1;
    const duplicated: StructuralConstraint = {
      ...c,
      id: `r${Date.now()}`,
      number: newNumber,
      name: `${c.name} (Copia)`,
      coefficients: { ...c.coefficients }
    };
    onUpdateModel({ ...model, constraints: [...model.constraints, duplicated] });
  };

  const handleDeleteVariable = (varId: string) => {
    if (model.variables.length <= 2) {
      alert('Se requieren al menos 2 variables de decisión.');
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

  const handleAddVariableSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newIdx = model.variables.length + 1;
    const newVarId = `x${newIdx}`;
    const newSymbol = `X${newIdx === 3 ? '₃' : newIdx === 4 ? '₄' : newIdx}`;

    const newVar: DecisionVariable = {
      id: newVarId,
      symbol: newSymbol,
      name: newVarName.trim() || `Producto ${newIdx}`,
      unit: newVarUnit.trim() || 'unidades',
      cost: Number(newVarCost) || 0,
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

    setIsAddingVar(false);
    setNewVarName('');
  };

  const handleAddConstraintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newNumber = model.constraints.length + 1;
    const newId = `r${Date.now()}`;

    const newConstraint: StructuralConstraint = {
      id: newId,
      number: newNumber,
      name: newConsName.trim() || `Restricción R${newNumber}`,
      description: newConsDesc.trim() || 'Límite operativo de recursos',
      coefficients: { ...newConsCoeffs },
      operator: newConsOp,
      rhs: Number(newConsRhs) || 100,
      unit: 'unidades',
      consumptionFormula: `R${newNumber}`,
      slackLabel: `HOLGURA S${newNumber}`,
      statusType: 'slack'
    };

    onUpdateModel({
      ...model,
      constraints: [...model.constraints, newConstraint]
    });

    setIsAddingConstraint(false);
    setNewConsName('');
    setNewConsDesc('');
  };

  const handleSolve = () => {
    setIsSolving(true);
    setTimeout(() => {
      setIsSolving(false);
      onSolveAndNavigate();
    }, 400);
  };

  return (
    <div className="flex flex-col w-full max-w-3xl mx-auto px-4 sm:px-6 pt-4 pb-28 gap-5">
      {/* Step Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#adc6ff] uppercase tracking-widest font-mono">
              Paso 1 • Formulación y Matriz
            </span>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#dbe1ff] tracking-tight">
              Definición del Problema Lineal
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#212942] text-[#4edea3] border border-[#4edea3]/20 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-ping"></span>
            <span className="text-[12px] font-mono font-bold">VÁLIDO</span>
          </div>
        </div>

        <p className="text-[13px] text-[#c2c6d6] leading-relaxed">
          Configura el objetivo analítico, variables de decisión, cotas de frontera y matriz de
          restricciones estructurales.
        </p>

        {/* View Mode Toggle: Tarjetas vs Matriz A·x ≤ b */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#050d25] border border-[#212942] gap-1 shadow-inner mt-1">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all ${
              viewMode === 'cards'
                ? 'bg-[#171e37] text-[#4edea3] border border-[#4edea3]/40 shadow-sm font-bold'
                : 'text-[#8c909f] hover:text-[#dbe1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">dashboard</span>
            <span>Vista Tarjetas</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-[13px] font-semibold transition-all ${
              viewMode === 'matrix'
                ? 'bg-[#171e37] text-[#adc6ff] border border-[#4c8eff]/40 shadow-sm font-bold'
                : 'text-[#8c909f] hover:text-[#dbe1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">grid_on</span>
            <span>Editor Matricial (A · x ≤ b)</span>
          </button>
        </div>

        {/* Optimization Direction Selector */}
        <div className="grid grid-cols-2 p-1 rounded-xl bg-[#050d25] border border-[#212942] gap-1 shadow-inner">
          <button
            onClick={() => handleSetType('MAX')}
            type="button"
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${
              model.type === 'MAX'
                ? 'bg-[#4c8eff] text-[#00285d] shadow-md shadow-[#4c8eff]/25 font-bold'
                : 'text-[#c2c6d6] hover:text-[#dbe1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
            <span className="truncate">Max Z (Utilidad)</span>
          </button>

          <button
            onClick={() => handleSetType('MIN')}
            type="button"
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-semibold transition-all ${
              model.type === 'MIN'
                ? 'bg-[#4c8eff] text-[#00285d] shadow-md shadow-[#4c8eff]/25 font-bold'
                : 'text-[#c2c6d6] hover:text-[#dbe1ff]'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">trending_down</span>
            <span className="truncate">Min Z (Costos)</span>
          </button>
        </div>

        {/* Dimension Space Selector */}
        <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-[#131a33] border border-[#212942]">
          <span className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider">
            Dimensión del Espacio de Solución
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (model.variables.length > 2) {
                  onUpdateModel({
                    ...model,
                    variables: model.variables.slice(0, 2),
                    dimension: '2d'
                  });
                }
              }}
              className={`flex flex-col p-2.5 rounded-lg text-left transition-all border ${
                is2D
                  ? 'bg-[#171e37] text-[#dbe1ff] border-[#4edea3]/40 shadow-sm'
                  : 'bg-[#050d25]/60 text-[#8c909f] border-transparent hover:text-[#dbe1ff]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[14px] text-[#4edea3] font-bold">2 Variables</span>
                {is2D && (
                  <span className="material-symbols-outlined text-[#4edea3] text-[16px]">
                    check_circle
                  </span>
                )}
              </div>
              <span className="text-[11px] text-[#c2c6d6] leading-tight mt-0.5">
                X₁, X₂ • Gráfico + Simplex
              </span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddingVar(true)}
              className={`flex flex-col p-2.5 rounded-lg text-left transition-all border ${
                !is2D
                  ? 'bg-[#171e37] text-[#dbe1ff] border-[#adc6ff]/40 shadow-sm'
                  : 'bg-[#050d25]/60 text-[#8c909f] border-transparent hover:text-[#dbe1ff]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[14px] text-[#adc6ff] font-bold">n Variables</span>
                <span className="material-symbols-outlined text-[16px] text-[#adc6ff]">tune</span>
              </div>
              <span className="text-[11px] text-[#8c909f] leading-tight mt-0.5">
                X₁...Xₙ ({model.variables.length} vars activas)
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* RENDER VIEW: MATRIX or CARDS */}
      {viewMode === 'matrix' ? (
        <MatrixEditor
          model={model}
          onUpdateModel={onUpdateModel}
          onSolveAndNavigate={handleSolve}
        />
      ) : (
        <>
          {/* Canonical Objective Function Card with Direct In-Text Formula Editor */}
          <section className="flex flex-col rounded-xl bg-[#050d25] border border-[#212942] p-4 shadow-xl relative overflow-hidden gap-3">
            <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-[#4c8eff]/10 blur-2xl pointer-events-none"></div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#adc6ff] text-[18px]">
                  functions
                </span>
                <span className="text-[11px] font-semibold text-[#adc6ff] uppercase tracking-wider">
                  Función Objetivo Canónica (Editable en Texto)
                </span>
              </div>

              {/* Editable Target Name */}
              <input
                type="text"
                value={model.targetName}
                onChange={(e) => onUpdateModel({ ...model, targetName: e.target.value })}
                className="px-2 py-0.5 rounded bg-[#171e37] text-[#4edea3] font-mono text-[11px] font-medium border border-[#4edea3]/20 focus:outline-none focus:border-[#4edea3] text-right"
                placeholder="Nombre del objetivo"
              />
            </div>

            {/* Direct In-Text Algebraic Formula Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <label className="text-[#c2c6d6] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#4edea3]">edit_note</span>
                  <span>Escribe o modifica la ecuación directamente en este texto:</span>
                </label>
                {formulaError ? (
                  <span className="text-[#ffb4ab] font-mono text-[10px]">{formulaError}</span>
                ) : (
                  <span className="text-[#4edea3] font-mono text-[10px] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]"></span>
                    <span>Sintaxis algebraica válida</span>
                  </span>
                )}
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={formulaInput}
                  onChange={(e) => handleFormulaInputChange(e.target.value)}
                  onFocus={() => setIsFormulaInputFocused(true)}
                  onBlur={() => setIsFormulaInputFocused(false)}
                  placeholder="Ej. Max Z = 50*X1 + 40*X2 - 15*X3"
                  className={`w-full bg-[#131a33] border rounded-xl px-3.5 py-2.5 font-mono text-[15px] sm:text-[16px] font-bold tracking-wide focus:outline-none transition-all shadow-inner ${
                    formulaError
                      ? 'border-[#ffb4ab]/60 text-[#ffdad6] focus:border-[#ffb4ab]'
                      : 'border-[#2c344d] text-[#4edea3] focus:border-[#4c8eff]'
                  }`}
                />
              </div>
            </div>

            {/* Dynamic LaTeX Formula Preview */}
            <div className="p-3 rounded-lg bg-[#212942]/60 border border-[#2c344d]/50 flex items-center justify-center my-0.5">
              <div className="flex items-baseline flex-wrap justify-center gap-x-2 gap-y-1 font-mono text-[17px] text-[#dbe1ff] font-semibold tracking-tight">
                <span
                  onClick={() => handleSetType(model.type === 'MAX' ? 'MIN' : 'MAX')}
                  title="Haz clic para alternar Max / Min"
                  className={`cursor-pointer hover:underline ${
                    model.type === 'MAX' ? 'text-[#ffb95f]' : 'text-[#4c8eff]'
                  }`}
                >
                  {model.type === 'MAX' ? 'Max Z' : 'Min Z'}
                </span>
                <span className="text-[#8c909f]">=</span>

                {model.variables.map((v, idx) => (
                  <React.Fragment key={v.id}>
                    {idx > 0 && (
                      <span className="text-[#8c909f] font-bold">
                        {v.cost >= 0 ? '+' : '−'}
                      </span>
                    )}
                    <span className="text-[#4edea3] inline-flex items-baseline">
                      <span>{Math.abs(v.cost)}</span>
                      <span className="text-xs ml-0.5 text-[#c2c6d6]">
                        ·{v.symbol || `X${idx + 1}`}
                      </span>
                    </span>
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Quick Algebraic Operations Toolbar */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#212942]/60">
              <span className="text-[10px] font-semibold text-[#8c909f] uppercase tracking-wider font-mono mr-1">
                Operaciones:
              </span>

              <button
                type="button"
                onClick={() => handleAddFormulaTerm('+')}
                title="Sumar nuevo término con coeficiente positivo"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#4edea3] font-mono text-[11px] font-bold border border-[#4edea3]/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[13px]">add</span>
                <span>Sumar (+ c·X)</span>
              </button>

              <button
                type="button"
                onClick={() => handleAddFormulaTerm('-')}
                title="Restar término o penalidad con coeficiente negativo"
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#ffb95f] font-mono text-[11px] font-bold border border-[#ffb95f]/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[13px]">remove</span>
                <span>Restar (− c·X)</span>
              </button>

              <button
                type="button"
                onClick={() => handleScaleFormula(2)}
                title="Multiplicar todos los coeficientes por 2"
                className="px-2 py-1 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#adc6ff] font-mono text-[11px] font-semibold border border-[#2c344d] transition-all"
              >
                ×2 Escalar
              </button>

              <button
                type="button"
                onClick={() => handleScaleFormula(0.5)}
                title="Dividir todos los coeficientes a la mitad"
                className="px-2 py-1 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#adc6ff] font-mono text-[11px] font-semibold border border-[#2c344d] transition-all"
              >
                ÷2 Reducir
              </button>

              <button
                type="button"
                onClick={handleInvertFormulaSigns}
                title="Invertir los signos algebraicos de la función"
                className="px-2 py-1 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] font-mono text-[11px] font-semibold border border-[#2c344d] transition-all"
              >
                ± Invertir
              </button>

              <button
                type="button"
                onClick={() => handleSetType(model.type === 'MAX' ? 'MIN' : 'MAX')}
                title="Cambiar entre Maximización y Minimización"
                className="px-2 py-1 rounded-lg bg-[#171e37] hover:bg-[#212942] text-[#ffb95f] font-mono text-[11px] font-semibold border border-[#2c344d] transition-all ml-auto"
              >
                {model.type === 'MAX' ? 'Cambiar a Min' : 'Cambiar a Max'}
              </button>
            </div>

            {/* Footer with Unit and Standard Form */}
            <div className="flex items-center justify-between pt-1 text-[12px]">
              <div className="flex items-center gap-1.5">
                <span className="text-[#8c909f]">Unidad objetivo:</span>
                <input
                  type="text"
                  value={model.unit}
                  onChange={(e) => onUpdateModel({ ...model, unit: e.target.value })}
                  className="bg-[#171e37] border border-[#2c344d] rounded px-2 py-0.5 text-[11px] text-[#dbe1ff] focus:outline-none w-28"
                />
              </div>
              <span className="font-mono text-[11px] text-[#adc6ff] opacity-80">
                Linear Program • Standard Form
              </span>
            </div>
          </section>

          {/* Decision Variables Section with Cotas / Bounds */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4edea3] text-[20px]">
                  data_array
                </span>
                <h2 className="text-[18px] font-semibold text-[#dbe1ff]">
                  Variables de Decisión y Restricciones de Cota
                </h2>
              </div>
              <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#212942] text-[#c2c6d6] border border-[#2c344d]">
                k = {model.variables.length}
              </span>
            </div>

            {/* Variables Cards */}
            {model.variables.map((v, idx) => (
              <div
                key={v.id}
                className="flex flex-col p-3 rounded-xl bg-[#171e37] border border-[#212942] shadow-md gap-2.5"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 flex-1 pr-2">
                    <span className="px-2.5 py-1 rounded bg-[#4edea3]/15 text-[#4edea3] font-mono text-[14px] font-bold border border-[#4edea3]/30">
                      {v.symbol || `X${idx + 1}`}
                    </span>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => {
                        const updated = model.variables.map((item) =>
                          item.id === v.id ? { ...item, name: e.target.value } : item
                        );
                        onUpdateModel({ ...model, variables: updated });
                      }}
                      className="bg-transparent hover:bg-[#131a33] border border-transparent hover:border-[#2c344d] rounded px-1.5 py-0.5 text-[14px] font-semibold text-[#dbe1ff] focus:bg-[#131a33] focus:border-[#4c8eff] focus:outline-none flex-1 truncate"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingVar(v)}
                      aria-label={`Editar Variable ${v.symbol}`}
                      className="w-8 h-8 rounded-lg bg-[#212942] hover:bg-[#2c344d] text-[#c2c6d6] hover:text-[#dbe1ff] flex items-center justify-center transition-colors"
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>

                    {model.variables.length > 2 && (
                      <button
                        onClick={() => handleDeleteVariable(v.id)}
                        title="Eliminar variable"
                        type="button"
                        className="w-8 h-8 rounded-lg bg-[#212942] text-[#c2c6d6] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Stepper for Unit Contribution ($) */}
                <div className="flex items-center justify-between pt-1 bg-[#050d25]/80 p-2 rounded-lg border border-[#212942]/60">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-[#8c909f]">
                      Contribución Unitaria ($)
                    </span>
                    <span className="text-[12px] text-[#c2c6d6]">
                      Margen bruto (c{idx + 1})
                    </span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#171e37] px-1 py-1 rounded-lg border border-[#2c344d]">
                    <button
                      type="button"
                      onClick={() => handleUpdateCost(v.id, -5)}
                      className="w-7 h-7 rounded bg-[#212942] text-[#dbe1ff] flex items-center justify-center hover:bg-[#313852] active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">remove</span>
                    </button>

                    <input
                      type="number"
                      value={v.cost}
                      onChange={(e) => handleSetCostInput(v.id, parseFloat(e.target.value))}
                      className="w-16 bg-transparent text-center font-mono text-[15px] text-[#4edea3] font-bold focus:outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => handleUpdateCost(v.id, 5)}
                      className="w-7 h-7 rounded bg-[#212942] text-[#dbe1ff] flex items-center justify-center hover:bg-[#313852] active:scale-95 transition-all"
                    >
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </button>
                  </div>
                </div>

                {/* Cotas / Restricciones al Coeficiente / Variable */}
                <div className="grid grid-cols-2 gap-2 bg-[#131a33]/60 p-2 rounded-lg border border-[#212942] text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[#8c909f]">Cota Mínima (≥):</span>
                    <input
                      type="number"
                      value={v.lowerBound}
                      onChange={(e) =>
                        handleUpdateLowerBound(v.id, parseFloat(e.target.value))
                      }
                      className="w-16 bg-[#050d25] border border-[#2c344d] rounded text-center font-mono text-[#4edea3] py-0.5 focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[#8c909f]">Cota Máxima (≤):</span>
                    <input
                      type="number"
                      placeholder="Sin tope"
                      value={v.upperBound ?? ''}
                      onChange={(e) => handleUpdateUpperBound(v.id, e.target.value)}
                      className="w-16 bg-[#050d25] border border-[#2c344d] rounded text-center font-mono text-[#adc6ff] py-0.5 focus:outline-none placeholder:text-[#8c909f]/40"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Quick Add Variable Button */}
            <button
              onClick={() => setIsAddingVar(true)}
              type="button"
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#131a33] hover:bg-[#171e37] text-[#adc6ff] border border-dashed border-[#4c8eff]/40 text-[12px] font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              <span>Añadir Variable de Decisión (X{model.variables.length + 1})</span>
            </button>
          </section>

          {/* Structural Constraints Section */}
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#ffb95f] text-[20px]">
                  table_rows
                </span>
                <h2 className="text-[18px] font-semibold text-[#dbe1ff]">
                  Restricciones Estructurales
                </h2>
              </div>
              <span className="font-mono text-[12px] font-bold px-2 py-0.5 rounded-full bg-[#212942] text-[#4edea3] border border-[#2c344d]">
                {model.constraints.length} Activas
              </span>
            </div>

            {/* Constraint Cards */}
            {model.constraints.map((c, cIdx) => {
              const isCritical = c.statusType === 'critical';
              const accentColor = isCritical ? 'bg-[#ffb95f]' : 'bg-[#4edea3]';
              const badgeBg = isCritical
                ? 'bg-[#ca8100]/30 text-[#ffb95f] border-[#ffb95f]/30'
                : 'bg-[#00a572]/25 text-[#6ffbbe] border-[#4edea3]/30';

              return (
                <div
                  key={c.id}
                  className="flex flex-col p-3 rounded-xl bg-[#171e37] border border-[#212942] shadow-md gap-2 relative overflow-hidden"
                >
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor} rounded-l`}
                  ></div>

                  <div className="flex items-start justify-between pl-1">
                    <div className="flex flex-col min-w-0 pr-2 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono text-[13px] font-bold ${
                            isCritical ? 'text-[#ffb95f]' : 'text-[#4edea3]'
                          }`}
                        >
                          R{c.number || cIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={c.name}
                          onChange={(e) => {
                            const updated = model.constraints.map((item) =>
                              item.id === c.id ? { ...item, name: e.target.value } : item
                            );
                            onUpdateModel({ ...model, constraints: updated });
                          }}
                          className="bg-transparent hover:bg-[#131a33] border border-transparent hover:border-[#2c344d] rounded px-1 text-[14px] font-semibold text-[#dbe1ff] focus:bg-[#131a33] focus:border-[#4c8eff] focus:outline-none flex-1 truncate"
                        />
                      </div>
                      <input
                        type="text"
                        value={c.description}
                        onChange={(e) => {
                          const updated = model.constraints.map((item) =>
                            item.id === c.id ? { ...item, description: e.target.value } : item
                          );
                          onUpdateModel({ ...model, constraints: updated });
                        }}
                        className="bg-transparent hover:bg-[#131a33] border border-transparent hover:border-[#2c344d] rounded px-1 text-[11px] text-[#8c909f] focus:bg-[#131a33] focus:border-[#4c8eff] focus:outline-none truncate mt-0.5"
                      />
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleDuplicateConstraint(c)}
                        title="Duplicar restricción"
                        type="button"
                        className="w-7 h-7 rounded-lg bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[15px]">content_copy</span>
                      </button>

                      <button
                        onClick={() => handleDeleteConstraint(c.id)}
                        type="button"
                        title="Eliminar restricción"
                        className="w-7 h-7 rounded-lg bg-[#212942] text-[#c2c6d6] hover:text-[#ffb4ab] hover:bg-[#ffb4ab]/10 flex items-center justify-center transition-colors"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>

                  {/* Formula Expression Grid */}
                  <div className="grid grid-cols-5 items-center gap-1 p-2 rounded-lg bg-[#050d25] border border-[#212942]/60 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-[#8c909f] mb-0.5">X₁</span>
                      <input
                        type="number"
                        value={c.coefficients[v1?.id || 'x1'] ?? 1}
                        onChange={(e) =>
                          handleUpdateConstraintCoeff(
                            c.id,
                            v1?.id || 'x1',
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full bg-[#171e37] border border-[#2c344d] text-center rounded py-1 font-mono text-[14px] text-[#adc6ff] font-bold focus:outline-none focus:border-[#4c8eff]"
                      />
                    </div>

                    <span className="font-mono text-[14px] text-[#8c909f] font-bold">+</span>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-[#8c909f] mb-0.5">X₂</span>
                      <input
                        type="number"
                        value={c.coefficients[v2?.id || 'x2'] ?? 1}
                        onChange={(e) =>
                          handleUpdateConstraintCoeff(
                            c.id,
                            v2?.id || 'x2',
                            parseFloat(e.target.value)
                          )
                        }
                        className="w-full bg-[#171e37] border border-[#2c344d] text-center rounded py-1 font-mono text-[14px] text-[#adc6ff] font-bold focus:outline-none focus:border-[#4c8eff]"
                      />
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-[#8c909f] mb-0.5">Op.</span>
                      <select
                        value={c.operator}
                        onChange={(e) =>
                          handleUpdateConstraintOp(c.id, e.target.value as '<=' | '>=' | '=')
                        }
                        className="w-full bg-[#171e37] border border-[#2c344d] text-center rounded py-1 font-mono text-[14px] text-[#4edea3] font-bold focus:outline-none appearance-none cursor-pointer"
                      >
                        <option value="<=">≤</option>
                        <option value=">=">≥</option>
                        <option value="=">=</option>
                      </select>
                    </div>

                    <div className="flex flex-col items-center">
                      <span className="text-[10px] font-semibold text-[#8c909f] mb-0.5">Límite</span>
                      <input
                        type="number"
                        value={c.rhs}
                        onChange={(e) =>
                          handleUpdateConstraintRhs(c.id, parseFloat(e.target.value))
                        }
                        className="w-full bg-[#171e37] border border-[#2c344d] text-center rounded py-1 font-mono text-[14px] text-[#4edea3] font-bold focus:outline-none focus:border-[#4edea3]"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#8c909f] px-1">
                    <span>
                      {c.consumptionFormula ||
                        `Consumo: ${c.coefficients[v1?.id || 'x1'] ?? 1} / X₁ + ${
                          c.coefficients[v2?.id || 'x2'] ?? 1
                        } / X₂`}
                    </span>
                    <span>
                      Max {c.rhs} {c.unit}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Non-negativity condition */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#131a33] border border-[#212942] shadow-sm">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-[#4edea3] text-[20px]">lock</span>
                <div className="flex flex-col">
                  <span className="text-[14px] font-semibold text-[#dbe1ff]">
                    No Negatividad de Variables
                  </span>
                  <span className="font-mono text-[13px] text-[#4edea3] font-bold">
                    {model.variables.map((v) => v.symbol).join(', ')} ≥ 0
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#4edea3] uppercase tracking-wider">
                  Fijo
                </span>
                <div className="w-10 h-5 bg-[#00a572]/40 rounded-full relative flex items-center px-0.5 border border-[#4edea3]/40">
                  <div className="w-4 h-4 rounded-full bg-[#4edea3] ml-auto shadow-sm"></div>
                </div>
              </div>
            </div>

            {/* Add Constraint Trigger */}
            <button
              onClick={() => setIsAddingConstraint(true)}
              type="button"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#212942]/60 hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] border border-dashed border-[#2c344d] text-[12px] font-semibold transition-all"
            >
              <span className="material-symbols-outlined text-[20px] text-[#adc6ff]">add</span>
              <span>Añadir Restricción Tecnológica</span>
            </button>
          </section>

          {/* Contextual Information Note */}
          <div className="p-3.5 rounded-xl bg-[#131a33] border border-[#212942] flex items-start gap-2.5">
            <span className="material-symbols-outlined text-[#4edea3] text-[20px] flex-shrink-0 mt-0.5">
              verified
            </span>
            <div className="flex flex-col text-[#c2c6d6]">
              <span className="text-[12px] font-semibold text-[#dbe1ff]">
                Región Factible Acotada
              </span>
              <span className="text-[12px] leading-relaxed mt-0.5">
                El sistema cuenta con {model.constraints.length} hiperplanos y cotas de
                no-negatividad. Se proyecta un poliedro convexo cerrado con solución óptima finita
                garantizada.
              </span>
            </div>
          </div>

          {/* Preset Case Studies */}
          <section className="flex flex-col gap-2 pt-1">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-semibold text-[#8c909f] uppercase tracking-wider font-mono">
                Cargar Casos de Estudio
              </span>
              <button
                onClick={onOpenLibrary}
                type="button"
                className="text-[11px] font-semibold text-[#adc6ff] hover:underline"
              >
                Ver biblioteca
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => onLoadCase('mezcla-produccion-1')}
                type="button"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] border border-[#212942] transition-all text-center group"
              >
                <span className="material-symbols-outlined text-[20px] text-[#4edea3] mb-1 group-hover:scale-110 transition-transform">
                  factory
                </span>
                <span className="text-[11px] font-bold leading-tight">Mezcla Producción</span>
              </button>

              <button
                onClick={() => onLoadCase('dieta-min-costo')}
                type="button"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] border border-[#212942] transition-all text-center group"
              >
                <span className="material-symbols-outlined text-[20px] text-[#ffb95f] mb-1 group-hover:scale-110 transition-transform">
                  restaurant
                </span>
                <span className="text-[11px] font-bold leading-tight">Dieta Mín. Costo</span>
              </button>

              <button
                onClick={() => onLoadCase('red-logistica-transporte')}
                type="button"
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] border border-[#212942] transition-all text-center group"
              >
                <span className="material-symbols-outlined text-[20px] text-[#adc6ff] mb-1 group-hover:scale-110 transition-transform">
                  local_shipping
                </span>
                <span className="text-[11px] font-bold leading-tight">Red Logística</span>
              </button>
            </div>
          </section>

          {/* Primary Action Button */}
          <div className="mt-2">
            <button
              onClick={handleSolve}
              disabled={isSolving}
              type="button"
              className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl bg-[#4edea3] hover:bg-[#6ffbbe] text-[#003824] text-[16px] sm:text-[18px] font-bold shadow-xl shadow-[#4edea3]/20 transition-all active:scale-[0.98] relative overflow-hidden group"
            >
              {isSolving ? (
                <>
                  <span className="w-5 h-5 border-2 border-[#003824] border-t-transparent rounded-full animate-spin"></span>
                  <span>Resolviendo Simplex Primal...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[24px]">calculate</span>
                  <span>Calcular Solución y Graficar</span>
                  <span className="material-symbols-outlined text-[20px] group-hover:translate-x-1 transition-transform">
                    arrow_forward
                  </span>
                </>
              )}
            </button>
            <p className="text-center font-mono text-[11px] text-[#8c909f] mt-2">
              Ejecuta algoritmo Simplex Primal en 2D con visualización geométrica
            </p>
          </div>
        </>
      )}

      {/* Modal to Add Variable */}
      {isAddingVar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddVariableSubmit}
            className="w-full max-w-md bg-[#131a33] border border-[#212942] rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#212942] pb-3">
              <h3 className="text-[16px] font-bold text-[#dbe1ff]">
                Añadir Variable de Decisión (X{model.variables.length + 1})
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingVar(false)}
                className="text-[#8c909f] hover:text-[#dbe1ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#c2c6d6]">Nombre de la Variable</label>
              <input
                type="text"
                placeholder="Ej. Producto C (Sillones reclinables)"
                value={newVarName}
                onChange={(e) => setNewVarName(e.target.value)}
                className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#dbe1ff] focus:outline-none focus:border-[#4c8eff]"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#c2c6d6]">Unidad de Medida</label>
                <input
                  type="text"
                  placeholder="unidades / mes"
                  value={newVarUnit}
                  onChange={(e) => setNewVarUnit(e.target.value)}
                  className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#dbe1ff] focus:outline-none focus:border-[#4c8eff]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#c2c6d6]">Coeficiente ($)</label>
                <input
                  type="number"
                  value={newVarCost}
                  onChange={(e) => setNewVarCost(parseFloat(e.target.value))}
                  className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#4edea3] font-mono font-bold focus:outline-none focus:border-[#4c8eff]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#212942]">
              <button
                type="button"
                onClick={() => setIsAddingVar(false)}
                className="px-4 py-2 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:bg-[#212942] text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#4edea3] text-[#003824] font-bold text-[13px] hover:bg-[#6ffbbe]"
              >
                Guardar Variable
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal to Add Constraint */}
      {isAddingConstraint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <form
            onSubmit={handleAddConstraintSubmit}
            className="w-full max-w-md bg-[#131a33] border border-[#212942] rounded-2xl p-5 shadow-2xl flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b border-[#212942] pb-3">
              <h3 className="text-[16px] font-bold text-[#dbe1ff]">
                Añadir Restricción Tecnológica (R{model.constraints.length + 1})
              </h3>
              <button
                type="button"
                onClick={() => setIsAddingConstraint(false)}
                className="text-[#8c909f] hover:text-[#dbe1ff]"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#c2c6d6]">Nombre de la Restricción</label>
              <input
                type="text"
                placeholder="Ej. Control de Calidad / Inspección"
                value={newConsName}
                onChange={(e) => setNewConsName(e.target.value)}
                className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#dbe1ff] focus:outline-none focus:border-[#4c8eff]"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#c2c6d6]">Descripción / Recurso</label>
              <input
                type="text"
                placeholder="Horas hombre técnicas disponibles"
                value={newConsDesc}
                onChange={(e) => setNewConsDesc(e.target.value)}
                className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#dbe1ff] focus:outline-none focus:border-[#4c8eff]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#c2c6d6]">Operador</label>
                <select
                  value={newConsOp}
                  onChange={(e) => setNewConsOp(e.target.value as '<=' | '>=' | '=')}
                  className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#4edea3] font-mono font-bold focus:outline-none"
                >
                  <option value="<=">Menor o Igual (≤)</option>
                  <option value=">=">Mayor o Igual (≥)</option>
                  <option value="=">Estrictamente Igual (=)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#c2c6d6]">Límite / RHS</label>
                <input
                  type="number"
                  value={newConsRhs}
                  onChange={(e) => setNewConsRhs(parseFloat(e.target.value))}
                  className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#4edea3] font-mono font-bold focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-[12px] text-[#c2c6d6]">Coeficientes de Consumo</span>
              <div className="grid grid-cols-2 gap-2">
                {model.variables.map((v) => (
                  <div
                    key={v.id}
                    className="flex items-center gap-2 bg-[#050d25] p-2 rounded-lg border border-[#212942]"
                  >
                    <span className="font-mono text-[12px] text-[#adc6ff]">{v.symbol}:</span>
                    <input
                      type="number"
                      defaultValue={1}
                      onChange={(e) =>
                        setNewConsCoeffs((prev) => ({
                          ...prev,
                          [v.id]: parseFloat(e.target.value) || 0
                        }))
                      }
                      className="w-full bg-[#171e37] text-center font-mono rounded py-1 text-[13px] text-[#dbe1ff]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#212942]">
              <button
                type="button"
                onClick={() => setIsAddingConstraint(false)}
                className="px-4 py-2 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:bg-[#212942] text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-[#4edea3] text-[#003824] font-bold text-[13px] hover:bg-[#6ffbbe]"
              >
                Guardar Restricción
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal to Edit Variable Details */}
      {editingVar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#131a33] border border-[#212942] rounded-2xl p-5 shadow-2xl flex flex-col gap-4">
            <h3 className="text-[16px] font-bold text-[#dbe1ff]">
              Editar Variable {editingVar.symbol}
            </h3>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#c2c6d6]">Símbolo (ej. X₁, Y, Mesas)</label>
              <input
                type="text"
                value={editingVar.symbol}
                onChange={(e) => setEditingVar({ ...editingVar, symbol: e.target.value })}
                className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#4edea3] font-mono font-bold focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[12px] text-[#c2c6d6]">Nombre descriptivo</label>
              <input
                type="text"
                value={editingVar.name}
                onChange={(e) => setEditingVar({ ...editingVar, name: e.target.value })}
                className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#dbe1ff] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#c2c6d6]">Unidad</label>
                <input
                  type="text"
                  value={editingVar.unit}
                  onChange={(e) => setEditingVar({ ...editingVar, unit: e.target.value })}
                  className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#dbe1ff] focus:outline-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[12px] text-[#c2c6d6]">Cota Superior Máx (≤)</label>
                <input
                  type="number"
                  placeholder="Sin tope"
                  value={editingVar.upperBound ?? ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setEditingVar({
                      ...editingVar,
                      upperBound: isNaN(val) ? undefined : val
                    });
                  }}
                  className="bg-[#171e37] border border-[#2c344d] rounded-lg px-3 py-2 text-[14px] text-[#adc6ff] font-mono focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-2 pt-3 border-t border-[#212942]">
              <button
                type="button"
                onClick={() => setEditingVar(null)}
                className="px-4 py-2 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:bg-[#212942] text-[13px]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const updated = model.variables.map((v) =>
                    v.id === editingVar.id ? editingVar : v
                  );
                  onUpdateModel({ ...model, variables: updated });
                  setEditingVar(null);
                }}
                className="px-4 py-2 rounded-lg bg-[#4edea3] text-[#003824] font-bold text-[13px] hover:bg-[#6ffbbe]"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
