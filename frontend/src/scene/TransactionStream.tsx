// ============================================================================
// frontend/src/scene/TransactionStream.tsx
// Live transaction arrivals as motes that live until a block confirms them.
//
// HONESTY NOTES:
//  - Transactions have NO geography, so motes live in the abstract volume
//    between globe and halo. Their positions are meaningless by construction.
//  - Encoding is the treemap grammar: size <- vsize, color <- feerate.
//    `value` (sats moved) is NEVER encoded — it decides nothing about whether a
//    transaction gets mined, so it decides nothing visual here.
//  - A mote dies when a block CONFIRMS it, not on a timer. Fate is decided by
//    real data: block.feeRange[0] is the lowest feerate that made it in, and
//    miners fill greedily by feerate, so motes at/above that were included.
//  - LIMITS: the feed is a rolling window (we may miss arrivals during bursts),
//    feeRange[0] is an approximation (CPFP/package relay/RBF blur it), and
//    MAX_MOTES caps the swarm — so this UNDERSTATES the true ~250k backlog.
//    It is a window on arrivals, never the whole mempool.
// ============================================================================

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Tx, Block, MempoolState } from "@btcglobe/shared/types";

const MAX_MOTES = 3000; // ~14 min of arrivals at ~3.5/s
const FADE_IN = 0.6; // seconds to appear
const HARVEST_FADE = 2.6; // seconds to flare and wink out once confirmed
const R_INNER = 2.35; // high feerate — next in line
const R_OUTER = 3.0; // low feerate — waiting

// Feerate -> color, log scale (feerates span ~1 to 1000+ sat/vB).
const COOL = new THREE.Color("#7be6fb"); // low feerate — deep, dim, receding
const MID = new THREE.Color("#04a3ff"); // mid — your blue, unchanged
const HOT = new THREE.Color("#636bff"); // high feerate — electric, advancing

// Feerate -> orbital radius. Distance from the globe IS distance from being
// mined. Normalized against the LIVE fee ladder, so "inner = next block" stays
// true as fee conditions change rather than being an arbitrary fixed scale.
function radiusForFeerate(feerate: number, m: MempoolState | null): number {
  const lo = Math.max(m?.fees.minimum ?? 1, 0.1);
  const hi = Math.max(m?.fees.fastest ?? 50, lo * 2);
  const t = THREE.MathUtils.clamp(
    (Math.log(Math.max(feerate, lo)) - Math.log(lo)) /
      (Math.log(hi) - Math.log(lo)),
    0,
    1,
  );
  return R_OUTER - (R_OUTER - R_INNER) * t;
}

function feerateColor(rate: number, out: THREE.Color): THREE.Color {
  const t = THREE.MathUtils.clamp(
    Math.log(Math.max(rate, 1)) / Math.log(120),
    0,
    1,
  );
  const fColor =
    t < 0.5
      ? out.copy(COOL).lerp(MID, t * 2)
      : out.copy(MID).lerp(HOT, (t - 0.5) * 2);

  // console.log("fColor: ", fColor);
  return fColor;
}

// vsize -> point size. sqrt so a 10x bigger tx isn't a 10x bigger dot.
function vsizeToSize(vsize: number, base: number): number {
  return base * THREE.MathUtils.clamp(Math.sqrt(vsize / 200), 0.55, 3.2);
}

interface Mote {
  born: number;
  pos: THREE.Vector3;
  axis: THREE.Vector3; // drift axis — motion without implied direction
  speed: number;
  size: number;
  color: THREE.Color;
  feerate: number; // decides its fate at the next block
  harvestedAt: number | null; // set when a block confirms it
  logFeerate: number;
}

const tmpSize = new THREE.Vector2();

export function TransactionStream({
  txQueueRef,
  mempoolRef,
  block,
  baseSize = 0.1,
  opacity = 0.9,
}: {
  txQueueRef: MutableRefObject<Tx[]>;
  mempoolRef: MutableRefObject<MempoolState | null>;
  block: Block | null;
  baseSize?: number;
  opacity?: number;
}) {
  const motes = useRef<(Mote | undefined)[]>(
    new Array(MAX_MOTES).fill(undefined),
  );
  const cursor = useRef(0);
  const geomRef = useRef<THREE.BufferGeometry>(null);
  const lastHash = useRef<string | null>(null);
  const pendingHarvest = useRef<number | null>(null);

  const { positions, colors, sizes, alphas, texture } = useMemo(() => {
    const s = 64;
    const c = document.createElement("canvas");
    c.width = c.height = s;
    const ctx = c.getContext("2d")!;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.4, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
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
          uScale: { value: 300 }, // overwritten every frame in useFrame
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

  // A new block confirms every pending tx at or above its lowest included feerate.
  useEffect(() => {
    if (!block) return;
    if (lastHash.current === null) {
      // First block on connect is the server's current-state snapshot, not a new event.
      lastHash.current = block.hash;
      return;
    }
    if (block.hash === lastHash.current) return;
    lastHash.current = block.hash;
    pendingHarvest.current = block.feeRange[0] ?? 0;
  }, [block]);

  useFrame((state, dt) => {
    const now = state.clock.elapsedTime;

    // Match Three's own size attenuation so baseSize is comparable to node size.
    material.uniforms.uScale.value =
      state.gl.getDrawingBufferSize(tmpSize).height * 0.5;

    // The live fee ladder — needed by BOTH spawning and the per-frame radius
    // tracking, so it lives at the top of the frame, not inside the drain block.
    const mp = mempoolRef.current;
    const lo = Math.max(mp?.fees.minimum ?? 1, 0.1);
    const hi = Math.max(mp?.fees.fastest ?? 50, lo * 2);
    const logLo = Math.log(lo);
    const logSpan = Math.log(hi) - logLo;

    // 1. Drain arrivals -> one mote per real transaction.
    const queue = txQueueRef.current;
    if (queue.length) {
      for (const tx of queue) {
        const r = radiusForFeerate(tx.feerate, mp);
        motes.current[cursor.current] = {
          born: now,
          pos: new THREE.Vector3().randomDirection().multiplyScalar(r),
          // Fully random orbital plane: for every mote circling one way there's a
          // statistically equal one circling the other, so the cloud has NO net
          // direction. The axis carries no information — the RADIUS does.
          axis: new THREE.Vector3().randomDirection(),
          speed: 0.07 * Math.pow(R_OUTER / r, 0.5), // <-- keep your reduced value
          size: vsizeToSize(tx.vsize, baseSize),
          color: feerateColor(tx.feerate, new THREE.Color()),
          feerate: tx.feerate,
          logFeerate: Math.log(Math.max(tx.feerate, 0.1)),
          harvestedAt: null,
        };
        cursor.current = (cursor.current + 1) % MAX_MOTES;
      }
      queue.length = 0;
    }

    // 2. A block landed -> mark everything it (very likely) included.
    if (pendingHarvest.current !== null) {
      const cutoff = pendingHarvest.current;
      for (const m of motes.current) {
        if (m && m.harvestedAt === null && m.feerate >= cutoff)
          m.harvestedAt = now;
      }
      pendingHarvest.current = null;
    }

    // 3. Advance + write buffers.
    for (let i = 0; i < MAX_MOTES; i++) {
      const m = motes.current[i];
      if (i < 5 && m && Math.random() < 0.01) {
        // console.log(
        //   `fee ${m.feerate.toFixed(1)}  logF ${m.logFeerate.toFixed(2)}  r ${m.pos.length().toFixed(2)}  ladder[${logLo.toFixed(2)}..${(logLo + logSpan).toFixed(2)}]`,
        // );
      }

      if (!m) {
        alphas[i] = 0;
        continue;
      }

      if (m.harvestedAt !== null) {
        const h = (now - m.harvestedAt) / HARVEST_FADE;
        if (h >= 1) {
          motes.current[i] = undefined; // confirmed and gone
          alphas[i] = 0;
          continue;
        }
        alphas[i] = 1 - h; // flare, then out
        sizes[i] = m.size * (1 + 1.6 * Math.pow(1 - h, 3));
      } else {
        alphas[i] = Math.min((now - m.born) / FADE_IN, 1); // pending: holds its bid
        sizes[i] = m.size;
      }

      m.pos.applyAxisAngle(m.axis, m.speed * dt);

      // Radius tracks the LIVE fee ladder: your feerate is fixed, but your position
      // in the auction is not. Damped, so shells drift rather than snap.
      const t = THREE.MathUtils.clamp((m.logFeerate - logLo) / logSpan, 0, 1);
      const targetR = R_OUTER - (R_OUTER - R_INNER) * t;
      m.pos.setLength(THREE.MathUtils.damp(m.pos.length(), targetR, 0.6, dt));

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
