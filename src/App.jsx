import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, MeshDistortMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// --- ESTADO GLOBAL ---
const players = {}
const meters = {}
let availableStems = {}

// --- COMPONENTES VISUAIS (MANTIDOS IGUAIS) ---

function DrumsOrb({ status, id, scale: customScale, position }) {
  const meshRef = useRef()
  const matRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let energy = 0
    let distortForce = 0.3
    if (status === 'playing' && meters[id]) {
      const val = meters[id].getValue()
      energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
      distortForce = 0.3 + (energy * 4) 
      if (meshRef.current) {
        const baseScale = customScale * 2.0
        const scale = baseScale + (energy * 0.8 * customScale) 
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.4)
      }
    } else {
      const pulse = Math.sin(time * 2) * 0.1
      const scale = customScale * 2.0 + pulse
      if (meshRef.current) meshRef.current.scale.set(scale, scale, scale)
    }
    if (matRef.current) {
      matRef.current.distort = THREE.MathUtils.lerp(matRef.current.distort, distortForce, 0.1)
      if (status === 'playing') {
         const targetColor = energy > 0.4 ? new THREE.Color("#ffffff") : new THREE.Color("#ff0055")
         matRef.current.emissive.lerp(targetColor, 0.3)
      } else {
         matRef.current.emissive.set("#ff0055")
      }
    }
  })
  return (
    <Sphere args={[1, 64, 64]} position={position} ref={meshRef}>
      <MeshDistortMaterial ref={matRef} color="#ff0055" emissive="#550022" emissiveIntensity={2} roughness={0.1} metalness={0.9} speed={3} />
    </Sphere>
  )
}

function BassWave({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  const args = [8, 0.3, 100, 1] 
  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.getElapsedTime()
    let energy = 0
    if (status === 'playing' && meters[id]) {
      const val = meters[id].getValue()
      energy = Tone.dbToGain(val)
    }
    const geometry = meshRef.current.geometry
    const positionAttribute = geometry.attributes.position
    const vertex = new THREE.Vector3()
    for (let i = 0; i < positionAttribute.count; i++) {
      vertex.fromBufferAttribute(positionAttribute, i)
      const x = vertex.x 
      const waveSpeed = time * 3 * playbackRate
      const waveFrequency = 1.5
      const amplitude = 0.2 + (energy * 4 * customScale)
      const newY = Math.sin(x * waveFrequency + waveSpeed) * amplitude
      const newZ = Math.cos(x * waveFrequency + waveSpeed) * amplitude * 0.5
      if (status !== 'playing') {
          positionAttribute.setY(i, Math.sin(x + time) * 0.2)
          positionAttribute.setZ(i, 0)
      } else {
          positionAttribute.setY(i, newY)
          positionAttribute.setZ(i, newZ)
      }
    }
    positionAttribute.needsUpdate = true
    meshRef.current.position.set(position[0], position[1], position[2])
    meshRef.current.rotation.z = Math.sin(time * 0.2) * 0.1
  })
  return (
    <mesh ref={meshRef} position={position}>
      <planeGeometry args={args} />
      <meshStandardMaterial color="#4b0082" emissive="#8a2be2" emissiveIntensity={3} side={THREE.DoubleSide} wireframe={true} />
    </mesh>
  )
}

function VocalKnot({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let energy = 0
    if (status === 'playing' && meters[id]) energy = Tone.dbToGain(meters[id].getValue())
    if (meshRef.current) {
        meshRef.current.position.y = position[1] + Math.sin(time * 0.5) * 0.3
        meshRef.current.rotation.x = time * 0.2 * playbackRate
        meshRef.current.rotation.y = time * 0.3 * playbackRate
        const baseScale = customScale * 0.8
        const targetScale = baseScale + (energy * 1.5 * customScale)
        meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05)
    }
  })
  return (
    <mesh ref={meshRef} position={position}>
      <torusKnotGeometry args={[1, 0.25, 128, 16]} />
      <meshStandardMaterial color="#00ffff" emissive="#00aaaa" emissiveIntensity={1.2} roughness={0} metalness={1} opacity={0.9} transparent />
    </mesh>
  )
}

function GuitarShards({ status, id, scale: customScale, position, playbackRate }) {
  const groupRef = useRef()
  const shards = [-1, 0, 1]
  useFrame((state) => {
    if (status !== 'playing' || !meters[id]) return
    const energy = Tone.dbToGain(meters[id].getValue())
    if (groupRef.current) {
       groupRef.current.rotation.y += (0.01 + energy) * playbackRate
       groupRef.current.rotation.z -= 0.02
       const expansion = 1 + (energy * 3)
       groupRef.current.children.forEach((child, i) => {
         const offset = (i - 1) * 1.5 * expansion
         child.position.x = THREE.MathUtils.lerp(child.position.x, offset, 0.2)
         child.rotation.x += 0.1 * expansion
         child.rotation.y += 0.1 * expansion
       })
       const s = customScale
       groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1)
    }
  })
  return (
    <group position={position} ref={groupRef}>
       {shards.map((i) => (
         <mesh key={i} position={[i, 0, 0]}>
           <octahedronGeometry args={[0.7, 0]} />
           <meshStandardMaterial color="#ff8800" emissive="#ff4400" emissiveIntensity={3} wireframe={true} />
         </mesh>
       ))}
    </group>
  )
}

function PianoHelix({ status, id, scale: customScale, position, playbackRate }) {
  const groupRef = useRef()
  const keys = [0, 1, 2, 3, 4]
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (status !== 'playing' || !meters[id]) return
    const energy = Tone.dbToGain(meters[id].getValue())
    if (groupRef.current) {
        groupRef.current.rotation.y = time * 0.2 * playbackRate
        groupRef.current.children.forEach((child, i) => {
           const offset = i * 0.5
           const jump = Math.sin(time * 5 + offset) * energy * 2
           child.position.y = (i * 0.6) - 1.5 + jump 
           child.material.emissiveIntensity = 1 + (energy * 5)
        })
        const s = customScale
        groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1)
    }
  })
  return (
    <group position={position} ref={groupRef}>
        {keys.map((k) => (
          <mesh key={k} rotation={[0, k * 0.5, 0]} position={[0, (k*0.6)-1.5, 0]}>
              <boxGeometry args={[1.2, 0.2, 0.4]} />
              <meshStandardMaterial color="#00ff88" emissive="#00ff88" />
          </mesh>
        ))}
    </group>
  )
}

// --- CONFIGURAÇÕES E MAPAS ---

const OrbComponents = {
  drums: DrumsOrb,
  bass: BassWave,
  vocals: VocalKnot,
  guitar: GuitarShards,
  piano: PianoHelix
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

// --- APLICAÇÃO PRINCIPAL ---

function App() {
  const [status, setStatus] = useState("idle")
  const [orbs, setOrbs] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState("") // NOVO STATE
  const fileInputRef = useRef(null)

  // 1. INPUT DE ARQUIVO
  const handleFileButtonClick = async () => {
    await Tone.start()
    fileInputRef.current.click()
  }

  // 2. INPUT DO YOUTUBE
  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl) return alert("Por favor, cole um link do YouTube!")
    
    await Tone.start()
    setStatus("processing_yt") // Status visual diferente
    
    try {
      // ⚠️ IMPORTANTE: Usando localhost agora
      const response = await fetch('http://localhost:3001/process-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      })
      
      const data = await response.json()
      processResponseData(data)
      
    } catch (e) {
      console.error(e)
      alert("Erro ao conectar com servidor local (Porta 3001).")
      setStatus("idle")
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setStatus("uploading")
    const formData = new FormData()
    formData.append('audio', file)

    try {
      setStatus("processing")
      // ⚠️ IMPORTANTE: Usando localhost agora
      const response = await fetch('http://localhost:3001/separate', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      processResponseData(data)
    } catch (e) {
      console.error(e)
      alert("Erro de conexão com servidor local.")
      setStatus("idle")
    }
  }

  // Lógica centralizada para processar os dados da IA
  const processResponseData = async (data) => {
    if (data.success) {
      if (data.isDemo) alert("Modo Demo: Usando áudio de exemplo.")
      availableStems = data.stems
      
      const initialOrbs = []
      const positions = {
        drums: [0, 0, 0],
        bass: [0, -3.5, 0],
        vocals: [0, 3.5, 0],
        guitar: [-5, 0, -2],
        piano: [5, 0, -2]
      }
      
      Object.keys(data.stems).forEach((stem) => {
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
      alert("Erro no servidor: " + (data.error || "Desconhecido"))
      setStatus("idle")
    }
  }

  const carregarStems = async (orbList) => {
    setStatus("loading_audio")
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
    orbList.forEach((orb) => {
      if (players[orb.id]) {
        const pan = Math.max(-1, Math.min(1, orb.position[0] / 8))
        const panner = new Tone.Panner(pan).toDestination()
        players[orb.id].disconnect()
        players[orb.id].connect(panner)
        if (meters[orb.id]) players[orb.id].connect(meters[orb.id])
        const volume = (orb.position[2] * 2)
        players[orb.id].volume.value = Math.min(0, volume)
        players[orb.id].playbackRate = orb.playbackRate
      }
    })
  }
  
  const addOrb = (type) => {
    if (!availableStems[type]) return
    const newId = `${type}-${Date.now()}`
    const newOrb = {
        id: newId, type, scale: 1, position: [Math.random() * 4 - 2, Math.random() * 4 - 2, 0], playbackRate: 1
    }
    const newOrbs = [...orbs, newOrb]
    setOrbs(newOrbs)
    const url = availableStems[type]
    const p = new Tone.Player(url).toDestination()
    const m = new Tone.Meter({ smoothing: 0.8 })
    p.connect(m); p.loop = true; players[newId] = p; meters[newId] = m
    if (status === 'playing') p.start()
    updateMix(newOrbs)
  }
  
  const removeOrb = (id) => {
    if (players[id]) { players[id].stop(); players[id].dispose(); delete players[id]; delete meters[id] }
    const newOrbs = orbs.filter(o => o.id !== id); setOrbs(newOrbs); updateMix(newOrbs)
  }
  
  const updateOrbScale = (id, newScale) => {
    const newOrbs = orbs.map(o => {
      if (o.id === id) {
        const playbackRate = 1 / newScale
        if (players[id]) players[id].playbackRate = playbackRate
        return { ...o, scale: newScale, playbackRate }
      } return o
    }); setOrbs(newOrbs); updateMix(newOrbs)
  }
  
  const updateOrbPosition = (id, newPosition) => {
    const newOrbs = orbs.map(o => { if (o.id === id) return { ...o, position: newPosition }; return o }); setOrbs(newOrbs); updateMix(newOrbs)
  }
  
  const handleDragStart = (e, type) => setDraggedItem(type)
  const handleDragOver = (e) => e.preventDefault()
  const handleOrbDrop = (e) => {
    e.preventDefault()
    if (draggedItem && availableStems[draggedItem]) { addOrb(draggedItem); setDraggedItem(null) }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505", overflow: "hidden" }}>
      
      <Canvas camera={{ position: [0, 0, 14], fov: 45 }} onDrop={handleOrbDrop} onDragOver={handleDragOver}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        {orbs.map(orb => {
          const OrbComponent = OrbComponents[orb.type]
          return OrbComponent ? (
            <OrbComponent key={orb.id} id={orb.id} status={status} scale={orb.scale} position={orb.position} playbackRate={orb.playbackRate} />
          ) : null
        })}
        <OrbitControls enableZoom={true} />
      </Canvas>

      {/* TELA INICIAL / UPLOAD */}
      {status !== "playing" && (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.85)', 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            zIndex: 20
          }}>
           {status === "idle" && (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
                <h1 style={{ color: 'white', fontSize: '4rem', margin: 0, letterSpacing: '0.2em', textShadow: '0 0 30px #ff0055' }}>SYNESTHESIA</h1>
                <p style={{ color: '#aaa', letterSpacing: '2px', marginBottom: '20px' }}>VISUALIZADOR DE STEMS 3D</p>
                
                {/* OPÇÃO 1: UPLOAD DE ARQUIVO */}
                <button onClick={handleFileButtonClick} style={{
                    padding: '15px 40px', fontSize: '1rem', cursor: 'pointer',
                    background: '#ff0055', color: 'white', border: 'none', borderRadius: '50px',
                    textTransform: 'uppercase', fontWeight: 'bold', boxShadow: '0 0 20px rgba(255, 0, 85, 0.4)',
                    width: '300px'
                  }}>
                  📂 Carregar Arquivo MP3
                </button>

                <div style={{ color: '#555' }}>— OU —</div>

                {/* OPÇÃO 2: YOUTUBE */}
                <div style={{ display: 'flex', gap: '10px', width: '300px' }}>
                    <input 
                        type="text" 
                        placeholder="Cole link do YouTube..." 
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        style={{
                            flex: 1, padding: '10px 15px', borderRadius: '25px', border: '1px solid #444',
                            background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none'
                        }}
                    />
                    <button onClick={handleYoutubeSubmit} style={{
                        padding: '10px 20px', borderRadius: '25px', border: '1px solid #ff0055',
                        background: 'transparent', color: '#ff0055', cursor: 'pointer', fontWeight: 'bold'
                    }}>
                        GO
                    </button>
                </div>
             </div>
           )}
           
           {(status === "processing" || status === "processing_yt") && (
             <div style={{ textAlign: 'center' }}>
                <h2 style={{ color: '#ff0055', animation: 'pulse 1s infinite' }}>
                    {status === "processing_yt" ? "BAIXANDO DO YOUTUBE..." : "PROCESSANDO ÁUDIO..."}
                </h2>
                <p style={{ color: '#ccc' }}>
                    {status === "processing_yt" ? "Isso pode levar alguns segundos..." : "Isolando instrumentos via IA..."}
                </p>
             </div>
           )}
           
           {status === "loading_audio" && <h2 style={{ color: '#00ff00' }}>CARREGANDO SONS...</h2>}
           <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        </div>
      )}

      {/* INTERFACE DE JOGO (QUANDO ESTIVER TOCANDO) */}
      {status === "playing" && (
        <>
          {/* Header */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10 }}>
             <h3 style={{ color: 'white', margin: 0, letterSpacing: '2px' }}>SYNESTHESIA</h3>
             <p style={{ color: '#666', fontSize: '0.8rem', margin: 0 }}>Arraste os ícones para criar novos sons</p>
          </div>

          {/* Docker (Bottom) */}
          <div style={{
            position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(20,20,20,0.9)', padding: '15px 25px', borderRadius: '20px',
            display: 'flex', gap: '20px', zIndex: 30,
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            {Object.keys(OrbComponents).map(type => (
              availableStems[type] && (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, type)}
                  style={{
                    width: '50px', height: '50px', borderRadius: '12px',
                    background: OrbColors[type], display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'grab', fontSize: '0.6rem', color: 'white', fontWeight: 'bold',
                    boxShadow: `0 0 10px ${OrbColors[type]}`,
                    border: '2px solid rgba(255,255,255,0.2)'
                  }}
                  title={`Arrastar ${OrbNames[type]}`}
                >
                  {OrbNames[type].toUpperCase().substring(0, 3)}
                </div>
              )
            ))}
          </div>

          {/* Sidebar (Right) - Controles */}
          <div style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(10,10,10,0.8)', padding: '20px', borderRadius: '15px',
            maxHeight: '85vh', overflowY: 'auto', zIndex: 30, width: '220px',
            backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.05)'
          }}>
            <h4 style={{ color: '#aaa', margin: '0 0 15px 0', fontSize: '0.8rem', textTransform: 'uppercase' }}>Mistura Ativa</h4>
            {orbs.length === 0 && <p style={{color: '#444', fontSize: '0.8rem'}}>Nenhum instrumento na cena.</p>}
            
            {orbs.map(orb => (
              <div key={orb.id} style={{
                background: 'rgba(255,255,255,0.03)', padding: '10px', marginBottom: '10px',
                borderRadius: '8px', borderLeft: `3px solid ${OrbColors[orb.type]}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>{OrbNames[orb.type]}</span>
                  <button onClick={() => removeOrb(orb.id)} style={{
                      background: 'transparent', border: 'none', color: '#ff4444', 
                      cursor: 'pointer', fontSize: '0.9rem'
                    }}>×</button>
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ color: '#666', fontSize: '0.65rem' }}>Escala / Tempo</label>
                  <input type="range" min="0.5" max="2" step="0.1" value={orb.scale}
                    onChange={(e) => updateOrbScale(orb.id, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: OrbColors[orb.type] }} />
                </div>

                <div>
                  <label style={{ color: '#666', fontSize: '0.65rem' }}>Posição X / Pan</label>
                  <input type="range" min="-6" max="6" step="0.5" value={orb.position[0]}
                    onChange={(e) => updateOrbPosition(orb.id, [parseFloat(e.target.value), orb.position[1], orb.position[2]])}
                    style={{ width: '100%', accentColor: OrbColors[orb.type] }} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App