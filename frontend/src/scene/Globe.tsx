// ============================================================================
// frontend/src/scene/Globe.tsx
// The network body: lit silhouette globe, coastlines, graticule, the dynamic
// (mempool-driven) atmosphere, and the glowing nodes.
// Values marked // tune are the ones you've been adjusting by feel.
// ============================================================================

import { useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import { Coastlines } from "./Coastlines";
import { Atmosphere } from "./Atmosphere";
import type { NodeSnapshot, MempoolState, Block, Tx } from "@btcglobe/shared/types";
import { UnlocatableHalo } from "./UnlocatableHalo";
import { TransactionStream } from "./TransactionStream";
import { Nodes } from "./Nodes";

const GLOBE_RADIUS = 1.8;

// Faint lat/long rings: structure + orientation, kept quieter than the coastlines.
function Graticule({ radius }: { radius: number }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const segs = 96;
    for (let lat = -60; lat <= 60; lat += 30) {
      const phi = ((90 - lat) * Math.PI) / 180;
      const rr = radius * Math.sin(phi);
      const y = radius * Math.cos(phi);
      for (let i = 0; i < segs; i++) {
        const a0 = (i / segs) * Math.PI * 2;
        const a1 = ((i + 1) / segs) * Math.PI * 2;
        pts.push(new THREE.Vector3(rr * Math.cos(a0), y, rr * Math.sin(a0)));
        pts.push(new THREE.Vector3(rr * Math.cos(a1), y, rr * Math.sin(a1)));
      }
    }
    for (let lng = 0; lng < 180; lng += 30) {
      const t = (lng * Math.PI) / 180;
      for (let i = 0; i < segs; i++) {
        const p0 = (i / segs) * Math.PI * 2;
        const p1 = ((i + 1) / segs) * Math.PI * 2;
        pts.push(
          new THREE.Vector3(
            radius * Math.sin(p0) * Math.cos(t),
            radius * Math.cos(p0),
            radius * Math.sin(p0) * Math.sin(t),
          ),
          new THREE.Vector3(
            radius * Math.sin(p1) * Math.cos(t),
            radius * Math.cos(p1),
            radius * Math.sin(p1) * Math.sin(t),
          ),
        );
      }
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [radius]);

  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#396274" transparent opacity={0.85} />{" "}
      {/* tune: graticule color/opacity */}
    </lineSegments>
  );
}

export function Globe({
  snapshot,
  mempoolRef,
  txQueueRef,
  block,
}: {
  snapshot: NodeSnapshot | null;
  mempoolRef: MutableRefObject<MempoolState | null>;
  txQueueRef: MutableRefObject<Tx[]>;
  block: Block | null;
}) {
  // Persist the last known count so the halo stays visible when disconnected.
  // Seed with a realistic fallback so it renders immediately on first load too.
  const lastUnlocatableCount = useRef(15000);
  if (snapshot) lastUnlocatableCount.current = snapshot.unlocatableCount;

  return (
    <group>
      {/* dark, light-reactive body — shows the terminator as it rotates */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#0d1826"
          roughness={0.8}
          metalness={0.15}
        />{" "}
        {/* tune: body color */}
      </mesh>

      <Coastlines radius={GLOBE_RADIUS * 1.003} color="#1eacc5" opacity={0.7} />

      <Graticule radius={GLOBE_RADIUS * 1.002} />

      {/* dynamic atmosphere — breathes with live mempool pressure */}
      <Atmosphere
        mempoolRef={mempoolRef}
        radius={
          GLOBE_RADIUS
        } /* color="#3b6a8c" exponent={3.5} baseStrength={0.35} maxStrength={0.95} */
      />

      {snapshot && (
        <Nodes located={snapshot.located} radius={GLOBE_RADIUS * 1.01} />
      )}
      <UnlocatableHalo
        count={snapshot?.unlocatableCount ?? lastUnlocatableCount.current}
      />
      <TransactionStream
        txQueueRef={txQueueRef}
        mempoolRef={mempoolRef}
        block={block}
      />

      <OrbitControls
        enablePan={false}
        minDistance={5.9}
        maxDistance={30}
        autoRotate
        autoRotateSpeed={0.3}
        zoomSpeed={0.04} /* default is 1.0 — lower = slower */
      />
    </group>
  );
}
