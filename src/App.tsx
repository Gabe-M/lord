import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { MOUSE } from "three";
import { LogicalSize } from "@tauri-apps/api/dpi";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Avatar from "./components/Avatar";
import "./App.css";

const BASE_WIDTH = 360;
const BASE_HEIGHT = 360;
const MIN_SCALE = 0.6; // 216x216 (minWidth / minHeight do tauri.conf.json)
const MAX_SCALE = 1.6; // 576x576 (maxWidth / maxHeight do tauri.conf.json)

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function App() {
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
      // deltaY < 0 (scroll para cima) aumenta a janela; deltaY > 0 diminui
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

export default App;