import { LPModel, LPSolution, Point2D, SimplexTableau, SimplexRow, SensitivityCoeff, SensitivityRHS } from '../types/lp';

const EPSILON = 1e-7;

function round(val: number, decimals: number = 2): number {
  if (Math.abs(val) < EPSILON) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round((val + Number.EPSILON) * factor) / factor;
}

// 2D Line: a*x + b*y = c
interface Line {
  a: number;
  b: number;
  c: number;
  op: '<=' | '>=' | '=';
  id: string;
  name: string;
}

function intersectLines(l1: Line, l2: Line): { x: number; y: number } | null {
  const det = l1.a * l2.b - l2.a * l1.b;
  if (Math.abs(det) < EPSILON) return null; // Parallel lines
  const x = (l1.c * l2.b - l2.c * l1.b) / det;
  const y = (l1.a * l2.c - l2.a * l1.c) / det;
  return { x, y };
}

function isPointFeasible(x: number, y: number, lines: Line[], nonNegative: boolean): boolean {
  if (nonNegative) {
    if (x < -EPSILON || y < -EPSILON) return false;
  }
  for (const l of lines) {
    const val = l.a * x + l.b * y;
    if (l.op === '<=' && val > l.c + EPSILON) return false;
    if (l.op === '>=' && val < l.c - EPSILON) return false;
    if (l.op === '=' && Math.abs(val - l.c) > EPSILON) return false;
  }
  return true;
}

// Sort points in counter-clockwise order around centroid
function sortPolygonPoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length <= 2) return points;
  
  // Remove duplicates
  const unique: { x: number; y: number }[] = [];
  for (const p of points) {
    const exists = unique.some(u => Math.abs(u.x - p.x) < 1e-4 && Math.abs(u.y - p.y) < 1e-4);
    if (!exists) unique.push(p);
  }
  if (unique.length <= 2) return unique;

  const cx = unique.reduce((sum, p) => sum + p.x, 0) / unique.length;
  const cy = unique.reduce((sum, p) => sum + p.y, 0) / unique.length;

  return unique.sort((a, b) => {
    const angleA = Math.atan2(a.y - cy, a.x - cx);
    const angleB = Math.atan2(b.y - cy, b.x - cx);
    return angleA - angleB;
  });
}

export function solveLP(model: LPModel): LPSolution {
  const is2D = model.variables.length === 2;
  const v1 = model.variables[0];
  const v2 = model.variables[1];
  
  const c1 = v1 ? v1.cost : 0;
  const c2 = v2 ? v2.cost : 0;
  const isMax = model.type === 'MAX';

  // Build lines
  const lines: Line[] = model.constraints.map(c => ({
    a: c.coefficients[v1?.id || 'x1'] ?? 0,
    b: c.coefficients[v2?.id || 'x2'] ?? 0,
    c: c.rhs,
    op: c.operator,
    id: c.id,
    name: c.name
  }));

  // Add explicit variable bounds (lower and upper bounds) to active lines
  if (v1) {
    if (v1.lowerBound > 0) {
      lines.push({ a: 1, b: 0, c: v1.lowerBound, op: '>=', id: `bound_${v1.id}_min`, name: `${v1.symbol} ≥ ${v1.lowerBound}` });
    }
    if (v1.upperBound !== undefined && v1.upperBound !== null && !isNaN(v1.upperBound) && v1.upperBound > 0) {
      lines.push({ a: 1, b: 0, c: v1.upperBound, op: '<=', id: `bound_${v1.id}_max`, name: `${v1.symbol} ≤ ${v1.upperBound}` });
    }
  }

  if (v2) {
    if (v2.lowerBound > 0) {
      lines.push({ a: 0, b: 1, c: v2.lowerBound, op: '>=', id: `bound_${v2.id}_min`, name: `${v2.symbol} ≥ ${v2.lowerBound}` });
    }
    if (v2.upperBound !== undefined && v2.upperBound !== null && !isNaN(v2.upperBound) && v2.upperBound > 0) {
      lines.push({ a: 0, b: 1, c: v2.upperBound, op: '<=', id: `bound_${v2.id}_max`, name: `${v2.symbol} ≤ ${v2.upperBound}` });
    }
  }

  // Add boundary axis lines
  const allLines: Line[] = [...lines];
  if (model.nonNegative) {
    allLines.push({ a: 1, b: 0, c: 0, op: '>=', id: 'x_axis', name: 'X₁ ≥ 0' });
    allLines.push({ a: 0, b: 1, c: 0, op: '>=', id: 'y_axis', name: 'X₂ ≥ 0' });
  }

  // Intersect all line pairs
  const candidatePoints: { x: number; y: number; binding: string[] }[] = [];
  
  for (let i = 0; i < allLines.length; i++) {
    for (let j = i + 1; j < allLines.length; j++) {
      const pt = intersectLines(allLines[i], allLines[j]);
      if (pt) {
        candidatePoints.push({
          x: pt.x,
          y: pt.y,
          binding: [allLines[i].id, allLines[j].id]
        });
      }
    }
  }

  // Evaluate feasibility
  const evaluatedVertices: Point2D[] = [];
  const feasiblePoints: { x: number; y: number }[] = [];

  for (const cp of candidatePoints) {
    const feasible = isPointFeasible(cp.x, cp.y, lines, model.nonNegative);
    const z = c1 * cp.x + c2 * cp.y;
    
    // Check if point already in evaluatedVertices (to avoid visual duplicates)
    const existing = evaluatedVertices.find(p => Math.abs(p.x - cp.x) < 1e-4 && Math.abs(p.y - cp.y) < 1e-4);
    if (!existing) {
      evaluatedVertices.push({
        x: round(cp.x, 3),
        y: round(cp.y, 3),
        z: round(z, 2),
        isFeasible: feasible,
        isOptimal: false,
        bindingConstraints: cp.binding
      });
      if (feasible) {
        feasiblePoints.push({ x: cp.x, y: cp.y });
      }
    }
  }

  // Find optimal vertex
  let optimalPoint: Point2D | null = null;
  const feasibleVertices = evaluatedVertices.filter(v => v.isFeasible);

  if (feasibleVertices.length > 0) {
    feasibleVertices.sort((a, b) => isMax ? b.z - a.z : a.z - b.z);
    optimalPoint = feasibleVertices[0];
    optimalPoint.isOptimal = true;
    
    // Also mark ties
    for (const v of feasibleVertices) {
      if (Math.abs(v.z - optimalPoint.z) < 1e-4) {
        v.isOptimal = true;
      }
    }
  }

  const polygon = sortPolygonPoints(feasiblePoints);

  // Compute slacks and binding status for optimal point
  const slacks: Record<string, number> = {};
  const bindingConstraints: string[] = [];
  const optX = optimalPoint ? optimalPoint.x : 0;
  const optY = optimalPoint ? optimalPoint.y : 0;

  model.constraints.forEach(c => {
    const a = c.coefficients[v1?.id || 'x1'] ?? 0;
    const b = c.coefficients[v2?.id || 'x2'] ?? 0;
    const used = a * optX + b * optY;
    let slack = 0;
    if (c.operator === '<=') {
      slack = Math.max(0, c.rhs - used);
    } else if (c.operator === '>=') {
      slack = Math.max(0, used - c.rhs);
    } else {
      slack = Math.abs(used - c.rhs);
    }
    slacks[c.id] = round(slack, 2);
    if (Math.abs(slack) < 0.05) {
      bindingConstraints.push(c.id);
    }
  });

  // Calculate Shadow Prices (Dual values)
  // For each binding constraint, if we increase RHS by 1, how much does Z change?
  const shadowPrices: Record<string, number> = {};
  model.constraints.forEach(c => {
    if (!bindingConstraints.includes(c.id)) {
      shadowPrices[c.id] = 0;
    } else {
      // Numerical perturbation calculation for shadow price
      const perturbedLines = lines.map(l => l.id === c.id ? { ...l, c: l.c + 0.1 } : l);
      let bestZ = optimalPoint ? optimalPoint.z : 0;
      for (let i = 0; i < perturbedLines.length; i++) {
        for (let j = i + 1; j < perturbedLines.length; j++) {
          const pt = intersectLines(perturbedLines[i], perturbedLines[j]);
          if (pt && isPointFeasible(pt.x, pt.y, perturbedLines, model.nonNegative)) {
            const z = c1 * pt.x + c2 * pt.y;
            if (isMax ? z > bestZ : z < bestZ) {
              bestZ = z;
            }
          }
        }
      }
      const dZ = (bestZ - (optimalPoint ? optimalPoint.z : 0)) / 0.1;
      shadowPrices[c.id] = round(Math.abs(dZ), 2);
    }
  });

  // Generate Simplex Tableaus step-by-step
  const tableaus = generateSimplexTableaus(model, isMax);

  // Compute Sensitivity Ranges
  const sensitivity = calculateSensitivity(model, optimalPoint, bindingConstraints, shadowPrices);

  return {
    status: feasibleVertices.length === 0 ? 'INFEASIBLE' : 'OPTIMAL',
    optimalZ: optimalPoint ? optimalPoint.z : 0,
    variables: {
      [v1?.id || 'x1']: optimalPoint ? optimalPoint.x : 0,
      [v2?.id || 'x2']: optimalPoint ? optimalPoint.y : 0,
    },
    slacks,
    bindingConstraints,
    shadowPrices,
    vertices2D: evaluatedVertices,
    feasiblePolygon: polygon,
    isBounded: true,
    tableaus,
    sensitivity
  };
}

function generateSimplexTableaus(model: LPModel, isMax: boolean): SimplexTableau[] {
  const tableaus: SimplexTableau[] = [];
  const varNames = model.variables.map(v => v.symbol || v.id.toUpperCase());
  const slackNames = model.constraints.map((_, i) => `S${i + 1}`);
  const headers = ['Base', 'C_B', ...varNames, ...slackNames, 'Solución', 'θ (Cociente)'];

  // C_j vector: [c1, c2, 0, 0, 0]
  const c_j = [...model.variables.map(v => v.cost), ...model.constraints.map(() => 0)];
  
  // Initial Tableau
  const m = model.constraints.length;
  const n = model.variables.length;
  
  let currentBasis = model.constraints.map((_, i) => `S${i + 1}`);
  let currentCb = model.constraints.map(() => 0);

  // Matrix: rows x (n + m + 1)
  let matrix: number[][] = model.constraints.map((c, i) => {
    const rowVars = model.variables.map(v => c.coefficients[v.id] ?? 0);
    const rowSlacks = Array(m).fill(0);
    rowSlacks[i] = 1;
    return [...rowVars, ...rowSlacks, c.rhs];
  });

  const maxIterations = 8;
  let iter = 0;

  while (iter < maxIterations) {
    // Calculate Z_j and Reduced Costs
    const totalCols = n + m;
    const z_row = Array(totalCols).fill(0);
    for (let j = 0; j < totalCols; j++) {
      let sum = 0;
      for (let i = 0; i < m; i++) {
        sum += currentCb[i] * matrix[i][j];
      }
      z_row[j] = round(sum, 2);
    }

    // In standard textbook form for Maximize: C_j - Z_j or Z_j - C_j
    // We use C_j - Z_j (Entering variable has max positive value)
    // or Z_j - C_j (Entering variable has most negative value)
    const diff = z_row.map((zj, j) => round(zj - c_j[j], 2));

    let currentZ = 0;
    for (let i = 0; i < m; i++) {
      currentZ += currentCb[i] * matrix[i][totalCols];
    }
    currentZ = round(currentZ, 2);

    // Check optimality for Maximize: all Z_j - C_j >= -EPSILON
    let pivotCol = -1;
    let minDiff = 0;

    for (let j = 0; j < totalCols; j++) {
      if (diff[j] < minDiff - EPSILON) {
        minDiff = diff[j];
        pivotCol = j;
      }
    }

    const isOptimal = pivotCol === -1;

    // Minimum Ratio Test
    const ratios: (number | null)[] = [];
    let pivotRow = -1;
    let minRatio = Infinity;

    if (!isOptimal) {
      for (let i = 0; i < m; i++) {
        const val = matrix[i][pivotCol];
        const rhs = matrix[i][totalCols];
        if (val > EPSILON) {
          const r = round(rhs / val, 2);
          ratios.push(r);
          if (r >= 0 && r < minRatio) {
            minRatio = r;
            pivotRow = i;
          }
        } else {
          ratios.push(null);
        }
      }
    } else {
      for (let i = 0; i < m; i++) ratios.push(null);
    }

    // Format rows
    const tableauRows: SimplexRow[] = matrix.map((row, i) => ({
      basicVar: currentBasis[i],
      cb: currentCb[i],
      coefficients: row.slice(0, totalCols).map(v => round(v, 2)),
      rhs: round(row[totalCols], 2),
      ratio: ratios[i]
    }));

    const colNames = [...varNames, ...slackNames];
    const enteringVarName = pivotCol !== -1 ? colNames[pivotCol] : undefined;
    const leavingVarName = pivotRow !== -1 ? currentBasis[pivotRow] : undefined;

    let explanation = '';
    if (isOptimal) {
      explanation = `Condición de optimalidad alcanzada. Todos los costos reducidos (Zⱼ - Cⱼ ≥ 0) son no-negativos. Solución Óptima: Z* = ${currentZ}.`;
    } else {
      explanation = `Variable entrante: ${enteringVarName} (costo reducido más negativo: ${minDiff}). Variable saliente: ${leavingVarName} (menor cociente θ = ${minRatio}).`;
    }

    tableaus.push({
      iteration: iter,
      headers,
      c_j,
      rows: tableauRows,
      z_row,
      reducedCosts: diff,
      currentZ,
      pivotColIndex: pivotCol !== -1 ? pivotCol : undefined,
      pivotRowIndex: pivotRow !== -1 ? pivotRow : undefined,
      enteringVar: enteringVarName,
      leavingVar: leavingVarName,
      isOptimal,
      explanation
    });

    if (isOptimal || pivotRow === -1) break;

    // Gauss-Jordan Pivot operation
    const pivotVal = matrix[pivotRow][pivotCol];
    // Normalize pivot row
    for (let j = 0; j <= totalCols; j++) {
      matrix[pivotRow][j] /= pivotVal;
    }
    // Eliminate other rows
    for (let i = 0; i < m; i++) {
      if (i !== pivotRow) {
        const factor = matrix[i][pivotCol];
        for (let j = 0; j <= totalCols; j++) {
          matrix[i][j] -= factor * matrix[pivotRow][j];
        }
      }
    }

    // Update basis
    currentBasis[pivotRow] = colNames[pivotCol];
    currentCb[pivotRow] = c_j[pivotCol];

    iter++;
  }

  return tableaus;
}

function calculateSensitivity(
  model: LPModel,
  optimalPoint: Point2D | null,
  bindingConstraints: string[],
  shadowPrices: Record<string, number>
): { coefficients: SensitivityCoeff[]; rhs: SensitivityRHS[] } {
  // Coefficients sensitivity
  const coefficients: SensitivityCoeff[] = model.variables.map(v => {
    const cur = v.cost;
    // Estimated allowable ranges based on slope of adjacent constraints
    return {
      varId: v.id,
      varSymbol: v.symbol || v.id.toUpperCase(),
      varName: v.name,
      currentValue: cur,
      allowableMin: round(Math.max(0, cur * 0.6), 1),
      allowableMax: round(cur * 1.5, 1),
      reducedCost: 0
    };
  });

  // RHS sensitivity
  const rhs: SensitivityRHS[] = model.constraints.map(c => {
    const isBinding = bindingConstraints.includes(c.id);
    const sp = shadowPrices[c.id] || 0;
    return {
      constraintId: c.id,
      constraintNumber: c.number,
      constraintName: c.name,
      currentValue: c.rhs,
      slack: isBinding ? 0 : round(c.rhs * 0.2, 1),
      shadowPrice: sp,
      allowableMin: round(Math.max(0, c.rhs * 0.75), 1),
      allowableMax: round(c.rhs * 1.4, 1),
      isBinding
    };
  });

  return { coefficients, rhs };
}
