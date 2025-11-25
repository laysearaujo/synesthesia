import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, MeshDistortMaterial, Sphere, Icosahedron, Torus, Octahedron, Box } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// --- ESTADO GLOBAL ---
const players = {}
const meters = {}
let availableStems = {}

// 1. BATERIA: O "Orbe Líquido" (Centro)
function DrumsOrb({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  const matRef = useRef()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let energy = 0
    let distortForce = 0.4

    if (status === 'playing' && meters[id]) {
      const val = meters[id].getValue()
      energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
      distortForce = 0.4 + (energy * 3)
      
      if (meshRef.current) {
        const baseScale = customScale * 2.2
        const scale = baseScale + (energy * 1.5 * customScale)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.3)
      }
    } else {
      const heartbeat = Math.sin(time * 2) * 0.1
      const scale = customScale * 2.2 + heartbeat
      if (meshRef.current) meshRef.current.scale.set(scale, scale, scale)
    }

    if (matRef.current) {
      matRef.current.distort = distortForce
      if (status === 'playing') {
         const targetColor = energy > 0.5 ? new THREE.Color("#ffffff") : new THREE.Color("#ff0055")
         matRef.current.emissive.lerp(targetColor, 0.2)
      } else {
         matRef.current.emissive.set("#ff0055")
      }
    }
  })

  return (
    <Sphere args={[1, 64, 64]} position={position} ref={meshRef}>
      <MeshDistortMaterial ref={matRef} color="#ff0055" emissive="#ff0055" emissiveIntensity={1.5} roughness={0.2} metalness={0.8} speed={2} />
    </Sphere>
  )
}

// 2. BAIXO: Anel Pesado (Chão)
function BassRing({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  useFrame(() => {
    if (status !== 'playing' || !meters[id]) return
    const val = meters[id].getValue()
    const energy = Tone.dbToGain(val)
    
    if (meshRef.current) {
        meshRef.current.rotation.x += 0.01 * playbackRate
        meshRef.current.rotation.y += 0.005 * playbackRate
        const baseScale = customScale * 2.8
        const scale = baseScale + (energy * 2 * customScale)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })
  return (
    <Torus args={[1.8, 0.15, 16, 100]} rotation={[1.6, 0, 0]} position={position} ref={meshRef}>
      <meshStandardMaterial color="#4b0082" emissive="#4b0082" emissiveIntensity={2} />
    </Torus>
  )
}

// 3. VOZ: Nuvem Etérea (Topo)
function VocalCloud({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  const baseY = position[1]
  
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let energy = 0
    if (status === 'playing' && meters[id]) energy = Tone.dbToGain(meters[id].getValue())

    if (meshRef.current) {
        meshRef.current.position.y = baseY + Math.sin(time * playbackRate) * 0.5
        meshRef.current.rotation.y += 0.01 * playbackRate
        const baseScale = customScale
        const scale = baseScale + (energy * 2.5 * customScale)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })
  return (
    <Icosahedron args={[0.8, 1]} position={position} ref={meshRef}>
      <MeshDistortMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.5} distort={0.6} speed={2} wireframe />
    </Icosahedron>
  )
}

// 4. GUITARRA: Cristais Elétricos (Esquerda)
function GuitarSpikes({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  useFrame(() => {
    if (status !== 'playing' || !meters[id]) return
    const energy = Tone.dbToGain(meters[id].getValue())
    
    if (meshRef.current) {
       meshRef.current.rotation.z -= (0.02 + (energy * 0.1)) * playbackRate
       const baseScale = customScale * 0.8
       const scale = baseScale + (energy * 3 * customScale)
       meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2)
    }
  })
  return (
    <Octahedron args={[1, 0]} position={position} ref={meshRef}>
       <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2} wireframe={true} />
    </Octahedron>
  )
}

// 5. PIANO: Cubos Suaves (Direita)
function PianoCubes({ status, id, scale: customScale, position, playbackRate }) {
  const groupRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (status !== 'playing' || !meters[id]) return
    const energy = Tone.dbToGain(meters[id].getValue())

    if (groupRef.current) {
        groupRef.current.position.y = position[1] + Math.sin(time * 2 * playbackRate) * 0.5
        groupRef.current.rotation.x = Math.cos(time * playbackRate) * 0.2
        
        const scale = customScale * (1 + (energy * 2))
        groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })
  return (
    <group position={position} ref={groupRef}>
        <Box args={[0.8, 0.8, 0.8]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
        </Box>
        <Box args={[0.5, 0.5, 0.5]} position={[0.8, -0.5, 0.2]}>
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
        </Box>
    </group>
  )
}

// Mapeamento de componentes por tipo
const OrbComponents = {
  drums: DrumsOrb,
  bass: BassRing,
  vocals: VocalCloud,
  guitar: GuitarSpikes,
  piano: PianoCubes
}

const OrbColors = {
  drums: '#ff0055',
  bass: '#4b0082',
  vocals: '#00ffff',
  guitar: '#ff8800',
  piano: '#00ff88'
}

const OrbNames = {
  drums: 'Bateria',
  bass: 'Baixo',
  vocals: 'Voz',
  guitar: 'Guitarra',
  piano: 'Piano'
}

function App() {
  const [status, setStatus] = useState("idle")
  const [orbs, setOrbs] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [draggedOrb, setDraggedOrb] = useState(null)
  const fileInputRef = useRef(null)

  const handleButtonClick = async () => {
    await Tone.start()
    fileInputRef.current.click()
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setStatus("uploading")
    const formData = new FormData()
    formData.append('audio', file)

    try {
      setStatus("processing")
      const response = await fetch('https://synesthesia-server.onrender.com/separate', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      
      if (data.success) {
        console.log("Stems:", data.stems)
        if (data.isDemo) alert("Modo Demo: Usando áudio de exemplo.")
        availableStems = data.stems
        
        // Cria orbes iniciais apenas para stems disponíveis
        const initialOrbs = []
        const positions = {
          drums: [0, 0, 0],
          bass: [0, -2, 0],
          vocals: [0, 3, 0],
          guitar: [-4, 0, -1],
          piano: [4, 0, -1]
        }
        
        Object.keys(data.stems).forEach((stem, idx) => {
          if (data.stems[stem]) {
            initialOrbs.push({
              id: `${stem}-0`,
              type: stem,
              scale: 1,
              position: positions[stem] || [0, 0, 0],
              playbackRate: 1
            })
          }
        })
        
        setOrbs(initialOrbs)
        await carregarStems(initialOrbs)
      } else {
        alert("Erro no servidor.")
        setStatus("idle")
      }
    } catch (e) {
      console.error(e)
      alert("Erro de conexão com localhost:3001")
      setStatus("idle")
    }
  }

  const carregarStems = async (orbList) => {
    setStatus("loading_audio")
    
    // Limpa players antigos
    Object.values(players).forEach(p => p && p.dispose())
    Object.keys(players).forEach(k => delete players[k])
    Object.keys(meters).forEach(k => delete meters[k])

    const loadTrack = (url) => {
       if (!url) return null
       const p = new Tone.Player(url).toDestination()
       const m = new Tone.Meter({ smoothing: 0.8 })
       p.connect(m)
       p.loop = true
       p.autostart = false
       return { p, m }
    }

    // Carrega cada orbe
    orbList.forEach(orb => {
      const url = availableStems[orb.type]
      if (url) {
        const track = loadTrack(url)
        if (track) {
          players[orb.id] = track.p
          meters[orb.id] = track.m
          track.p.playbackRate = orb.playbackRate
        }
      }
    })

    try {
      await Tone.loaded()
      const now = Tone.now() + 0.1
      Object.values(players).forEach(p => p && p.start(now))
      setStatus("playing")
      updateMix(orbList)
    } catch (e) {
      console.error(e)
      alert("Erro ao carregar áudio.")
      setStatus("idle")
    }
  }

  const updateMix = (orbList) => {
    // Altera a mixagem baseado na ordem dos orbes
    orbList.forEach((orb, index) => {
      if (players[orb.id]) {
        // Posição afeta panorama (esquerda/direita)
        const pan = (orb.position[0] / 10).toFixed(2)
        const panner = new Tone.Panner(parseFloat(pan)).toDestination()
        players[orb.id].disconnect()
        players[orb.id].connect(panner)
        if (meters[orb.id]) players[orb.id].connect(meters[orb.id])
        
        // Volume baseado na altura (Y)
        const volume = -10 + (orb.position[1] * 2)
        players[orb.id].volume.value = volume
        
        // Playback rate já definido
        players[orb.id].playbackRate = orb.playbackRate
      }
    })
  }

  const addOrb = (type) => {
    if (!availableStems[type]) return
    
    const newId = `${type}-${Date.now()}`
    const newOrb = {
      id: newId,
      type,
      scale: 1,
      position: [Math.random() * 4 - 2, Math.random() * 4 - 2, 0],
      playbackRate: 1
    }
    
    const newOrbs = [...orbs, newOrb]
    setOrbs(newOrbs)
    
    // Carrega o novo player
    const url = availableStems[type]
    const p = new Tone.Player(url).toDestination()
    const m = new Tone.Meter({ smoothing: 0.8 })
    p.connect(m)
    p.loop = true
    players[newId] = p
    meters[newId] = m
    
    if (status === 'playing') {
      p.start()
    }
    
    updateMix(newOrbs)
  }

  const removeOrb = (id) => {
    if (players[id]) {
      players[id].stop()
      players[id].dispose()
      delete players[id]
      delete meters[id]
    }
    const newOrbs = orbs.filter(o => o.id !== id)
    setOrbs(newOrbs)
    updateMix(newOrbs)
  }

  const updateOrbScale = (id, newScale) => {
    const newOrbs = orbs.map(o => {
      if (o.id === id) {
        // Escala maior = mais lento (inverso)
        const playbackRate = 1 / newScale
        if (players[id]) {
          players[id].playbackRate = playbackRate
        }
        return { ...o, scale: newScale, playbackRate }
      }
      return o
    })
    setOrbs(newOrbs)
    updateMix(newOrbs)
  }

  const updateOrbPosition = (id, newPosition) => {
    const newOrbs = orbs.map(o => {
      if (o.id === id) {
        return { ...o, position: newPosition }
      }
      return o
    })
    setOrbs(newOrbs)
    updateMix(newOrbs)
  }

  // Drag and Drop handlers
  const handleDragStart = (e, type) => {
    setDraggedItem(type)
  }

  const handleOrbDragStart = (e, orb) => {
    setDraggedOrb(orb)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleOrbDrop = (e) => {
    e.preventDefault()
    if (draggedItem && availableStems[draggedItem]) {
      addOrb(draggedItem)
      setDraggedItem(null)
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505" }}>
      
      <Canvas camera={{ position: [0, 0, 12] }} onDrop={handleOrbDrop} onDragOver={handleDragOver}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        {orbs.map(orb => {
          const OrbComponent = OrbComponents[orb.type]
          return OrbComponent ? (
            <OrbComponent 
              key={orb.id}
              id={orb.id}
              status={status}
              scale={orb.scale}
              position={orb.position}
              playbackRate={orb.playbackRate}
            />
          ) : null
        })}

        <OrbitControls enableZoom={false} />
      </Canvas>

      {/* UI */}
      {status !== "playing" && (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.7)', 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            zIndex: 20
          }}>
           {status === "idle" && (
             <>
                <h2 style={{ color: 'white', letterSpacing: '2px', marginBottom: '30px' }}>SELECIONE SUA MÚSICA</h2>
                <button onClick={handleButtonClick} style={{
                    padding: '20px 50px', fontSize: '1.2rem', cursor: 'pointer',
                    background: 'transparent', color: '#ff0055', border: '2px solid #ff0055', borderRadius: '50px',
                    textTransform: 'uppercase', fontWeight: 'bold', boxShadow: '0 0 20px rgba(255, 0, 85, 0.4)'
                  }}>
                  UPLOAD MP3 🎵
                </button>
             </>
           )}
           {status === "processing" && (
             <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#ff0055', animation: 'pulse 1s infinite' }}>MUSIC.AI PROCESSANDO... 🧠</h2>
                <p style={{ color: '#ccc' }}>Separando: Bateria, Baixo, Voz, Guitarra e Piano</p>
             </div>
           )}
           {status === "loading_audio" && <h2 style={{ color: '#00ff00' }}>SINCRONIZANDO... ⏳</h2>}
           <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {/* Docker de Instrumentos */}
      {status === "playing" && (
        <div style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(0,0,0,0.8)',
          padding: '15px 20px',
          borderRadius: '15px',
          display: 'flex',
          gap: '15px',
          zIndex: 30,
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          {Object.keys(OrbComponents).map(type => (
            availableStems[type] && (
              <div
                key={type}
                draggable
                onDragStart={(e) => handleDragStart(e, type)}
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  background: OrbColors[type],
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'grab',
                  fontSize: '0.7rem',
                  color: 'white',
                  fontWeight: 'bold',
                  textAlign: 'center',
                  boxShadow: `0 0 15px ${OrbColors[type]}`,
                  transition: 'transform 0.2s',
                  border: '2px solid rgba(255,255,255,0.3)'
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                {OrbNames[type]}
              </div>
            )
          ))}
        </div>
      )}

      {/* Controles de Orbes */}
      {status === "playing" && orbs.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100px',
          right: '20px',
          background: 'rgba(0,0,0,0.8)',
          padding: '15px',
          borderRadius: '10px',
          maxHeight: '70vh',
          overflowY: 'auto',
          zIndex: 30,
          minWidth: '200px',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <h3 style={{ color: 'white', margin: '0 0 15px 0', fontSize: '0.9rem' }}>ORBES ATIVAS</h3>
          {orbs.map(orb => (
            <div key={orb.id} style={{
              background: 'rgba(255,255,255,0.05)',
              padding: '10px',
              marginBottom: '10px',
              borderRadius: '8px',
              border: `1px solid ${OrbColors[orb.type]}`
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ color: OrbColors[orb.type], fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {OrbNames[orb.type]}
                </span>
                <button
                  onClick={() => removeOrb(orb.id)}
                  style={{
                    background: '#ff0055',
                    border: 'none',
                    color: 'white',
                    padding: '3px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.7rem'
                  }}
                >
                  ✕
                </button>
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ color: '#aaa', fontSize: '0.7rem', display: 'block', marginBottom: '3px' }}>
                  Tamanho: {orb.scale.toFixed(2)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={orb.scale}
                  onChange={(e) => updateOrbScale(orb.id, parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ color: '#666', fontSize: '0.65rem', marginTop: '2px' }}>
                  Velocidade: {orb.playbackRate.toFixed(2)}x
                </div>
              </div>

              <div>
                <label style={{ color: '#aaa', fontSize: '0.7rem', display: 'block', marginBottom: '3px' }}>
                  Posição X: {orb.position[0].toFixed(1)}
                </label>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="0.5"
                  value={orb.position[0]}
                  onChange={(e) => updateOrbPosition(orb.id, [parseFloat(e.target.value), orb.position[1], orb.position[2]])}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ marginTop: '5px' }}>
                <label style={{ color: '#aaa', fontSize: '0.7rem', display: 'block', marginBottom: '3px' }}>
                  Posição Y: {orb.position[1].toFixed(1)}
                </label>
                <input
                  type="range"
                  min="-3"
                  max="5"
                  step="0.5"
                  value={orb.position[1]}
                  onChange={(e) => updateOrbPosition(orb.id, [orb.position[0], parseFloat(e.target.value), orb.position[2]])}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ position: 'absolute', top: '40px', width: '100%', textAlign: 'center', color: 'white', pointerEvents: 'none', fontFamily: 'sans-serif', zIndex: 10 }}>
        <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '0.2em', textShadow: '0 0 20px #ff0055' }}>SYNESTHESIA</h1>
        <p style={{ opacity: 0.8, letterSpacing: '0.1em', marginTop: '10px' }}>SOUND LAB - 5 STEMS</p>
      </div>
    </div>
  )
}

export default App