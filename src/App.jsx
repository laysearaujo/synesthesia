import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Stars, Sparkles, Sphere, Torus, Icosahedron, Octahedron, Box, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// --- ESTADO GLOBAL ---
const players = {}
const meters = {}
let availableStems = {}
const BASE_BPM = 120

// --- COMPONENTES VISUAIS ---
// --- URL DO BACKEND ---
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001' 
  : 'https://synesthesia-server.onrender.com'

// --- GLOBAIS DE ÁUDIO ---
const players = { drums: null, bass: null, vocals: null, guitar: null, piano: null }
const meters = { drums: null, bass: null, vocals: null, guitar: null, piano: null }

// Configuração dos Pincéis
const BRUSHES = {
  drum:   { color: "#ff003c", name: "Bateria", icon: "🥁" }, 
  bass:   { color: "#8A2BE2", name: "Baixo", icon: "🎸" },   
  vocal:  { color: "#00f0ff", name: "Voz", icon: "🎤" },     
  guitar: { color: "#ffaa00", name: "Guitarra", icon: "⚡" },
  piano:  { color: "#39ff14", name: "Piano", icon: "🎹" }    
}

// --- EFEITO DE CÂMERA ---
function CameraRig({ status }) {
  useFrame((state) => {
    if (status !== 'playing' || !meters.bass) return
    const val = meters.bass.getValue()
    const energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
    const targetZ = 15 - (energy * 5) 
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.15)
    if(energy > 0.6) {
        state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, (Math.random() - 0.5) * 0.02, 0.2)
    } else {
        state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, 0, 0.1)
    }
  })
  return null
}

// --- OBJETOS 3D (MODO PALCO) ---
function DrumObject({ status }) {
  const mesh = useRef()
  useFrame(() => {
    if(!meters.drums) return
    const energy = status === 'playing' ? Tone.dbToGain(meters.drums.getValue()) : 0
    const scale = 1.5 + (energy * 4) 
    mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.4)
    mesh.current.material.emissiveIntensity = 1 + (energy * 10)
    mesh.current.material.distort = 0.3 + (energy * 2)
  })
  return (
    <Sphere ref={mesh} args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial color={BRUSHES.drum.color} emissive={BRUSHES.drum.color} speed={5} />
    </Sphere>
  )
}

function BassObject({ status }) {
  const mesh = useRef()
  useFrame(() => {
    if(!meters.bass) return
    const energy = status === 'playing' ? Tone.dbToGain(meters.bass.getValue()) : 0
    mesh.current.rotation.x += 0.01 + (energy * 0.1)
    mesh.current.scale.setScalar(2 + (energy * 2))
    mesh.current.material.color.setHSL(0.75, 1, 0.5 + energy)
  })
  return (
    <Torus ref={mesh} args={[2, 0.2, 16, 100]} rotation={[1.5, 0, 0]}>
      <meshStandardMaterial color={BRUSHES.bass.color} emissive={BRUSHES.bass.color} emissiveIntensity={2} />
    </Torus>
  )
}

function VocalObject({ status }) {
  const mesh = useRef()
  useFrame((state) => {
    if(!meters.vocals) return
    const t = state.clock.getElapsedTime()
    const energy = status === 'playing' ? Tone.dbToGain(meters.vocals.getValue()) : 0
    mesh.current.position.y = 3 + Math.sin(t) * 0.5
    mesh.current.rotation.y += 0.01
    const scale = 1 + (energy * 3)
    mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2)
    mesh.current.material.wireframe = energy < 0.2
  })
  return (
    <Icosahedron ref={mesh} args={[1, 2]} position={[0, 3, 0]}>
      <MeshDistortMaterial color={BRUSHES.vocal.color} emissive={BRUSHES.vocal.color} emissiveIntensity={3} distort={0.6} speed={3} />
    </Icosahedron>
  )
}

function GuitarObject({ status }) {
  const mesh = useRef()
  useFrame(() => {
    if(!meters.guitar) return
    const energy = status === 'playing' ? Tone.dbToGain(meters.guitar.getValue()) : 0
    mesh.current.rotation.z -= 0.02 + energy
    mesh.current.scale.setScalar(0.8 + (energy * 4))
  })
  return (
    <Octahedron ref={mesh} args={[1, 0]} position={[-4, 0, -2]}>
       <meshStandardMaterial color={BRUSHES.guitar.color} emissive={BRUSHES.guitar.color} emissiveIntensity={4} wireframe />
    </Octahedron>
  )
}

function PianoObject({ status }) {
  const group = useRef()
  useFrame((state) => {
    if(!meters.piano) return
    const energy = status === 'playing' ? Tone.dbToGain(meters.piano.getValue()) : 0
    const t = state.clock.getElapsedTime()
    group.current.position.y = Math.sin(t * 2)
    group.current.children.forEach((child, i) => {
        child.scale.y = 1 + (energy * 5 * (i+1))
    })
  })
  return (
    <group ref={group} position={[4, 0, -2]}>
        <Box args={[0.5, 1, 0.5]} position={[-0.5, 0, 0]}>
            <meshStandardMaterial color={BRUSHES.piano.color} emissive={BRUSHES.piano.color} emissiveIntensity={2} />
        </Box>
        <Box args={[0.5, 1, 0.5]} position={[0.5, 0, 0]}>
            <meshStandardMaterial color={BRUSHES.piano.color} emissive={BRUSHES.piano.color} emissiveIntensity={2} />
        </Box>
    </group>
  )
}

// --- MODO DESENHO: TRAÇO GROSSO E VIVO ---
function LiveDrawing({ id, points, type, status, activeBrush, onDelete }) {
  const lineRef = useRef()
  
  const typeToChannel = {
    'drum': 'drums', 'bass': 'bass', 'vocal': 'vocals', 
    'guitar': 'guitar', 'piano': 'piano'
  }

  useFrame((state) => {
    const channel = typeToChannel[type]
    const meter = meters[channel]
    const time = state.clock.getElapsedTime()

    let energy = 0
    if (status === 'playing' && meter) {
      const val = meter.getValue()
      energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
    } else {
      energy = 0.1 + Math.sin(time * 2) * 0.05
    }

    if (lineRef.current && lineRef.current.material) {
      const targetWidth = 1 + (energy * 20) 
      lineRef.current.material.linewidth = THREE.MathUtils.lerp(
        lineRef.current.material.linewidth, targetWidth, 0.2
      )
      
      const baseColor = new THREE.Color(BRUSHES[type].color)
      if (energy > 0.4) baseColor.lerp(new THREE.Color("white"), 0.9)
      
      lineRef.current.material.color.lerp(baseColor, 0.3)
      lineRef.current.position.z = THREE.MathUtils.lerp(lineRef.current.position.z, energy * 5, 0.1)
    }
  })

  // Manipulador de clique para apagar
  const handleClick = (e) => {
    if (activeBrush === 'eraser') {
      e.stopPropagation() // Impede de desenhar ao clicar para apagar
      onDelete(id)
    }
  }

  return (
    <Line 
      ref={lineRef} 
      points={points} 
      color={BRUSHES[type].color} 
      lineWidth={1} 
      toneMapped={false} 
      transparent 
      opacity={0.9} 
      onClick={handleClick}
      onPointerOver={() => {
        if(activeBrush === 'eraser') document.body.style.cursor = 'not-allowed'
      }}
      onPointerOut={() => document.body.style.cursor = 'auto'}
    />
  )
}

function DrawingCanvas({ activeBrush, onDrawComplete, isDrawing, setIsDrawing }) {
  const { camera, raycaster, pointer } = useThree()
  const [points, setPoints] = useState([])

  const handlePointerDown = (e) => {
    if (!activeBrush || activeBrush === 'eraser') return // Não desenha se for borracha
    e.stopPropagation() 
    setIsDrawing(true)
    setPoints([[e.point.x, e.point.y, 0]]) 
  }

  const handlePointerMove = (e) => {
    if (!isDrawing) return
    setPoints((prev) => [...prev, [e.point.x, e.point.y, 0]])
  }

  const handlePointerUp = () => {
    if (isDrawing) {
      setIsDrawing(false)
      if (points.length > 2) {
        onDrawComplete(points) 
      }
      setPoints([]) 
    }
  }

  return (
    <>
      <mesh visible={false} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
      </mesh>
      {isDrawing && <Line points={points} color="#ffffff" lineWidth={2} />}
    </>
  )
}

function MusicPlayer({ isPlaying, onPlayPause, duration, currentTime, onSeek }) {
  const fmt = (t) => {
    if (!t && t !== 0) return "0:00"
    const m = Math.floor(t / 60)
    const s = Math.floor(t % 60)
    return `${m}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div style={{
      position: 'absolute', bottom: '120px', left: '50%', transform: 'translateX(-50%)',
      width: '90%', maxWidth: '600px',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)',
      padding: '10px 20px', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.1)',
      display: 'flex', alignItems: 'center', gap: '15px', zIndex: 100
    }}>
      <button onClick={onPlayPause} style={{ background: 'none', border: 'none', color: '#00f0ff', fontSize: '24px', cursor: 'pointer', display: 'flex' }}>
        {isPlaying ? '⏸' : '▶'}
      </button>
      <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px', minWidth: '40px' }}>{fmt(currentTime)}</span>
      <input type="range" min="0" max={duration || 100} value={currentTime || 0} onChange={(e) => onSeek(parseFloat(e.target.value))} style={{ flex: 1, accentColor: '#00f0ff', height: '4px', cursor: 'pointer' }} />
      <span style={{ color: '#fff', fontFamily: 'monospace', fontSize: '12px', minWidth: '40px' }}>{fmt(duration)}</span>
    </div>
  )
}

function App() {
  const [status, setStatus] = useState("idle")
  const [orbs, setOrbs] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState("") 
 
  const [globalBpm, setGlobalBpm] = useState(BASE_BPM)

  const [drawings, setDrawings] = useState([]) 
  const [mode, setMode] = useState('draw') 
  
  const [activeBrush, setActiveBrush] = useState(null) 
  const [isDrawing, setIsDrawing] = useState(false)
  const [availableInstruments, setAvailableInstruments] = useState(['drum', 'bass', 'vocal', 'guitar', 'piano'])

  const [isPlaying, setIsPlaying] = useState(false)
  const [trackDuration, setTrackDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const fileInputRef = useRef(null)
  const recorderRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [canvasEl, setCanvasEl] = useState(null)
  const videoRecorderRef = useRef(null)
const [isVideoRecording, setIsVideoRecording] = useState(false)


const handleStartVideoRecording = async () => {
  if (!canvasEl) return
  await Tone.start()

  // stream de vídeo do canvas
  const videoStream = canvasEl.captureStream(60) // 60fps

  // destino de áudio do Web Audio (Tone)
  const audioContext = Tone.getContext().rawContext
  const audioDest = audioContext.createMediaStreamDestination()
  Tone.Destination.connect(audioDest)

  // junta tracks de vídeo + áudio
  const mixedStream = new MediaStream([
    ...videoStream.getVideoTracks(),
    ...audioDest.stream.getAudioTracks()
  ])

  const recorder = new MediaRecorder(mixedStream, {
    mimeType: 'video/webm;codecs=vp9'
  })

  const chunks = []
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data)
  }

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: 'video/webm' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'synesthesia-visual.webm'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
    Tone.Destination.disconnect(audioDest)
  }

  videoRecorderRef.current = recorder
  recorder.start() // começa a gravar já
  setIsVideoRecording(true)
}


  useEffect(() => {
    const recorder = new Tone.Recorder()
    Tone.Destination.connect(recorder)
    recorderRef.current = recorder

    return () => {
      Tone.Destination.disconnect(recorder)
    }
  }, [])
  // Listener de redimensionamento
  const youtubeInputRef = useRef(null)

  useEffect(() => {
    let interval
    if (status === 'playing' && isPlaying) {
      interval = setInterval(() => setCurrentTime(Tone.Transport.seconds), 100)
    }
    return () => clearInterval(interval)
  }, [status, isPlaying])

  const handleDrawComplete = (points) => {
    setDrawings([...drawings, { id: Date.now(), type: activeBrush, points }])
  }

  // --- FUNÇÃO PARA DELETAR DESENHO ESPECÍFICO ---
  const handleDeleteDrawing = (id) => {
    setDrawings(prev => prev.filter(d => d.id !== id))
  }

  const togglePlay = () => {
    if (Tone.Transport.state === 'started') {
      Tone.Transport.pause(); setIsPlaying(false)
    } else {
      Tone.Transport.start(); setIsPlaying(true)
    }
  }

  const seekTrack = (time) => {
    Tone.Transport.seconds = time; setCurrentTime(time)
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    const formData = new FormData()
    formData.append('audio', file)
    processAudioSource(formData, 'separate')
  }
  const handleStopVideoRecording = () => {
  if (!videoRecorderRef.current) return
  videoRecorderRef.current.stop()
  setIsVideoRecording(false)
}


  const handleStartRecording = async () => {
    if (!recorderRef.current) return
    await Tone.start() // garante que o contexto de áudio está ativo
    recorderRef.current.start()
    setIsRecording(true)
  }

  const handleStopRecording = async () => {
    if (!recorderRef.current) return

    const recording = await recorderRef.current.stop() // Blob de áudio
    setIsRecording(false)

    const url = URL.createObjectURL(recording)
    const a = document.createElement('a')
    a.href = url
    a.download = 'synesthesia-mix.webm' // pode trocar para .wav, se preferir
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }


  const handleYoutubeUpload = async () => {
    const url = youtubeInputRef.current.value
    if (!url) return alert("Cole uma URL do YouTube")
    processAudioSource({ url }, 'process-youtube')
  }

  const processAudioSource = async (bodyData, endpoint) => {
    setStatus("uploading")
    try {
      setStatus("processing")
      const headers = bodyData instanceof FormData ? {} : { 'Content-Type': 'application/json' }
      const body = bodyData instanceof FormData ? bodyData : JSON.stringify(bodyData)

      const response = await fetch(`${API_URL}/${endpoint}`, { method: 'POST', headers, body })
      const data = await response.json()
      
      if (data.success) {
        if(data.isDemo) alert("⚠️ Modo Demo (API Falhou)")
        if(data.cached) console.log("⚡ Cache Hit!")
        await carregarStems(data.stems)
      } else {
        alert("Erro: " + (data.error || "Desconhecido"))
        setStatus("idle")
      }
    } catch (e) {
      alert(`Erro de conexão com servidor (${API_URL})`)
      setStatus("idle")
    }
  }

  const carregarStems = async (urls) => {
    setStatus("loading_audio")
    await Tone.start()
    Tone.Transport.stop(); Tone.Transport.cancel()
    
    Object.values(players).forEach(p => p && p.dispose())
    Object.values(meters).forEach(m => m && m.dispose())

    const validInsts = []

    const load = (url, type) => {
       if (!url) return { p: null, m: null }
       validInsts.push(type) 
       const p = new Tone.Player(url).toDestination()
       p.sync().start(0) 
       const m = new Tone.Meter({ smoothing: 0.8 })
       p.connect(m)
       return { p, m }
    }

    const t = { 
      drums: load(urls.drums, 'drum'), 
      bass: load(urls.bass, 'bass'), 
      vocals: load(urls.vocals, 'vocal'), 
      guitar: load(urls.guitar, 'guitar'), 
      piano: load(urls.piano, 'piano') 
    }
    
    setAvailableInstruments(validInsts)

    for (const k in t) { players[k] = t[k].p; meters[k] = t[k].m }

    try {
      await Tone.loaded()
      const duration = players.drums ? players.drums.buffer.duration : 30
      setTrackDuration(duration)
      Tone.Transport.loop = true; Tone.Transport.loopEnd = duration
      Tone.Transport.start()
      setIsPlaying(true)
      setStatus("playing")
      if (validInsts.includes('drum')) setActiveBrush('drum') 
      else if (validInsts.length > 0) setActiveBrush(validInsts[0])
    } catch (e) {
      console.error(e)
      alert("Erro ao carregar áudio.")
      setStatus("idle")
    }
  }

  const updateMix = (orbList) => {
  const tempoFactor = globalBpm / BASE_BPM

  orbList.forEach((orb) => {
    if (players[orb.id]) {
      const pan = Math.max(-1, Math.min(1, orb.position[0] / 8))
      const panner = new Tone.Panner(pan).toDestination()

      players[orb.id].disconnect()
      players[orb.id].connect(panner)

      if (meters[orb.id]) {
        players[orb.id].connect(meters[orb.id])
      }

      const volume = (orb.position[2] * 2)
      players[orb.id].volume.value = Math.min(0, volume)

      // AQUI: tempo local * fator global
      const finalRate = orb.playbackRate * tempoFactor
      players[orb.id].playbackRate = finalRate
    }
  })
}
  
  const addOrb = (type) => {
    if (!availableStems[type]) return
    const newId = `${type}-${Date.now()}`
    // Posição aleatória menor para telas menores
    const range = isMobile ? 2 : 4
    const newOrb = {
        id: newId, type, scale: 1, 
        position: [Math.random() * range - (range/2), Math.random() * range - (range/2), 0], 
        playbackRate: 1
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
        const baseRate = 1 / newScale  // ou qualquer relação que você preferir
        return { ...o, scale: newScale, playbackRate: baseRate }
      }
      return o
    })
    setOrbs(newOrbs)
    updateMix(newOrbs)
  }
  
  const updateOrbPosition = (id, newPosition) => {
    const newOrbs = orbs.map(o => { if (o.id === id) return { ...o, position: newPosition }; return o }); setOrbs(newOrbs); updateMix(newOrbs)
  }
  
  // Drag logic (Desktop)
  const handleDragStart = (e, type) => setDraggedItem(type)
  const handleDragOver = (e) => e.preventDefault()
  const handleOrbDrop = (e) => {
    e.preventDefault()
    if (draggedItem && availableStems[draggedItem]) { addOrb(draggedItem); setDraggedItem(null) }
  }

  // --- RENDERIZAÇÃO ---
  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505", cursor: (mode === 'draw' && activeBrush && activeBrush !== 'eraser') ? 'crosshair' : (activeBrush === 'eraser' ? 'alias' : 'auto') }}>
      
      {/* Canvas com ajuste de FOV para mobile (câmera mais longe se a tela for estreita) */}
      <Canvas
        camera={{ position: [0, 0, isMobile ? 18 : 14], fov: 45 }}
        onDrop={handleOrbDrop}
        onDragOver={handleDragOver}
        onCreated={({ gl }) => setCanvasEl(gl.domElement)}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
        <Sparkles count={500} scale={20} size={2} speed={0.4} opacity={0.5} color="#00f0ff" />

        <CameraRig status={status} />

        {mode === 'draw' && (
          <>
            {drawings.map((draw) => (
              <LiveDrawing 
                key={draw.id} 
                id={draw.id}
                points={draw.points} 
                type={draw.type} 
                status={status}
                activeBrush={activeBrush} // Passa o pincel atual para saber se é borracha
                onDelete={handleDeleteDrawing} // Função de deletar
              />
            ))}
            <DrawingCanvas activeBrush={activeBrush} onDrawComplete={handleDrawComplete} isDrawing={isDrawing} setIsDrawing={setIsDrawing} />
          </>
        )}

        {mode === 'scene' && (
          <>
            {availableInstruments.includes('drum') && <DrumObject status={status} />}
            {availableInstruments.includes('bass') && <BassObject status={status} />}
            {availableInstruments.includes('vocal') && <VocalObject status={status} />}
            {availableInstruments.includes('guitar') && <GuitarObject status={status} />}
            {availableInstruments.includes('piano') && <PianoObject status={status} />}
          </>
        )}

        <OrbitControls enabled={!isDrawing && !(mode==='draw' && activeBrush && activeBrush !== 'eraser')} makeDefault />
      </Canvas>

      {/* Título e Seletor de Modo (TOPO DIREITO para não atrapalhar o player) */}
      <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px', zIndex: 100 }}>
        <h1 style={{ fontSize: '1.5rem', margin: 0, textShadow: '0 0 10px #ff0055', color: 'white' }}>SYNESTHESIA</h1>
        {status === 'playing' && (
          <div style={{ background: 'rgba(0,0,0,0.8)', padding: '5px', borderRadius: '30px', border: '1px solid #333', display: 'flex', gap: '5px' }}>
            <button onClick={() => setMode('draw')} style={{
              padding: '8px 15px', borderRadius: '25px', border: 'none', cursor: 'pointer',
              background: mode === 'draw' ? '#00f0ff' : 'transparent', color: mode === 'draw' ? 'black' : 'white', fontWeight: 'bold'
            }}>🖌️ PINTURA</button>
            <button onClick={() => setMode('scene')} style={{
              padding: '8px 15px', borderRadius: '25px', border: 'none', cursor: 'pointer',
              background: mode === 'scene' ? '#00f0ff' : 'transparent', color: mode === 'scene' ? 'black' : 'white', fontWeight: 'bold'
            }}>🔮 PALCO</button>
          </div>
        )}
      </div>

      {status === "playing" && (
        <MusicPlayer isPlaying={isPlaying} onPlayPause={togglePlay} duration={trackDuration} currentTime={currentTime} onSeek={seekTrack} />
      )}

      {status === "playing" && mode === 'draw' && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 30, 0.9)', backdropFilter: 'blur(12px)',
          padding: '10px 20px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', gap: '15px', zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
        }}>
          {availableInstruments.map(key => {
            const info = BRUSHES[key]
            return (
              <button 
                key={key}
                onClick={() => setActiveBrush(activeBrush === key ? null : key)}
                style={{
                  background: activeBrush === key ? info.color : 'transparent',
                  color: 'white', border: `2px solid ${info.color}`,
                  width: '50px', height: '50px', borderRadius: '15px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: activeBrush === key ? `0 0 25px ${info.color}` : 'none',
                  transform: activeBrush === key ? 'translateY(-10px) scale(1.1)' : 'none',
                  transition: 'all 0.2s'
                }}
                title={info.name}
              >
                <span style={{fontSize: '24px'}}>{info.icon}</span>
              </button>
            )
          })}
          
          <div style={{ width: '1px', background: 'white', margin: '0 5px', opacity: 0.3 }}></div>
          
          {/* Botão BORRACHA (Para apagar um por um) */}
          <button 
            onClick={() => setActiveBrush(activeBrush === 'eraser' ? null : 'eraser')} 
            style={{ 
              background: activeBrush === 'eraser' ? '#ff4444' : 'transparent', 
              border: '2px solid #ff4444', borderRadius: '15px', width: '50px', height: '50px', 
              fontSize:'24px', cursor:'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: activeBrush === 'eraser' ? 'translateY(-10px) scale(1.1)' : 'none',
              transition: 'all 0.2s'
            }} 
            title="Borracha (Clique para apagar)"
          >
            🧽
          </button>

          {/* Botão LIMPAR TUDO */}
          <button onClick={() => setDrawings([])} style={{ background:'transparent', border:'none', fontSize:'24px', cursor:'pointer', opacity: 0.7 }} title="Limpar Tudo">
            🗑️
          </button>
        </div>
      )}

      {status !== "playing" && (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'radial-gradient(circle at center, rgba(20,20,20,0.9) 0%, rgba(0,0,0,1) 100%)', 
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', zIndex: 20
          }}>
           {status === "idle" && (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '25px', width: '90%', maxWidth: '450px' }}>
                <h1 style={{ color: 'white', fontSize: '3.5rem', margin: 0, textShadow: '0 0 40px rgba(255, 0, 85, 0.6)', textAlign: 'center', letterSpacing: '4px' }}>SYNESTHESIA</h1>
                <p style={{ color: '#00f0ff', letterSpacing: '3px', marginBottom: '30px', fontWeight: 'bold' }}>PAINT THE SOUND</p>
                <button onClick={() => fileInputRef.current.click()} style={{
                    width: '100%', padding: '18px', fontSize: '1.1rem', cursor: 'pointer',
                    background: 'linear-gradient(90deg, #ff0055 0%, #ff8800 100%)', color: 'white', 
                    border: 'none', borderRadius: '12px', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px',
                    boxShadow: '0 10px 30px rgba(255, 0, 85, 0.3)', transition: 'transform 0.2s'
                  }} onMouseOver={e => e.target.style.transform = 'scale(1.02)'} onMouseOut={e => e.target.style.transform = 'scale(1)'}>
                  📁 Upload MP3
                </button>
                <div style={{color: '#444', fontSize: '0.8rem'}}>OU COLE UM LINK DO YOUTUBE</div>
                <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                  <input ref={youtubeInputRef} placeholder="https://youtube.com/watch?v=..." style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #333', background: '#111', color: 'white', outline: 'none', fontFamily: 'monospace' }} />
                  <button onClick={handleYoutubeUpload} style={{ padding: '0 25px', cursor: 'pointer', background: '#333', color: 'white', border: '1px solid #444', borderRadius: '12px', fontWeight: 'bold', transition: 'background 0.2s' }}>▶</button>
                </div>
             </div>
           )}
           {(status === "processing" || status === "uploading") && (
             <div style={{textAlign: 'center'}}>
               <div style={{ width: '50px', height: '50px', border: '4px solid #ff0055', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
               <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
               <h2 style={{color:'white', letterSpacing: '1px'}}>PROCESSANDO ÁUDIO...</h2>
               <p style={{color:'#666', fontSize: '0.9rem'}}>A IA está separando os instrumentos...</p>
             </div>
           )}
           {status === "loading_audio" && <h2 style={{color:'#00ff00', textShadow: '0 0 20px #00ff00'}}>BAIXANDO STEMS... ⏳</h2>}
           <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        </div>
      )}

      {/* INTERFACE DE JOGO */}
      {status === "playing" && (
        <>
          {/* Header Mobile-Friendly */}
          <div style={{ position: 'absolute', top: '20px', left: '20px', zIndex: 10, pointerEvents: 'none' }}>
             <h3 style={{ color: 'white', margin: 0, letterSpacing: '2px', fontSize: isMobile ? '1rem' : '1.2rem' }}>SYNESTHESIA</h3>
             <p style={{ color: '#666', fontSize: '0.7rem', margin: 0 }}>
               {isMobile ? "Toque nos ícones para adicionar" : "Arraste ou clique nos ícones"}
             </p>
          </div>
          {/* Botões de gravação (mix + vídeo) */}
          <div
            style={{
              position: 'absolute',
              top: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 20,
              pointerEvents: 'auto',
              display: 'flex',
              gap: '10px',
            }}
          >
            <button
              onClick={isRecording ? handleStopRecording : handleStartRecording}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #ff0055',
                background: isRecording ? '#ff0055' : 'transparent',
                color: 'white',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(255,0,85,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              {isRecording ? 'Parar e baixar mix' : 'Gravar mix atual'}
            </button>

            <button
              onClick={isVideoRecording ? handleStopVideoRecording : handleStartVideoRecording}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid #0ff',
                background: isVideoRecording ? '#0ff' : 'transparent',
                color: 'white',
                fontSize: '0.8rem',
                textTransform: 'uppercase',
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(0,255,255,0.4)',
                whiteSpace: 'nowrap',
              }}
            >
              {isVideoRecording ? 'Parar e baixar vídeo' : 'Gravar vídeo & áudio'}
            </button>
          </div>


          {/* Botão Toggle Sidebar (Só aparece se necessário) */}
          <button 
            onClick={() => setShowSidebar(!showSidebar)}
            style={{
              position: 'absolute', top: '20px', right: '20px', zIndex: 40,
              background: 'rgba(20,20,20,0.8)', color: 'white', border: '1px solid #444',
              borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            {showSidebar ? '✕' : '⚙️'}
          </button>

          {/* Docker (Barra Inferior) */}
          <div style={{
            position: 'absolute', bottom: '30px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(20,20,20,0.9)', padding: '10px 20px', borderRadius: '20px',
            display: 'flex', gap: isMobile ? '15px' : '20px', zIndex: 30,
            border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
            maxWidth: '90vw', overflowX: 'auto'
          }}>
            {Object.keys(OrbComponents).map(type => (
              availableStems[type] && (
                <div
                  key={type}
                  draggable={!isMobile} // Só arrasta no desktop
                  onDragStart={(e) => handleDragStart(e, type)}
                  onClick={() => addOrb(type)} // NOVO: Clique funciona no mobile
                  style={{
                    minWidth: '45px', width: '45px', height: '45px', borderRadius: '12px',
                    background: OrbColors[type], display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', fontSize: '0.6rem', color: 'white', fontWeight: 'bold',
                    boxShadow: `0 0 10px ${OrbColors[type]}`,
                    border: '2px solid rgba(255,255,255,0.2)',
                    userSelect: 'none'
                  }}
                >
                  {OrbNames[type]}
                </div>
              )
            ))}
          </div>

          {/* Sidebar (Configurações) */}
          {showSidebar && (
            <div
              style={{
                position: 'absolute',
                top: isMobile ? '70px' : '20px',
                right: '20px',
                background: 'rgba(10,10,10,0.9)',
                padding: '20px',
                borderRadius: '15px',
                maxHeight: '70vh',
                overflowY: 'auto',
                zIndex: 30,
                width: isMobile ? '260px' : '220px',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '-10px 10px 30px rgba(0,0,0,0.5)',
              }}
            >
              {/* Controle de BPM global */}
              <div style={{ marginBottom: '15px' }}>
                <label
                  style={{
                    color: '#ccc',
                    fontSize: '0.7rem',
                    display: 'block',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                  }}
                >
                  BPM global: {globalBpm}
                </label>
                <input
                  type="range"
                  min="60"
                  max="180"
                  step="1"
                  value={globalBpm}
                  onChange={(e) => {
                    const newBpm = parseInt(e.target.value, 10)
                    setGlobalBpm(newBpm)
                    updateMix(orbs)
                  }}
                  style={{ width: '100%' }}
                />
              </div>
              <h4 style={{ color: '#aaa', margin: '0 0 15px 0', fontSize: '0.8rem', textTransform: 'uppercase' }}>Mistura Ativa</h4>
              {orbs.length === 0 && <p style={{color: '#444', fontSize: '0.8rem'}}>Vazio. Adicione instrumentos.</p>}
              
              {orbs.map(orb => (
                <div key={orb.id} style={{
                  background: 'rgba(255,255,255,0.03)', padding: '10px', marginBottom: '10px',
                  borderRadius: '8px', borderLeft: `3px solid ${OrbColors[orb.type]}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ color: 'white', fontSize: '0.8rem', fontWeight: 'bold' }}>{OrbNames[orb.type]} {orb.type}</span>
                    <button onClick={() => removeOrb(orb.id)} style={{
                        background: 'transparent', border: 'none', color: '#ff4444', 
                        cursor: 'pointer', fontSize: '1.2rem', padding: '0 5px'
                      }}>×</button>
                  </div>
                  
                  <div style={{ marginBottom: '8px' }}>
                    <label style={{ color: '#666', fontSize: '0.65rem', display: 'block' }}>Escala / Tempo</label>
                    <input type="range" min="0.5" max="2" step="0.1" value={orb.scale}
                      onChange={(e) => updateOrbScale(orb.id, parseFloat(e.target.value))}
                      style={{ width: '100%', accentColor: OrbColors[orb.type] }} />
                  </div>

                  <div>
                    <label style={{ color: '#666', fontSize: '0.65rem', display: 'block' }}>Posição X / Pan</label>
                    <input type="range" min="-6" max="6" step="0.5" value={orb.position[0]}
                      onChange={(e) => updateOrbPosition(orb.id, [parseFloat(e.target.value), orb.position[1], orb.position[2]])}
                      style={{ width: '100%', accentColor: OrbColors[orb.type] }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      {status === "playing" && mode === 'draw' && (
        <div style={{ position: 'absolute', top: '20px', left: '30px', color: 'white', pointerEvents: 'none' }}>
          <p style={{ margin: '5px 0 0', fontSize: '0.9rem', opacity: 0.7, fontFamily: 'monospace' }}>
            {activeBrush === 'eraser' 
              ? "❌ Clique em um desenho para apagar" 
              : (activeBrush ? "🖊️ Arraste para desenhar som" : "👀 Arraste para girar a câmera")}
          </p>
        </div>
      )}
    </div>
  )
}

export default App