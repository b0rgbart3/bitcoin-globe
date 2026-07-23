// ============================================================================
// frontend/src/scene/MoonOrbitRing.tsx
// Dashed ring tracing the Moon's real orbital path over the current sidereal
// month, so its tilt relative to Earth's equator (the graticule's lat=0 line)
// is visible at a glance. The shape is static ephemeris (moonOrbitGeometry);
// the enclosing group is rotated by live GMST every frame to re-align it with
// Earth's current orientation — the exact correction sublunarPoint() applies
// to a single point — which keeps the Moon marker sitting exactly on the ring.
// ============================================================================

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { moonOrbitGeometry, moonOrbitArrows } from "./moonOrbit";
import { gmstDegrees } from "./lunar";

const DEG = Math.PI / 180;
const COLOR = "#bda671";

// Tiny, dim chevrons — just enough to read "which way", never enough to
// compete with the dashed ring itself.
const arrowGeo = new THREE.ConeGeometry(0.05, 0.18, 8);
const arrowMat = new THREE.MeshBasicMaterial({
  color: COLOR,
  transparent: true,
  opacity: 0.1,
});

export function MoonOrbitRing() {
  const groupRef = useRef<THREE.Group>(null);

  const line = useMemo(() => {
    const geo = moonOrbitGeometry();
    const mat = new THREE.LineDashedMaterial({
      color: COLOR,
      transparent: true,
      opacity: 0.52,
      dashSize: 0.1,
      gapSize: 0.15,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, []);

  const arrows = useMemo(() => moonOrbitArrows(), []);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y = -gmstDegrees(new Date()) * DEG;
    }
  });

  return (
    <group ref={groupRef}>
      <primitive object={line} />
      {arrows.map((a, i) => (
        <mesh
          key={i}
          position={a.position}
          quaternion={a.quaternion}
          geometry={arrowGeo}
          material={arrowMat}
        />
      ))}
    </group>
  );
}
