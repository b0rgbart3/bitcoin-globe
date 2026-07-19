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
import { BlockHeightOrbit } from "./scene/BlockHeightOrbit";

function blockRewardBTC(blockHeight: number): string {
  const era = BigInt(blockHeight) / 210_000n;
  const sats = 5_000_000_000n >> era;
  return (Number(sats) / 1e8).toString();
}

function remainingSatoshis(blockHeight: number): bigint {
  const HALVING_INTERVAL = 210_000n;
  const INITIAL_REWARD = 5_000_000_000n; // 50 BTC in satoshis
  const height = BigInt(blockHeight);
  const era = height / HALVING_INTERVAL;
  const currentReward = INITIAL_REWARD >> era;
  if (currentReward === 0n) return 0n;
  const blocksLeftInEra = (era + 1n) * HALVING_INTERVAL - height;
  let remaining = blocksLeftInEra * currentReward;
  let nextEra = era + 1n;
  while (true) {
    const reward = INITIAL_REWARD >> nextEra;
    if (reward === 0n) break;
    remaining += HALVING_INTERVAL * reward;
    nextEra += 1n;
  }
  return remaining;
}

function formatSats(sats: bigint): string {
  const n = Number(sats);
  if (n >= 1e12) return (n / 1e12).toFixed(1) + "T";
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  return n.toLocaleString();
}

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
  const [statsOpen, setStatsOpen] = useState(true);

  // Use whichever source has the higher value: snapshot updates continuously,
  // block fires immediately on confirmation but persists stale across reconnects.
  const chainHeight =
    Math.max(block?.height ?? 0, snapshot?.chainHeight ?? 0) || null;

  const satsLeftToMine = chainHeight ? remainingSatoshis(chainHeight) : null;

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
        <div className={`telemetry__body${statsOpen ? "" : " telemetry__body--hidden"}`}>
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
              value={(chainHeight ?? snapshot.chainHeight).toLocaleString()}
              label="height"
            />

            {chainHeight && (
              <Stat
                value={blockRewardBTC(chainHeight)}
                label="block reward BTC"
              />
            )}
            {block && (
              <Stat
                value={(block.sizeBytes / 1e6).toFixed(2)}
                label="last block MB"
              />
            )}

            {satsLeftToMine !== null && (
              <Stat
                value={formatSats(satsLeftToMine)}
                label="sats left to mine"
              />
            )}
            {satsLeftToMine !== null && (
              <Stat
                value={formatSats(satsLeftToMine / 100_000_000n)}
                label="BTC left to mine"
              />
            )}

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
      </div>

      <button
        className={`stats-btn${statsOpen ? " stats-btn--active" : ""}`}
        onClick={() => setStatsOpen((v) => !v)}
      >
        Stats
      </button>
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
        <BlockHeightOrbit chainHeight={chainHeight} />
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
