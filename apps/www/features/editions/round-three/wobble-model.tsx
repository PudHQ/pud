"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import { CatmullRomCurve3, type Group, PMREMGenerator, Vector3 } from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { moldFlan, pourCaramel } from "@/components/scenes/flan-geometry";
import type { Pull } from "./wobble";

type Props = { controls: RefObject<Pull>; animate: boolean };
const ink = "#2c111f";

function Line({ points, radius = 0.027 }: { points: number[][]; radius?: number }) {
  const curve = useMemo(() => new CatmullRomCurve3(points.map(([x, y, z]) => new Vector3(x, y, z))), [points]);
  return (
    <mesh>
      <tubeGeometry args={[curve, 20, radius, 7, false]} />
      <meshStandardMaterial color={ink} roughness={0.22} />
    </mesh>
  );
}

function Face() {
  return (
    <group>
      {[-1, 1].map((sign) => (
        <group key={sign} position={[sign * 0.418, 1.03, 1.41]} rotation={[-0.22, sign * 0.25, 0]}>
          <mesh>
            <torusGeometry args={[0.328, 0.047, 14, 50]} />
            <meshStandardMaterial color={ink} roughness={0.17} />
          </mesh>
          <mesh position={[0, 0, -0.035]} scale={[0.306, 0.306, 0.073]}>
            <sphereGeometry args={[1, 32, 20]} />
            <meshStandardMaterial color="#fff4d8" roughness={0.28} />
          </mesh>
          <mesh position={[0.031, 0.007, 0.043]} scale={[0.095, 0.135, 0.039]}>
            <sphereGeometry args={[1, 24, 16]} />
            <meshStandardMaterial color={ink} roughness={0.21} />
          </mesh>
          <mesh position={[0.056, 0.057, 0.079]}>
            <sphereGeometry args={[0.028, 10, 8]} />
            <meshBasicMaterial color="white" />
          </mesh>
          <Line
            points={[
              [sign * 0.32, 0.03, 0],
              [sign * 0.57, 0.025, -0.1],
              [sign * 0.78, -0.025, -0.34],
              [sign * 0.91, -0.1, -0.66],
            ]}
          />
        </group>
      ))}
      <Line
        points={[
          [-0.118, 1.06, 1.47],
          [0, 1.12, 1.5],
          [0.118, 1.06, 1.47],
        ]}
        radius={0.034}
      />
      <Line
        points={[
          [-0.2, 0.625, 1.448],
          [-0.105, 0.555, 1.477],
          [0.035, 0.548, 1.479],
          [0.175, 0.625, 1.453],
        ]}
        radius={0.027}
      />
      {[-1, 1].map((sign) => (
        <mesh
          key={sign}
          position={[sign * 0.81, 0.67, 1.095]}
          rotation={[0, sign * 0.55, 0]}
          scale={[0.145, 0.061, 0.042]}
        >
          <sphereGeometry args={[1, 20, 12]} />
          <meshStandardMaterial color="#ff7359" roughness={0.28} />
        </mesh>
      ))}
      <group position={[0.22, 0.235, 1.475]} rotation={[0.05, 0.13, -0.13]}>
        {[-1, 1].map((sign) => (
          <mesh
            key={sign}
            position={[sign * 0.122, 0, 0]}
            rotation={[0, 0.1, (sign * Math.PI) / 2]}
            scale={[1, 0.97, 0.62]}
          >
            <coneGeometry args={[0.173, 0.26, 4]} />
            <meshStandardMaterial color="#fc184c" roughness={0.24} />
          </mesh>
        ))}
        <mesh scale={[0.077, 0.09, 0.072]}>
          <sphereGeometry args={[1, 14, 12]} />
          <meshStandardMaterial color="#d71547" />
        </mesh>
      </group>
    </group>
  );
}

function Custard({ controls, animate }: Props) {
  const rig = useRef<Group>(null);
  const { gl, scene, viewport, invalidate } = useThree();
  const motion = useRef({ tilt: -0.13, tiltV: 0, squash: 0.1, squashV: 0, turn: 0, turnV: 0, kick: -1 });
  const body = useMemo(() => moldFlan(144), []);
  const glaze = useMemo(() => pourCaramel(144), []);
  const size = Math.min(1.01, viewport.width / 3.52, viewport.height / 2.75);
  useLayoutEffect(() => {
    const room = new RoomEnvironment();
    const generator = new PMREMGenerator(gl);
    const texture = generator.fromScene(room, 0.04);
    scene.environment = texture.texture;
    room.dispose();
    generator.dispose();
    invalidate();
    return () => {
      scene.environment = null;
      texture.dispose();
    };
  }, [gl, scene, invalidate]);
  useEffect(() => {
    const input = controls.current;
    input.repaint = invalidate;
    invalidate();
    return () => {
      delete input.repaint;
    };
  }, [controls, invalidate, animate]);
  useFrame((_, elapsed) => {
    if (!rig.current) return;
    const input = controls.current;
    const m = motion.current;
    if (input.impulse !== m.kick) {
      if (animate) {
        m.squashV += 3.2;
        m.tiltV -= 2.1;
        m.turnV += 1.7;
      }
      m.kick = input.impulse;
    }
    const targetTilt = -input.x * 0.43,
      targetSquash = input.down ? 0.12 + input.y * 0.35 : 0,
      targetTurn = input.x * 1.25;
    const dt = Math.min(Math.max(elapsed, 0.001), 0.035);
    if (animate) {
      m.tiltV = (m.tiltV + (targetTilt - m.tilt) * 107 * dt) * Math.exp(-6.5 * dt);
      m.squashV = (m.squashV + (targetSquash - m.squash) * 145 * dt) * Math.exp(-6.3 * dt);
      m.turnV = (m.turnV + (targetTurn - m.turn) * 72 * dt) * Math.exp(-6.7 * dt);
      m.tilt += m.tiltV * dt;
      m.squash += m.squashV * dt;
      m.turn += m.turnV * dt;
    } else {
      m.tilt = targetTilt;
      m.squash = targetSquash;
      m.turn = targetTurn;
      m.tiltV = m.squashV = m.turnV = 0;
    }
    const height = Math.max(0.5, 1 - m.squash),
      spread = 1 / Math.sqrt(height);
    rig.current.scale.set(spread, height, spread);
    rig.current.rotation.set(-0.04 + m.squash * 0.16, m.turn + 0.08, m.tilt);
    if (
      animate &&
      Math.abs(m.tiltV) +
        Math.abs(m.squashV) +
        Math.abs(m.turnV) +
        Math.abs(targetTilt - m.tilt) +
        Math.abs(targetSquash - m.squash) +
        Math.abs(targetTurn - m.turn) >
        0.002
    )
      invalidate();
  });
  return (
    <group scale={size} position={[0, -size * 0.92, 0]}>
      <group ref={rig}>
        <group scale={[8, 9.3, 8]}>
          <mesh geometry={body}>
            <meshPhysicalMaterial vertexColors clearcoat={0.65} clearcoatRoughness={0.18} roughness={0.3} />
          </mesh>
          <mesh geometry={glaze}>
            <meshPhysicalMaterial color="#792006" clearcoat={0.88} clearcoatRoughness={0.19} roughness={0.25} />
          </mesh>
        </group>
        <Face />
      </group>
    </group>
  );
}

export default function WobbleModel(props: Props) {
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
      camera={{ position: [1.75, 1.15, 5.65], fov: 33 }}
      onCreated={({ camera }) => {
        camera.lookAt(0, 0, 0);
      }}
    >
      <hemisphereLight args={["#fff4d5", "#67446a", 0.8]} />
      <directionalLight position={[-4, 7, 5]} intensity={1.45} color="#fff2e0" />
      <directionalLight position={[3, 2, -4]} intensity={2} color="#b9faff" />
      <Custard {...props} />
    </Canvas>
  );
}
