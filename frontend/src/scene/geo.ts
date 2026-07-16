// ============================================================================
// frontend/src/scene/geo.ts
// The single canonical lat/lng -> sphere projection. Every layer that places
// anything geographically MUST use this one — nodes, coastlines, and the sun.
// If they disagree, the terminator won't line up with the continents.
// ============================================================================

import * as THREE from "three";

const DEG = Math.PI / 180;

export function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}
