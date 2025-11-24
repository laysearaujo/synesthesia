import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, MeshDistortMaterial, Sphere, Icosahedron, Torus, Octahedron, Box } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// --- ESTADO GLOBAL ---
const players = { drums: null, bass: null, vocals: null, guitar: null, piano: null }
const meters = { drums: null, bass: null, vocals: null, guitar: null, piano: null }

// 1. BATERIA: O "Orbe Líquido" (Centro)
function DrumsOrb({ status }) {
  const meshRef = useRef()
  const matRef = useRef()

  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let energy = 0
    let distortForce = 0.4

    if (status === 'playing' && meters.drums) {
      const val = meters.drums.getValue()
      energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
      distortForce = 0.4 + (energy * 3)
      
      if (meshRef.current) {
        const scale = 2.2 + (energy * 1.5)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.3)
      }
    } else {
      // Modo repouso (respiração)
      const heartbeat = Math.sin(time * 2) * 0.1
      const scale = 2.2 + heartbeat
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
    <Sphere args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial ref={matRef} color="#ff0055" emissive="#ff0055" emissiveIntensity={1.5} roughness={0.2} metalness={0.8} speed={2} />
    </Sphere>
  )
}

// 2. BAIXO: Anel Pesado (Chão)
function BassRing({ status }) {
  const meshRef = useRef()
  useFrame(() => {
    if (status !== 'playing' || !meters.bass) return
    const val = meters.bass.getValue()
    const energy = Tone.dbToGain(val)
    
    if (meshRef.current) {
        meshRef.current.rotation.x += 0.01
        meshRef.current.rotation.y += 0.005
        const scale = 2.8 + (energy * 2)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })
  return (
    <Torus args={[1.8, 0.15, 16, 100]} rotation={[1.6, 0, 0]} ref={meshRef}>
      <meshStandardMaterial color="#4b0082" emissive="#4b0082" emissiveIntensity={2} />
    </Torus>
  )
}

// 3. VOZ: Nuvem Etérea (Topo)
function VocalCloud({ status }) {
  const meshRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    let energy = 0
    if (status === 'playing' && meters.vocals) energy = Tone.dbToGain(meters.vocals.getValue())

    if (meshRef.current) {
        meshRef.current.position.y = 3 + Math.sin(time) * 0.5
        meshRef.current.rotation.y += 0.01
        const scale = 1 + (energy * 2.5)
        meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })
  return (
    <Icosahedron args={[0.8, 1]} position={[0, 3, 0]} ref={meshRef}>
      <MeshDistortMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={1.5} distort={0.6} speed={2} wireframe />
    </Icosahedron>
  )
}

// 4. GUITARRA: Cristais Elétricos (Esquerda)
function GuitarSpikes({ status }) {
  const meshRef = useRef()
  useFrame(() => {
    if (status !== 'playing' || !meters.guitar) return
    const energy = Tone.dbToGain(meters.guitar.getValue())
    
    if (meshRef.current) {
       meshRef.current.rotation.z -= 0.02 + (energy * 0.1) // Gira rápido com solo
       const scale = 0.8 + (energy * 3) // Fica gigante com distorção
       meshRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2)
    }
  })
  return (
    <Octahedron args={[1, 0]} position={[-4, 0, -1]} ref={meshRef}>
       <meshStandardMaterial color="#ff8800" emissive="#ff8800" emissiveIntensity={2} wireframe={true} />
    </Octahedron>
  )
}

// 5. PIANO: Cubos Suaves (Direita)
function PianoCubes({ status }) {
  const groupRef = useRef()
  useFrame((state) => {
    const time = state.clock.getElapsedTime()
    if (status !== 'playing' || !meters.piano) return
    const energy = Tone.dbToGain(meters.piano.getValue())

    if (groupRef.current) {
        // Ondula
        groupRef.current.position.y = Math.sin(time * 2) * 0.5
        // Gira suave
        groupRef.current.rotation.x = Math.cos(time) * 0.2
        
        const scale = 1 + (energy * 2)
        groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
    }
  })
  return (
    <group position={[4, 0, -1]} ref={groupRef}>
        <Box args={[0.8, 0.8, 0.8]} position={[0, 0.5, 0]}>
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
        </Box>
        <Box args={[0.5, 0.5, 0.5]} position={[0.8, -0.5, 0.2]}>
            <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
        </Box>
    </group>
  )
}

function App() {
  const [status, setStatus] = useState("idle")
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
      const response = await fetch('http://localhost:3001/separate', {
        method: 'POST',
        body: formData
      })
      const data = await response.json()
      
      if (data.success) {
        console.log("Stems:", data.stems)
        if (data.isDemo) alert("Modo Demo: Usando áudio de exemplo.")
        await carregarStems(data.stems)
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

  const carregarStems = async (urls) => {
    setStatus("loading_audio")
    if(players.drums) players.drums.dispose() // Limpeza básica
    
    const loadTrack = (url) => {
       if (!url) return { p: null, m: null }
       const p = new Tone.Player(url).toDestination()
       const m = new Tone.Meter({ smoothing: 0.8 })
       p.connect(m)
       p.loop = true
       p.autostart = false
       return { p, m }
    }

    // Carrega os 5 Instrumentos
    const tracks = {
        drums: loadTrack(urls.drums),
        bass: loadTrack(urls.bass),
        vocals: loadTrack(urls.vocals),
        guitar: loadTrack(urls.guitar),
        piano: loadTrack(urls.piano)
    }

    // Conecta aos globais
    for (const key in tracks) {
        players[key] = tracks[key].p
        meters[key] = tracks[key].m
    }

    try {
      await Tone.loaded()
      const now = Tone.now() + 0.1
      for (const key in players) {
          if (players[key]) players[key].start(now)
      }
      setStatus("playing")
    } catch (e) {
      console.error(e)
      alert("Erro ao carregar áudio.")
      setStatus("idle")
    }
  }

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505" }}>
      
      <Canvas camera={{ position: [0, 0, 12] }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} />
        
        {/* --- O PALCO 5-STEMS --- */}
        <DrumsOrb status={status} />   {/* Bateria (Centro) */}
        <BassRing status={status} />   {/* Baixo (Chão) */}
        <VocalCloud status={status} /> {/* Voz (Topo) */}
        <GuitarSpikes status={status} /> {/* Guitarra (Esq) */}
        <PianoCubes status={status} />   {/* Piano (Dir) */}

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

      <div style={{ position: 'absolute', top: '40px', width: '100%', textAlign: 'center', color: 'white', pointerEvents: 'none', fontFamily: 'sans-serif', zIndex: 10 }}>
        <h1 style={{ fontSize: '3rem', margin: 0, letterSpacing: '0.2em', textShadow: '0 0 20px #ff0055' }}>SYNESTHESIA</h1>
        <p style={{ opacity: 0.8, letterSpacing: '0.1em', marginTop: '10px' }}>SOUND LAB - 5 STEMS</p>
      </div>
    </div>
  )
}

export default App