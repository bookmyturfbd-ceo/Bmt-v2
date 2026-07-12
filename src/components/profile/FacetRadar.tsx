'use client';

import { useEffect, useRef } from 'react';

interface FacetPoint {
  label: string;
  value: number; // 0–99
}

interface FacetRadarProps {
  facets: FacetPoint[];
  color?: string;
  size?: number;
  provisional?: boolean;
}

export function FacetRadar({
  facets,
  color = '#00ff41',
  size = 200,
  provisional = false,
}: FacetRadarProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const N = facets.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size * 0.38; // outer ring radius
  const labelR = size * 0.47; // label radius

  // Angle for each axis (starting from top, clockwise)
  function angleFor(i: number) {
    return (Math.PI * 2 * i) / N - Math.PI / 2;
  }

  // Point on circle at given angle and radius
  function point(angle: number, r: number) {
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  }

  // Build polygon path string
  function polygonPath(values: number[]) {
    return values
      .map((v, i) => {
        const r = (v / 99) * R;
        const p = point(angleFor(i), r);
        return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
      })
      .join(' ') + ' Z';
  }

  // Grid rings (20, 40, 60, 80, 99)
  const rings = [20, 40, 60, 80, 99];

  // Axis grid polygon
  function ringPath(pct: number) {
    const r = (pct / 99) * R;
    return Array.from({ length: N }, (_, i) => {
      const p = point(angleFor(i), r);
      return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
    }).join(' ') + ' Z';
  }

  const dataPath = polygonPath(provisional ? facets.map(() => 50) : facets.map(f => f.value));

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="overflow-visible"
    >
      {/* Background rings */}
      {rings.map(r => (
        <path
          key={r}
          d={ringPath(r)}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}

      {/* Axis lines */}
      {facets.map((_, i) => {
        const outer = point(angleFor(i), R);
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x.toFixed(2)}
            y2={outer.y.toFixed(2)}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={1}
          />
        );
      })}

      {/* Data polygon fill */}
      <path
        d={dataPath}
        fill={color}
        fillOpacity={provisional ? 0.02 : 0.12}
      />

      {/* Data polygon stroke — animated draw-in */}
      <path
        d={dataPath}
        fill="none"
        stroke={provisional ? 'rgba(255,255,255,0.2)' : color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray={provisional ? '4 4' : undefined}
        className="radar-stroke"
        style={{
          strokeDasharray: provisional ? '4 4' : 9999,
          strokeDashoffset: provisional ? 0 : 9999,
          animation: provisional ? 'none' : 'radarDraw 1.2s ease-out forwards',
        }}
      />

      {/* Dot at each vertex */}
      {!provisional && facets.map((f, i) => {
        const r = (f.value / 99) * R;
        const p = point(angleFor(i), r);
        return (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3}
            fill={color}
            opacity={0.9}
          />
        );
      })}

      {/* Locked/calibrating state vertices */}
      {provisional && facets.map((_, i) => {
        const r = 0.5 * R;
        const p = point(angleFor(i), r);
        return (
          <g key={i} className="opacity-40">
            <circle
              cx={p.x}
              cy={p.y}
              r="7"
              fill="#0a0f0b"
              stroke={color}
              strokeWidth="1"
            />
            <text
              x={p.x}
              y={p.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize="8"
              fontWeight="900"
              fill={color}
            >
              ?
            </text>
          </g>
        );
      })}

      {/* Labels */}
      {facets.map((f, i) => {
        const p = point(angleFor(i), labelR);
        return (
          <text
            key={i}
            x={p.x.toFixed(2)}
            y={p.y.toFixed(2)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.07}
            fontWeight="900"
            fill={color}
            fillOpacity={0.6}
            letterSpacing={1}
          >
            {f.label}
          </text>
        );
      })}

      <style>{`
        @keyframes radarDraw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
}
