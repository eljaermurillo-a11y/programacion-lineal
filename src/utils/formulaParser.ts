import { DecisionVariable } from '../types/lp';

export interface ParsedTerm {
  coefficient: number;
  variableName?: string;
  isConstant: boolean;
}

export interface ParsedFormulaResult {
  isValid: boolean;
  type?: 'MAX' | 'MIN';
  terms: {
    varSymbol: string;
    coeff: number;
  }[];
  constant: number;
  errorMessage?: string;
}

export function normalizeVarSymbol(sym: string): string {
  return sym
    .replace(/₁/g, '1')
    .replace(/₂/g, '2')
    .replace(/₃/g, '3')
    .replace(/₄/g, '4')
    .replace(/₅/g, '5')
    .replace(/₆/g, '6')
    .replace(/₇/g, '7')
    .replace(/₈/g, '8')
    .replace(/₉/g, '9')
    .toUpperCase();
}

/**
 * Parses an algebraic objective function string such as:
 * "Max Z = 50*X1 + 40*X2 - 15*X3"
 * "50X1 + 40X2"
 * "100*x1 - 25*x2 + 30"
 * "Min Z = 12A + 18B - 5C"
 */
export function parseObjectiveFormula(formula: string): ParsedFormulaResult {
  const clean = formula.trim();
  if (!clean) {
    return { isValid: false, terms: [], constant: 0, errorMessage: 'La fórmula está vacía.' };
  }

  let text = clean;
  let type: 'MAX' | 'MIN' | undefined = undefined;

  // Check for Max Z = or Min Z = prefix
  const maxMinMatch = text.match(/^(max(?:imizar)?|min(?:imizar)?)\s*(?:z)?\s*=\s*/i);
  if (maxMinMatch) {
    type = maxMinMatch[1].toLowerCase().startsWith('min') ? 'MIN' : 'MAX';
    text = text.substring(maxMinMatch[0].length);
  } else {
    // Check if there is a "Z =" without max/min
    const zMatch = text.match(/^z\s*=\s*/i);
    if (zMatch) {
      text = text.substring(zMatch[0].length);
    }
  }

  // Normalize operators and remove spaces around signs
  // e.g. "50*X1 - 20*X2" -> "+50*X1 -20*X2"
  text = text.replace(/·/g, '*').replace(/−/g, '-');
  
  const normalized = text.replace(/\s+/g, '');
  
  // Split by signed terms: ([+-]?[^+-]+)
  const termRegex = /([+-]?[^+-]+)/g;
  const matches = normalized.match(termRegex);

  if (!matches || matches.length === 0) {
    return { isValid: false, terms: [], constant: 0, errorMessage: 'No se encontraron términos válidos.' };
  }

  const terms: { varSymbol: string; coeff: number }[] = [];
  let constant = 0;

  for (const match of matches) {
    const rawTerm = match.trim();
    if (!rawTerm) continue;

    // Check if it has a variable part
    const varMatch = rawTerm.match(/([a-zA-Z_][a-zA-Z0-9_₁₂₃₄₅₆₇₈₉]*)$/);

    if (varMatch) {
      const rawVarSymbol = varMatch[1];
      const varSymbol = normalizeVarSymbol(rawVarSymbol);
      const coeffPart = rawTerm.substring(0, rawTerm.length - rawVarSymbol.length).replace(/\*$/, '');

      let coeff = 1;
      if (coeffPart === '' || coeffPart === '+') {
        coeff = 1;
      } else if (coeffPart === '-') {
        coeff = -1;
      } else {
        const parsed = parseFloat(coeffPart);
        if (isNaN(parsed)) {
          return { isValid: false, terms: [], constant: 0, errorMessage: `Coeficiente inválido en "${rawTerm}"` };
        }
        coeff = parsed;
      }

      // If variable symbol already exists in terms, aggregate
      const existing = terms.find(t => t.varSymbol.toLowerCase() === varSymbol.toLowerCase());
      if (existing) {
        existing.coeff += coeff;
      } else {
        terms.push({ varSymbol, coeff });
      }
    } else {
      // Pure numeric constant term
      const num = parseFloat(rawTerm);
      if (!isNaN(num)) {
        constant += num;
      }
    }
  }

  if (terms.length === 0 && constant === 0) {
    return { isValid: false, terms: [], constant: 0, errorMessage: 'Debes incluir al menos una variable en la función objetivo.' };
  }

  return {
    isValid: true,
    type,
    terms,
    constant
  };
}

/**
 * Builds a clean formula string from model variables
 */
export function buildFormulaString(
  type: 'MAX' | 'MIN',
  variables: DecisionVariable[]
): string {
  if (variables.length === 0) return `${type === 'MAX' ? 'Max' : 'Min'} Z = 0`;

  let str = `${type === 'MAX' ? 'Max' : 'Min'} Z = `;
  variables.forEach((v, idx) => {
    const sym = v.symbol || `X${idx + 1}`;
    if (idx === 0) {
      str += `${v.cost}·${sym}`;
    } else {
      if (v.cost >= 0) {
        str += ` + ${v.cost}·${sym}`;
      } else {
        str += ` - ${Math.abs(v.cost)}·${sym}`;
      }
    }
  });

  return str;
}
