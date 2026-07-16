// ============================================================================
// frontend/src/scene/Globe.tsx
// The network body: lit silhouette globe, coastlines, graticule, the dynamic
// (mempool-driven) atmosphere, and the glowing nodes.
// Values marked // tune are the ones you've been adjusting by feel.
// ============================================================================

import { useMemo, useRef, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Coastlines } from "./Coastlines";
import { Atmosphere } from "./Atmosphere";
import type { NodeSnapshot, MempoolState, Block } from "@btcglobe/shared/types";
import { pulseProgress } from "./blockPulse"; // new
import { PULSE_DURATION } from "./Heartbeat";
import { UnlocatableHalo } from "./UnlocatableHalo";
import { TransactionStream } from "./TransactionStream";
import { latLngToVec3 } from "./geo";

const GLOBE_RADIUS = 1.8;
const NODE_RADIUS = GLOBE_RADIUS * 1.01;
const NODE_BASE_SIZE = 0.05; // resting size (your tuned value)
const FLARE_SIZE_GAIN = 2.1; // how much bigger at peak flare
const FLARE_COLOR = new THREE.Color("#33f7e3"); // hot white-gold at peak
const BASE_COLOR = new THREE.Color("#29735d"); // resting gold (your tuned value)
// Fast attack, slow decay — a flash, not a swell.
const FLARE_ATTACK = 0.025; // fraction of the pulse spent rising to peak

// Soft radial sprite so each node is a glow, not a hard square.
function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.75)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function Nodes({ located }: { located: NodeSnapshot["located"] }) {
  const glow = useMemo(makeGlowTexture, []);
  const matRef = useRef<THREE.PointsMaterial>(null);

  const positions = useMemo(() => {
    const arr = new Float32Array(located.length * 3);
    located.forEach((n, i) => {
      const p = latLngToVec3(n.lat, n.lng, NODE_RADIUS);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, [located]);

  // The flare: on each block pulse the nodes bloom hot and settle back.
  // Reads the SAME clock as the shockwave, so they fire together — which is
  // what makes the wave read as emanating from the network, not the Earth.
  useFrame((state) => {
    const mat = matRef.current;
    if (!mat) return;

    const p = pulseProgress(state.clock.elapsedTime, PULSE_DURATION);
    if (p === null) {
      mat.size = NODE_BASE_SIZE;
      mat.color.copy(BASE_COLOR);
      return;
    }

    // inside useFrame:
    const env =
      p < FLARE_ATTACK
        ? p / FLARE_ATTACK
        : Math.pow(1 - (p - FLARE_ATTACK) / (1 - FLARE_ATTACK), 2);

    mat.size = NODE_BASE_SIZE * (1 + (FLARE_SIZE_GAIN - 1) * env);
    mat.color.copy(BASE_COLOR).lerp(FLARE_COLOR, env);
  });

  return (
    <points key={positions.length}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={matRef}
        map={glow}
        color={BASE_COLOR}
        size={NODE_BASE_SIZE}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Faint lat/long rings: structure + orientation, kept quieter than the coastlines.
function Graticule({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = 96;
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = ((90 - lat) * Math.PI) / 180;
      const rr = radius * Math.sin(phi);
      const y = radius * Math.cos(phi);
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(rr * Math.cos(a0), y, rr * Math.sin(a0)));
        pts.push(new THREE.Vector3(rr * Math.cos(a1), y, rr * Math.sin(a1)));
      }
    }
    for (let lng = 0; lng < 180; lng += 30) {
      const t = (lng * Math.PI) / 180;
      for (let i = 0; i < segs; i++) {
        const p0 = (i / segs) * Math.PI * 2;
        const p1 = ((i + 1) / segs) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            radius * Math.sin(p0) * Math.cos(t),
            radius * Math.cos(p0),
            radius * Math.sin(p0) * Math.sin(t),
          ),
          new THREE.Vector3(
            radius * Math.sin(p1) * Math.cos(t),
            radius * Math.cos(p1),
            radius * Math.sin(p1) * Math.sin(t),
          ),
        );
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#21344a" transparent opacity={0.85} />{" "}
      {/* tune: graticule color/opacity */}
    </lineSegments>
  );
}

export function Globe({
  snapshot,
  mempoolRef,
  txQueueRef,
  block,
}: {
  snapshot: NodeSnapshot | null;
  mempoolRef: MutableRefObject<MempoolState | null>;
  txQueueRef: MutableRefObject<Tx[]>;
  block: Block | null;
}) {
  return (
    <group>
      {/* dark, light-reactive body — shows the terminator as it rotates */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#0d1826"
          roughness={1}
          metalness={0}
        />{" "}
        {/* tune: body color */}
      </mesh>

      <Coastlines radius={GLOBE_RADIUS * 1.003} color="#1eacc5" opacity={0.7} />

      <Graticule radius={GLOBE_RADIUS * 1.002} />

      {/* dynamic atmosphere — breathes with live mempool pressure */}
      <Atmosphere
        mempoolRef={mempoolRef}
        radius={
          GLOBE_RADIUS
        } /* color="#3b6a8c" exponent={3.5} baseStrength={0.35} maxStrength={0.95} */
      />

      {snapshot && <Nodes located={snapshot.located} />}
      {snapshot && <UnlocatableHalo count={snapshot.unlocatableCount} />}
      <TransactionStream
        txQueueRef={txQueueRef}
        baseSize={0.149}
        block={block}
      />

      <OrbitControls
        enablePan={false}
        minDistance={4.5}
        maxDistance={12}
        autoRotate
        autoRotateSpeed={0.3}
        zoomSpeed={0.08} /* default is 1.0 — lower = slower */
      />
    </group>
  );
}
