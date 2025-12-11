import React, { useEffect, useRef, useState } from 'react'
import { Stage, Layer, Line, Circle } from 'react-konva'

// Simple Konva-based renderer for the fixed visualShapes
export default function KonvaVisuals({ visualMapping, visualShapes, availableInstruments, status }) {
  const [energies, setEnergies] = useState({})
  const rafRef = useRef(null)
  const phaseRef = useRef({}) // Armazena a fase da animação para cada stem

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

  // Função para gerar pontos da wave
  const generateWavePoints = (stem, energy, centerX, centerY, width = 400) => {
    // Inicializa a fase se não existir
    if (!phaseRef.current[stem]) {
      phaseRef.current[stem] = 0
    }
    
    // Incrementa a fase baseado no energy (multiplicador)
    const multiplier = 0.5 + energy * 2.5 // Varia de 0.5 a 3.0 baseado no energy
    phaseRef.current[stem] += 0.05 * multiplier
    
    const points = []
    const amplitude = energy * 60 // Amplitude varia com energy
    const frequency = 0.07
    const halfWidth = width / 2
    
    // Gera pontos da onda
    for (let x = -halfWidth; x <= halfWidth; x += 8) {
      const y = Math.sin(x * frequency + phaseRef.current[stem]) * amplitude
      points.push(centerX + x, centerY + y)
    }
    
    return points
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
        return <Circle draggable key={stem} x={window.innerWidth/2} y={70 + window.innerHeight/2} radius={70 + energy * 120} fill={'rgba(0,240,255,' + (0.08 + energy * 0.5) + ')'} stroke={stroke} strokeWidth={2 + energy * 6} />
      case 'Terrain':
        // Triângulo com vértices que variam com energy
        const baseSize = 80
        const multiplier = 0.5 + energy * 2 // Varia de 0.5 a 2.5
        const size = baseSize * multiplier
        
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2
        
        // Calcula os três vértices do triângulo equilátero
        const trianglePoints = [
          centerX, centerY - size, // Vértice superior
          centerX - size * Math.cos(Math.PI / 6), centerY + size * Math.sin(Math.PI / 6), // Vértice inferior esquerdo
          centerX + size * Math.cos(Math.PI / 6), centerY + size * Math.sin(Math.PI / 6), // Vértice inferior direito
        ]
        
        return <Line
          y={70}
          draggable 
          key={stem} 
          points={trianglePoints} 
          closed 
          fill={'rgba(138,43,226,' + (0.06 + energy * 0.4) + ')'} 
          stroke={'#8A2BE2'} 
          strokeWidth={2 + energy * 4}
          shadowColor={'#8A2BE2'}
          shadowBlur={5 + energy * 20}
          shadowOpacity={0.5}
        />
        //Wave
      case 'Comet':
        // Agora Comet é uma wave animada
        const wavePoints = generateWavePoints(stem, energy, window.innerWidth/2, window.innerHeight/2, 500)
        return (
          <React.Fragment key={stem}>
            {/* Wave principal */}
            <Line
              draggable
              points={wavePoints}
              y={300}
              stroke={'#ff0055'}
              strokeWidth={3 + energy * 8}
              lineCap={'round'}
              lineJoin={'round'}
              shadowColor={'#ff0055'}
              shadowBlur={10 + energy * 30}
              shadowOpacity={0.6}
            />
            {/* Wave secundária para efeito de profundidade */}
            <Line
              draggable
              points={wavePoints}
              y={315}
              stroke={'#ff6699'}
              strokeWidth={2 + energy * 5}
              lineCap={'round'}
              lineJoin={'round'}
              opacity={0.5}
            />
          </React.Fragment>
        )
      case 'Cloud':
        // Múltiplas linhas verticais vibrando como cordas de guitarra
        const numStrings = 6 // Número de "cordas"
        const stringHeight = 300
        const stringSpacing = 20
        const centerXGuitar = window.innerWidth / 2
        const centerYGuitar = window.innerHeight / 2
        
        // Inicializa a fase se não existir
        if (!phaseRef.current[stem]) {
          phaseRef.current[stem] = 0
        }
        
        // Incrementa a fase baseado no energy (velocidade de oscilação)
        const speedMultiplier = 0.3 + energy * 2.5 // Varia de 0.3 a 2.8
        phaseRef.current[stem] += 0.08 * speedMultiplier
        
        // Amplitude de vibração baseada no energy
        const amplitude = 5 + energy * 35 // Varia de 5 a 40 pixels
        
        return (
          <React.Fragment key={stem}>
            {Array.from({ length: numStrings }).map((_, i) => {
              const stringPoints = []
              const xOffset = (i - numStrings / 2) * stringSpacing + stringSpacing / 2
              const phaseOffset = i * 0.5 // Cada corda tem fase ligeiramente diferente
              
              // Gera pontos da linha vertical ondulante
              for (let y = 0; y <= stringHeight; y += 10) {
                const x = centerXGuitar + xOffset + Math.sin((y * 0.02) + phaseRef.current[stem] + phaseOffset) * amplitude
                const yPos = centerYGuitar - stringHeight / 2 + y
                stringPoints.push(x, yPos)
              }
              
              return (
                <Line
                  key={`string-${i}`}
                  draggable
                  y={60}
                  x={270}
                  points={stringPoints}
                  stroke={'#39ff14'}
                  strokeWidth={1.5 + energy * 2.5}
                  lineCap={'round'}
                  lineJoin={'round'}
                  shadowColor={'#39ff14'}
                  shadowBlur={3 + energy * 15}
                  shadowOpacity={0.6}
                  opacity={0.7 + energy * 0.3}
                />
              )
            })}
          </React.Fragment>
        )
      default:
        return null
    }
  }

  return (
    <div style={{ position: 'absolute', top: -200, zIndex: 50, pointerEvents: 'none' }}>
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