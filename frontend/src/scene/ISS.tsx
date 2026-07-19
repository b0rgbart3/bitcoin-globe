// ============================================================================
// frontend/src/scene/ISS.tsx
// International Space Station — simplified cross geometry, accurate orbit.
//
// Geometry is ~250× real scale so it's visible at this scene scale.
// The Bloom post-process pass adds a faint glow to the emissive surfaces.
// ============================================================================

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  issOrbitGeometry,
  issPosition,
  issPrograde,
  issRAANOffset,
} from "./issOrbit";

// Artistic scale — real ISS wingspan is 109 m; at true scene scale that's ~0.00003 units.
// Scaled up so it reads clearly near the globe without being absurd.
const TRUSS_HALF = 0.12; // half-length of main truss (scene units)
const TRUSS_THICK = 0.008; // truss cross-section
const PANEL_W = 0.055; // solar panel width (along truss direction)
const PANEL_D = 0.03; // solar panel depth (along prograde)
const PANEL_T = 0.004; // panel thickness
const PANEL_Y_OFFSET = 0.02; // how far each panel pair sits off the truss (zenith axis)
const MODULE_R = 0.022; // habitat capsule radius

const GOLD = new THREE.MeshStandardMaterial({
  color: "#168798",
  roughness: 0.4,
  metalness: 0.5,
  emissive: "#077083",
  emissiveIntensity: 0.7,
});
const SILVER = new THREE.MeshStandardMaterial({
  color: "#849ca9",
  roughness: 0.3,
  metalness: 0.8,
  emissive: "#6090a8",
  emissiveIntensity: 0.4,
});
const WHITE = new THREE.MeshStandardMaterial({
  color: "#a5bfcb",
  roughness: 0.5,
  metalness: 0.2,
  emissive: "#80aac0",
  emissiveIntensity: 0.5,
});

// Module-level geometries — created once
const trussGeo = new THREE.BoxGeometry(
  TRUSS_HALF * 2,
  TRUSS_THICK,
  TRUSS_THICK,
);
const panelGeo = new THREE.BoxGeometry(PANEL_W, PANEL_T, PANEL_D);
const moduleGeo = new THREE.CapsuleGeometry(MODULE_R, MODULE_R * 2.5, 6, 12);

// The 4 panel-pair positions along the truss (each pair = one above + one below)
const panelOffsets = [
  -TRUSS_HALF * 0.72,
  -TRUSS_HALF * 0.3,
  TRUSS_HALF * 0.3,
  TRUSS_HALF * 0.72,
];

// Orbit ring — distinct cyan-white so it stands out from the blue-grey graticule
function OrbitRing() {
  const line = useMemo(() => {
    const geo = issOrbitGeometry(512);
    const mat = new THREE.LineDashedMaterial({
      color: "#1cd2ff",
      transparent: true,
      opacity: 0.45,
      dashSize: 0.08,
      gapSize: 0.08,
    });
    const l = new THREE.Line(geo, mat);
    l.computeLineDistances();
    return l;
  }, []);
  return <primitive object={line} />;
}

export function ISS() {
  const groupRef = useRef<THREE.Group>(null);
  const raan = useMemo(() => issRAANOffset(), []);

  // Pre-allocated vectors — mutated each frame to avoid GC pressure
  const _pos = useMemo(() => new THREE.Vector3(), []);
  const _fwd = useMemo(() => new THREE.Vector3(), []);
  const _up = useMemo(() => new THREE.Vector3(), []);
  const _side = useMemo(() => new THREE.Vector3(), []);
  const _mat = useMemo(() => new THREE.Matrix4(), []);

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;

    const t = state.clock.elapsedTime;

    _pos.copy(issPosition(t));
    g.position.copy(_pos);

    // Build orthonormal frame: side (truss), up (zenith), fwd (prograde)
    // Right-hand constraint: side × up = fwd → up = fwd × side
    _up.copy(_pos).normalize(); // zenith (away from Earth)
    _fwd.copy(issPrograde(t)); // prograde
    _side.crossVectors(_fwd, _up).normalize(); // along truss
    _up.crossVectors(_fwd, _side).normalize(); // re-orthogonalise; keeps side×up=fwd ✓

    _mat.makeBasis(_side, _up, _fwd);
    g.quaternion.setFromRotationMatrix(_mat);
  });

  return (
    <group rotation-y={raan}>
      <OrbitRing />

      <group ref={groupRef}>
        {/* Main truss — runs along local X */}
        <mesh geometry={trussGeo} material={SILVER} />

        {/* Four pairs of solar panels along the truss */}
        {panelOffsets.map((xOff, i) => (
          <group key={i} position={[xOff, 0, 0]}>
            <mesh
              geometry={panelGeo}
              material={GOLD}
              position={[0, PANEL_Y_OFFSET, 0]}
            />
            <mesh
              geometry={panelGeo}
              material={GOLD}
              position={[0, -PANEL_Y_OFFSET, 0]}
            />
          </group>
        ))}

        {/* Central habitat / lab module cluster */}
        <mesh
          geometry={moduleGeo}
          material={WHITE}
          rotation={[0, 0, Math.PI / 2]}
        />
        <mesh
          geometry={moduleGeo}
          material={WHITE}
          rotation={[Math.PI / 2, 0, 0]}
          scale={[0.3, 0.3, 0.3]}
          position={[0, 0, MODULE_R * 2.8]}
        />
      </group>
    </group>
  );
}
