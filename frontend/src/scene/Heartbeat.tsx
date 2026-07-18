// ============================================================================
// frontend/src/scene/Heartbeat.tsx
// The block heartbeat's shockwave. Now fires a SHARED pulse (blockPulse.ts) so
// the node flare can ride the same clock — making the wave read as coming from
// the network rather than from the Earth's center.
// ============================================================================

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Block } from "@btcglobe/shared/types";
import { firePulse, pulseProgress } from "./blockPulse";

export const PULSE_DURATION = 2.8; // shared by the flare — keep in one place
const START_SCALE = 0.8;
const END_SCALE = 3.7;
const PEAK_OPACITY = 1.0; // <-- YOUR TUNED VALUE

export function Heartbeat({
  block,
  radius,
}: {
  block: Block | null;
  radius: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pendingRef = useRef(false);
  const lastHashRef = useRef<string | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#00bba5") },
          uOpacity: { value: 0 },
        },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          varying vec3 vNormal;
          uniform vec3 uColor;
          uniform float uOpacity;
          void main() {
            // <-- YOUR TUNED VALUES: exponent + smoothstep floor
            float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 8.0);
            rim = smoothstep(0.15, 1.0, rim);
            gl_FragColor = vec4(uColor, 1.0) * rim * uOpacity;
          }`,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  useEffect(() => {
    if (!block) return;
    if (lastHashRef.current === null) {
      // First block on connect is the server's current-state snapshot, not a new event.
      lastHashRef.current = block.hash;
      return;
    }
    if (block.hash === lastHashRef.current) return;
    lastHashRef.current = block.hash;
    pendingRef.current = true;
  }, [block]);

  // DEV: press "b" to fire a test pulse. Remove before shipping.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "b") pendingRef.current = true;
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useFrame((state) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const now = state.clock.elapsedTime;

    // Fire the SHARED pulse — the node flare reads this same clock.
    if (pendingRef.current) {
      firePulse(now);
      pendingRef.current = false;
    }

    const p = pulseProgress(now, PULSE_DURATION);
    if (p === null) {
      mesh.visible = false;
      return;
    }
    mesh.scale.setScalar(START_SCALE + (END_SCALE - START_SCALE) * p);
    material.uniforms.uOpacity.value = PEAK_OPACITY * (1 - p) * (1 - p);
    mesh.visible = true;
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <sphereGeometry args={[radius, 48, 48]} />
    </mesh>
  );
}
