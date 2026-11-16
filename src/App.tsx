import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { invoke } from "@tauri-apps/api/core";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { MOUSE } from "three";
import Avatar from "./components/Avatar";
import ChatContainer from "./components/ChatContainer";
import QuickInput from "./components/QuickInput";
import SpeechBubble from "./components/SpeechBubble";
import type { ChatMessage } from "./components/ChatContainer";
import "./App.css";

const BASE_WIDTH = 280;
const BASE_HEIGHT = 280;
const CAMERA_FOV = 30;
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
  const [followMouse, setFollowMouse] = useState(false);
  const appRef = useRef<HTMLElement | null>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const mouseLookTarget = useRef({ x: 0, y: 0 });
  const lastRightClickRef = useRef(0);
  const lastFollowToggleRef = useRef(0);
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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.repeat) {
        invoke("exit_app").catch((err) =>
          console.error("Falha ao encerrar o software:", err),
        );
      } else if (event.key === "+" && !event.repeat) {
        setFollowMouse(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (followMouse) {
      controlsRef.current?.reset();
    }
  }, [followMouse]);

  useEffect(() => {
    if (!followMouse) return;

    const currentWindow = getCurrentWindow();
    let polling = false;
    const updateMouseTarget = () => {
      if (polling) return;
      polling = true;

      Promise.all([
        cursorPosition(),
        currentWindow.outerPosition(),
        currentWindow.innerSize(),
      ])
        .then(([cursor, position, size]) => {
          mouseLookTarget.current.x =
            ((cursor.x - position.x) / size.width) * 2 - 1;
          mouseLookTarget.current.y =
            1 - ((cursor.y - position.y) / size.height) * 2;
        })
        .catch((err) => console.error("Falha ao rastrear o cursor:", err))
        .finally(() => {
          polling = false;
        });
    };

    updateMouseTarget();
    const intervalId = window.setInterval(updateMouseTarget, 32);
    return () => window.clearInterval(intervalId);
  }, [followMouse]);

  return (
    <main ref={appRef} className="app">
      <Canvas
        camera={{ position: [0, 1.2, 3.8], fov: CAMERA_FOV }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        onClick={(event) => {
          if (event.detail >= 3) {
            setFollowMouse(true);
          }
        }}
        onPointerDown={(e) => {
          if (e.button === 0) {
            getCurrentWindow()
              .startDragging()
              .catch((err) => console.error("Falha ao arrastar janela:", err));
          }
          if (e.button === 2) {
            const now = performance.now();
            const isDoubleClick = now - lastRightClickRef.current <= 400;
            lastRightClickRef.current = isDoubleClick ? 0 : now;

            if (
              isDoubleClick &&
              now - lastFollowToggleRef.current >= 3000
            ) {
              lastFollowToggleRef.current = now;
              setFollowMouse((current) => !current);
            }
          }
        }}
        onContextMenu={(event) => event.nativeEvent.preventDefault()}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Avatar
            currentIndex={currentIndex}
            onExpressionChange={setCurrentIndex}
            followMouse={followMouse}
            mouseLookTarget={mouseLookTarget}
          />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          mouseButtons={{ RIGHT: MOUSE.ROTATE }}
          enablePan={false}
          enableZoom={false}
          enableRotate={!followMouse}
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
  if (windowLabel === "quick-input") {
    return <QuickInput />;
  }
  if (windowLabel === "speech" || windowLabel.startsWith("speech-")) {
    return <SpeechBubble />;
  }

  return <AvatarWindowView />;
}

export default App;