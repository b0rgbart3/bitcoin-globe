// ============================================================================
// frontend/src/scene/Atmosphere.tsx
// The breathing shell. A fresnel rim whose uStrength eases toward a target set
// by live mempool pressure — the continuous lane of the render loop. Pressure
// rises as the mempool fills between blocks and settles as blocks clear, so the
// "breathing" is the real fill/drain rhythm, not a synthetic oscillation.
//
// All look knobs are props — carry over whatever you'd tuned inline in Globe.
// ============================================================================

import { useEffect, useMemo, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import type { MempoolState } from "@btcglobe/shared/types";
import { pressureFromMempool } from "./pressure";

export function Atmosphere({
  mempoolRef,
  radius,
  scale = 1.18,
  color = "#3b6a8c",
  exponent = 3.5,
  baseStrength = 0.35, // resting glow (empty mempool)
  maxStrength = 0.95, // full glow (congested)
  damping = 2.5, // how fast the glow chases pressure (higher = snappier)
}: {
  mempoolRef: MutableRefObject<MempoolState | null>;
  radius: number;
  scale?: number;
  color?: string;
  exponent?: number;
  baseStrength?: number;
  maxStrength?: number;
  damping?: number;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          uColor: { value: new THREE.Color(color) },
          uStrength: { value: baseStrength },
          uExponent: { value: exponent },
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
          uniform float uStrength;
          uniform float uExponent;
          void main() {
            float i = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), uExponent);
            gl_FragColor = vec4(uColor, 1.0) * clamp(i, 0.0, 1.0) * uStrength;
          }`,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    [], // created once; look props are synced below
  );

  // Keep look-uniforms in sync when you tune the props.
  useEffect(() => {
    material.uniforms.uColor.value.set(color);
    material.uniforms.uExponent.value = exponent;
  }, [color, exponent, material]);

  // Continuous lane: every frame, ease uStrength toward the live pressure target.
  useFrame((_, dt) => {
    const pressure = pressureFromMempool(mempoolRef.current);
    const target = baseStrength + (maxStrength - baseStrength) * pressure;
    const u = material.uniforms.uStrength;
    u.value = THREE.MathUtils.damp(u.value, target, damping, dt);
  });

  return (
    <mesh material={material} scale={scale}>
      <sphereGeometry args={[radius, 48, 48]} />
    </mesh>
  );
}
