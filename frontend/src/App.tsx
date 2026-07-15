// frontend/src/App.tsx
import { Canvas } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { Globe } from "./scene/Globe";
import { Starfield } from "./scene/Starfield";
import { useNetworkSocket } from "./net/useNetworkSocket";
import "./App.scss";
import { pressureFromMempool } from "./scene/pressure";
import { Heartbeat } from "./scene/Heartbeat";
import { useEffect, useState } from "react";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function App() {
  const { snapshot, mempool, mempoolRef, block } = useNetworkSocket();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      if (block) setElapsed(Math.floor(Date.now() / 1000 - block.minedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [block]);

  return (
    <div className="app">
      <div className="telemetry">
        <div className="telemetry__title">Bitcoin Network · Live</div>
        {snapshot ? (
          <div className="telemetry__readout">
            {block && (
              <Stat
                value={`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}`}
                label="since block"
              />
            )}
            <Stat value={snapshot.located.length.toString()} label="located" />
            <Stat
              value={snapshot.unlocatableCount.toString()}
              label="unlocatable"
            />

            <Stat
              value={snapshot.chainHeight.toLocaleString()}
              label="height"
            />

            {mempool && (
              <Stat
                value={(mempool.pendingVBytes / 1e6).toFixed(1)}
                label="pending vMB"
              />
            )}
            {mempool && (
              <Stat
                value={Math.round(mempool.intakeVBytesPerSec).toString()}
                label="intake vB/s"
              />
            )}
            {mempool && (
              <Stat
                value={Math.round(
                  pressureFromMempool(mempool) * 100,
                ).toString()}
                label="pressure"
              />
            )}
          </div>
        ) : (
          <div className="telemetry__standby">awaiting first snapshot…</div>
        )}
      </div>

      <Canvas camera={{ position: [0, 0, 6.5], fov: 35 }}>
        <color attach="background" args={["#060a12"]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[4, 2, 3]} intensity={1.1} />
        <Starfield />
        <Globe snapshot={snapshot} mempoolRef={mempoolRef} />
        <Heartbeat block={block} radius={2} />
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.3}
            luminanceSmoothing={0.9}
            intensity={0.4}
            radius={0.4}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
