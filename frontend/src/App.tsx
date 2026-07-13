// ============================================================================
// frontend/src/App.tsx
// Canvas + Bloom + Starfield + Globe, with a monospace telemetry readout.
// Bloom is the "one risk": it turns the gold nodes into signal-fire.
// ============================================================================

import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Globe } from "./scene/Globe";
import { Starfield } from "./scene/Starfield";
import { useNodeSocket } from "./net/useNodeSocket";
import "./App.scss";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function App() {
  const snapshot = useNodeSocket();

  return (
    <div className="app">
      <div className="telemetry">
        <div className="telemetry__title">Bitcoin Network · Live</div>
        {snapshot ? (
          <div className="telemetry__readout">
            <Stat value={snapshot.located.length.toString()} label="located" />
            <Stat
              value={snapshot.unlocatableCount.toString()}
              label="unlocatable"
            />
            <Stat
              value={snapshot.chainHeight.toLocaleString()}
              label="height"
            />
          </div>
        ) : (
          <div className="telemetry__standby">awaiting first snapshot…</div>
        )}
      </div>

      <Canvas camera={{ position: [0, 5, 5], fov: 45 }}>
        <color attach="background" args={["#060a12"]} />
        <Starfield />
        <ambientLight intensity={0.25} />
        <directionalLight position={[4, 2, 3]} intensity={1.1} />
        <Globe snapshot={snapshot} />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.5}
            luminanceSmoothing={0.9}
            intensity={0.9}
            radius={0.7}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
