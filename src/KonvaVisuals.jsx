import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle } from 'react-konva'

// Simple Konva-based renderer for the fixed visualShapes
export default function KonvaVisuals({ visualMapping, visualShapes, availableInstruments, status }) {
  const [energies, setEnergies] = useState({})
  const rafRef = useRef(null)

  // Poll visualMeters if available (global) to drive animation
  useEffect(() => {
    let mounted = true
    const loop = () => {
      // visualMeters is imported globally from VisualComponents if present
      const vm = (typeof window !== 'undefined' && window.visualMeters) ? window.visualMeters : null
      if (vm) {
        const next = {}
        for (const k of availableInstruments) {
          const meter = vm[k]
          if (meter && meter.getValue) {
            const val = meter.getValue()
            const e = Math.max(0, Math.min(1, (ToneDbToGainSafe(val) * 2)))
            next[k] = e
          } else next[k] = 0
        }
        if (mounted) setEnergies(next)
      }
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { mounted = false; cancelAnimationFrame(rafRef.current) }
  }, [availableInstruments])

  // Safe conversion from dB to gain (Tone.js helper not imported here to avoid adding dependency in this file)
  function ToneDbToGainSafe(db) {
    if (db === undefined || db === null || isNaN(db)) return 0
    // approximate: gain = 10^(db/20)
    return Math.pow(10, db / 20)
  }

  // Map visual shapes to Konva primitives
  const renderVisual = (stem, visual) => {
    const shapePoints = visualShapes[visual] || []
    // flatten to x,y pairs scaled for canvas
    const points = shapePoints.map(p => [p[0] * 40 + window.innerWidth/2, -p[1] * 40 + window.innerHeight/2]).flat()
    const energy = energies[stem] || 0
    const stroke = '#00f0ff'
    switch (visual) {
      case 'Orb':
        return <Circle key={stem} x={window.innerWidth/2} y={window.innerHeight/2} radius={60 + energy * 120} fill={'rgba(0,240,255,' + (0.08 + energy * 0.5) + ')'} stroke={stroke} strokeWidth={2 + energy * 6} />
      case 'Terrain':
        return <Line key={stem} points={points} closed fill={'rgba(138,43,226,' + (0.06 + energy * 0.4) + ')'} stroke={'#8A2BE2'} strokeWidth={2 + energy * 4} tension={0.4} />
      case 'Comet':
        return <Line key={stem} points={points} stroke={'#ff0055'} strokeWidth={4 + energy * 8} lineCap={'round'} shadowBlur={10 + energy * 30} />
      case 'Cloud':
        return <Line key={stem} points={points} closed stroke={'#39ff14'} strokeWidth={2 + energy * 3} opacity={0.6 + energy * 0.3} tension={0.6} />
      default:
        return null
    }
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none' }}>
      <Stage width={window.innerWidth} height={window.innerHeight} >
        <Layer>
          {Object.entries(visualMapping).map(([stem, visual]) => {
            if (!availableInstruments.includes(stem)) return null
            return renderVisual(stem, visual)
          })}
        </Layer>
      </Stage>
    </div>
  )
}
