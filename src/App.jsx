import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, MeshDistortMaterial, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import * as Tone from 'tone'

// --- ESTADO GLOBAL ---
const players = {}
const meters = {}
let availableStems = {}

// --- COMPONENTES VISUAIS ---

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

// 2. BAIXO: Tubo Oscilante (Corda Grossa 3D)
function BassWave({ status, id, scale: customScale, position, playbackRate }) {
  const meshRef = useRef()
  
  // Configuração do Tubo:
  // [RaioTopo, RaioBase, Altura(Comprimento), SegmentsRadial, SegmentsAltura]
  // Altura 8 = Comprimento da corda
  // Raio 0.15 = Espessura total de 0.3 (igual a voz)
  const args = [0.15, 0.15, 8, 12, 64] 

  useEffect(() => {
    // Truque para animação 3D: Salvar as posições originais dos vértices
    // para que possamos deformar o tubo sem "amassar" ele para sempre.
    if (meshRef.current) {
       const geometry = meshRef.current.geometry
       // Clona a posição inicial para 'userData' para termos uma referência estática
       geometry.userData.originalPos = geometry.attributes.position.clone()
    }
  }, [])

  useFrame((state) => {
    if (!meshRef.current || !meshRef.current.geometry.userData.originalPos) return
    
    const time = state.clock.getElapsedTime()
    let energy = 0
    
    if (status === 'playing' && meters[id]) {
      const val = meters[id].getValue()
      energy = Tone.dbToGain(val)
    }

    const geometry = meshRef.current.geometry
    const positionAttribute = geometry.attributes.position
    const originalPos = geometry.userData.originalPos // Lemos do original
    
    const vertex = new THREE.Vector3()

    for (let i = 0; i < positionAttribute.count; i++) {
      // Ler do original (estático)
      vertex.fromBufferAttribute(originalPos, i)
      
      // O Cilindro é criado em pé (eixo Y). Nós o deitamos depois com rotation.
      // Então aqui, 'y' é o comprimento da corda.
      const lengthPos = vertex.y 
      
      const waveSpeed = time * 3 * playbackRate
      const waveFrequency = 1.5
      
      // Amplitude base + energia do som
      const amplitude = 0.2 + (energy * 3 * customScale)
      
      // Cálculo da Onda Senoidal
      const waveOffset = Math.sin(lengthPos * waveFrequency + waveSpeed) * amplitude

      // Aplicar a onda no eixo X (que será a altura no mundo real após rotação)
      // Somamos à posição original para manter a espessura do tubo
      const currentX = vertex.x + waveOffset
      const currentZ = vertex.z + (Math.cos(lengthPos * waveFrequency + waveSpeed) * amplitude * 0.3)

      if (status !== 'playing') {
          // Movimento suave "Idle"
          const idleWave = Math.sin(lengthPos + time) * 0.2
          positionAttribute.setX(i, vertex.x + idleWave)
          positionAttribute.setZ(i, vertex.z)
      } else {
          // Movimento intenso "Playing"
          positionAttribute.setX(i, currentX)
          positionAttribute.setZ(i, currentZ) // Um pouco de movimento lateral também
      }
    }
    
    positionAttribute.needsUpdate = true
    
    // Posicionamento geral
    meshRef.current.position.set(position[0], position[1], position[2])
    
    // Rotação leve do objeto inteiro
    meshRef.current.rotation.x = Math.sin(time * 0.2) * 0.1
  })

  return (
    <mesh ref={meshRef} position={position} rotation={[0, 0, Math.PI / 2]}> 
      {/* Rotação Z = 90 graus para deitar o cilindro */}
      <cylinderGeometry args={args} />
      {/* Material sólido e brilhante para combinar com os outros */}
      <meshPhysicalMaterial 
        color="#4b0082" 
        emissive="#6a0dad" 
        emissiveIntensity={2} 
        roughness={0.2} 
        metalness={0.8} 
        clearcoat={1}
      />
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
      {/* O segundo argumento (0.25) é a grossura do tubo. O baixo agora tem 0.3, bem próximo. */}
      <torusKnotGeometry args={[1, 0.25, 128, 16]} />
      <meshStandardMaterial color="#00ffff" emissive="#00aaaa" emissiveIntensity={1.2} roughness={0} metalness={1} opacity={0.9} transparent />
    </mesh>
  )
}

function GuitarShards({ status, id, scale: customScale, position, playbackRate }) {
  const groupRef = useRef()
  // 3 "Shards" (Estilhaços) principais
  const shards = [-1.2, 0, 1.2] 

  useFrame((state) => {
    if (status !== 'playing' || !meters[id]) return

    // Pegamos a energia do áudio
    const val = meters[id].getValue()
    const energy = (val > -100) ? Tone.dbToGain(val) : 0
    
    if (groupRef.current) {
       // Rotação constante + explosão de velocidade na batida
       groupRef.current.rotation.x += (0.005 + energy * 0.5) * playbackRate
       groupRef.current.rotation.y += (0.01 + energy * 0.5) * playbackRate
       
       // Expansão: Quando a guitarra toca, os cristais se afastam do centro
       const expansion = 1 + (energy * 4) // Multiplicador de "explosão"

       groupRef.current.children.forEach((child, i) => {
         // Posição baseada no índice (-1, 0, 1)
         // Se afastam horizontalmente
         const xOffset = (i - 1) * 1.5 
         
         // Interpolação suave para a posição de "ataque"
         child.position.x = THREE.MathUtils.lerp(child.position.x, xOffset * expansion, 0.2)
         
         // Eles também sobem/descem aleatoriamente com a energia
         const noise = Math.sin(state.clock.elapsedTime * 10 + i) 
         child.position.y = THREE.MathUtils.lerp(child.position.y, noise * energy * 2, 0.2)

         // Rotação individual frenética
         child.rotation.z += 0.05 + energy
         
         // Cor: Fica mais branca/brilhante quando toca forte
         if (child.material) {
             const targetIntensity = 1 + (energy * 10) // Brilho intenso
             child.material.emissiveIntensity = THREE.MathUtils.lerp(child.material.emissiveIntensity, targetIntensity, 0.3)
         }
       })

       // Escala geral do grupo controlada pelo slider
       const s = customScale
       groupRef.current.scale.lerp(new THREE.Vector3(s, s, s), 0.1)
    }
  })

  return (
    <group position={position} ref={groupRef}>
       {shards.map((i, index) => (
         <mesh key={index} position={[i, 0, 0]}>
           {/* Tetrahedron = Pirâmide (Mais agressivo que esfera/cubo) */}
           <tetrahedronGeometry args={[0.6, 0]} /> 
           
           {/* Material Sólido Metálico Incandescente */}
           <meshPhysicalMaterial 
             color="#ff5500"       // Laranja Avermelhado
             emissive="#ff2200"    // Brilha vermelho
             emissiveIntensity={1} // Brilho base
             roughness={0.2}       // Meio liso
             metalness={0.9}       // Bem metálico
             clearcoat={1}         // Camada de verniz por cima
             clearcoatRoughness={0.1}
           />
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
  drums: '🥁',
  bass: '🔊', 
  vocals: '🎤',
  guitar: '🎸',
  piano: '🎹'
}

// --- APLICAÇÃO PRINCIPAL ---

function App() {
  const [status, setStatus] = useState("idle")
  const [orbs, setOrbs] = useState([])
  const [draggedItem, setDraggedItem] = useState(null)
  const [youtubeUrl, setYoutubeUrl] = useState("") 
  
  // NOVO: Estados para Responsividade e UI
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showSidebar, setShowSidebar] = useState(!isMobile) // Mobile começa fechado
  const fileInputRef = useRef(null)

  // Listener de redimensionamento
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setShowSidebar(true) // Abre sidebar se voltar pra desktop
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 1. INPUT DE ARQUIVO
  const handleFileButtonClick = async () => {
    await Tone.start()
    fileInputRef.current.click()
  }

  // 2. INPUT DO YOUTUBE
  const handleYoutubeSubmit = async () => {
    if (!youtubeUrl) return alert("Por favor, cole um link do YouTube!")
    await Tone.start()
    setStatus("downloading") 
    const progressTimer = setTimeout(() => setStatus("separating"), 10000)

    try {
      const response = await fetch('https://synesthesia-server.onrender.com/process-youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl })
      })
      const data = await response.json()
      clearTimeout(progressTimer) 
      processResponseData(data)
    } catch (e) {
      console.error(e)
      clearTimeout(progressTimer)
      alert("Erro ao conectar com servidor.")
      setStatus("idle")
    }
  }

  const handleFileChange = async (event) => {
    const file = event.target.files[0]
    if (!file) return
    setStatus("processing")
    const formData = new FormData()
    formData.append('audio', file)
    try {
      const response = await fetch('https://synesthesia-server.onrender.com/separate', { method: 'POST', body: formData })
      const data = await response.json()
      processResponseData(data)
    } catch (e) {
      console.error(e)
      alert("Erro de conexão com servidor.")
      setStatus("idle")
    }
  }

  const processResponseData = async (data) => {
    if (data.success) {
      if (data.isDemo) alert("Modo Demo: Usando áudio de exemplo.")
      availableStems = data.stems
      const initialOrbs = []
      // Posições ajustadas para caber melhor na tela se for mobile? 
      // Por enquanto mantemos padrão, mas o zoom da câmera resolve.
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
            id: `${stem}-0`, type: stem, scale: 1, position: positions[stem] || [0, 0, 0], playbackRate: 1
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
       p.connect(m); p.loop = true; p.autostart = false
       return { p, m }
    }
    orbList.forEach(orb => {
      const url = availableStems[orb.type]
      if (url) {
        const track = loadTrack(url)
        if (track) {
          players[orb.id] = track.p; meters[orb.id] = track.m; track.p.playbackRate = orb.playbackRate
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
        const playbackRate = 1 / newScale
        if (players[id]) players[id].playbackRate = playbackRate
        return { ...o, scale: newScale, playbackRate }
      } return o
    }); setOrbs(newOrbs); updateMix(newOrbs)
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
    <div style={{ width: "100vw", height: "100vh", background: "#050505", overflow: "hidden", fontFamily: 'sans-serif' }}>
      
      {/* Canvas com ajuste de FOV para mobile (câmera mais longe se a tela for estreita) */}
      <Canvas 
        camera={{ position: [0, 0, isMobile ? 18 : 14], fov: 45 }} 
        onDrop={handleOrbDrop} 
        onDragOver={handleDragOver}
      >
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
            background: 'rgba(0,0,0,0.85)', padding: '20px', boxSizing: 'border-box',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
            zIndex: 20
          }}>
           {status === "idle" && (
             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', width: '100%', maxWidth: '500px' }}>
                <h1 style={{ 
                    color: 'white', fontSize: isMobile ? '2.5rem' : '4rem', margin: 0, 
                    letterSpacing: '0.2em', textShadow: '0 0 30px #ff0055', textAlign: 'center' 
                  }}>
                  SYNESTHESIA
                </h1>
                <p style={{ color: '#aaa', letterSpacing: '2px', marginBottom: '20px', textAlign: 'center', fontSize: isMobile ? '0.8rem' : '1rem' }}>
                  VISUALIZADOR DE STEMS 3D
                </p>
                
                <button onClick={handleFileButtonClick} style={{
                    padding: '15px 0', fontSize: '1rem', cursor: 'pointer', width: '100%',
                    background: '#ff0055', color: 'white', border: 'none', borderRadius: '50px',
                    textTransform: 'uppercase', fontWeight: 'bold', boxShadow: '0 0 20px rgba(255, 0, 85, 0.4)',
                  }}>
                  📂 Carregar MP3
                </button>

                {/* <div style={{ color: '#555' }}>— OU —</div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            placeholder="Link do YouTube..." 
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            style={{
                                flex: 1, padding: '12px 15px', borderRadius: '25px', border: '1px solid #444',
                                background: 'rgba(255,255,255,0.1)', color: 'white', outline: 'none', width: '100%'
                            }}
                        />
                        <button onClick={handleYoutubeSubmit} style={{
                            padding: '10px 20px', borderRadius: '25px', border: '1px solid #ff0055',
                            background: 'transparent', color: '#ff0055', cursor: 'pointer', fontWeight: 'bold'
                        }}>
                            GO
                        </button>
                    </div>

                    <p style={{ color: '#888', fontSize: '0.7rem', margin: 0, textAlign: 'left' }}>
                    <strong>Dica:</strong> Use o botão "Compartilhar" do vídeo e copie o link curto.
                    </p>
                </div> 
                */}
             </div>
           )}
           
           {(status === "processing" || status === "downloading" || status === "separating") && (
             <div style={{ textAlign: 'center', padding: '0 20px' }}>
                <h2 style={{ color: '#ff0055', animation: 'pulse 1s infinite', textTransform: 'uppercase', fontSize: isMobile ? '1.2rem' : '1.5rem' }}>
                    {status === "downloading" && "BAIXANDO..."}
                    {status === "separating" && "SEPARANDO FAIXAS..."}
                    {status === "processing" && "PROCESSANDO..."}
                </h2>
                <p style={{ color: '#ccc', fontSize: '0.9rem' }}>Aguarde um momento.</p>
             </div>
           )}
           
           {status === "loading_audio" && <h2 style={{ color: '#00ff00', fontSize: '1.2rem' }}>SINCRONIZANDO...</h2>}
           <input type="file" accept="audio/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
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
            <div style={{
              position: 'absolute', top: isMobile ? '70px' : '20px', right: '20px',
              background: 'rgba(10,10,10,0.9)', padding: '20px', borderRadius: '15px',
              maxHeight: '70vh', overflowY: 'auto', zIndex: 30, 
              width: isMobile ? '260px' : '220px',
              backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: '-10px 10px 30px rgba(0,0,0,0.5)'
            }}>
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
      )}
    </div>
  )
}

export default App