// ============================================================================
// frontend/src/scene/UnlocatableHalo.tsx
// The unlocatable network: one point per Tor node, in an orbital band around
// the globe. These nodes are real and reachable but have no coordinates, so the
// band is deliberately OFF-GLOBE and uniformly random — any position on it is
// meaningless by design, which is the honest way to show "we know they exist,
// we don't know where."
//
// It drifts on its own axis (not locked to Earth's rotation) to reinforce that
// it isn't geography, and it flares with the block pulse because these nodes
// receive the block too.
// ============================================================================

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { pulseProgress } from "./blockPulse";
import { PULSE_DURATION } from "./Heartbeat";

// Deterministic PRNG so the band doesn't reshuffle on every render.
function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeSoftTexture(): THREE.Texture {
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
  g.addColorStop(0.35, "rgba(255,255,255,0.6)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

const FLARE_ATTACK = 0.06;

export function UnlocatableHalo({
  count,
  bandRadius = 3.2, // distance from globe centre — keep clear of the atmosphere
  tubeSigma = 0.38, // thickness (gaussian, so the band has no hard edge)
  tilt = 0.32, // radians — a tilted band reads as orbital, not equatorial
  tiltDrift = 0.28,
  tiltDriftSpeed = 0.01,
  size = 0.045,
  baseColor = "#429785",
  flareColor = "#9bfddf",
  flareSizeGain = 1.7,
  driftSpeed = 0.01, // its own slow rotation, independent of the globe
}: {
  count: number;
  bandRadius?: number;
  tubeSigma?: number;
  tilt?: number;
  tiltDrift?: number;
  tiltDriftSpeed?: number;
  size?: number;
  baseColor?: string;
  flareColor?: string;
  flareSizeGain?: number;
  driftSpeed?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.PointsMaterial>(null);
  const tex = useMemo(makeSoftTexture, []);

  const base = useMemo(() => new THREE.Color(baseColor), [baseColor]);
  const flare = useMemo(() => new THREE.Color(flareColor), [flareColor]);

  const positions = useMemo(() => {
    const rng = makeRng(1337);
    const gauss = () => {
      const u = 1 - rng(),
        v = rng();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };

    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      // Uniform around the band: no angle means anything.
      const theta = rng() * Math.PI * 2;
      // Gaussian across the tube cross-section: soft, edgeless band.
      const tubeAngle = rng() * Math.PI * 2;
      const tubeR = Math.abs(gauss()) * tubeSigma;
      const r = bandRadius + tubeR * Math.cos(tubeAngle);

      arr[i * 3] = r * Math.cos(theta);
      arr[i * 3 + 1] = tubeR * Math.sin(tubeAngle);
      arr[i * 3 + 2] = r * Math.sin(theta);
    }
    return arr;
  }, [count, bandRadius, tubeSigma]);

  useFrame((state, dt) => {
    const g = groupRef.current;
    if (g) {
      const t = state.clock.elapsedTime;
      g.rotation.y += dt * driftSpeed;
      // The band's axis wanders — no fixed frame, no implied geography.
      // The 0.73 ratio keeps the two axes out of phase so the motion never loops.
      g.rotation.x = tilt + Math.sin(t * tiltDriftSpeed) * 12 * tiltDrift;
      g.rotation.z =
        tilt * 0.5 + Math.cos(t * tiltDriftSpeed * 0.73) * tiltDrift;
    }

    const mat = matRef.current;
    if (!mat) return;

    const p = pulseProgress(state.clock.elapsedTime, PULSE_DURATION);
    if (p === null) {
      mat.size = size;
      mat.color.copy(base);
      return;
    }
    const env =
      p < FLARE_ATTACK
        ? p / FLARE_ATTACK
        : Math.pow(1 - (p - FLARE_ATTACK) / (1 - FLARE_ATTACK), 2);
    mat.size = size * (1 + (flareSizeGain - 1) * env);
    mat.color.copy(base).lerp(flare, env);
  });

  if (count <= 0) return null;

  return (
    <group ref={groupRef}>
      <points key={count}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          ref={matRef}
          map={tex}
          color={base}
          size={size}
          sizeAttenuation
          transparent
          opacity={0.85}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  );
}
