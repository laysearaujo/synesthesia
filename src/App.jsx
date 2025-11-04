import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import Matter from 'matter-js'

// Importa nosso CSS
import './index.css'

function App() {
  // --- 1. Hooks do React ---
  const sceneRef = useRef(null)
  const engineRef = useRef(null)
  const worldRef = useRef(null)
  const synthRef = useRef(null)
  const [isStarted, setIsStarted] = useState(false)

  // --- 2. useEffect: Onde a mágica acontece ---
  useEffect(() => {
    console.log("useEffect: Montando componente...") // Log de Depuração

    // --- Configuração da Física (Matter.js) ---
    const Engine = Matter.Engine
    const Render = Matter.Render
    const World = Matter.World
    const Bodies = Matter.Bodies
    const Body = Matter.Body
    const Events = Matter.Events

    const engine = Engine.create()
    engine.world.gravity.y = 0 // Sem gravidade
    const world = engine.world

    const render = Render.create({
      element: sceneRef.current, // Renderiza dentro do nosso <div>
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent'
      }
    })

    engineRef.current = engine
    worldRef.current = world

    // Cria as paredes invisíveis
    const wallOptions = {
      isStatic: true,
      restitution: 1,
      friction: 0,
      render: { fillStyle: 'transparent' },
      label: 'parede' // Damos um 'label' às paredes
    }
    World.add(world, [
      Bodies.rectangle(window.innerWidth / 2, -10, window.innerWidth, 20, wallOptions), // Topo
      Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 10, window.innerWidth, 20, wallOptions), // Baixo
      Bodies.rectangle(-10, window.innerHeight / 2, 20, window.innerHeight, wallOptions), // Esquerda
      Bodies.rectangle(window.innerWidth + 10, window.innerHeight / 2, 20, window.innerHeight, wallOptions)  // Direita
    ])

    console.log("useEffect: Motor de física e paredes criados."); // Log de Depuração

    // --- Configuração do Áudio (Tone.js) ---
    try {
      const kickSynth = new Tone.MembraneSynth({
        octaves: 5,
        pitchDecay: 0.05
      }).toDestination()
      const reverb = new Tone.Reverb(1.5).toDestination()
      kickSynth.connect(reverb)
      synthRef.current = kickSynth // Guarda o synth na Ref
      console.log("useEffect: Sintetizador de áudio (Tone.js) criado."); // Log de Depuração
    } catch (error) {
      console.error("Erro ao criar o sintetizador Tone.js:", error);
    }
    
    // --- Conectando Física e Áudio ---
    Events.on(engine, 'collisionStart', (event) => {
      // **LOG DE DEPURAÇÃO PRINCIPAL**
      console.log("--- Evento de Colisão Detectado! ---"); 
      
      const pairs = event.pairs
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]
        
        // Log para ver O QUE colidiu
        console.log("Colisão entre:", pair.bodyA.label, "e", pair.bodyB.label);

        // Verifica se um orbe colidiu com uma parede
        if ((pair.bodyA.label === 'orbe-ritmico' && pair.bodyB.label === 'parede') ||
            (pair.bodyA.label === 'parede' && pair.bodyB.label === 'orbe-ritmico')) {
          
          console.log("%cCOLISÃO DE ORBE-PAREDE CONFIRMADA!", "color: #00faff; font-weight: bold;"); // Log de Depuração

          const velocity = pair.collision.tangentImpulse * 0.1
          const volume = Math.min(Math.max(velocity, 0.3), 1.0)
          
          if (synthRef.current) {
            console.log(`Disparando som: volume ${volume}`); // Log de Depuração
            synthRef.current.triggerAttackRelease("C1", "8n", Tone.now(), volume)
          } else {
            console.warn("Colisão de orbe detectada, mas synthRef.current é nulo!");
          }
        }
      }
    })

    Engine.run(engine)
    Render.run(render)
    console.log("useEffect: Motor e Render iniciados."); // Log de Depuração

    // --- Função de Limpeza ---
    return () => {
      console.log("useEffect: Limpando...");
      Render.stop(render)
      World.clear(world)
      Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, []) // O array vazio [] garante que isso rode SÓ UMA VEZ

  // --- 3. Funções de Interação (Handlers) ---

  const handleStart = async () => {
    try {
      await Tone.start()
      setIsStarted(true)
      // **MENSAGEM IMPORTANTE**
      console.log("%cContexto de Áudio iniciado! (handleStart)", "color: green; font-weight: bold;");
    } catch (error) {
      console.error("Erro ao iniciar o Tone.start():", error);
    }
  }

  const handleCanvasClick = (e) => {
    if (!isStarted) {
      console.log("Clique no canvas ignorado (áudio não iniciado).");
      return
    }
    
    console.log("Criando Orbe em:", e.clientX, e.clientY); // Log de Depuração

    const orbe = Matter.Bodies.circle(
      e.clientX,
      e.clientY,
      20, // Raio
      {
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        label: 'orbe-ritmico', // Label é crucial
        render: {
          fillStyle: '#00faff',
          strokeStyle: '#ffffff',
          lineWidth: 2,
          shadowColor: '#00faff',
          shadowBlur: 20,
        }
      }
    )
    
    Matter.Body.setVelocity(orbe, { 
      x: (Math.random() - 0.5) * 10, 
      y: (Math.random() - 0.5) * 10
    })

    if (worldRef.current) {
      Matter.World.add(worldRef.current, orbe)
      console.log("Orbe adicionado ao mundo."); // Log de Depuração
    } else {
      console.warn("Clique no canvas, mas worldRef.current é nulo!");
    }
  }

  const handleClear = () => {
    console.log("Botão Limpar clicado.");
    if (worldRef.current) {
      const allBodies = Matter.World.bodies(worldRef.current)
      const orbes = allBodies.filter(body => body.label === 'orbe-ritmico')
      Matter.World.remove(worldRef.current, orbes)
      console.log(`${orbes.length} orbes removidos.`);
    }
  }

  // --- 4. O que será renderizado (JSX) ---
  return (
    <div className="App">
      
      <div 
        id="start-overlay" 
        className={isStarted ? 'hidden' : ''} 
        onClick={handleStart}
      >
        <h1>Synesthesia Studio</h1>
        <p>Clique para começar</p>
      </div>

      <div 
        id="canvas-container" 
        ref={sceneRef} 
        onClick={handleCanvasClick} 
      />

      <div className="toolbox">
        <button id="btn-limpar" onClick={handleClear}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M17 6H22V8H20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21H2V8H0V6H5V3C5 2.44772 5.44772 2 6 2H18C18.5523 2 19 2.44772 19 3V6H17ZM6 6V4H18V6H6ZM8 10V18H10V10H8ZM14 10V18H16V10H14Z"></path>
          </svg>
          Limpar
        </button>
      </div>

    </div>
  )
}

export default App