import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { MOUSE } from "three";
import Avatar from "./components/Avatar";
import ChatContainer from "./components/ChatContainer";
import type { ChatMessage } from "./components/ChatContainer";
import "./App.css";

const BASE_WIDTH = 280;
const BASE_HEIGHT = 280;
const MIN_SCALE = 0.55;
const MAX_SCALE = 2.2;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function ChatWindowView() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const handleSendMessage = (content: string) => {
    const newUserMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    setMessages((prev) => [...prev, newUserMsg]);

    setTimeout(() => {
      const newLordMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "COMANDO RECEBIDO. PROCESSANDO DIRETRIZES...\n[SISTEMA OK]",
      };
      setMessages((prev) => [...prev, newLordMsg]);
    }, 600);
  };

  return (
    <main className="app crt-overlay">
      <ChatContainer messages={messages} onSend={handleSendMessage} />
    </main>
  );
}

function AvatarWindowView() {
  const [currentIndex, setCurrentIndex] = useState(11);
  const appRef = useRef<HTMLElement | null>(null);
  const scaleRef = useRef(1.0);
  const lastSizeRef = useRef({ width: BASE_WIDTH, height: BASE_HEIGHT });

  const applyWindowScale = (nextScale: number) => {
    const clampedScale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
    scaleRef.current = clampedScale;

    const width = Math.round(BASE_WIDTH * clampedScale);
    const height = Math.round(BASE_HEIGHT * clampedScale);

    if (
      width === lastSizeRef.current.width &&
      height === lastSizeRef.current.height
    ) {
      return;
    }

    lastSizeRef.current = { width, height };

    getCurrentWindow()
      .setSize(new LogicalSize(width, height))
      .catch((err) => console.error("Falha ao redimensionar janela:", err));
  };

  useEffect(() => {
    const node = appRef.current;
    if (!node) return;

    const handleWheel = (event: WheelEvent) => {
      const step = event.deltaY < 0 ? 0.06 : -0.06;
      window.requestAnimationFrame(() => {
        applyWindowScale(scaleRef.current + step);
      });
    };

    node.addEventListener("wheel", handleWheel, { passive: true });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  return (
    <main ref={appRef} className="app">
      <Canvas
        camera={{ position: [0, 1.2, 3.8], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onPointerDown={(e) => {
          if (e.button === 0) {
            getCurrentWindow()
              .startDragging()
              .catch((err) => console.error("Falha ao arrastar janela:", err));
          }
        }}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Avatar currentIndex={currentIndex} onExpressionChange={setCurrentIndex} />
        </Suspense>
        <OrbitControls
          mouseButtons={{ RIGHT: MOUSE.ROTATE }}
          enablePan={false}
          enableZoom={false}
          enableDamping
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
        />
      </Canvas>
    </main>
  );
}

function App() {
  const [windowLabel] = useState(() => {
    try {
      return getCurrentWindow().label;
    } catch {
      return "main";
    }
  });

  if (windowLabel === "chat") {
    return <ChatWindowView />;
  }

  return <AvatarWindowView />;
}

export default App;