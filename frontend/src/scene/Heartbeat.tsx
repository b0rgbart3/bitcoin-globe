// ============================================================================
// frontend/src/scene/Heartbeat.tsx
// The block heartbeat: an expanding fresnel shell that ripples outward and fades
// each time a block is mined. A discrete-lane animation — spawned on the event,
// runs ~1.8s, retires. (Next: a node flare so it reads as coming from the
// network rather than from the Earth's center.)
// ============================================================================

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { Block } from "@btcglobe/shared/types";

const DURATION = 2.8; // seconds: expand + fade
const START_SCALE = 1.02; // just outside the globe surface
const END_SCALE = 3.7;
const PEAK_OPACITY = 0.5;

export function Heartbeat({
  block,
  radius,
}: {
  block: Block | null;
  radius: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const startRef = useRef(-Infinity);
  const pendingRef = useRef(false);
  const lastHashRef = useRef<string | null>(null);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color("#13c3b1") }, // warm, ties to the nodes
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
            // bright at the silhouette -> reads as an expanding ring
            float rim = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, .3))), 6.0);
rim = smoothstep(0.125, 1.0, rim); // cut the dim tail where banding lives
gl_FragColor = vec4(uColor, 1.0) * rim * uOpacity;
          }`,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  // Fire on a genuinely new block (guard the hash against StrictMode double-invoke).
  useEffect(() => {
    if (!block || block.hash === lastHashRef.current) return;
    lastHashRef.current = block.hash;
    pendingRef.current = true;
  }, [block]);

  // DEV: press "b" to fire a test ripple without waiting ~10 min. Remove later.
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

    if (pendingRef.current) {
      startRef.current = now;
      pendingRef.current = false;
    }

    const t = now - startRef.current;
    if (t >= 0 && t <= DURATION) {
      const p = t / DURATION;
      mesh.scale.setScalar(START_SCALE + (END_SCALE - START_SCALE) * p);
      material.uniforms.uOpacity.value = PEAK_OPACITY * (1 - p) * (1 - p); // ease-out
      mesh.visible = true;
    } else {
      mesh.visible = false;
    }
  });

  return (
    <mesh ref={meshRef} material={material} visible={false}>
      <sphereGeometry args={[radius, 48, 48]} />
    </mesh>
  );
}
