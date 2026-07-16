// ============================================================================
// frontend/src/scene/TransactionStream.tsx
// Live transaction arrivals as drifting motes.
//
// HONESTY NOTES:
//  - Transactions have NO geography, so motes live in the abstract volume
//    between globe and halo. Their positions are meaningless by construction.
//  - This shows ARRIVALS ("each transaction as it enters"), not the ~250k
//    pending mempool. A complete claim about a real thing, rather than a
//    partial claim about everything.
//  - Encoding is the treemap grammar: size <- vsize, color <- feerate.
//    `value` (sats moved) is NEVER encoded — it decides nothing about whether
//    a transaction gets mined, so it decides nothing visual here either.
// ============================================================================

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Block, Tx } from "@btcglobe/shared/types";

const MAX_MOTES = 3000; // ring buffer; ~4/s * 15s life leaves plenty of room
// const LIFE = 24; // seconds a mote lives

const FADE_OUT = 4.0;
const HARVEST_FADE = 1.6; // how long a confirmed mote takes to wink out
const FADE_IN = 0.6;

const R_MIN = 2.55; // just outside the atmosphere
const R_MAX = 2.85; // just inside the halo band

// Feerate -> color. Log scale: feerates span ~1 to 1000+ sat/vB, and the
// interesting variation is at the low end.
const COOL = new THREE.Color("#0ed8e3"); // low feerate — patient, cheap
const MID = new THREE.Color("#09e0e0"); // mid — matches the node hue
const HOT = new THREE.Color("#20bcff"); // high feerate — urgent, paying up
const tmpSize = new THREE.Vector2();

function feerateColor(rate: number, out: THREE.Color): THREE.Color {
  const t = THREE.MathUtils.clamp(
    Math.log(Math.max(rate, 1)) / Math.log(120),
    0,
    1,
  );
  return t < 0.5
    ? out.copy(COOL).lerp(MID, t * 2)
    : out.copy(MID).lerp(HOT, (t - 0.5) * 2);
}

// vsize -> point size. sqrt so a 10x bigger tx isn't a 10x bigger dot.
function vsizeToSize(vsize: number, base: number): number {
  return base * THREE.MathUtils.clamp(Math.sqrt(vsize / 200), 0.55, 3.2);
}

interface Mote {
  born: number;
  pos: THREE.Vector3;
  axis: THREE.Vector3;
  speed: number;
  size: number;
  color: THREE.Color;
  feerate: number; // decides its fate at the next block
  harvestedAt: number | null; // set when a block confirms it
}

export function TransactionStream({
  txQueueRef,
  baseSize = 0.05,
  opacity = 0.9,
  block,
}: {
  txQueueRef: MutableRefObject<Tx[]>;
  baseSize?: number;
  opacity?: number;
  block: Block | null; // used to harvest motes that were included in the block
}) {
  const motes = useRef<Mote[]>([]);
  const cursor = useRef(0);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const lastHash = useRef<string | null>(null);
  const pendingHarvest = useRef<number | null>(null);

  useEffect(() => {
    if (!block || block.hash === lastHash.current) return;
    lastHash.current = block.hash;
    // The lowest feerate that made it into this block. Miners fill greedily by
    // feerate, so motes at or above this were (very likely) included.
    pendingHarvest.current = block.feeRange[0] ?? 0;
  }, [block]);

  const { positions, colors, sizes, alphas, texture } = useMemo(() => {
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
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    return {
      positions: new Float32Array(MAX_MOTES * 3),
      colors: new Float32Array(MAX_MOTES * 3),
      sizes: new Float32Array(MAX_MOTES),
      alphas: new Float32Array(MAX_MOTES),
      texture: new THREE.CanvasTexture(c),
    };
  }, []);

  // Per-point size + color + alpha needs a custom shader; PointsMaterial only
  // supports one size for the whole cloud.
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uTex: { value: texture },
          uOpacity: { value: opacity },
          uScale: { value: 300 },
        },
        vertexShader: `
          attribute float aSize;
          attribute float aAlpha;
          varying vec3 vColor;
          varying float vAlpha;
          uniform float uScale;
          void main() {
            vColor = color;
            vAlpha = aAlpha;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = aSize * uScale / -mv.z;
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform sampler2D uTex;
          uniform float uOpacity;
          varying vec3 vColor;
          varying float vAlpha;
          void main() {
            vec4 t = texture2D(uTex, gl_PointCoord);
            gl_FragColor = vec4(vColor, 1.0) * t.a * vAlpha * uOpacity;
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexColors: true,
      }),
    [texture, opacity],
  );

  useFrame((state, dt) => {
    material.uniforms.uScale.value =
      state.gl.getDrawingBufferSize(tmpSize).height * 0.5;
    const now = state.clock.elapsedTime;

    // 1. Drain arrivals -> spawn one mote per real transaction.
    const queue = txQueueRef.current;
    if (queue.length) {
      for (const tx of queue) {
        const dir = new THREE.Vector3().randomDirection();
        const r = R_MIN + Math.random() * (R_MAX - R_MIN);
        const m: Mote = {
          born: now,
          pos: dir.multiplyScalar(r),
          axis: new THREE.Vector3().randomDirection(),
          speed: 0.24 + Math.random() * 0.05,
          size: vsizeToSize(tx.vsize, baseSize),
          color: feerateColor(tx.feerate, new THREE.Color()),
        };
        motes.current[cursor.current] = m;
        cursor.current = (cursor.current + 1) % MAX_MOTES;
      }
      // if (queue.length) console.log("[stream] spawning", queue.length, "motes");
      queue.length = 0; // consumed
    }

    // 2. Advance + write buffers.
    for (let i = 0; i < MAX_MOTES; i++) {
      const m = motes.current[i];
      const age = m ? now - m.born : Infinity;

      if (!m || age > LIFE) {
        alphas[i] = 0;
        continue;
      }
      // Slow orbital drift — motion without implied direction.
      m.pos.applyAxisAngle(m.axis, m.speed * dt);

      const fadeIn = Math.min(age / FADE_IN, 1);
      const fadeOut = Math.min((LIFE - age) / FADE_OUT, 1);
      alphas[i] = fadeIn * fadeOut;
      sizes[i] = m.size;
      positions[i * 3] = m.pos.x;
      positions[i * 3 + 1] = m.pos.y;
      positions[i * 3 + 2] = m.pos.z;
      colors[i * 3] = m.color.r;
      colors[i * 3 + 1] = m.color.g;
      colors[i * 3 + 2] = m.color.b;
    }

    const geom = geomRef.current;
    if (geom) {
      geom.attributes.position.needsUpdate = true;
      geom.attributes.color.needsUpdate = true;
      geom.attributes.aSize.needsUpdate = true;
      geom.attributes.aAlpha.needsUpdate = true;
    }
  });

  return (
    <points material={material}>
      <bufferGeometry ref={geomRef}>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aAlpha" args={[alphas, 1]} />
      </bufferGeometry>
    </points>
  );
}
