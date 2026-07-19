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
import { SunLight } from "./scene/SunLight";
import { Moon } from "./scene/Moon";
import { ISS } from "./scene/ISS";
import { AboutModal } from "./AboutModal";

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="stat">
      <span className="stat__value">{value}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function App() {
  const {
    snapshot,
    mempool,
    mempoolRef,
    block,
    txQueueRef,
    txStats,
    connected,
  } = useNetworkSocket();
  const [elapsed, setElapsed] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    const id = setInterval(() => {
      if (block) setElapsed(Math.floor(Date.now() / 1000 - block.minedAt));
    }, 1000);
    return () => clearInterval(id);
  }, [block]);

  return (
    <div className="app">
      <div className="telemetry">
        <div className="telemetry__title">
          Bitcoin Network{" "}
          <span
            className={
              connected
                ? "telemetry__status--live"
                : "telemetry__status--offline"
            }
          >
            · {connected ? "Live" : "Offline"}
          </span>
        </div>
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
            {txStats && (
              <Stat value={txStats.medianFeerate.toFixed(1)} label="sat/vB" />
            )}
            {txStats && (
              <Stat
                value={txStats.sinceBlock.toLocaleString()}
                label="TXs in block"
              />
            )}
            {txStats && <Stat value={txStats.rate.toFixed(1)} label="tx/s" />}
          </div>
        ) : (
          <div className="telemetry__standby">
            {connected
              ? "awaiting first snapshot…"
              : "live feed unavailable · reconnecting…"}
          </div>
        )}
      </div>

      <button className="about-btn" onClick={() => setAboutOpen(true)}>
        About
      </button>

      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}

      <Canvas camera={{ position: [0, 0, 8.5], fov: 35 }}>
        <color attach="background" args={["#060a12"]} />
        <ambientLight color="#8ab4d4" intensity={0.3} />
        <SunLight />
        {/* <directionalLight position={[4, 2, 3]} intensity={1.1} /> */}
        <Moon />
        <ISS />
        <Starfield />
        <Globe
          snapshot={snapshot}
          mempoolRef={mempoolRef}
          txQueueRef={txQueueRef}
          block={block}
        />
        <Heartbeat block={block} radius={2} /> /* pulse the globe on each new
        block */
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
