import React, { useState, useMemo, useRef, useEffect } from 'react';
import { LPModel, LPSolution, Point2D } from '../types/lp';

interface GraphViewProps {
  model: LPModel;
  solution: LPSolution;
  onNavigateToSimplex: () => void;
  onNavigateToEditor: () => void;
}

export const GraphView: React.FC<GraphViewProps> = ({
  model,
  solution,
  onNavigateToSimplex,
  onNavigateToEditor
}) => {
  const [selectedPoint, setSelectedPoint] = useState<Point2D | null>(null);
  const [showIsoLine, setShowIsoLine] = useState(true);
  const [isoValue, setIsoValue] = useState<number>(solution.optimalZ || 100);
  const [isPlayingIso, setIsPlayingIso] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });

  // Update isoValue when optimalZ changes
  useEffect(() => {
    if (solution.optimalZ) {
      setIsoValue(solution.optimalZ);
    }
  }, [solution.optimalZ]);

  // Isoprofit animation loop
  useEffect(() => {
    let animId: number;
    if (isPlayingIso) {
      const maxVal = (solution.optimalZ || 100) * 1.25;
      const step = maxVal / 180;
      const animate = () => {
        setIsoValue((prev) => {
          if (prev >= maxVal) {
            return 0;
          }
          return prev + step;
        });
        animId = requestAnimationFrame(animate);
      };
      animId = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlayingIso, solution.optimalZ]);

  const v1 = model.variables[0];
  const v2 = model.variables[1];
  const c1 = v1 ? v1.cost : 50;
  const c2 = v2 ? v2.cost : 40;

  // Calculate SVG graph dimensions & coordinate bounding box
  const { maxX, maxY, width, height, padding } = useMemo(() => {
    let rawMaxX = 10;
    let rawMaxY = 10;

    model.constraints.forEach((c) => {
      const a = c.coefficients[v1?.id || 'x1'] || 0;
      const b = c.coefficients[v2?.id || 'x2'] || 0;
      if (a > 0) rawMaxX = Math.max(rawMaxX, c.rhs / a);
      if (b > 0) rawMaxY = Math.max(rawMaxY, c.rhs / b);
    });

    solution.vertices2D.forEach((p) => {
      if (p.isFeasible) {
        rawMaxX = Math.max(rawMaxX, p.x);
        rawMaxY = Math.max(rawMaxY, p.y);
      }
    });

    // Provide comfortable margin
    const computedMaxX = Math.ceil((rawMaxX * 1.2) / 10) * 10 || 100;
    const computedMaxY = Math.ceil((rawMaxY * 1.2) / 10) * 10 || 100;

    return {
      maxX: computedMaxX,
      maxY: computedMaxY,
      width: 540,
      height: 440,
      padding: { left: 45, right: 30, top: 30, bottom: 45 }
    };
  }, [model, solution, v1, v2]);

  // Coordinate transforms
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const toSvgX = (x: number) => {
    return padding.left + (x / maxX) * plotWidth * zoomLevel + panOffset.x;
  };

  const toSvgY = (y: number) => {
    return height - padding.bottom - (y / maxY) * plotHeight * zoomLevel + panOffset.y;
  };

  // Convert SVG coordinates back to model (X, Y)
  const fromSvgX = (svgX: number) => {
    return ((svgX - padding.left - panOffset.x) / (plotWidth * zoomLevel)) * maxX;
  };

  const fromSvgY = (svgY: number) => {
    return ((height - padding.bottom + panOffset.y - svgY) / (plotHeight * zoomLevel)) * maxY;
  };

  // Build Feasible Region Polygon SVG path
  const polygonPointsStr = useMemo(() => {
    if (!solution.feasiblePolygon || solution.feasiblePolygon.length < 3) return '';
    return solution.feasiblePolygon.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ');
  }, [solution.feasiblePolygon, zoomLevel, panOffset, maxX, maxY]);

  // Constraint line colors
  const constraintPalette = [
    { stroke: '#4c8eff', name: 'Azul Eléctrico' },
    { stroke: '#ffb95f', name: 'Ámbar Cálido' },
    { stroke: '#4edea3', name: 'Esmeralda Tecnológico' },
    { stroke: '#ff7b72', name: 'Coral Alerta' },
    { stroke: '#d2a8ff', name: 'Púrpura' }
  ];

  // Generate grid ticks
  const xTicks = useMemo(() => {
    const step = maxX <= 50 ? 10 : maxX <= 120 ? 20 : 50;
    const ticks: number[] = [];
    for (let x = 0; x <= maxX; x += step) ticks.push(x);
    return ticks;
  }, [maxX]);

  const yTicks = useMemo(() => {
    const step = maxY <= 50 ? 10 : maxY <= 120 ? 20 : 50;
    const ticks: number[] = [];
    for (let y = 0; y <= maxY; y += step) ticks.push(y);
    return ticks;
  }, [maxY]);

  // Compute Isoprofit Line: c1*X1 + c2*X2 = isoValue
  const isoLinePoints = useMemo(() => {
    if (c1 <= 0 && c2 <= 0) return null;
    let p1 = { x: 0, y: 0 };
    let p2 = { x: 0, y: 0 };

    if (c2 > 0 && c1 > 0) {
      p1 = { x: 0, y: isoValue / c2 };
      p2 = { x: isoValue / c1, y: 0 };
    } else if (c1 > 0) {
      p1 = { x: isoValue / c1, y: 0 };
      p2 = { x: isoValue / c1, y: maxY };
    } else {
      p1 = { x: 0, y: isoValue / c2 };
      p2 = { x: maxX, y: isoValue / c2 };
    }

    return {
      x1: toSvgX(p1.x),
      y1: toSvgY(p1.y),
      x2: toSvgX(p2.x),
      y2: toSvgY(p2.y)
    };
  }, [isoValue, c1, c2, maxX, maxY, zoomLevel, panOffset]);

  const optimalVertex = solution.vertices2D.find((v) => v.isOptimal && v.isFeasible);

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto px-4 sm:px-6 pt-4 pb-28 gap-5">
      {/* Header */}
      <section className="flex flex-col gap-2 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-[#adc6ff] uppercase tracking-widest font-mono">
              Paso 2 • Resolución Geométrica
            </span>
            <h1 className="text-[24px] sm:text-[28px] font-bold text-[#dbe1ff] tracking-tight">
              Solución y Gráfica 2D
            </h1>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131a33] text-[#4edea3] border border-[#4edea3]/30 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse"></span>
            <span className="text-[12px] font-mono font-bold">
              {solution.status === 'OPTIMAL' ? 'ÓPTIMO CALCULADO' : solution.status}
            </span>
          </div>
        </div>

        <p className="text-[13px] text-[#c2c6d6] leading-relaxed">
          Visualización bidimensional del poliedro de factibilidad, hiperplanos de frontera y
          trayectoria de la función objetivo.
        </p>
      </section>

      {/* Main Graph Card */}
      <section className="flex flex-col rounded-2xl bg-[#050d25] border border-[#212942] p-3 sm:p-4 shadow-2xl relative overflow-hidden">
        {/* Controls Toolbar */}
        <div className="flex items-center justify-between mb-3 border-b border-[#212942] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#adc6ff] text-[18px]">
              analytics
            </span>
            <span className="text-[12px] font-semibold text-[#dbe1ff] uppercase tracking-wider font-mono">
              Plano Cartesiano ({v1?.symbol || 'X₁'} vs {v2?.symbol || 'X₂'})
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              title="Acercar (Zoom In)"
              type="button"
              className="w-7 h-7 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:text-[#dbe1ff] hover:bg-[#212942] flex items-center justify-center text-[15px]"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_in</span>
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
              title="Alejar (Zoom Out)"
              type="button"
              className="w-7 h-7 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:text-[#dbe1ff] hover:bg-[#212942] flex items-center justify-center text-[15px]"
            >
              <span className="material-symbols-outlined text-[16px]">zoom_out</span>
            </button>
            <button
              onClick={() => {
                setZoomLevel(1);
                setPanOffset({ x: 0, y: 0 });
              }}
              title="Restablecer Vista"
              type="button"
              className="w-7 h-7 rounded-lg bg-[#171e37] text-[#c2c6d6] hover:text-[#dbe1ff] hover:bg-[#212942] flex items-center justify-center text-[15px]"
            >
              <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            </button>
          </div>
        </div>

        {/* SVG Canvas Viewport */}
        <div className="relative w-full aspect-[4/3] bg-[#0a122a] rounded-xl border border-[#212942] overflow-hidden select-none shadow-inner">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full"
            style={{ touchAction: 'none' }}
          >
            <defs>
              {/* Feasible polygon fill pattern */}
              <pattern
                id="feasiblePattern"
                width="16"
                height="16"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <line x1="0" y1="0" x2="0" y2="16" stroke="#4edea3" strokeWidth="0.8" opacity="0.15" />
              </pattern>

              {/* Gradient for feasible polygon */}
              <linearGradient id="feasibleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4c8eff" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4edea3" stopOpacity="0.30" />
              </linearGradient>

              {/* Glow filter for optimal point */}
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Grid Lines */}
            <g className="grid-lines" opacity="0.4">
              {xTicks.map((x) => (
                <line
                  key={`gx-${x}`}
                  x1={toSvgX(x)}
                  y1={padding.top}
                  x2={toSvgX(x)}
                  y2={height - padding.bottom}
                  stroke="#212942"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              ))}
              {yTicks.map((y) => (
                <line
                  key={`gy-${y}`}
                  x1={padding.left}
                  y1={toSvgY(y)}
                  x2={width - padding.right}
                  y2={toSvgY(y)}
                  stroke="#212942"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              ))}
            </g>

            {/* Feasible Region Polygon */}
            {polygonPointsStr && (
              <polygon
                points={polygonPointsStr}
                fill="url(#feasibleGrad)"
                stroke="#4edea3"
                strokeWidth="2"
                strokeDasharray="none"
                className="transition-all duration-300"
              />
            )}

            {/* Constraint Boundary Lines */}
            {model.constraints.map((c, i) => {
              const a = c.coefficients[v1?.id || 'x1'] ?? 0;
              const b = c.coefficients[v2?.id || 'x2'] ?? 0;
              const strokeColor = constraintPalette[i % constraintPalette.length].stroke;

              // Line intersections with canvas bounds
              let pStart = { x: 0, y: 0 };
              let pEnd = { x: 0, y: 0 };

              if (b !== 0 && a !== 0) {
                // Intersect with x=0 and y=0
                pStart = { x: 0, y: c.rhs / b };
                pEnd = { x: c.rhs / a, y: 0 };
              } else if (a !== 0) {
                pStart = { x: c.rhs / a, y: 0 };
                pEnd = { x: c.rhs / a, y: maxY };
              } else if (b !== 0) {
                pStart = { x: 0, y: c.rhs / b };
                pEnd = { x: maxX, y: c.rhs / b };
              }

              const sx1 = toSvgX(pStart.x);
              const sy1 = toSvgY(pStart.y);
              const sx2 = toSvgX(pEnd.x);
              const sy2 = toSvgY(pEnd.y);

              return (
                <g key={c.id}>
                  <line
                    x1={sx1}
                    y1={sy1}
                    x2={sx2}
                    y2={sy2}
                    stroke={strokeColor}
                    strokeWidth="2"
                    opacity="0.9"
                  />
                  {/* Constraint label along line */}
                  <text
                    x={sx2 - 20}
                    y={sy2 - 10}
                    fill={strokeColor}
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    R{c.number || i + 1}
                  </text>
                </g>
              );
            })}

            {/* Explicit Variable Bounds Lines (Cotas X1 <= U1, X2 <= U2) */}
            {v1?.upperBound !== undefined && v1.upperBound > 0 && (
              <g>
                <line
                  x1={toSvgX(v1.upperBound)}
                  y1={toSvgY(0)}
                  x2={toSvgX(v1.upperBound)}
                  y2={toSvgY(maxY)}
                  stroke="#adc6ff"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />
                <text
                  x={toSvgX(v1.upperBound) + 4}
                  y={toSvgY(maxY * 0.85)}
                  fill="#adc6ff"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {v1.symbol} ≤ {v1.upperBound}
                </text>
              </g>
            )}

            {v2?.upperBound !== undefined && v2.upperBound > 0 && (
              <g>
                <line
                  x1={toSvgX(0)}
                  y1={toSvgY(v2.upperBound)}
                  x2={toSvgX(maxX)}
                  y2={toSvgY(v2.upperBound)}
                  stroke="#adc6ff"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                />
                <text
                  x={toSvgX(maxX * 0.75)}
                  y={toSvgY(v2.upperBound) - 4}
                  fill="#adc6ff"
                  fontSize="9"
                  fontWeight="bold"
                  fontFamily="JetBrains Mono, monospace"
                >
                  {v2.symbol} ≤ {v2.upperBound}
                </text>
              </g>
            )}

            {/* Interactive Isoprofit / Isocost Line */}
            {showIsoLine && isoLinePoints && (
              <g className="transition-all duration-75">
                <line
                  x1={isoLinePoints.x1}
                  y1={isoLinePoints.y1}
                  x2={isoLinePoints.x2}
                  y2={isoLinePoints.y2}
                  stroke="#adc6ff"
                  strokeWidth="2.5"
                  strokeDasharray="6 4"
                  opacity="0.95"
                />
                <circle
                  cx={(isoLinePoints.x1 + isoLinePoints.x2) / 2}
                  cy={(isoLinePoints.y1 + isoLinePoints.y2) / 2}
                  r="4"
                  fill="#4c8eff"
                />
              </g>
            )}

            {/* Cartesian Axes */}
            <g className="axes">
              {/* X Axis */}
              <line
                x1={padding.left}
                y1={height - padding.bottom}
                x2={width - padding.right + 10}
                y2={height - padding.bottom}
                stroke="#8c909f"
                strokeWidth="1.8"
              />
              {/* Y Axis */}
              <line
                x1={padding.left}
                y1={height - padding.bottom}
                x2={padding.left}
                y2={padding.top - 10}
                stroke="#8c909f"
                strokeWidth="1.8"
              />

              {/* Axis Arrowheads */}
              <polygon
                points={`${width - padding.right + 15},${height - padding.bottom} ${width - padding.right + 8},${height - padding.bottom - 4} ${width - padding.right + 8},${height - padding.bottom + 4}`}
                fill="#8c909f"
              />
              <polygon
                points={`${padding.left},${padding.top - 15} ${padding.left - 4},${padding.top - 8} ${padding.left + 4},${padding.top - 8}`}
                fill="#8c909f"
              />

              {/* Ticks and numeric labels */}
              {xTicks.map((x) => (
                <g key={`xtick-${x}`}>
                  <line
                    x1={toSvgX(x)}
                    y1={height - padding.bottom}
                    x2={toSvgX(x)}
                    y2={height - padding.bottom + 5}
                    stroke="#8c909f"
                    strokeWidth="1"
                  />
                  <text
                    x={toSvgX(x)}
                    y={height - padding.bottom + 18}
                    fill="#8c909f"
                    fontSize="10"
                    textAnchor="middle"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {x}
                  </text>
                </g>
              ))}

              {yTicks.map((y) => (
                <g key={`ytick-${y}`}>
                  <line
                    x1={padding.left - 5}
                    y1={toSvgY(y)}
                    x2={padding.left}
                    y2={toSvgY(y)}
                    stroke="#8c909f"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={toSvgY(y) + 3}
                    fill="#8c909f"
                    fontSize="10"
                    textAnchor="end"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {y}
                  </text>
                </g>
              ))}

              {/* Variable Axis Names */}
              <text
                x={width - padding.right}
                y={height - padding.bottom + 32}
                fill="#adc6ff"
                fontSize="12"
                fontWeight="bold"
                textAnchor="end"
                fontFamily="JetBrains Mono, monospace"
              >
                {v1?.symbol || 'X₁'} ({v1?.name?.split(' ')[0] || 'Prod A'}) →
              </text>

              <text
                x={padding.left - 10}
                y={padding.top - 12}
                fill="#adc6ff"
                fontSize="12"
                fontWeight="bold"
                textAnchor="start"
                fontFamily="JetBrains Mono, monospace"
              >
                ↑ {v2?.symbol || 'X₂'} ({v2?.name?.split(' ')[0] || 'Prod B'})
              </text>
            </g>

            {/* Vertices Points (Corners of Feasible Region) */}
            {solution.vertices2D.map((pt, i) => {
              const cx = toSvgX(pt.x);
              const cy = toSvgY(pt.y);
              const isOpt = pt.isOptimal && pt.isFeasible;

              if (!pt.isFeasible) return null; // only show feasible corners for clarity

              return (
                <g
                  key={`pt-${i}`}
                  className="cursor-pointer group"
                  onClick={() => setSelectedPoint(pt)}
                >
                  {isOpt ? (
                    // Optimal crosshair and beacon
                    <g filter="url(#glow)">
                      <circle cx={cx} cy={cy} r="14" fill="#4edea3" fillOpacity="0.25" />
                      <circle
                        cx={cx}
                        cy={cy}
                        r="8"
                        fill="#003824"
                        stroke="#4edea3"
                        strokeWidth="2.5"
                      />
                      {/* Crosshairs */}
                      <line
                        x1={cx - 12}
                        y1={cy}
                        x2={cx + 12}
                        y2={cy}
                        stroke="#4edea3"
                        strokeWidth="1.5"
                      />
                      <line
                        x1={cx}
                        y1={cy - 12}
                        x2={cx}
                        y2={cy + 12}
                        stroke="#4edea3"
                        strokeWidth="1.5"
                      />

                      {/* Optimal Tag */}
                      <rect
                        x={cx + 10}
                        y={cy - 28}
                        width="88"
                        height="22"
                        rx="4"
                        fill="#050d25"
                        stroke="#4edea3"
                        strokeWidth="1.5"
                      />
                      <text
                        x={cx + 15}
                        y={cy - 14}
                        fill="#4edea3"
                        fontSize="11"
                        fontWeight="bold"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        Z* = {pt.z}
                      </text>
                    </g>
                  ) : (
                    // Regular feasible vertex
                    <circle
                      cx={cx}
                      cy={cy}
                      r="5.5"
                      fill="#131a33"
                      stroke="#4c8eff"
                      strokeWidth="2"
                      className="hover:r-7 transition-all"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Inspection Tooltip if a vertex was tapped */}
          {selectedPoint && (
            <div className="absolute top-3 left-3 bg-[#131a33]/95 backdrop-blur-md border border-[#4edea3] rounded-xl p-3 shadow-2xl z-20 flex flex-col gap-1 max-w-[220px]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#4edea3] font-mono">
                  {selectedPoint.isOptimal ? '★ VÉRTICE ÓPTIMO' : 'VÉRTICE FACTIBLE'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedPoint(null)}
                  className="text-[#8c909f] hover:text-[#dbe1ff]"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              </div>
              <div className="text-[12px] font-mono text-[#dbe1ff]">
                ({v1?.symbol}: {selectedPoint.x}, {v2?.symbol}: {selectedPoint.y})
              </div>
              <div className="text-[13px] font-bold text-[#4edea3] font-mono">
                Z = {selectedPoint.z} {model.unit}
              </div>
            </div>
          )}
        </div>

        {/* Legend of Constraints */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-3 pt-2 border-t border-[#212942]/60 text-[11px]">
          {model.constraints.map((c, i) => (
            <div key={c.id} className="flex items-center gap-1.5 font-mono">
              <span
                className="w-3 h-1 rounded"
                style={{ backgroundColor: constraintPalette[i % constraintPalette.length].stroke }}
              ></span>
              <span className="text-[#c2c6d6]">
                R{c.number || i + 1}: {c.name.split(':')[0]}
              </span>
            </div>
          ))}
          <div className="flex items-center gap-1.5 font-mono ml-auto">
            <span className="w-3 h-1 rounded bg-[#4edea3]"></span>
            <span className="text-[#4edea3] font-semibold">Región Factible</span>
          </div>
        </div>
      </section>

      {/* Isoprofit Line Slider Controller */}
      <section className="flex flex-col p-4 rounded-xl bg-[#131a33] border border-[#212942] shadow-md gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#adc6ff] text-[18px]">
              straighten
            </span>
            <span className="text-[13px] font-semibold text-[#dbe1ff]">
              Recta de Isoutilidad (Función Objetivo: {c1}·X₁ + {c2}·X₂ = Z)
            </span>
          </div>

          <button
            onClick={() => setIsPlayingIso(!isPlayingIso)}
            type="button"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#212942] hover:bg-[#2c344d] text-[#4edea3] font-mono text-[11px] font-bold transition-all"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isPlayingIso ? 'pause' : 'play_arrow'}
            </span>
            <span>{isPlayingIso ? 'Pausar' : 'Barrer Z'}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono text-[12px] text-[#8c909f]">Z = 0</span>
          <input
            type="range"
            min={0}
            max={(solution.optimalZ || 100) * 1.3}
            step={5}
            value={isoValue}
            onChange={(e) => {
              setIsPlayingIso(false);
              setIsoValue(parseFloat(e.target.value));
            }}
            className="flex-1 accent-[#4edea3] h-2 bg-[#050d25] rounded-lg cursor-pointer"
          />
          <span className="font-mono text-[13px] font-bold text-[#4edea3] min-w-[70px] text-right">
            Z = {Math.round(isoValue)}
          </span>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#8c909f]">
          <span>Arrastra el control para observar cómo la recta paralela toca el vértice óptimo.</span>
          <button
            onClick={() => setIsoValue(solution.optimalZ)}
            type="button"
            className="text-[#adc6ff] hover:underline font-mono"
          >
            Fijar en Z* ({solution.optimalZ})
          </button>
        </div>
      </section>

      {/* Solution KPI Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        <div className="flex flex-col p-3 rounded-xl bg-[#171e37] border border-[#4edea3]/40 shadow-lg relative overflow-hidden">
          <div className="text-[11px] font-semibold text-[#8c909f] uppercase">
            Valor Óptimo (Z*)
          </div>
          <div className="text-[24px] font-mono font-bold text-[#4edea3] mt-0.5">
            ${solution.optimalZ.toLocaleString()}
          </div>
          <span className="text-[11px] text-[#c2c6d6] truncate">{model.targetName}</span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-[#171e37] border border-[#212942] shadow-md">
          <div className="text-[11px] font-semibold text-[#8c909f] uppercase">
            {v1?.symbol || 'X₁'} Óptimo
          </div>
          <div className="text-[24px] font-mono font-bold text-[#adc6ff] mt-0.5">
            {optimalVertex ? optimalVertex.x : 0}
          </div>
          <span className="text-[11px] text-[#c2c6d6] truncate">{v1?.unit}</span>
        </div>

        <div className="flex flex-col p-3 rounded-xl bg-[#171e37] border border-[#212942] shadow-md col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-[#8c909f] uppercase">
            {v2?.symbol || 'X₂'} Óptimo
          </div>
          <div className="text-[24px] font-mono font-bold text-[#adc6ff] mt-0.5">
            {optimalVertex ? optimalVertex.y : 0}
          </div>
          <span className="text-[11px] text-[#c2c6d6] truncate">{v2?.unit}</span>
        </div>
      </section>

      {/* Feasible Vertices Comparison Table */}
      <section className="flex flex-col rounded-xl bg-[#131a33] border border-[#212942] p-4 shadow-md gap-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-[15px] font-semibold text-[#dbe1ff]">
            Evaluación de Vértices en la Función Objetivo
          </h3>
          <span className="font-mono text-[11px] text-[#8c909f]">
            {solution.vertices2D.filter((v) => v.isFeasible).length} Puntos Esquina
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[12px]">
            <thead>
              <tr className="border-b border-[#212942] text-[#8c909f] text-[11px]">
                <th className="py-2 px-2">Vértice</th>
                <th className="py-2 px-2">{v1?.symbol || 'X₁'}</th>
                <th className="py-2 px-2">{v2?.symbol || 'X₂'}</th>
                <th className="py-2 px-2">Valor Z</th>
                <th className="py-2 px-2 text-right">Diagnóstico</th>
              </tr>
            </thead>
            <tbody>
              {solution.vertices2D
                .filter((v) => v.isFeasible)
                .sort((a, b) => b.z - a.z)
                .map((pt, idx) => (
                  <tr
                    key={idx}
                    className={`border-b border-[#212942]/40 transition-colors ${
                      pt.isOptimal
                        ? 'bg-[#4edea3]/10 text-[#4edea3] font-bold'
                        : 'text-[#c2c6d6] hover:bg-[#171e37]'
                    }`}
                  >
                    <td className="py-2 px-2">
                      P{idx + 1} {pt.isOptimal && '★'}
                    </td>
                    <td className="py-2 px-2">{pt.x}</td>
                    <td className="py-2 px-2">{pt.y}</td>
                    <td className="py-2 px-2 font-bold">${pt.z}</td>
                    <td className="py-2 px-2 text-right">
                      {pt.isOptimal ? (
                        <span className="px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] text-[10px] font-bold">
                          ÓPTIMO
                        </span>
                      ) : (
                        <span className="text-[#8c909f] text-[10px]">Factible</span>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Constraints Utilization & Slack Table */}
      <section className="flex flex-col rounded-xl bg-[#131a33] border border-[#212942] p-4 shadow-md gap-2.5">
        <h3 className="text-[15px] font-semibold text-[#dbe1ff]">
          Estado de Restricciones y Holguras en el Óptimo
        </h3>

        <div className="flex flex-col gap-2">
          {model.constraints.map((c) => {
            const isBinding = solution.bindingConstraints.includes(c.id);
            const slack = solution.slacks[c.id] ?? 0;
            const shadowPrice = solution.shadowPrices[c.id] ?? 0;

            return (
              <div
                key={c.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-[#171e37] border border-[#212942]"
              >
                <div className="flex flex-col min-w-0 pr-2">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[12px] text-[#adc6ff] font-bold">
                      R{c.number}:
                    </span>
                    <span className="text-[13px] text-[#dbe1ff] font-medium truncate">
                      {c.name}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#8c909f]">
                    Precio Sombra: <strong>${shadowPrice} / {c.unit}</strong>
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {isBinding ? (
                    <span className="px-2 py-0.5 rounded bg-[#ffb95f]/20 text-[#ffb95f] font-mono text-[11px] font-bold border border-[#ffb95f]/30">
                      Saturada (Holgura = 0)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] font-mono text-[11px] font-bold border border-[#4edea3]/30">
                      Holgura = {slack} {c.unit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Action Bar */}
      <div className="flex items-center gap-3 mt-1">
        <button
          onClick={onNavigateToEditor}
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#171e37] hover:bg-[#212942] text-[#c2c6d6] hover:text-[#dbe1ff] border border-[#212942] font-semibold text-[13px] transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">edit_note</span>
          <span>Ajustar Parámetros</span>
        </button>

        <button
          onClick={onNavigateToSimplex}
          type="button"
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-[#4c8eff] hover:bg-[#adc6ff] text-[#00285d] font-bold text-[13px] shadow-lg shadow-[#4c8eff]/20 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">table_chart</span>
          <span>Ver Tablas Simplex</span>
        </button>
      </div>
    </div>
  );
};
