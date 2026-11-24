import { useGLTF, useTexture } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo } from "react";
import { CatmullRomCurve3, DoubleSide, ExtrudeGeometry, Mesh, Shape, SRGBColorSpace, Vector2, Vector3 } from "three";
import { Block, usePrint } from "../scenes/props";
import { clipboard, clipboardPenAsset, mug } from "./desk-layout";
import { useSurfaceGrain } from "./surface-grain";

const quarter = Math.PI / 2;
const mugGlaze = { color: "#ad2b23", roughness: 0.30, clearcoat: 0.92, clearcoatRoughness: 0.17, ior: 1.52 };
const outside = [[0, 0], [0.078, 0], [0.089, 0.004], [0.094, 0.01], [0.103, 0.013], [0.11, 0.033], [0.117, 0.105], [0.122, 0.219], [0.12, 0.241]]
  .map(([radius, y]) => new Vector2(radius, y));
const inside = [[0, 0.038], [0.08, 0.038], [0.093, 0.046], [0.102, 0.094], [0.108, 0.192], [0.109, 0.237]]
  .map(([radius, y]) => new Vector2(radius, y));
const meniscus = [[0.109, 0.194], [0.107, 0.192], [0.103, 0.190], [0.099, 0.19]].map(([radius, y]) => new Vector2(radius, y));

function drawCork(ink: CanvasRenderingContext2D) {
  ink.fillStyle = "#907451";
  ink.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 6900; i++) {
    const x = (i * 93 + i * i * 17) % 271;
    const y = (i * 71 + i * i * 19) % 277;
    ink.fillStyle = i % 3 ? "#402b2452" : "#e5c08969";
    ink.fillRect(x, y, 1.2 + i % 5, 0.9 + i % 3);
  }
  ink.strokeStyle = "#58392151";
  ink.lineWidth = 8;
  ink.beginPath();
  ink.arc(128, 128, 94, 0, 4.45);
  ink.stroke();
}

function drawCoffee(ink: CanvasRenderingContext2D) {
  const liquid = ink.createRadialGradient(104, 110, 18, 128, 128, 131);
  liquid.addColorStop(0, "#28130d");
  liquid.addColorStop(0.72, "#321b12");
  liquid.addColorStop(1, "#502e19");
  ink.fillStyle = liquid;
  ink.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 105; i++) {
    const angle = i * 2.399963;
    const radius = 119 - (i * 11 % 27) / 2;
    const x = 128 + Math.cos(angle) * radius;
    const y = 128 + Math.sin(angle) * radius;
    const bubble = 0.33 + (i * 7 % 15) / 9;
    ink.beginPath();
    ink.fillStyle = i % 3 ? "#9b633a8b" : "#bd855a93";
    ink.arc(x, y, bubble, 0, Math.PI * 2);
    ink.fill();
  }
}

export function CoffeeMug() {
  const cork = usePrint(256, 256, drawCork);
  const coffee = usePrint(256, 256, drawCoffee);
  const handle = useMemo(() => new CatmullRomCurve3([
    [0.102, 0.192], [0.147, 0.207], [0.192, 0.184], [0.203, 0.143],
    [0.184, 0.101], [0.146, 0.077], [0.099, 0.078],
  ].map(([x, y]) => new Vector3(x, y, 0))), []);
  return (
    <group position={mug.position} rotation={[0, -0.36, 0]}>
      <mesh position={[0, 0.016, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.246, 0.243, 0.028, 46]} />
        <meshStandardMaterial color="#8c6e49" roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.031, 0]} rotation={[-quarter, 0, 0]} receiveShadow>
        <circleGeometry args={[0.245, 46]} />
        <meshStandardMaterial map={cork} bumpMap={cork} bumpScale={0.006} roughness={0.93} />
      </mesh>
      <group position={[0, 0.031, 0]} scale={mug.scale}>
        <mesh castShadow receiveShadow>
          <latheGeometry args={[outside, 60]} />
          <meshPhysicalMaterial {...mugGlaze} />
        </mesh>
        <mesh receiveShadow>
          <latheGeometry args={[inside, 52]} />
          <meshPhysicalMaterial color="#e3d6bb" roughness={0.32} clearcoat={0.49} side={DoubleSide} />
        </mesh>
        <mesh position={[0, 0.237, 0]} rotation={[-quarter, 0, 0]} castShadow receiveShadow>
          <torusGeometry args={[0.115, 0.0066, 12, 60]} />
          <meshPhysicalMaterial {...mugGlaze} color="#c23528" />
        </mesh>
        <mesh position={[0, 0.19, 0]} rotation={[-quarter, 0, 0]} receiveShadow>
          <circleGeometry args={[0.104, 52]} />
          <meshPhysicalMaterial map={coffee} roughness={0.23} ior={1.334} specularIntensity={0.68} clearcoat={0.22} clearcoatRoughness={0.26} />
        </mesh>
        <mesh receiveShadow>
          <latheGeometry args={[meniscus, 52]} />
          <meshPhysicalMaterial color="#402317" roughness={0.24} ior={1.334} specularIntensity={0.72} />
        </mesh>
        <mesh castShadow receiveShadow>
          <tubeGeometry args={[handle, 32, 0.016, 14, false]} />
          <meshPhysicalMaterial {...mugGlaze} />
        </mesh>
      </group>
    </group>
  );
}

function ClipboardPen() {
  // Retractable ballpoint from Grab3D's CC0 Ballpoint Pens set.
  const { scene } = useGLTF(clipboardPenAsset, false, false);
  const { gl, invalidate } = useThree();
  const pen = useMemo(() => {
    const model = scene.clone();
    model.traverse(object => { if (object instanceof Mesh) object.castShadow = true; });
    return model;
  }, [scene]);
  useEffect(() => {
    gl.shadowMap.needsUpdate = true;
    invalidate();
  }, [gl, invalidate]);
  return <primitive object={pen} position={[0.075, 0.026, 0.151]} rotation={[0, -0.83, 0]} scale={2.11} />;
}

function ShiftReport() {
  const sheet = useTexture("/pud-shift-record.webp");
  useEffect(() => {
    sheet.colorSpace = SRGBColorSpace;
    sheet.anisotropy = 8;
    sheet.needsUpdate = true;
  }, [sheet]);
  return (
    <mesh position={[0, 0.0255, 0.007]} rotation={[-quarter, 0, 0]} receiveShadow>
      <planeGeometry args={[0.414, 0.576]} />
      <meshStandardMaterial map={sheet} roughness={0.91} />
    </mesh>
  );
}

function StampedClamp() {
  const brushed = useSurfaceGrain(2, 3, true);
  const prong = useMemo(() => {
    const width = 0.035;
    const profile = new Shape();
    profile.moveTo(-0.300, 0.067);
    profile.bezierCurveTo(-0.279, 0.08, -0.244, 0.068, -0.22, 0.049);
    profile.quadraticCurveTo(-0.208, 0.035, -0.193, 0.033);
    profile.lineTo(-0.185, 0.035);
    profile.lineTo(-0.186, 0.026);
    profile.quadraticCurveTo(-0.2, 0.022, -0.214, 0.032);
    profile.bezierCurveTo(-0.238, 0.046, -0.274, 0.069, -0.298, 0.057);
    profile.closePath();
    return new ExtrudeGeometry(profile, { depth: width, bevelThickness: 0.0024, bevelSize: 0.0023, bevelSegments: 3, curveSegments: 12 })
      .translate(0, 0, -width / 2).rotateY(-quarter);
  }, []);
  useEffect(() => () => prong.dispose(), [prong]);
  return (
    <group>
      {[-0.086, 0.086].map(x => (
        <group key={x} position={[x, 0, 0]}>
          <Block size={[0.049, 0.013, 0.068]} radius={0.006} color="#838278" roughness={0.46} metalness={0.71} position={[0, 0.028, -0.276]} receiveShadow />
          <Block size={[0.027, 0.036, 0.05]} radius={0.008} color="#6a6c65" metalness={0.57} position={[0, 0.049, -0.283]} castShadow />
          <mesh position={[0, 0.037, -0.259]}>
            <cylinderGeometry args={[0.011, 0.012, 0.006, 18]} />
            <meshStandardMaterial color="#afa99a" metalness={0.75} roughness={0.39} />
          </mesh>
          <mesh geometry={prong} castShadow receiveShadow>
            <meshPhysicalMaterial color="#aba99a" roughness={0.34} metalness={0.76} bumpMap={brushed} bumpScale={0.0016} clearcoat={0.22} />
          </mesh>
          <Block size={[0.037, 0.01, 0.025]} radius={0.004} color="#3f4440" position={[0, 0.030, -0.193]} roughness={0.89} />
        </group>
      ))}
      <mesh position={[0, 0.055, -0.283]} rotation={[0, 0, quarter]} castShadow receiveShadow>
        <cylinderGeometry args={[0.011, 0.011, 0.228, 20]} />
        <meshStandardMaterial color="#5e615f" metalness={0.72} roughness={0.43} />
      </mesh>
    </group>
  );
}

export function Clipboard() {
  return (
    <group position={clipboard.position} rotation={[0, -0.165, 0]} scale={clipboard.scale}>
      <Block size={[0.46, 0.032, 0.63]} radius={0.015} color="#4d3b2d" roughness={0.85} castShadow receiveShadow />
      <Block size={[0.424, 0.009, 0.582]} radius={0.003} color="#c3b697" position={[0.003, 0.02, 0.006]} receiveShadow />
      <Suspense fallback={null}><ShiftReport /></Suspense>
      <StampedClamp />
      <Suspense fallback={null}><ClipboardPen /></Suspense>
    </group>
  );
}
