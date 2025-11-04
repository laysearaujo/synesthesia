import { useState, useEffect, useRef } from 'react'
import * as Tone from 'tone'
import Matter from 'matter-js'

// Importa nosso CSS
import './index.css'

function App() {
  const sceneRef = useRef(null)
  const engineRef = useRef(null)
  const worldRef = useRef(null)
  const runnerRef = useRef(null)
  const synthRef = useRef(null)
  const [isStarted, setIsStarted] = useState(false)

  useEffect(() => {
    console.log("useEffect: Montando componente...")

    // --- Configuração da Física (Matter.js) ---
    const Engine = Matter.Engine
    const Render = Matter.Render
    const World = Matter.World
    const Bodies = Matter.Bodies
    const Body = Matter.Body
    const Events = Matter.Events
    const Runner = Matter.Runner 

    const engine = Engine.create()
    engine.world.gravity.y = 0
    const world = engine.world

    const render = Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false,
        background: 'transparent'
      }
    })

    const runner = Runner.create()
    runnerRef.current = runner 

    engineRef.current = engine
    worldRef.current = world

    // Cria as paredes invisíveis
    const wallOptions = {
      isStatic: true,
      restitution: 1,
      friction: 0,
      render: { fillStyle: 'transparent' },
      label: 'parede'
    }
    World.add(world, [
      Bodies.rectangle(window.innerWidth / 2, -10, window.innerWidth, 20, wallOptions),
      Bodies.rectangle(window.innerWidth / 2, window.innerHeight + 10, window.innerWidth, 20, wallOptions),
      Bodies.rectangle(-10, window.innerHeight / 2, 20, window.innerHeight, wallOptions),
      Bodies.rectangle(window.innerWidth + 10, window.innerHeight / 2, 20, window.innerHeight, wallOptions)
    ])
    console.log("useEffect: Motor de física e paredes criados.");

    // --- Configuração do Áudio (Tone.js) ---
    try {
      const kickSynth = new Tone.MembraneSynth({
        octaves: 5,
        pitchDecay: 0.05
      }).toDestination()
      const reverb = new Tone.Reverb(1.5).toDestination()
      kickSynth.connect(reverb)
      synthRef.current = kickSynth
      console.log("useEffect: Sintetizador de áudio (Tone.js) criado.");
    } catch (error) {
      console.error("Erro ao criar o sintetizador Tone.js:", error);
    }
    
    // --- Conectando Física e Áudio ---
    Events.on(engine, 'collisionStart', (event) => {
      const pairs = event.pairs
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i]

        if ((pair.bodyA.label === 'orbe-ritmico' && pair.bodyB.label === 'parede') ||
            (pair.bodyA.label === 'parede' && pair.bodyB.label === 'orbe-ritmico')) {
          
          console.log("%cCOLISÃO DE ORBE-PAREDE CONFIRMADA!", "color: #00faff; font-weight: bold;");

          // --- INÍCIO DA CORREÇÃO ---
          
          // 1. Tenta pegar o impulso. 'normalImpulse' é mais confiável.
          let impulse = pair.collision.normalImpulse;
          
          // 2. Se for inválido (undefined, 0), usa 'tangentImpulse' como alternativa.
          if (!impulse) {
            impulse = pair.collision.tangentImpulse;
          }

          // 3. Calcula a velocidade (e dá um valor padrão 1 se o impulso ainda for inválido)
          const velocity = (impulse || 1) * 0.1; 

          // 4. Calcula o volume final
          let finalVolume = Math.min(Math.max(velocity, 0.3), 1.0);
          
          // 5. Failsafe definitivo: Se o cálculo AINDA ASSIM der NaN, usa 0.5
          if (isNaN(finalVolume)) {
            finalVolume = 0.5;
            console.warn("Cálculo de volume falhou, usando volume padrão 0.5");
          }
          
          console.log(`Disparando som: volume ${finalVolume}`); // Log corrigido
          
          // --- FIM DA CORREÇÃO ---

          if (synthRef.current) {
            // Passa o 'finalVolume' seguro para o Tone.js
            synthRef.current.triggerAttackRelease("C1", "8n", Tone.now(), finalVolume)
          } else {
            console.warn("Colisão de orbe detectada, mas synthRef.current é nulo!");
          }
        }
      }
    })

    Runner.run(runner, engine)
    Render.run(render)
    console.log("useEffect: Runner e Render iniciados.");

    // --- Função de Limpeza ---
    return () => {
      console.log("useEffect: Limpando...");
      Runner.stop(runnerRef.current)
      Render.stop(render)
      World.clear(world)
      Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, []) 

  // --- 3. Funções de Interação (Handlers) ---

  const handleStart = async () => {
    try {
      await Tone.start()
      setIsStarted(true)
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
    console.log("Criando Orbe em:", e.clientX, e.clientY);

    const orbe = Matter.Bodies.circle(
      e.clientX,
      e.clientY,
      20,
      {
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        label: 'orbe-ritmico',
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
      console.log("Orbe adicionado ao mundo.");
    } else {
      console.warn("Clique no canvas, mas worldRef.current é nulo!");
    }
  }

  // --- FUNÇÃO CORRIGIDA ---
  const handleClear = () => {
    console.log("Botão Limpar clicado.");
    if (worldRef.current) {
      // Esta é a função correta:
      // Ela remove todos os corpos do mundo,
      // mas o 'true' (keepStatic) mantém as paredes.
      Matter.World.clear(worldRef.current, true);
      console.log("Todos os orbes removidos.");
    }
  }
  // --- FIM DA CORREÇÃO ---

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