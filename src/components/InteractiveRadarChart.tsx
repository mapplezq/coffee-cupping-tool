"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface RadarChartProps {
  data: {
    fragrance: number;
    flavor: number;
    aftertaste: number;
    acidity: number;
    body: number;
    balance: number;
    overall: number;
  };
  onChange: (attribute: string, value: number) => void;
  size?: number;
}

const ATTRIBUTES = [
  { key: 'fragrance', label: '干/湿香' },
  { key: 'flavor', label: '风味' },
  { key: 'aftertaste', label: '余韵' },
  { key: 'acidity', label: '酸质' },
  { key: 'body', label: '醇厚度' },
  { key: 'balance', label: '平衡度' },
  { key: 'overall', label: '整体' },
];

const MIN_SCORE = 6;
const MAX_SCORE = 10;
const TOTAL_STEPS = 4; // 6, 7, 8, 9, 10

export default function InteractiveRadarChart({ data, onChange, size = 320 }: RadarChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [activeAttribute, setActiveAttribute] = useState<string | null>(null);

  const center = size / 2;
  const radius = (size / 2) - 60; // Increased padding from 50 to 60 to prevent label cutoff on small screens
  const angleStep = (Math.PI * 2) / ATTRIBUTES.length;

  // Helper: Value to Radius
  const valueToRadius = (value: number) => {
    const normalized = Math.max(MIN_SCORE, Math.min(MAX_SCORE, value)) - MIN_SCORE;
    return (normalized / (MAX_SCORE - MIN_SCORE)) * radius;
  };

  // Helper: Radius to Value
  const radiusToValue = (r: number) => {
    const normalized = r / radius;
    const value = normalized * (MAX_SCORE - MIN_SCORE) + MIN_SCORE;
    // Snap to 0.25
    return Math.round(value * 4) / 4;
  };

  // Calculate coordinates for a point
  const getCoordinates = (value: number, index: number) => {
    const angle = index * angleStep - Math.PI / 2; // Start from top
    const r = valueToRadius(value);
    return {
      x: center + Math.cos(angle) * r,
      y: center + Math.sin(angle) * r,
    };
  };

  // Generate polygon path
  const polygonPath = ATTRIBUTES.map((attr, i) => {
    const { x, y } = getCoordinates(data[attr.key as keyof typeof data], i);
    return `${i === 0 ? 'M' : 'L'} ${x},${y}`;
  }).join(' ') + ' Z';

  // Handle Global Touch Move for smoother dragging
  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (activeAttribute) {
        e.preventDefault(); // Prevent scrolling only when dragging
        handleInteraction(e as any);
      }
    };
    
    const handleTouchEnd = () => {
      setActiveAttribute(null);
    };

    if (activeAttribute) {
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
      document.addEventListener('mouseup', handleTouchEnd);
    }

    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('mouseup', handleTouchEnd);
    };
  }, [activeAttribute]); // Re-bind when activeAttribute changes

  // Handle Drag interaction
  const handleInteraction = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent, index: number | null = null) => {
    if (!svgRef.current) return;
    
    // Determine active index (either passed explicitly or from state)
    const targetIndex = index !== null ? index : (activeAttribute ? ATTRIBUTES.findIndex(a => a.key === activeAttribute) : -1);
    if (targetIndex === -1) return;
    
    const svgRect = svgRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? (e as any).touches[0].clientX : (e as any).clientX;
    const clientY = 'touches' in e ? (e as any).touches[0].clientY : (e as any).clientY;

    const dx = clientX - svgRect.left - center;
    const dy = clientY - svgRect.top - center;
    
    // Calculate distance from center
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate new value based on distance
    // Clamp distance to max radius
    const clampedDist = Math.min(dist, radius);
    let newValue = radiusToValue(clampedDist);
    
    // Clamp value
    newValue = Math.max(MIN_SCORE, Math.min(MAX_SCORE, newValue));

    // Improved Snapping Logic
    // Snap to nearest 0.25
    let snappedValue = Math.round(newValue * 4) / 4;
    
    // Stronger snap to integers (e.g. 8.0, 9.0) with larger threshold
    // Increased threshold from 0.1 to 0.15 to make it easier to hit integers
    if (Math.abs(newValue - Math.round(newValue)) < 0.15) {
      snappedValue = Math.round(newValue);
    }

    onChange(ATTRIBUTES[targetIndex].key, snappedValue);
  };

  return (
    <div className="flex flex-col items-center select-none">
      <svg 
        ref={svgRef}
        width={size} 
        height={size} 
        className="overflow-visible" 
        onMouseMove={(e) => activeAttribute && e.buttons === 1 && handleInteraction(e)}
        onMouseUp={() => setActiveAttribute(null)}
      >
        {/* Background Grid (Concentric Polygons) */}
        {[0, 0.25, 0.5, 0.75, 1].map((step, i) => {
          const r = radius * step;
          const value = MIN_SCORE + step * (MAX_SCORE - MIN_SCORE);
          const path = ATTRIBUTES.map((_, j) => {
            const angle = j * angleStep - Math.PI / 2;
            return `${j === 0 ? 'M' : 'L'} ${center + Math.cos(angle) * r},${center + Math.sin(angle) * r}`;
          }).join(' ') + ' Z';
          
          return (
            <g key={i}>
              <path 
                d={path} 
                fill="none" 
                stroke={i === 4 ? "#d1d5db" : "#f3f4f6"} // Lighter grid lines
                strokeWidth="1" 
                strokeDasharray={i === 4 ? "0" : "4 4"}
              />
              {/* Score Labels on the top axis */}
              {/* Hide the top '10' label to avoid collision with title */}
              {i !== 4 && (
                <text 
                  x={center} 
                  y={center - r - 4} 
                  textAnchor="middle" 
                  className="text-[10px] fill-gray-300 select-none pointer-events-none"
                >
                  {value}
                </text>
              )}
            </g>
          );
        })}

        {/* Axes Lines */}
        {ATTRIBUTES.map((_, i) => {
          const angle = i * angleStep - Math.PI / 2;
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + Math.cos(angle) * radius}
              y2={center + Math.sin(angle) * radius}
              stroke="#f3f4f6" // Lighter axes
              strokeWidth="1"
            />
          );
        })}

        {/* Data Polygon with Gradient */}
        <defs>
          <linearGradient id="radarGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgba(217, 119, 6, 0.5)" />
            <stop offset="100%" stopColor="rgba(217, 119, 6, 0.2)" />
          </linearGradient>
        </defs>

        <motion.path
          d={polygonPath}
          fill="url(#radarGradient)" 
          stroke="#d97706"
          strokeWidth="3"
          strokeLinejoin="round"
          initial={false}
          animate={{ d: polygonPath }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />

        {/* Interactive Points & Labels */}
        {ATTRIBUTES.map((attr, i) => {
          const value = data[attr.key as keyof typeof data];
          const { x, y } = getCoordinates(value, i);
          
          // Label Position (pushed further out)
          const angle = i * angleStep - Math.PI / 2;
          const labelR = radius + 35; // Increased padding from 25 to 35
          const labelX = center + Math.cos(angle) * labelR;
          const labelY = center + Math.sin(angle) * labelR;

          return (
            <g key={attr.key}>
              {/* Axis Label */}
              <text
                x={labelX}
                y={labelY - 8} // Shift label up slightly
                textAnchor="middle"
                dominantBaseline="middle"
                className={`text-xs ${activeAttribute === attr.key ? 'fill-amber-800 font-bold' : 'fill-gray-600 font-medium'} select-none pointer-events-none`}
              >
                {attr.label}
              </text>
              
              {/* Value Label (Current Score) */}
              <text
                x={labelX}
                y={labelY + 8} // Shift value down
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm font-bold fill-amber-600 select-none pointer-events-none"
              >
                {value.toFixed(2)}
              </text>

              {/* Interactive Handle */}
              <motion.circle
                cx={x}
                cy={y}
                r={activeAttribute === attr.key ? 12 : 6}
                fill={activeAttribute === attr.key ? "#d97706" : "#ffffff"}
                stroke="#d97706"
                strokeWidth="2"
                initial={false}
                animate={{ cx: x, cy: y }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="cursor-pointer hover:fill-amber-100"
                onMouseDown={(e) => {
                  setActiveAttribute(attr.key);
                  handleInteraction(e, i);
                }}
                onTouchStart={(e) => {
                  setActiveAttribute(attr.key);
                  handleInteraction(e, i);
                }}
              />
              
              {/* Invisible Hit Area for easier touch */}
              <circle
                cx={x}
                cy={y}
                r={24}
                fill="transparent"
                className="cursor-pointer"
                onMouseDown={(e) => {
                  setActiveAttribute(attr.key);
                  handleInteraction(e, i);
                }}
                onTouchStart={(e) => {
                  setActiveAttribute(attr.key);
                  handleInteraction(e, i);
                }}
              />
            </g>
          );
        })}
      </svg>
      
      <p className="text-xs text-gray-400 mt-2">拖动顶点调整分数 (6.0 - 10.0)</p>
    </div>
  );
}
