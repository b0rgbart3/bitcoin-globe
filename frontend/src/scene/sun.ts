// ============================================================================
// frontend/src/scene/sun.ts
// Where the sun is actually overhead, right now.
//
// This is real astronomy, not decoration: at any instant the sun is directly
// above exactly one point on Earth (the "subsolar point"), and it's computable
// from UTC time alone — no API, no data source. Lighting the globe from that
// direction makes the terminator show REAL day/night, and its tilt shows the
// real season (via solar declination).
//
// Uses the NOAA solar position approximation: accurate to well under a degree,
// which is far finer than anything visible at this scale.
// ============================================================================

import * as THREE from "three";
import { latLngToVec3 } from "./geo";

export interface SubsolarPoint {
  lat: number; // = solar declination: 0 at equinox, ±23.44° at solstice
  lng: number; // where it is solar noon right now
}

export function subsolarPoint(date: Date = new Date()): SubsolarPoint {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - startOfYear) / 86_400_000) + 1;
  const hours =
    date.getUTCHours() + date.getUTCMinutes() / 60 + date.getUTCSeconds() / 3600;

  // Fractional year, radians.
  const g = ((2 * Math.PI) / 365) * (dayOfYear - 1 + (hours - 12) / 24);

  // Solar declination (radians) — the latitude the sun is over. Drives seasons.
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);

  // Equation of time (minutes) — Earth's orbit is elliptical and its axis is
  // tilted, so real solar noon drifts up to ~16 min from clock noon.
  const eqTime =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(g) -
      0.032077 * Math.sin(g) -
      0.014615 * Math.cos(2 * g) -
      0.040849 * Math.sin(2 * g));

  // Longitude of solar noon. At 12:00 UTC (eqTime 0) this is 0° — Greenwich.
  const rawLng = -15 * (hours + eqTime / 60 - 12);

  return {
    lat: (decl * 180) / Math.PI,
    lng: (((rawLng + 180) % 360) + 360) % 360 - 180, // wrap to [-180, 180]
  };
}

// A world-space position for the light, far enough out to read as directional.
export function sunDirection(distance = 50, date?: Date): THREE.Vector3 {
  const { lat, lng } = subsolarPoint(date);
  return latLngToVec3(lat, lng, distance);
}
