// ============================================================================
// frontend/src/scene/BlockHeightOrbit.tsx
// Block height displayed on a translucent 3-D panel that orbits the equator.
//
// Orbit is done by rotating a parent group around Y, so the panel's local +Z
// always points radially outward from the globe.  Text sits on that outer face.
//
// Direction: CCW (viewed from above, +Y), counter to the apparent globe drift
// caused by OrbitControls autoRotate (which sweeps the camera CCW at speed 0.3,
// period ~200 s).  World period 150 s → apparent counter-orbit ~600 s.
// ============================================================================

import { useRef } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const GLOBE_RADIUS = 1.8; // must match Globe.tsx
const ORBIT_RADIUS = GLOBE_RADIUS * 1.3; // ≈ 2.34 — outside ISS ring (~1.915)

const ORBIT_PERIOD_SEC = 75; // world-space period → ~300 s apparent counter-orbit
const OMEGA = -(2 * Math.PI) / ORBIT_PERIOD_SEC;

// Panel dimensions (scene units)
const BOX_W = 1.08;
const BOX_H = 0.48;
const BOX_D = 0.16;

// Created once at module level — never re-instantiated
const boxGeo = new THREE.BoxGeometry(BOX_W, BOX_H, BOX_D);
const edgesGeo = new THREE.EdgesGeometry(boxGeo);

const backPanelGeo = new THREE.PlaneGeometry(BOX_W, BOX_H);
const backPanelMat = new THREE.MeshBasicMaterial({
  color: "#000000",
  transparent: true,
  opacity: 0.5,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const fillMat = new THREE.MeshStandardMaterial({
  color: "#061a30",
  transparent: true,
  opacity: 0.22,
  emissive: "#081830",
  emissiveIntensity: 0.35,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const edgeMat = new THREE.LineBasicMaterial({
  color: "#014556",
  transparent: true,
  opacity: 0.7,
});

const FONT =
  "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5/files/ibm-plex-mono-latin-500-normal.woff";
const FONT_LIGHT =
  "https://cdn.jsdelivr.net/npm/@fontsource/ibm-plex-mono@5/files/ibm-plex-mono-latin-400-normal.woff";

export function BlockHeightOrbit({
  chainHeight,
}: {
  chainHeight: number | null;
}) {
  const orbitRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (orbitRef.current) {
      orbitRef.current.rotation.y = OMEGA * clock.elapsedTime;
    }
  });

  const displayValue = chainHeight != null ? chainHeight.toLocaleString() : "—";

  return (
    // This group rotates around Y — its local +Z sweeps the equatorial orbit.
    <group ref={orbitRef}>
      {/*
        Panel at [0, 0, ORBIT_RADIUS] in the rotating frame.
        The box's outer face is at local Z = +BOX_D/2, pointing radially outward.
        Text is placed just proud of that face so it reads from outside the globe.
      */}
      <group position={[0, 0, ORBIT_RADIUS]}>
        {/* Translucent body */}
        <mesh geometry={boxGeo} material={fillMat} />

        {/* 50% black back panel — sits just inside the rear face, faces outward */}
        <mesh
          geometry={backPanelGeo}
          material={backPanelMat}
          position={[0, 0, -BOX_D / 2 + 0.002]}
        />

        {/* Glowing edges — the main visual cue that this is a 3-D object */}
        <lineSegments geometry={edgesGeo} material={edgeMat} />

        {/* "BLOCK HEIGHT" label above the value */}
        <Text
          font={FONT_LIGHT}
          fontSize={0.062}
          color="#7da5d2"
          anchorX="center"
          anchorY="bottom"
          position={[0, 0.096, BOX_D / 2 + 0.006]}
          letterSpacing={0.22}
        >
          BLOCK HEIGHT
        </Text>

        {/* Block height value below the label */}
        <Text
          font={FONT}
          fontSize={0.176}
          color="#abbed3"
          anchorX="center"
          anchorY="top"
          position={[0, 0.096, BOX_D / 2 + 0.006]}
        >
          {displayValue}
        </Text>
      </group>
    </group>
  );
}
