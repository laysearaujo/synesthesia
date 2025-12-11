import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import KonvaVisuals from './KonvaVisuals'
import { OrbitControls, Stars, Sparkles, Sphere, Torus, Icosahedron, Octahedron, Box, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'
import StemMapper from './StemMapper'
import { OrbObject, TerrainObject, CloudObject, CometObject, visualMeters } from './VisualComponents'
import { Stage, Layer, Line as KonvaLine } from 'react-konva'

// --- URL DO BACKEND ---
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:3001'
  : 'https://synesthesia-server.onrender.com'

// --- GLOBAIS DE ÁUDIO ---
const players = { drums: null, bass: null, vocals: null, guitar: null, piano: null }
const meters = { drums: null, bass: null, vocals: null, guitar: null, piano: null }
const BASE_BPM = 120 // ajuste se souber o BPM real da track

// link meters to visual components (VisualComponents.jsx exports `visualMeters` object)
try { Object.assign(visualMeters, meters) } catch (e) { /* ignore in case import not available yet */ }

// Configuração dos Pincéis
const BRUSHES = {
  drum: { color: "#ff003c", name: "Bateria", icon: "🥁" },
  bass: { color: "#8A2BE2", name: "Baixo", icon: "🎸" },
  vocal: { color: "#00f0ff", name: "Voz", icon: "🎤" },
  guitar: { color: "#ffaa00", name: "Guitarra", icon: "⚡" },
  piano: { color: "#39ff14", name: "Piano", icon: "🎹" }
}

// --- EFEITO DE CÂMERA ---
function CameraRig({ status }) {
  useFrame((state) => {
    if (status !== 'playing' || !meters.bass) return
    const val = meters.bass.getValue()
    const energy = (val > -100 && val < 100) ? Tone.dbToGain(val) : 0
    const targetZ = 15 - (energy * 5)
    state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, targetZ, 0.15)
    if (energy > 0.6) {
      state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, (Math.random() - 0.5) * 0.02, 0.2)
    } else {
      state.camera.rotation.z = THREE.MathUtils.lerp(state.camera.rotation.z, 0, 0.1)
    }
  })
  return null
}

// --- OBJETOS 3D (MODO PALCO) ---
function DrumObject({ status, channel = 'drums' }) {
  const mesh = useRef()
  useFrame(() => {
    const meter = meters[channel]
    if (!meter) return
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0
    const scale = 1.5 + (energy * 4)
    mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.4)
    mesh.current.material.emissiveIntensity = 1 + (energy * 10)
    mesh.current.material.distort = 0.3 + (energy * 2)
  })
  const brushKey = channel === 'drums' ? 'drum' : (channel === 'vocals' ? 'vocal' : channel)
  return (
    <Sphere ref={mesh} args={[1, 64, 64]} position={[0, 0, 0]}>
      <MeshDistortMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} speed={5} />
    </Sphere>
  )
}

function BassObject({ status, channel = 'bass' }) {
  const mesh = useRef()
  useFrame(() => {
    const meter = meters[channel]
    if (!meter) return
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0
    mesh.current.rotation.x += 0.01 + (energy * 0.1)
    mesh.current.scale.setScalar(2 + (energy * 2))
    mesh.current.material.color.setHSL(0.75, 1, 0.5 + energy)
  })
  const brushKey = channel === 'drums' ? 'drum' : (channel === 'vocals' ? 'vocal' : channel)
  return (
    <Torus ref={mesh} args={[2, 0.2, 16, 100]} rotation={[1.5, 0, 0]}>
      <meshStandardMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={2} />
    </Torus>
  )
}

function VocalObject({ status, channel = 'vocals' }) {
  const mesh = useRef()
  useFrame((state) => {
    const meter = meters[channel]
    if (!meter) return
    const t = state.clock.getElapsedTime()
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0
    mesh.current.position.y = 3 + Math.sin(t) * 0.5
    mesh.current.rotation.y += 0.01
    const scale = 1 + (energy * 3)
    mesh.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.2)
    mesh.current.material.wireframe = energy < 0.2
  })
  const brushKey = channel === 'drums' ? 'drum' : (channel === 'vocals' ? 'vocal' : channel)
  return (
    <Icosahedron ref={mesh} args={[1, 2]} position={[0, 3, 0]}>
      <MeshDistortMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={3} distort={0.6} speed={3} />
    </Icosahedron>
  )
}

function GuitarObject({ status, channel = 'guitar' }) {
  const mesh = useRef()
  useFrame(() => {
    const meter = meters[channel]
    if (!meter) return
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0
    mesh.current.rotation.z -= 0.02 + energy
    mesh.current.scale.setScalar(0.8 + (energy * 4))
  })
  const brushKey = channel === 'drums' ? 'drum' : (channel === 'vocals' ? 'vocal' : channel)
  return (
    <Octahedron ref={mesh} args={[1, 0]} position={[-4, 0, -2]}>
      <meshStandardMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={4} wireframe />
    </Octahedron>
  )
}

function PianoObject({ status, channel = 'piano' }) {
  const group = useRef()
  useFrame((state) => {
    const meter = meters[channel]
    if (!meter) return
    const energy = status === 'playing' ? Tone.dbToGain(meter.getValue()) : 0
    const t = state.clock.getElapsedTime()
    group.current.position.y = Math.sin(t * 2)
    group.current.children.forEach((child, i) => {
      child.scale.y = 1 + (energy * 5 * (i + 1))
    })
  })
  const brushKey = channel === 'drums' ? 'drum' : (channel === 'vocals' ? 'vocal' : channel)
  return (
    <group ref={group} position={[4, 0, -2]}>
      <Box args={[0.5, 1, 0.5]} position={[-0.5, 0, 0]}>
        <meshStandardMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={2} />
      </Box>
      <Box args={[0.5, 1, 0.5]} position={[0.5, 0, 0]}>
        <meshStandardMaterial color={BRUSHES[brushKey].color} emissive={BRUSHES[brushKey].color} emissiveIntensity={2} />
      </Box>
    </group>
  )
}

// Visual components have been moved to `src/VisualComponents.jsx` and are imported at top.

// --- MODO DESENHO (2D) USANDO REACT-KONVA ---
function KonvaDrawingBoard({ activeBrush, drawings, setDrawings, isDrawing, setIsDrawing }) {
  const stageRef = useRef()
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight })
  const [currentPoints, setCurrentPoints] = useState([])

  // Recalcula tamanho ao redimensionar
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const getColor = (brush) => (BRUSHES[brush]?.color || '#999')

  const handlePointerDown = () => {
    if (!activeBrush || activeBrush === 'eraser') return
    const pos = stageRef.current?.getPointerPosition()
    if (!pos) return
    setIsDrawing(true)
    setCurrentPoints([pos.x, pos.y])
  }

  const handlePointerMove = () => {
    if (!isDrawing) return
    const pos = stageRef.current?.getPointerPosition()
    if (!pos) return
    setCurrentPoints((prev) => [...prev, pos.x, pos.y])
  }

  const handlePointerUp = () => {
    if (!isDrawing) return
    setIsDrawing(false)
    if (currentPoints.length > 4) {
      setDrawings((prev) => [...prev, { id: Date.now(), brush: activeBrush, points: currentPoints }])
    }
    setCurrentPoints([])
  }

  const handleDelete = (id) => {
    if (activeBrush !== 'eraser') return
    setDrawings((prev) => prev.filter((d) => d.id !== id))
  }

  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 60 }}>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        style={{ background: 'transparent' }}
      >
        <Layer>
          {drawings.map((d) => (
            <KonvaLine
              key={d.id}
              points={d.points}
              stroke={getColor(d.brush)}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              opacity={0.9}
              onClick={() => handleDelete(d.id)}
              shadowBlur={12}
            />
          ))}
          {isDrawing && currentPoints.length > 0 && (
            <KonvaLine
              points={currentPoints}
              stroke={getColor(activeBrush)}
              strokeWidth={6}
              lineCap="round"
              lineJoin="round"
              tension={0.4}
              opacity={0.5}
              dash={[12, 8]}
            />
          )}
        </Layer>
      </Stage>
    </div>
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
      position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
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
  const [drawings, setDrawings] = useState([])
  const [mode, setMode] = useState('draw')

  const [activeBrush, setActiveBrush] = useState(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [availableInstruments, setAvailableInstruments] = useState(['drum', 'bass', 'vocal', 'guitar', 'piano'])

  // Visual mapping state: stem/channel -> visual object id
  const VISUAL_OBJECTS = ['Orb', 'Terrain', 'Comet', 'Cloud']
  const defaultMapping = {
    drums: 'Orb',
    bass: 'Terrain',
    vocals: 'Comet',
    guitar: 'Cloud',
    piano: 'Cloud'
  }
  const [visualMapping, setVisualMapping] = useState(defaultMapping)

  // Default shapes - fixed and persistent
  const DEFAULT_SHAPES = {
    Orb: [[-1, -1, 0], [-0.5, -1.2, 0], [0, -1, 0], [0.5, -1.2, 0], [1, -1, 0], [1.2, -0.5, 0], [1.2, 0, 0], [1.2, 0.5, 0], [1, 1, 0], [0.5, 1.2, 0], [0, -1, 0], [-0.5, 1.2, 0], [-1, 1, 0], [-1.2, 0.5, 0], [-1.2, 0, 0], [-1.2, -0.5, 0]],
    Terrain: [[-2, -0.5, 0], [-1.5, -0.3, 0], [-1, -0.4, 0], [-0.5, -0.2, 0], [0, 0, 0], [0.5, -0.2, 0], [1, -0.4, 0], [1.5, -0.3, 0], [2, -0.5, 0], [2, 0.5, 0], [0, 0.5, 0], [-2, 0.5, 0]],
    Comet: [[-2, -0.3, 0], [-1.5, -0.5, 0], [-1, -0.4, 0], [-0.5, -0.6, 0], [0, -0.5, 0], [0.5, -0.6, 0], [1, -0.4, 0], [1.5, -0.5, 0], [2, -0.3, 0]],
    Cloud: [[-1.5, -0.5, 0], [-1, -0.8, 0], [-0.5, -0.7, 0], [0, -0.9, 0], [0.5, -0.7, 0], [1, -0.8, 0], [1.5, -0.5, 0], [0.8, 0.3, 0], [0, 0.5, 0], [-0.8, 0.3, 0]]
  }
  const [visualShapes, setVisualShapes] = useState(DEFAULT_SHAPES)

  // Update mapping and ensure uniqueness by swapping if necessary
  const updateMapping = async (stemId, newVisualId) => {
    // Optimistic update locally
    let previous
    setVisualMapping(prev => {
      previous = prev
      const currentForStem = prev[stemId]
      const otherStem = Object.keys(prev).find(k => prev[k] === newVisualId)
      const next = { ...prev }
      if (otherStem && otherStem !== stemId) {
        next[otherStem] = currentForStem
      }
      next[stemId] = newVisualId
      return next
    })

    // Persist to backend
    try {
      const res = await fetch(`${API_URL}/visual-mapping`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visualMapping ? { ...visualMapping, [stemId]: newVisualId } : { [stemId]: newVisualId })
      })
      const data = await res.json()
      if (!data.success) {
        console.warn('Failed to persist visual mapping', data)
        // revert to previous on failure
        setVisualMapping(previous)
        alert('Não foi possível salvar o mapeamento no servidor.')
      } else {
        // ensure local state equals server's authoritative mapping
        if (data.mapping) setVisualMapping(prev => ({ ...prev, ...data.mapping }))
      }
    } catch (e) {
      console.warn('Error saving visual mapping', e)
      setVisualMapping(previous)
      alert('Erro de rede: não foi possível salvar o mapeamento')
    }
  }

  // Load mapping from backend on mount
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/visual-mapping`)
        const data = await res.json()
        if (mounted && data && data.success && data.mapping) {
          // Merge with defaults to ensure keys exist
          setVisualMapping(prev => ({ ...prev, ...data.mapping }))
        }
        // Also try loading shapes
        const shapesRes = await fetch(`${API_URL}/visual-shapes`)
        const shapesData = await shapesRes.json()
        if (mounted && shapesData && shapesData.success && shapesData.shapes) {
          setVisualShapes(prev => ({ ...prev, ...shapesData.shapes }))
        }
      } catch (e) {
        console.warn('Could not load from server', e)
      }
    }
    load()
    return () => { mounted = false }
  }, [])


  const saveVisualShape = (visualId, points) => {
    // Save shape locally and to backend
    setVisualShapes(prev => ({ ...prev, [visualId]: points }))
    // Persist to backend
    fetch(`${API_URL}/visual-shapes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [visualId]: points })
    }).catch(e => console.warn('Failed to save shape', e))
  }

  const [isPlaying, setIsPlaying] = useState(false)
  const [trackDuration, setTrackDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const fileInputRef = useRef(null)
  const youtubeInputRef = useRef(null)
  const recorderRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)

  const [canvasEl, setCanvasEl] = useState(null)
  const videoRecorderRef = useRef(null)
  const [isVideoRecording, setIsVideoRecording] = useState(false)
  const [globalBpm, setGlobalBpm] = useState(BASE_BPM)

  const [instrumentRates, setInstrumentRates] = useState({
    drum: 1,
    bass: 1,
    vocal: 1,
    guitar: 1,
    piano: 1,
  })

  const typeToPlayerKey = {
    drum: 'drums',
    bass: 'bass',
    vocal: 'vocals',
    guitar: 'guitar',
    piano: 'piano',
  }

  useEffect(() => {
    const tempoFactor = globalBpm / BASE_BPM // 1.0 = BPM original

    Object.entries(typeToPlayerKey).forEach(([type, playerKey]) => {
      const player = players[playerKey]
      if (!player) return

      const localRate = instrumentRates[type] ?? 1
      // time‑stretch final = fator global * fator do instrumento
      player.playbackRate = tempoFactor * localRate
    })
  }, [globalBpm, instrumentRates])


  useEffect(() => {
    const recorder = new Tone.Recorder()
    Tone.Destination.connect(recorder)
    recorderRef.current = recorder

    return () => {
      Tone.Destination.disconnect(recorder)
    }
  }, [])


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
  const handleGlobalBpmChange = (value) => {
    setGlobalBpm(value)
  }

  const handleInstrumentRateChange = (type, value) => {
    setInstrumentRates(prev => ({
      ...prev,
      [type]: value,
    }))
  }


  const handleStartRecording = async () => {
    if (!recorderRef.current) return
    await Tone.start() // garante AudioContext ativo
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
    a.download = 'synesthesia-mix.webm' // pode trocar para .wav se mudar mimeType
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const handleStartVideoRecording = async () => {
    if (!canvasEl) return
    await Tone.start()

    // vídeo do canvas (60 fps)
    const videoStream = canvasEl.captureStream(60)

    // áudio global do Tone.js
    const audioContext = Tone.getContext().rawContext
    const audioDest = audioContext.createMediaStreamDestination()
    Tone.Destination.connect(audioDest)

    // junta vídeo + áudio num único MediaStream
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
    recorder.start()
    setIsVideoRecording(true)
  }

  const handleStopVideoRecording = () => {
    if (!videoRecorderRef.current) return
    videoRecorderRef.current.stop()
    setIsVideoRecording(false)
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
        if (data.isDemo) alert("⚠️ Modo Demo (API Falhou)")
        if (data.cached) console.log("⚡ Cache Hit!")
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
      drums: load(urls.drums, 'drums'),
      bass: load(urls.bass, 'bass'),
      vocals: load(urls.vocals, 'vocals'),
      guitar: load(urls.guitar, 'guitar'),
      piano: load(urls.piano, 'piano')
    }

    setAvailableInstruments(validInsts)

    for (const k in t) { players[k] = t[k].p; meters[k] = t[k].m }
    // Expose meters to VisualComponents
    Object.assign(visualMeters, meters)
    // Also expose for Konva overlay
    try { window.visualMeters = visualMeters } catch (e) { }

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

  return (
    <div style={{ width: "100vw", height: "100vh", background: "#050505", cursor: (mode === 'draw' && activeBrush && activeBrush !== 'eraser') ? 'crosshair' : (activeBrush === 'eraser' ? 'alias' : 'auto') }}>

      {/* Use Konva overlay for scene rendering (fallback to 2D canvas) */}
      {mode === 'scene' ? (
        <KonvaVisuals visualMapping={visualMapping} visualShapes={visualShapes} availableInstruments={availableInstruments} status={status} />
      ) : (
        <Canvas camera={{ position: [0, 0, 15] }}>
          <color attach="background" args={['#050505']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <Sparkles count={500} scale={20} size={2} speed={0.4} opacity={0.5} color="#00f0ff" />

          <CameraRig status={status} />

          {mode === 'scene' && (
            <>
              {/* Render scene objects based on dynamic visualMapping */}
              {Object.entries(visualMapping).map(([stem, visual]) => {
                // only render if this channel/instrument is available
                if (!availableInstruments.includes(stem)) return null
                const key = stem + '-' + visual
                switch (visual) {
                  case 'Orb':
                    return <OrbObject key={key} status={status} channel={stem} shapePoints={visualShapes['Orb']} />
                  case 'Terrain':
                    return <TerrainObject key={key} status={status} channel={stem} shapePoints={visualShapes['Terrain']} />
                  case 'Comet':
                    return <CometObject key={key} status={status} channel={stem} shapePoints={visualShapes['Comet']} />
                  case 'Cloud':
                    return <CloudObject key={key} status={status} channel={stem} shapePoints={visualShapes['Cloud']} />
                  default:
                    return null
                }
              })}
            </>
          )}

          <OrbitControls enabled={!isDrawing && !(mode === 'draw' && activeBrush && activeBrush !== 'eraser')} makeDefault />
        </Canvas>
      )}

      {status === 'playing' && mode === 'draw' && (
        <KonvaDrawingBoard
          activeBrush={activeBrush}
          drawings={drawings}
          setDrawings={setDrawings}
          isDrawing={isDrawing}
          setIsDrawing={setIsDrawing}
        />
      )}

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
      {/* Botões de gravação (mix + vídeo) */}
      {status === 'playing' && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 110,
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
      )}

      {status === "playing" && mode === 'draw' && (
        <div style={{
          position: 'absolute', bottom: '315px', left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(20, 20, 30, 0.9)', backdropFilter: 'blur(12px)',
          padding: '10px 20px', borderRadius: '25px', border: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', gap: '15px', zIndex: 100, boxShadow: '0 10px 40px rgba(0,0,0,0.6)'
        }}>
          {availableInstruments.map(key => {
            const instrumentToBrush = { drums: 'drum', vocals: 'vocal', bass: 'bass', guitar: 'guitar', piano: 'piano' }
            const brushKey = instrumentToBrush[key] || key
            const info = BRUSHES[brushKey] || { color: '#999', name: key, icon: '🎵' }
            return (
              <button
                key={key}
                onClick={() => setActiveBrush(activeBrush === brushKey ? null : brushKey)}
                style={{
                  background: activeBrush === brushKey ? info.color : 'transparent',
                  color: 'white', border: `2px solid ${info.color}`,
                  width: '50px', height: '50px', borderRadius: '15px', cursor: 'pointer',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  boxShadow: activeBrush === brushKey ? `0 0 25px ${info.color}` : 'none',
                  transform: activeBrush === brushKey ? 'translateY(-10px) scale(1.1)' : 'none',
                  transition: 'all 0.2s'
                }}
                title={info.name}
              >
                <span style={{ fontSize: '24px' }}>{info.icon}</span>
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
              fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transform: activeBrush === 'eraser' ? 'translateY(-10px) scale(1.1)' : 'none',
              transition: 'all 0.2s'
            }}
            title="Borracha (Clique para apagar)"
          >
            🧽
          </button>

          {/* Botão LIMPAR TUDO */}
          <button onClick={() => setDrawings([])} style={{ background: 'transparent', border: 'none', fontSize: '24px', cursor: 'pointer', opacity: 0.7 }} title="Limpar Tudo">
            🗑️
          </button>
        </div>
      )}

      {status === 'playing' && (
        <StemMapper stems={availableInstruments} mapping={visualMapping} visuals={VISUAL_OBJECTS} updateMapping={updateMapping} />
      )}

      {status === "playing" && (
        <MusicPlayer isPlaying={isPlaying} onPlayPause={togglePlay} duration={trackDuration} currentTime={currentTime} onSeek={seekTrack} />
      )}
      {status === "playing" && (
        <div
          style={{
            position: 'absolute',
            bottom: '90px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10,10,15,0.9)',
            padding: '12px 20px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'white',
            fontSize: '0.8rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            zIndex: 110,
            maxWidth: '600px',
            width: '90%',
          }}
        >
          {/* BPM global */}
          <div>
            <div style={{ marginBottom: 4 }}>BPM global: {globalBpm}</div>
            <input
              type="range"
              min="60"
              max="180"
              step="1"
              value={globalBpm}
              onChange={(e) => handleGlobalBpmChange(parseInt(e.target.value, 10))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Time‑stretch por instrumento */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
            {availableInstruments.map((type) => {
              const info = BRUSHES[type]
              const rate = instrumentRates[type]
              return (
                <div key={type}>
                  <div style={{ marginBottom: 2 }}>
                    {info?.icon} {info?.name} – fator: {rate?.toFixed(2)}x
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.05"
                    value={rate}
                    onChange={(e) =>
                      handleInstrumentRateChange(type, parseFloat(e.target.value))
                    }
                    style={{ width: '100%', accentColor: info?.color }}
                  />
                </div>
              )
            })}
          </div>
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
              <div style={{ color: '#444', fontSize: '0.8rem' }}>OU COLE UM LINK DO YOUTUBE</div>
              <div style={{ display: 'flex', width: '100%', gap: '10px' }}>
                <input ref={youtubeInputRef} placeholder="https://youtube.com/watch?v=..." style={{ flex: 1, padding: '15px', borderRadius: '12px', border: '1px solid #333', background: '#111', color: 'white', outline: 'none', fontFamily: 'monospace' }} />
                <button onClick={handleYoutubeUpload} style={{ padding: '0 25px', cursor: 'pointer', background: '#333', color: 'white', border: '1px solid #444', borderRadius: '12px', fontWeight: 'bold', transition: 'background 0.2s' }}>▶</button>
              </div>
            </div>
          )}
          {(status === "processing" || status === "uploading") && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: '50px', height: '50px', border: '4px solid #ff0055', borderTop: '4px solid transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }}></div>
              <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
              <h2 style={{ color: 'white', letterSpacing: '1px' }}>PROCESSANDO ÁUDIO...</h2>
              <p style={{ color: '#666', fontSize: '0.9rem' }}>A IA está separando os instrumentos...</p>
            </div>
          )}
          {status === "loading_audio" && <h2 style={{ color: '#00ff00', textShadow: '0 0 20px #00ff00' }}>BAIXANDO STEMS... ⏳</h2>}
          <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  )
}

export default App