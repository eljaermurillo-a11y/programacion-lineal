export type OptimizationType = 'MAX' | 'MIN';
export type ConstraintOperator = '<=' | '>=' | '=';

export interface DecisionVariable {
  id: string; // e.g. 'x1', 'x2'
  symbol: string; // e.g. 'X₁', 'X₂'
  name: string; // e.g. 'Producto A (Mesas estándar)'
  unit: string; // e.g. 'unidades / mes'
  cost: number; // e.g. 50
  lowerBound: number; // usually 0
  upperBound?: number; // e.g. 60
  costMin?: number; // minimum allowable coefficient
  costMax?: number; // maximum allowable coefficient
}

export interface StructuralConstraint {
  id: string; // e.g. 'r1', 'r2'
  number: number; // 1, 2, 3
  name: string; // e.g. 'Materia Prima: Madera Pino'
  description: string; // e.g. 'Inventario disponible en bodega'
  coefficients: Record<string, number>; // { x1: 2, x2: 1 }
  operator: ConstraintOperator;
  rhs: number; // 100
  unit: string; // 'kg', 'hrs'
  consumptionFormula?: string;
  slackLabel?: string; // 'HOLGURA S₁', 'HOLGURA S₂'
  statusType?: 'slack' | 'critical' | 'violated';
}

export interface LPModel {
  id: string;
  title: string;
  description: string;
  type: OptimizationType;
  dimension: '2d' | 'nd';
  unit: string; // e.g. 'USD ($/mes)'
  targetName: string; // e.g. 'Beneficio Neto'
  variables: DecisionVariable[];
  constraints: StructuralConstraint[];
  nonNegative: boolean;
  createdAt: number;
}

export interface SimplexRow {
  basicVar: string;
  cb: number;
  coefficients: number[]; // for x1, x2, ... s1, s2...
  rhs: number;
  ratio?: number | null;
}

export interface SimplexTableau {
  iteration: number;
  headers: string[]; // ['Base', 'C_b', 'X₁', 'X₂', 'S₁', 'S₂', 'S₃', 'RHS', 'θ (Cociente)']
  c_j: number[];
  rows: SimplexRow[];
  z_row: number[]; // Z_j
  reducedCosts: number[]; // C_j - Z_j or Z_j - C_j
  currentZ: number;
  pivotColIndex?: number;
  pivotRowIndex?: number;
  enteringVar?: string;
  leavingVar?: string;
  isOptimal: boolean;
  explanation: string;
}

export interface Point2D {
  x: number;
  y: number;
  z: number;
  isFeasible: boolean;
  isOptimal: boolean;
  label?: string;
  bindingConstraints: string[];
}

export interface SensitivityCoeff {
  varId: string;
  varSymbol: string;
  varName: string;
  currentValue: number;
  allowableMin: number;
  allowableMax: number;
  reducedCost: number;
}

export interface SensitivityRHS {
  constraintId: string;
  constraintNumber: number;
  constraintName: string;
  currentValue: number;
  slack: number;
  shadowPrice: number;
  allowableMin: number;
  allowableMax: number;
  isBinding: boolean;
}

export interface LPSolution {
  status: 'OPTIMAL' | 'UNBOUNDED' | 'INFEASIBLE';
  optimalZ: number;
  variables: Record<string, number>;
  slacks: Record<string, number>;
  bindingConstraints: string[];
  shadowPrices: Record<string, number>;
  vertices2D: Point2D[];
  feasiblePolygon: { x: number; y: number }[];
  isBounded: boolean;
  tableaus: SimplexTableau[];
  sensitivity: {
    coefficients: SensitivityCoeff[];
    rhs: SensitivityRHS[];
  };
}
