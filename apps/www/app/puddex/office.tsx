import { Block, usePrint } from "../scenes/props";
import { DeskLamp } from "./desk-lamp";
import { desktopSurface } from "./desk-layout";
import { Clipboard, CoffeeMug } from "./desk-props";
import { deskBake, useBakedLighting } from "./lightmaps";
import { useSurfaceGrain } from "./surface-grain";

const frame = "#333434";
const trim = "#64605a";
const windows = [-4.65, -2.32, 0, 2.32, 4.65];
const quarter = Math.PI / 2;

function drawWood(ink: CanvasRenderingContext2D) {
  const stain = ink.createLinearGradient(0, 0, 0, 512);
  stain.addColorStop(0, "#4f3f32");
  stain.addColorStop(0.31, "#62503f");
  stain.addColorStop(0.54, "#554536");
  stain.addColorStop(0.8, "#695747");
  stain.addColorStop(1, "#564536");
  ink.fillStyle = stain;
  ink.fillRect(0, 0, 1024, 512);
  for (let line = 0; line < 430; line++) {
    const y = (line * 37 + line * line * 13) % 512;
    const left = (line * 37) % 780 - 120;
    const span = 105 + (line * 53) % 610;
    const wobble = (line * 17 % 27) / 6;
    ink.strokeStyle = line % 4 === 0 ? "#c3a27a2e" : "#231b1736";
    ink.lineWidth = 0.36 + line % 4 * 0.31;
    ink.beginPath();
    ink.moveTo(left, y);
    ink.bezierCurveTo(left + span * 0.27, y + wobble, left + span * 0.63, y - 2 * wobble, left + span, y + wobble);
    ink.stroke();
  }
  for (const y of [119, 242, 398]) {
    ink.fillStyle = "#241b1573";
    ink.fillRect(0, y, 1024, 1);
    ink.fillStyle = "#c2a88730";
    ink.fillRect(0, y + 1, 1024, 1);
  }
  const wear = ink.createRadialGradient(500, 356, 3, 500, 356, 167);
  wear.addColorStop(0, "#ccab851b");
  wear.addColorStop(1, "#ccab8500");
  ink.fillStyle = wear;
  ink.fillRect(333, 189, 334, 334);
}

function OfficeWindows() {
  const paint = useSurfaceGrain(2, 6, true);
  return (
    <group position={[0, 0, -2.54]}>
      <Block size={[9.63, 0.4, 0.26]} color="#55534c" position={[0, -0.65, 0]} receiveShadow />
      <Block size={[9.76, 0.16, 0.41]} color={trim} position={[0, -0.41, 0.055]} bumpMap={paint} radius={0.025} receiveShadow />
      <Block size={[9.51, 0.029, 0.022]} color="#77746a" position={[0, -0.348, 0.265]} roughness={0.7} />
      <Block size={[9.64, 0.2, 0.29]} color={frame} position={[0, 2.84, 0]} />
      <Block size={[9.51, 0.089, 0.17]} color="#4e4f48" position={[0, 1.92, 0.026]} bumpMap={paint} />
      {windows.map(x => (
        <group key={x}>
          <Block size={[0.16, 3.27, 0.24]} radius={0.015} color={frame} position={[x, 1.22, 0]} bumpMap={paint} />
          <Block size={[0.045, 3.23, 0.028]} color="#74746a" position={[x + 0.046, 1.21, 0.124]} />
          {[-0.192, 1.912, 2.66].map(y => (
            <mesh key={y} position={[x - 0.023, y, 0.125]} rotation={[quarter, 0, 0]}>
              <cylinderGeometry args={[0.019, 0.019, 0.014, 10]} />
              <meshStandardMaterial color="#797a70" metalness={0.48} roughness={0.62} />
            </mesh>
          ))}
        </group>
      ))}
      {[-3.485, -1.16, 1.16, 3.485].map(x => (
        <mesh key={x} position={[x, 1.205, -0.057]}>
          <planeGeometry args={[2.225, 3.24]} />
          <meshStandardMaterial color="#899d9c" transparent opacity={0.065} depthWrite={false} metalness={0.16} roughness={0.43} />
        </mesh>
      ))}
      {[-5.19, 5.19].map(x => <Block key={x} size={[0.98, 3.7, 0.36]} color="#51524d" position={[x, 1.11, 0]} />)}
    </group>
  );
}

export function Office() {
  const wood = usePrint(1024, 512, drawWood);
  const baked = useBakedLighting(deskBake);
  return (
    <group>
      <Block size={[10.8, 0.14, 7.2]} color="#403d38" position={[0, -0.866, 0.89]} />
      <Block size={[10.8, 0.24, 7.3]} color="#444641" position={[0, 3.11, 0.89]} />
      {[-5.5, 5.5].map(x => <Block key={x} size={[0.31, 4.1, 7.34]} color="#52524e" position={[x, 1.068, 0.84]} />)}
      <OfficeWindows />
      <Block size={[1.78, 0.11, 0.36]} radius={0.025} color="#676852" position={[0, 2.946, -0.81]} />
      <mesh position={[0, 2.879, -0.81]} rotation={[quarter, 0, 0]}>
        <planeGeometry args={[1.58, 0.22]} />
        <meshBasicMaterial color="#8f9694" toneMapped={false} />
      </mesh>
      <Block size={[5.94, 0.148, 4.62]} radius={0.037} color="#534231" position={[0, -0.081, desktopSurface.z]} castShadow receiveShadow />
      <mesh position={deskBake.position} rotation={[-quarter, 0, 0]} receiveShadow>
        <planeGeometry args={deskBake.area} />
        <meshPhysicalMaterial map={wood} {...baked} lightMapIntensity={1.55} aoMapIntensity={0.86}
          roughness={0.66} clearcoat={0.26} clearcoatRoughness={0.64} bumpMap={wood} bumpScale={0.005} />
      </mesh>
      <Block size={[5.93, 0.03, 0.054]} radius={0.012} color="#806749" position={[0, -0.036, 3.286]} />
      <DeskLamp />
      <CoffeeMug />
      <Clipboard />
      <group position={[-1.43, 0.046, 2.37]} rotation={[0, 0.13, 0]}>
        <Block size={[0.40, 0.033, 0.46]} radius={0.01} color="#aca185" castShadow position={[0.018, -0.031, 0.028]} />
        <Block size={[0.42, 0.049, 0.47]} radius={0.016} color="#706749" castShadow />
        <Block size={[0.38, 0.035, 0.43]} radius={0.009} color="#b8ac8e" position={[0.012, 0.023, -0.01]} />
        <Block size={[0.43, 0.022, 0.47]} radius={0.011} color="#827455" position={[0, 0.043, 0]} />
      </group>
    </group>
  );
}
