import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { LogicalSize } from "@tauri-apps/api/dpi";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { getCurrentWindow } from "@tauri-apps/api/window";
import Avatar from "./components/Avatar";
import "./App.css";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function App() {
  const [currentIndex, setCurrentIndex] = useState(11);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const appRef = useRef<HTMLElement | null>(null);

  const syncWindowToZoom = () => {
    const distance = controlsRef.current?.getDistance() ?? 3.8;
    const ratio = clamp(distance / 3.8, 0.58, 1.8);
    const width = Math.round(clamp(820 * ratio, 500, 1280));
    const height = Math.round(clamp(620 * ratio, 380, 980));

    try {
      const current = getCurrentWindow();
      void current.setSize(new LogicalSize(width, height));
    } catch {
      // Ignora em ambientes não-Tauri.
    }
  };

  useEffect(() => {
    const node = appRef.current;
    if (!node) return;

    const handleWheel = () => {
      window.requestAnimationFrame(syncWindowToZoom);
    };

    node.addEventListener("wheel", handleWheel, { passive: true });
    return () => node.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    syncWindowToZoom();
  }, [currentIndex]);

  return (
    <main ref={appRef} className="app">
      <Canvas
        camera={{ position: [0, 1.2, 3.8], fov: 30 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={1.3} />
        <directionalLight position={[3, 5, 4]} intensity={2} />
        <Suspense fallback={null}>
          <Avatar currentIndex={currentIndex} onExpressionChange={setCurrentIndex} />
        </Suspense>
        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          minDistance={2.2}
          maxDistance={8}
          minPolarAngle={Math.PI / 3}
          maxPolarAngle={Math.PI / 1.8}
          onChange={syncWindowToZoom}
        />
      </Canvas>
    </main>
  );
}

export default App;
