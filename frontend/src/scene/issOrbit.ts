// ============================================================================
// frontend/src/scene/issOrbit.ts
// ISS orbital mechanics — analytically propagated, no live TLE required.
//
// What is accurate:
//   Inclination  51.6° — the real ISS orbital plane, limiting passes to ±51.6° lat.
//   Period       92.68 min — the real sidereal period.
//   Plane shape  The orbit ring traces the correct inclined circle.
//
// What is deliberately wrong:
//   Initial phase  Arbitrary. Without a live TLE feed there is no way to know where
//                  on the orbit the ISS is right now; the station's angular position
//                  is reset to zero each time the scene loads.
//   Geometry size  The ISS structure is exaggerated several hundred× for visibility.
// ============================================================================

import * as THREE from "three";

const EARTH_RADIUS_KM = 6_371;
const GLOBE_RADIUS = 1.8; // must match Globe.tsx
export const SCENE_SCALE = GLOBE_RADIUS / EARTH_RADIUS_KM;

const ISS_ALTITUDE_KM = 408;
export const ISS_ORBIT_RADIUS = (EARTH_RADIUS_KM + ISS_ALTITUDE_KM) * SCENE_SCALE;
// ≈ 1.915 scene units — true to scale

export const ISS_PERIOD_SEC = 92.68 * 60; // 5560.8 s
export const ISS_INCLINATION_RAD = 51.6 * (Math.PI / 180);

const TWO_PI_OVER_T = (2 * Math.PI) / ISS_PERIOD_SEC;

// Simulated RAAN precession — 360° over 60 days, derived from wall-clock date.
// Not synced to the real ISS; just gives the orbit ring a slow, plausible drift.
const RAAN_EPOCH_MS = Date.UTC(2026, 0, 1); // Jan 1 2026 = RAAN 0
const RAAN_PERIOD_MS = 60 * 24 * 60 * 60 * 1000; // 60 days in ms

export function issRAANOffset(): number {
  return ((Date.now() - RAAN_EPOCH_MS) / RAAN_PERIOD_MS) * (2 * Math.PI);
}

// World-space ISS position at elapsed seconds + optional phase offset.
// Orbit plane: equatorial (XZ) rotated by inclination around the X axis
// (the "line of nodes" — arbitrary RAAN, fixed for the session).
export function issPosition(elapsedSec: number, phase = 0): THREE.Vector3 {
  const θ = TWO_PI_OVER_T * elapsedSec + phase;
  const r = ISS_ORBIT_RADIUS;
  const sinI = Math.sin(ISS_INCLINATION_RAD);
  const cosI = Math.cos(ISS_INCLINATION_RAD);
  return new THREE.Vector3(
    r * Math.cos(θ),
    -r * Math.sin(θ) * sinI,
    r * Math.sin(θ) * cosI,
  );
}

// Unit velocity vector (prograde direction) — derivative of issPosition wrt θ.
export function issPrograde(elapsedSec: number, phase = 0): THREE.Vector3 {
  const θ = TWO_PI_OVER_T * elapsedSec + phase;
  const sinI = Math.sin(ISS_INCLINATION_RAD);
  const cosI = Math.cos(ISS_INCLINATION_RAD);
  return new THREE.Vector3(
    -Math.sin(θ),
    Math.cos(θ) * sinI,
    -Math.cos(θ) * cosI,
  ).normalize();
}

// Pre-compute a closed orbit ring as a BufferGeometry (static — call once).
export function issOrbitGeometry(segments = 256): THREE.BufferGeometry {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    pts.push(issPosition((i / segments) * ISS_PERIOD_SEC));
  }
  return new THREE.BufferGeometry().setFromPoints(pts);
}
