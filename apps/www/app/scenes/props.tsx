import { OrthographicCamera, RoundedBox } from "@react-three/drei";
import { type ThreeElements, useThree } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import { CanvasTexture, NearestFilter, SRGBColorSpace, type ColorRepresentation, type Path, type Texture, type Vector3Tuple } from "three";

export function traceRoundedRect<T extends Path>(path: T, x: number, y: number, width: number, height: number, radius: number): T {
  const l = x - width / 2;
  const r = x + width / 2;
  const b = y - height / 2;
  const t = y + height / 2;
  path.moveTo(l + radius, b);
  path.lineTo(r - radius, b);
  path.quadraticCurveTo(r, b, r, b + radius);
  path.lineTo(r, t - radius);
  path.quadraticCurveTo(r, t, r - radius, t);
  path.lineTo(l + radius, t);
  path.quadraticCurveTo(l, t, l, t - radius);
  path.lineTo(l, b + radius);
  path.quadraticCurveTo(l, b, l + radius, b);
  path.closePath();
  return path;
}

export function Block({ size, color, radius = 0, roughness = 0.72, metalness = 0, bumpMap, ...props }:
  Omit<ThreeElements["mesh"], "children" | "args" | "ref"> & {
    size: Vector3Tuple;
    color: ColorRepresentation;
    radius?: number;
    roughness?: number;
    metalness?: number;
    bumpMap?: Texture;
  }) {
  const material = <meshStandardMaterial color={color} roughness={roughness} metalness={metalness} bumpMap={bumpMap} bumpScale={0.014} />;
  return radius ? (
    <RoundedBox args={size} radius={radius} smoothness={3} {...props}>{material}</RoundedBox>
  ) : (
    <mesh {...props}><boxGeometry args={size} />{material}</mesh>
  );
}

export function FittedCamera({ width, height, position, target }: {
  width: number;
  height: number;
  position: Vector3Tuple;
  target: Vector3Tuple;
}) {
  const size = useThree(state => state.size);
  return (
    <OrthographicCamera
      makeDefault
      position={position}
      zoom={Math.min(size.width / width, size.height / height)}
      near={0.1}
      far={80}
      onUpdate={camera => camera.lookAt(...target)}
    />
  );
}

export function usePrint(width: number, height: number, draw: (ink: CanvasRenderingContext2D) => void, pixelated = false) {
  const print = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ink = canvas.getContext("2d");
    if (!ink) throw new Error("Could not draw the scene artwork");
    draw(ink);
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    if (pixelated) {
      map.minFilter = map.magFilter = NearestFilter;
      map.generateMipmaps = false;
    } else {
      map.anisotropy = 8;
    }
    return map;
  }, [width, height, draw, pixelated]);

  useEffect(() => () => print.dispose(), [print]);
  return print;
}

export function Print({ size, map, ...props }:
  Omit<ThreeElements["mesh"], "children" | "ref"> & { size: [number, number]; map: CanvasTexture }) {
  return (
    <mesh {...props}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>
  );
}
