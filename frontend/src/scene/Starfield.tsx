// ============================================================================
// frontend/src/scene/Starfield.tsx
// Faint depth behind the globe. Deliberately dim and cool so it never competes
// with the warm node signal — it's atmosphere, not decoration.
// ============================================================================

import { useMemo } from "react";
import * as THREE from "three";

export function Starfield({
  count = 700,
  radius = 40,
}: {
  count?: number;
  radius?: number;
}) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(radius * (0.85 + Math.random() * 0.15));
      arr[i * 3] = v.x;
      arr[i * 3 + 1] = v.y;
      arr[i * 3 + 2] = v.z;
    }
    return arr;
  }, [count, radius]);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        color="#8ea6c0"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={1}
        depthWrite={false}
      />
    </points>
  );
}
