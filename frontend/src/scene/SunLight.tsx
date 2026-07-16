// ============================================================================
// frontend/src/scene/SunLight.tsx
// A directional light placed at the real subsolar point. The terminator on the
// globe is then the actual day/night line, moving at the actual 15°/hour.
// ============================================================================

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sunDirection } from "./sun";

const RECOMPUTE_EVERY = 10; // seconds — the sun moves ~0.04° in that time

export function SunLight({
  intensity = 2.45,
  distance = 50,
}: {
  intensity?: number;
  distance?: number;
}) {
  const ref = useRef<THREE.DirectionalLight>(null);
  const last = useRef(-Infinity);

  // Mutated in the loop, never set declaratively — same rule as the halo's
  // rotation: one owner per property.
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (t - last.current < RECOMPUTE_EVERY) return;
    last.current = t;
    ref.current?.position.copy(sunDirection(distance));
  });

  return <directionalLight ref={ref} intensity={intensity} />;
}
