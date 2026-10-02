import { LPModel } from '../types/lp';

export const INITIAL_MODEL: LPModel = {
  id: 'mezcla-produccion-1',
  title: 'Mezcla Óptima de Producción (Carpintería)',
  description: 'Planificación de manufactura de mesas estándar y sillas ejecutivas bajo restricciones de madera, mano de obra y cabina de pintura.',
  type: 'MAX',
  dimension: '2d',
  unit: 'USD ($/mes)',
  targetName: 'Beneficio Neto',
  nonNegative: true,
  createdAt: Date.now(),
  variables: [
    {
      id: 'x1',
      symbol: 'X₁',
      name: 'Producto A (Mesas estándar)',
      unit: 'unidades / mes',
      cost: 50,
      lowerBound: 0
    },
    {
      id: 'x2',
      symbol: 'X₂',
      name: 'Producto B (Sillas ejecutivas)',
      unit: 'unidades / mes',
      cost: 40,
      lowerBound: 0
    }
  ],
  constraints: [
    {
      id: 'r1',
      number: 1,
      name: 'Materia Prima: Madera Pino',
      description: 'Inventario disponible en bodega',
      coefficients: { x1: 2, x2: 1 },
      operator: '<=',
      rhs: 100,
      unit: 'kg',
      consumptionFormula: 'Consumo: 2 kg/mesa + 1 kg/silla',
      slackLabel: 'HOLGURA S₁',
      statusType: 'slack'
    },
    {
      id: 'r2',
      number: 2,
      name: 'Mano de Obra: Ensamble',
      description: 'Turno ordinario mensual operarios',
      coefficients: { x1: 1, x2: 1 },
      operator: '<=',
      rhs: 80,
      unit: 'hrs',
      consumptionFormula: 'Consumo: 1 h/mesa + 1 h/silla',
      slackLabel: 'CRÍTICA',
      statusType: 'critical'
    },
    {
      id: 'r3',
      number: 3,
      name: 'Cabina de Pintura / Acabados',
      description: 'Capacidad de secado en horno',
      coefficients: { x1: 1, x2: 3 },
      operator: '<=',
      rhs: 180,
      unit: 'hrs',
      consumptionFormula: 'Consumo: 1 h/mesa + 3 h/silla',
      slackLabel: 'HOLGURA S₃',
      statusType: 'slack'
    }
  ]
};

export const CASE_STUDIES: LPModel[] = [
  INITIAL_MODEL,
  {
    id: 'dieta-min-costo',
    title: 'Problema de la Dieta Estigmática',
    description: 'Minimizar el costo diario de raciones nutricionales cumpliendo los requerimientos mínimos de proteínas, vitaminas y carbohidratos.',
    type: 'MIN',
    dimension: '2d',
    unit: 'USD / día',
    targetName: 'Costo Total de Alimentación',
    nonNegative: true,
    createdAt: Date.now() - 3600000,
    variables: [
      {
        id: 'x1',
        symbol: 'X₁',
        name: 'Alimento Suplementario A',
        unit: 'raciones / día',
        cost: 12,
        lowerBound: 0
      },
      {
        id: 'x2',
        symbol: 'X₂',
        name: 'Alimento Suplementario B',
        unit: 'raciones / día',
        cost: 18,
        lowerBound: 0
      }
    ],
    constraints: [
      {
        id: 'r1',
        number: 1,
        name: 'Aporte Mínimo Proteico',
        description: 'Requerimiento biológico diario',
        coefficients: { x1: 2, x2: 4 },
        operator: '>=',
        rhs: 16,
        unit: 'g',
        consumptionFormula: '2g/A + 4g/B ≥ 16g',
        slackLabel: 'SUPERÁVIT S₁',
        statusType: 'slack'
      },
      {
        id: 'r2',
        number: 2,
        name: 'Aporte de Vitaminas y Minerales',
        description: 'Umbral inmunológico preventivo',
        coefficients: { x1: 3, x2: 2 },
        operator: '>=',
        rhs: 18,
        unit: 'mg',
        consumptionFormula: '3mg/A + 2mg/B ≥ 18mg',
        slackLabel: 'CRÍTICA',
        statusType: 'critical'
      },
      {
        id: 'r3',
        number: 3,
        name: 'Energía Mínima Calórica',
        description: 'Mantenimiento del metabolismo basal',
        coefficients: { x1: 1, x2: 1 },
        operator: '>=',
        rhs: 7,
        unit: 'kcal',
        consumptionFormula: '1kcal/A + 1kcal/B ≥ 7kcal',
        slackLabel: 'SUPERÁVIT S₃',
        statusType: 'slack'
      }
    ]
  },
  {
    id: 'red-logistica-transporte',
    title: 'Red Logística y Capacidad de Despacho',
    description: 'Maximizar el margen de flete entre dos centros de distribución con limitaciones de bodegaje y horas de transporte vehicular.',
    type: 'MAX',
    dimension: '2d',
    unit: 'USD / lote',
    targetName: 'Beneficio Logístico',
    nonNegative: true,
    createdAt: Date.now() - 7200000,
    variables: [
      {
        id: 'x1',
        symbol: 'X₁',
        name: 'Carga Paletizada Ruta Norte',
        unit: 'palets / semana',
        cost: 35,
        lowerBound: 0
      },
      {
        id: 'x2',
        symbol: 'X₂',
        name: 'Carga Contenerizada Ruta Sur',
        unit: 'palets / semana',
        cost: 25,
        lowerBound: 0
      }
    ],
    constraints: [
      {
        id: 'r1',
        number: 1,
        name: 'Capacidad de Andén de Carga',
        description: 'Muelles operativos disponibles',
        coefficients: { x1: 3, x2: 2 },
        operator: '<=',
        rhs: 120,
        unit: 'horas/semana',
        consumptionFormula: '3h/Norte + 2h/Sur ≤ 120h',
        slackLabel: 'HOLGURA S₁',
        statusType: 'slack'
      },
      {
        id: 'r2',
        number: 2,
        name: 'Espacio de Bodega de Tránsito',
        description: 'Metros cuadrados techados en hub central',
        coefficients: { x1: 1, x2: 2 },
        operator: '<=',
        rhs: 80,
        unit: 'm²',
        consumptionFormula: '1m²/Norte + 2m²/Sur ≤ 80m²',
        slackLabel: 'CRÍTICA',
        statusType: 'critical'
      },
      {
        id: 'r3',
        number: 3,
        name: 'Disponibilidad de Cabezales Tracto',
        description: 'Flota propia de tractocamiones',
        coefficients: { x1: 2, x2: 1 },
        operator: '<=',
        rhs: 70,
        unit: 'viajes',
        consumptionFormula: '2v/Norte + 1v/Sur ≤ 70v',
        slackLabel: 'HOLGURA S₃',
        statusType: 'slack'
      }
    ]
  },
  {
    id: 'campana-publicitaria-marketing',
    title: 'Asignación Óptima de Presupuesto en Medios',
    description: 'Maximizar el número de impactos calificados combinando pauta en televisión y canales digitales bajo techo presupuestal y cuotas de audiencia.',
    type: 'MAX',
    dimension: '2d',
    unit: 'Miles de impactos',
    targetName: 'Alcance Bruto Efectivo',
    nonNegative: true,
    createdAt: Date.now() - 10800000,
    variables: [
      {
        id: 'x1',
        symbol: 'X₁',
        name: 'Spots en TV Abierta',
        unit: 'anuncios / mes',
        cost: 65,
        lowerBound: 0
      },
      {
        id: 'x2',
        symbol: 'X₂',
        name: 'Campañas de Ads Digitales',
        unit: 'paquetes / mes',
        cost: 45,
        lowerBound: 0
      }
    ],
    constraints: [
      {
        id: 'r1',
        number: 1,
        name: 'Presupuesto Total de Medios',
        description: 'Asignación financiera del trimestre',
        coefficients: { x1: 4, x2: 2 },
        operator: '<=',
        rhs: 200,
        unit: 'kUSD',
        consumptionFormula: '4k/TV + 2k/Digital ≤ 200k',
        slackLabel: 'CRÍTICA',
        statusType: 'critical'
      },
      {
        id: 'r2',
        number: 2,
        name: 'Horas Creativas de Producción',
        description: 'Capacidad mensual de la agencia',
        coefficients: { x1: 2, x2: 3 },
        operator: '<=',
        rhs: 150,
        unit: 'hrs',
        consumptionFormula: '2h/TV + 3h/Digital ≤ 150h',
        slackLabel: 'HOLGURA S₂',
        statusType: 'slack'
      }
    ]
  }
];
