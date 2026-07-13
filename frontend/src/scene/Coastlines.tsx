// ============================================================================
// frontend/src/scene/Coastlines.tsx
// Land outlines as thin lines on the sphere — a quiet reference stage, styled
// deliberately below the nodes so land never reads as data.
//
// Self-contained (its own latLngToVec3) so it doesn't couple to Globe.tsx.
// If you later want one canonical projector, lift latLngToVec3 into a shared
// scene/geo.ts and import it in both.
// ============================================================================

import { useMemo } from "react";
import * as THREE from "three";
import { mesh } from "topojson-client";
import landTopo from "world-atlas/land-50m.json";

const DEG = Math.PI / 180;

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * DEG;
  const theta = (lng + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

export function Coastlines({
  radius,
  color = "#2a4258",
  opacity = 0.7,
}: {
  radius: number;
  color?: string;
  opacity?: number;
}) {
  const geometry = useMemo(() => {
    const topo = landTopo as any;
    // mesh(topology, object) -> a GeoJSON MultiLineString of all land boundaries
    const lines = mesh(topo, topo.objects.land);
    const coords = lines.coordinates as [number, number][][];

    const pts: THREE.Vector3[] = [];
    for (const segment of coords) {
      for (let i = 0; i < segment.length - 1; i++) {
        const a = segment[i];
        const b = segment[i + 1];
        if (!a || !b) continue;
        // TopoJSON positions are [lng, lat]
        pts.push(
          latLngToVec3(a[1], a[0], radius),
          latLngToVec3(b[1], b[0], radius),
        );
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  return (
    <lineSegments geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </lineSegments>
  );
}
