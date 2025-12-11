import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Torus, Sparkles, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// Global meters reference (will be set by App.jsx)
export let visualMeters = {}

const BRUSHES = {
  drum:   { color: "#ff003c", name: "Bateria", icon: "🥁" }, 
  bass:   { color: "#8A2BE2", name: "Baixo", icon: "🎸" },   
  vocal:  { color: "#00f0ff", name: "Voz", icon: "🎤" },     
  guitar: { color: "#ffaa00", name: "Guitarra", icon: "⚡" },
  piano:  { color: "#39ff14", name: "Piano", icon: "🎹" }    
}

// Orb: blob com casco externo que pulsa e distorce
export function OrbObject({ status, channel, shapePoints }) {
  const ref = useRef()
  const shellRef = useRef()
  const geom = useMemo(() => {
    if (!shapePoints || shapePoints.length < 3) return null
    try {
      const shape = new THREE.Shape()
      const pts2 = shapePoints.map(p => new THREE.Vector2(p[0], p[1]))
      const cx = pts2.reduce((s,p)=>s+p.x,0)/pts2.length
      const cy = pts2.reduce((s,p)=>s+p.y,0)/pts2.length
      pts2.forEach((p,i)=>{
        const x = (p.x - cx) * 0.5
        const y = (p.y - cy) * 0.5
        if (i===0) shape.moveTo(x,y)
        else shape.lineTo(x,y)
      })
      shape.closePath()
      const g = new THREE.ExtrudeGeometry(shape, { depth: 0.8, bevelEnabled: true, bevelSize: 0.05, bevelSegments: 3 })
      g.computeVertexNormals()
      return g
    } catch(e) { console.warn(e); return null }
  }, [shapePoints])

  useFrame((state) => {
    const meter = visualMeters[channel]
    if(!meter || !ref.current) return
    const t = state.clock.getElapsedTime()
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0.15 + Math.sin(t) * 0.05
    const scale = 1 + (energy * 2.4)
    ref.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.18)
    if (shellRef.current) {
      shellRef.current.material.opacity = THREE.MathUtils.lerp(shellRef.current.material.opacity, 0.12 + energy * 0.4, 0.2)
      shellRef.current.rotation.y += 0.004 + energy * 0.05
    }
  })

  const brushKey = channel === 'drums' ? 'drum' : (channel === 'vocals' ? 'vocal' : channel)
  const coreColor = BRUSHES[brushKey].color
  if (geom) {
    return (
      <group>
        <mesh ref={ref} geometry={geom} position={[0,0,0]} scale={[1,1,1]}>
          <MeshDistortMaterial color={coreColor} emissive={coreColor} emissiveIntensity={2.5} speed={2.5} distort={0.25} roughness={0.2} metalness={0.3} />
        </mesh>
        <Sphere ref={shellRef} args={[1.6, 48, 48]} position={[0,0,0]}>
          <meshPhysicalMaterial color={coreColor} transparent opacity={0.1} roughness={0.4} metalness={0} emissive={coreColor} emissiveIntensity={0.3} />
        </Sphere>
      </group>
    )
  }

  return (
    <group>
      <Sphere ref={ref} args={[1, 48, 48]} position={[0, 0, 0]}>
        <MeshDistortMaterial color={coreColor} emissive={coreColor} emissiveIntensity={2} speed={3} distort={0.35} />
      </Sphere>
      <Sphere ref={shellRef} args={[1.4, 48, 48]} position={[0,0,0]}>
        <meshPhysicalMaterial color={coreColor} transparent opacity={0.12} roughness={0.4} emissive={coreColor} emissiveIntensity={0.25} />
      </Sphere>
    </group>
  )
}

// Terrain: terreno ondulado que levanta com graves
export function TerrainObject({ status, channel, shapePoints }) {
  const ref = useRef()
  const planeGeom = useMemo(() => new THREE.PlaneGeometry(10, 10, 60, 60), [])

  useFrame(() => {
    const meter = visualMeters[channel]
    if(!meter || !ref.current) return
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0
    const time = performance.now() * 0.001
    const pos = ref.current.geometry.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const noise = Math.sin(x * 1.2 + time) * Math.cos(y * 1.4 + time * 0.7)
      pos.setZ(i, noise * (0.2 + energy * 2.5))
    }
    pos.needsUpdate = true
    ref.current.geometry.computeVertexNormals()
    ref.current.rotation.z += 0.0008 + energy * 0.01
  })

  const brushKey = channel === 'bass' ? 'bass' : (channel === 'drums' ? 'drum' : channel)
  return (
    <mesh ref={ref} geometry={planeGeom} position={[0, -2, -4]} rotation={[-Math.PI / 2, 0, 0]}>
      <meshStandardMaterial
        color={BRUSHES[brushKey].color}
        emissive={BRUSHES[brushKey].color}
        emissiveIntensity={0.7}
        metalness={0.2}
        roughness={0.8}
        wireframe={false}
      />
    </mesh>
  )
}

// Cloud: pontos/partículas fluindo
export function CloudObject({ status, channel, shapePoints }) {
  const ref = useRef()
  const geom = useMemo(() => {
    const count = Math.max(shapePoints?.length || 80, 60)
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3)
    for (let i=0;i<count;i++){
      const base = shapePoints?.[i % (shapePoints.length || 1)] || [Math.random()*2-1, Math.random()*1.5-0.75, 0]
      positions[i*3+0] = base[0] * 0.9
      positions[i*3+1] = base[1] * 0.9
      positions[i*3+2] = (Math.random()-0.5) * 1.2
      seeds[i*3+0] = Math.random() * 10
      seeds[i*3+1] = Math.random() * 10
      seeds[i*3+2] = Math.random() * 10
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('seed', new THREE.BufferAttribute(seeds, 3))
    return g
  }, [shapePoints])

  useFrame((state) => {
    if(!ref.current) return
    const meter = visualMeters[channel]
    const t = state.clock.getElapsedTime()
    let energy = 0.05 + Math.sin(t * 0.5) * 0.02
    if (meter && status === 'playing') {
      const val = meter.getValue()
      energy = (val > -100 && val < 100) ? Tone.dbToGain(val) * 0.4 : energy
    }
    ref.current.rotation.y += 0.002 + energy * 0.03
    const pos = ref.current.geometry.attributes.position
    const seed = ref.current.geometry.attributes.seed
    for (let i=0;i<pos.count;i++){
      const sx = seed.getX(i)
      const sy = seed.getY(i)
      const sz = seed.getZ(i)
      const dx = Math.sin(t + sx) * 0.12 * (1 + energy * 2)
      const dy = Math.cos(t * 0.8 + sy) * 0.1 * (1 + energy * 2)
      const dz = Math.sin(t * 0.6 + sz) * 0.15
      pos.setXYZ(i, pos.getX(i) + dx * 0.01, pos.getY(i) + dy * 0.01, pos.getZ(i) + dz * 0.01)
    }
    pos.needsUpdate = true
  })

  const brushKey = 'piano'
  return (
    <group ref={ref} position={[0, 2, -4]}>
      <points geometry={geom}>
        <pointsMaterial size={0.12} color={BRUSHES[brushKey].color} transparent opacity={0.7} depthWrite={false} />
      </points>
      <Sparkles count={200} scale={8} size={1.2} speed={0.2} opacity={0.4} color={BRUSHES[brushKey].color} />
    </group>
  )
}

// Comet: forma em linha/tubo que se move
export function CometObject({ status, channel, shapePoints }) {
  const meshRef = useRef()
  const headRef = useRef()
  const pos = useRef({ x: -8, y: 0, z: -6, t: 0 })
  
  const curve = useMemo(() => {
    if (!shapePoints || shapePoints.length < 3) return null
    const curvePts = shapePoints.map(p => new THREE.Vector3(p[0] * 0.4, p[1] * 0.4, 0))
    return new THREE.CatmullRomCurve3(curvePts, true, 'catmullrom', 0.6)
  }, [shapePoints])

  const tubeGeom = useMemo(() => {
    if (!curve) return null
    return new THREE.TubeGeometry(curve, 80, 0.06, 10, true)
  }, [curve])

  useFrame((state) => {
    const meter = visualMeters[channel]
    const t = state.clock.getElapsedTime()
    let energy = 0
    if (meter && status === 'playing') {
      const val = meter.getValue()
      energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
    }
    const speed = 0.05 + energy * 0.2
    pos.current.t = (pos.current.t + speed * state.clock.getDelta()) % 1
    const point = curve ? curve.getPointAt(pos.current.t) : new THREE.Vector3(Math.sin(t) * 2, Math.cos(t) * 1, 0)
    if (headRef.current) {
      headRef.current.position.copy(point.clone().add(new THREE.Vector3(0, 0, -6)))
      headRef.current.scale.lerp(new THREE.Vector3(1 + energy * 2, 1 + energy * 2, 1), 0.12)
    }
    if (meshRef.current) {
      meshRef.current.rotation.z += 0.002 + energy * 0.01
    }
  })

  const brushKey = channel === 'vocals' ? 'vocal' : 'drum'
  return (
    <group>
      {tubeGeom && <mesh geometry={tubeGeom} position={[-4, 0, -6]}>
        <meshPhongMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={1.2} side={THREE.DoubleSide} />
      </mesh>}
      <mesh ref={headRef} position={[0,0,-6]}>
        <sphereGeometry args={[0.35, 20, 20]} />
        <meshPhongMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={3.2} />
      </mesh>
      <Sparkles count={80} scale={6} size={1.3} speed={0.8} opacity={0.6} color={BRUSHES[brushKey].color} position={[ -4, 0, -6 ]} />
    </group>
  )
}
