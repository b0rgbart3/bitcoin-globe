// ============================================================================
// frontend/src/scene/Globe.tsx
// The network body, observatory-instrument register: a dark silhouette globe
// with a faint graticule, a muted fresnel atmosphere, and warm glowing nodes.
// Boldness is spent entirely on the node glow (see Bloom in App).
// ============================================================================

import { useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "@react-three/drei";
import type { NodeSnapshot } from "@btcglobe/shared/types";
import { Coastlines } from "./Coastlines";
import { Atmosphere } from "./Atmosphere";
import type { MempoolState } from "@btcglobe/shared/types";
import type { MutableRefObject } from "react";

const GLOBE_RADIUS = 2;
const NODE_RADIUS = GLOBE_RADIUS * 1.01;

function latLngToVec3(lat: number, lng: number, r: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

// Soft radial sprite so each node is a glow, not a hard square.
function makeGlowTexture(): THREE.Texture {
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(
    size / 2,
    size / 2,
    0,
    size / 2,
    size / 2,
    size / 2,
  );
  g.addColorStop(0.0, "rgba(255,255,255,1)");
  g.addColorStop(0.3, "rgba(255,255,255,0.75)");
  g.addColorStop(1.0, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

function Nodes({ located }: { located: NodeSnapshot["located"] }) {
  const glow = useMemo(makeGlowTexture, []);
  const positions = useMemo(() => {
    const arr = new Float32Array(located.length * 3);
    located.forEach((n, i) => {
      const p = latLngToVec3(n.lat, n.lng, NODE_RADIUS);
      arr[i * 3] = p.x;
      arr[i * 3 + 1] = p.y;
      arr[i * 3 + 2] = p.z;
    });
    return arr;
  }, [located]);

  return (
    <points key={positions.length}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={glow}
        color="#10e2bf"
        size={0.14}
        sizeAttenuation
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

// Faint lat/long rings: gives the sphere 3D structure and orientation.
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
      <lineBasicMaterial color="#21344a" transparent opacity={0.55} />
    </lineSegments>
  );
}

// export function Globe({ snapshot }: { snapshot: NodeSnapshot | null, }) {
//   const atmosphere = useMemo(
//     () =>
//       new THREE.ShaderMaterial({
//         uniforms: {
//           uColor: { value: new THREE.Color("#3b6a8c") },
//           uStrength: { value: 0.01 },
//         }, // master dial: 0 = invisible, 1 = full},
//         vertexShader: `
//           varying vec3 vNormal;
//           void main() {
//             vNormal = normalize(normalMatrix * normal);
//             gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
//           }`,
//         fragmentShader: `
//           varying vec3 vNormal;
//           uniform vec3 uColor;
//           void main() {
//             float i = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.6);
//             gl_FragColor = vec4(uColor, 0.2) * clamp(i, 0.0, 1.0);
//           }`,
//         side: THREE.BackSide,
//         blending: THREE.AdditiveBlending,
//         transparent: true,
//         depthWrite: false,
//       }),
//     [],
//   );

export function Globe({ snapshot, mempoolRef }: {
  snapshot: NodeSnapshot | null;
  mempoolRef: MutableRefObject<MempoolState | null>;
}) {
  return (
    <group>
      {/* dark silhouette body (occludes far-side nodes) */}
      <mesh>
        <sphereGeometry args={[GLOBE_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#0d1826" roughness={1} metalness={0} />
      </mesh>
      <Coastlines
        radius={GLOBE_RADIUS * 1.003}
        color="#387483"
        opacity={0.85}
      />

      <Graticule radius={GLOBE_RADIUS * 1.002} />

      <Atmosphere mempoolRef={mempoolRef} radius={GLOBE_RADIUS} />

      {snapshot && <Nodes located={snapshot.located} />}

      <OrbitControls
        enablePan={false}
        minDistance={3}
        maxDistance={9}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </group>
  );
}
