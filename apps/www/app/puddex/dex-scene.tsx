import { BakeShadows, Environment, Lightformer } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { MathUtils, Mesh, MeshStandardMaterial, Object3D, PCFShadowMap, ShaderChunk, Vector3, type Group, type Material, type Vector3Tuple } from "three";
import { deskKey, display, type ScreenControls } from "./desk-layout";
import { DeskPeripherals } from "./desk-peripherals";
import { Factory } from "./factory";
import { Keyboard } from "./keyboard";
import { rightWallBounce } from "./lightmaps";
import { diskDurations, type Power } from "./machine";
import { Monitor } from "./monitor";
import { Office } from "./office";
import { BakeOfficeShadows, type OfficeShadowMaps } from "./office-shadows";
import { RenderBudget } from "./render-budget";
import { makeScreenProjection } from "./screen-projection";
import { SystemUnit } from "./system-unit";

const zero: Vector3Tuple = [0, 0, 0];
const sceneEye: Vector3Tuple = [0, 2.61, 4.58];
const maxRenderPixels = 2_250_000;

const directLight = "RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );";
const facesLight = "(dot(geometryNormal, directLight.direction) > 0.0 || dot(geometryClearcoatNormal, directLight.direction) > 0.0)";
const officeLights = ShaderChunk.lights_fragment_begin
  .replaceAll("directLight.visible && receiveShadow", `directLight.visible && receiveShadow && ${facesLight}`)
  .replaceAll(directLight, `if ( directLight.visible && ${facesLight} ) { ${directLight} }`);

const skipUnlitFragments: Material["onBeforeCompile"] = shader => {
  shader.fragmentShader = shader.fragmentShader.replace("#include <lights_fragment_begin>", officeLights);
};

function trackViewport(onResize: () => void) {
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}

function renderPixelRatio() {
  const area = window.innerWidth * window.innerHeight;
  return Math.min(window.devicePixelRatio, 1.55, Math.sqrt(maxRenderPixels / area));
}

function View({ controls, animate }: { controls: ScreenControls; animate: boolean }) {
  const { camera, gl, size, invalidate } = useThree();
  const applyProjection = useMemo(makeScreenProjection, []);
  const target = useMemo(() => new Vector3(), []);
  const pointer = useRef({ x: 0, y: 0 });
  const last = useRef<{ w: number; h: number; x: number; y: number } | null>(null);

  useEffect(() => {
    if (!animate) return;
    const surface = gl.domElement;
    function move(event: PointerEvent) {
      if (event.pointerType !== "mouse") return;
      const bounds = surface.getBoundingClientRect();
      pointer.current.x = (event.clientX - bounds.left) / bounds.width * 2 - 1;
      pointer.current.y = (event.clientY - bounds.top) / bounds.height * 2 - 1;
      invalidate();
    }
    function reset() {
      pointer.current = { x: 0, y: 0 };
      invalidate();
    }
    surface.addEventListener("pointermove", move, { passive: true });
    surface.addEventListener("pointerleave", reset, { passive: true });
    return () => {
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", reset);
      reset();
    };
  }, [animate, gl, invalidate]);

  useEffect(() => () => {
    last.current = null;
    for (const element of [controls.screen.current, controls.eject.current, controls.powerSwitch.current]) {
      if (element) for (const property of ["left", "top", "width", "height", "transform"]) element.style.removeProperty(property);
    }
  }, [controls]);

  useFrame((_, delta) => {
    if (!size.width || !size.height) return;
    const aspect = size.width / size.height;
    const z = Math.max(sceneEye[2], 2.75 + 2.65 / Math.max(aspect, 0.36));
    const x = animate ? MathUtils.damp(camera.position.x, pointer.current.x * 0.18, 5.4, delta) : 0;
    const y = animate ? MathUtils.damp(camera.position.y, sceneEye[1] - pointer.current.y * 0.085, 5.4, delta) : sceneEye[1];
    const previous = last.current;
    if (previous && Math.abs(x - previous.x) < 0.00005 && Math.abs(y - previous.y) < 0.00005 && size.width === previous.w && size.height === previous.h) return;
    camera.position.set(x, y, z);
    camera.lookAt(target.set(x * 0.14, 1.012, 1.015));
    camera.updateMatrixWorld();
    applyProjection(camera, size, controls);
    last.current = { w: size.width, h: size.height, x, y };
  });

  return null;
}

function DeskLighting() {
  const key = useMemo(() => new Object3D(), []);
  const edge = useMemo(() => new Object3D(), []);
  const reflection = useMemo(() => new Object3D(), []);
  const [x, y, z] = deskKey.position;
  return (
    <>
      <hemisphereLight args={["#c2cbc8", "#393229", 0.13]} />
      <primitive object={key} position={deskKey.target} />
      {/* Two samples across the broad ceiling fixture soften the key's prop shadows. */}
      {[-1, 1].map(side => (
        <spotLight key={side} position={[x + side * 0.203, y, z + side * 0.135]} target={key} color="#ffead1"
          intensity={11} distance={7.3} decay={2} angle={0.6} penumbra={0.83} castShadow shadow-mapSize={[1280, 1280]}
          shadow-camera-near={0.135} shadow-camera-far={8.5} shadow-normalBias={0.004} shadow-bias={-0.00017} shadow-radius={3.7} />
      ))}
      <primitive object={edge} position={[0.86, 0.87, 1.27]} />
      <spotLight position={[2.0, 2.64, -1.52]} target={edge} color="#bce0e2" intensity={7.4} distance={5.9} decay={2}
        angle={0.68} penumbra={0.88} />
      <primitive object={reflection} position={rightWallBounce.cone.target} />
      <spotLight position={rightWallBounce.position} target={reflection} color={rightWallBounce.color} intensity={23} distance={6.4} decay={2}
        angle={rightWallBounce.cone.angle} penumbra={rightWallBounce.cone.penumbra} castShadow shadow-mapSize={[768, 768]}
        shadow-camera-near={0.12} shadow-camera-far={6.4} shadow-radius={4.2} shadow-normalBias={0.0025} shadow-bias={-0.00014} />
      <pointLight position={[2.42, 1.59, 2.56]} intensity={1.28} color="#d1dad2" distance={4.6} decay={2} />
      <pointLight position={[-2.42, 1.25, 2.03]} intensity={0.92} color="#dbbd99" distance={2.7} decay={2} />
    </>
  );
}

const OfficeEnvironment = memo(function OfficeEnvironment() {
  return (
    <Environment frames={1} resolution={128} environmentIntensity={0.33}>
      <Lightformer position={[-4.0, 5.0, 4.1]} scale={[3.7, 2.2]} target={zero} color="#ffe5bf" intensity={1.71} />
      <Lightformer position={[5.8, 3.0, -4.7]} scale={[1.35, 5.58]} target={zero} color="#aacfd5" intensity={1.74} />
      <Lightformer position={[1.9, 5.0, 0.5]} scale={[3.91, 0.76]} target={zero} color="#c8d2d0" intensity={0.83} />
      <Lightformer position={[2.21, 3.04, -5.18]} scale={[1.51, 0.61]} target={zero} color="#ffeccb" intensity={1.87} />
      <Lightformer position={[2.05, -2.85, 3.88]} scale={[0.56, 2.45]} target={zero} color={rightWallBounce.color} intensity={2.22} />
    </Environment>
  );
});

const StaticOffice = memo(function StaticOffice({ shadows }: { shadows?: OfficeShadowMaps }) {
  return (
    <>
      <DeskLighting />
      <Office shadows={shadows} />
      <Keyboard />
      <DeskPeripherals />
    </>
  );
});

function OfficeScene({ power, onProgress }: { power: Power; onProgress: (value: number) => void }) {
  const geometry = useRef<Group>(null);
  const [shadows, setShadows] = useState<OfficeShadowMaps>();
  const onBake = useCallback((maps: OfficeShadowMaps) => {
    setShadows(maps);
    onProgress(88);
  }, [onProgress]);

  useLayoutEffect(() => {
    // Both the base normal and the clearcoat must face away before a light contributes zero.
    geometry.current?.traverse(object => {
      if (object instanceof Mesh && object.material instanceof MeshStandardMaterial) {
        object.material.onBeforeCompile = skipUnlitFragments;
        object.material.needsUpdate = true;
      }
    });
  }, []);

  useEffect(() => {
    if (!shadows) return;
    const frame = requestAnimationFrame(() => onProgress(100));
    return () => cancelAnimationFrame(frame);
  }, [onProgress, shadows]);

  return (
    <>
      <group ref={geometry}>
        <StaticOffice shadows={shadows} />
        <SystemUnit power={power} />
        <Monitor on={power.on} />
      </group>
      <Suspense fallback={null}><BakeOfficeShadows geometry={geometry} onBake={onBake} /></Suspense>
    </>
  );
}

export default function DexScene({ controls, animate, power, presented, onProgress }: {
  controls: ScreenControls;
  animate: boolean;
  power: Power;
  presented: boolean;
  onProgress: (value: number) => void;
}) {
  const moving = animate || diskDurations[power.disk] > 0;
  const lit = power.on;
  const ceiling = useSyncExternalStore(trackViewport, renderPixelRatio, () => 1);
  const [budget, setBudget] = useState(1.25);
  const dpr = Math.min(ceiling, budget);
  useEffect(() => onProgress(34), [onProgress]);

  return (
    <Canvas camera={{ position: sceneEye, fov: 48, near: 0.06, far: 56 }} shadows={{ type: PCFShadowMap }}
      gl={{ toneMappingExposure: 0.99 }} dpr={dpr} frameloop={moving ? "always" : "demand"} onCreated={() => onProgress(61)}>
      <color attach="background" args={["#303736"]} />
      <fogExp2 attach="fog" args={["#4c5857", 0.049]} />
      <View controls={controls} animate={animate} />
      <RenderBudget active={animate && presented} ratio={dpr} ceiling={ceiling} onChange={setBudget} />
      <OfficeEnvironment />
      <OfficeScene power={power} onProgress={onProgress} />
      <pointLight position={[0, display.position[1] - 0.19, 1.62]} intensity={lit ? 0.53 : 0.025} color="#aecce1" distance={2} decay={2} />
      <Factory animate={animate} />
      <BakeShadows />
    </Canvas>
  );
}
