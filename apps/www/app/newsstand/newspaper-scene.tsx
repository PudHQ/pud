import { Canvas, useLoader } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, type ReactNode } from "react";
import { DoubleSide, ImageLoader, PlaneGeometry } from "three";
import { FittedCamera, usePrint } from "../scenes/props";

const paperWidth = 3.48;
const paperHeight = 2.46;
const pages = [3, 2, 1, 0];
const photoSize = [112, 77] as const;
const inkShades = [32, 67, 103, 146, 190, 224, 241];
const halfTone = [-10, 6, -1, 13];

function drawStoryColumn(ink: CanvasRenderingContext2D, headline: string) {
  const left = 134;
  const width = 56;
  ink.textAlign = "left";
  ink.font = "bold 9px Georgia, serif";

  let line = "";
  let baseline = 55;
  for (const word of headline.split(/\s+/u)) {
    const next = line ? `${line} ${word}` : word;
    if (line && ink.measureText(next).width > width) {
      if (baseline === 85) {
        line += "…";
        break;
      }
      ink.fillText(line, left, baseline, width);
      baseline += 10;
      line = word;
    } else {
      line = next;
    }
  }
  ink.fillText(line, left, baseline, width);

  ink.strokeStyle = "#766b5c";
  ink.lineWidth = 0.7;
  ink.setLineDash([4, 0.7, 7, 0.8, 3, 0.7]);
  for (let y = baseline + 6, row = 0; y < 125; y += 3, row++) {
    ink.lineDashOffset = row * 3;
    ink.beginPath();
    ink.moveTo(left, y);
    ink.lineTo(left + (row % 6 === 5 ? 38 : width), y);
    ink.stroke();
  }
}

function drawCover(ink: CanvasRenderingContext2D, engraving: HTMLImageElement, headline: string) {
  ink.scale(ink.canvas.width / 200, ink.canvas.height / 142);
  ink.fillStyle = "#f2e8d5";
  ink.fillRect(0, 0, 200, 142);
  ink.fillStyle = "#282421";
  ink.fillRect(9, 8, 182, 2);
  ink.fillRect(9, 40, 182, 2);
  ink.font = "bold 29px Georgia, serif";
  ink.textAlign = "center";
  ink.fillText("The Pud Log", 100, 33, 178);

  const pixelArt = document.createElement("canvas");
  pixelArt.width = photoSize[0] * 2;
  pixelArt.height = photoSize[1] * 2;
  const plate = pixelArt.getContext("2d")!;
  plate.imageSmoothingQuality = "high";
  plate.drawImage(engraving, 0, 0, pixelArt.width, pixelArt.height);
  const bitmap = plate.getImageData(0, 0, pixelArt.width, pixelArt.height);
  const { data } = bitmap;
  for (let y = 0; y < pixelArt.height; y++) {
    for (let x = 0; x < pixelArt.width; x++) {
      const i = (y * pixelArt.width + x) * 4;
      const luminance = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
      const dithered = luminance + halfTone[x % 2 + (y % 2) * 2];
      const tone = inkShades[Math.max(0, Math.min(inkShades.length - 1, Math.round((dithered - 30) / 35)))];
      data[i] = tone;
      data[i + 1] = tone * 0.954;
      data[i + 2] = tone * 0.866;
    }
  }
  plate.putImageData(bitmap, 0, 0);
  ink.imageSmoothingEnabled = false;
  ink.drawImage(pixelArt, 9, 48, ...photoSize);
  ink.fillStyle = "#3c342c";
  ink.fillRect(128, 48, 1, 77);
  drawStoryColumn(ink, headline);
  ink.fillStyle = "#282421";
  ink.fillRect(9, 131, 182, 2);
}

function useFoldedSheet() {
  const sheet = useMemo(() => {
    const geometry = new PlaneGeometry(paperWidth, paperHeight, 36, 26);
    const coordinates = geometry.attributes.position;
    for (let index = 0; index < coordinates.count; index++) {
      const x = coordinates.getX(index);
      const y = coordinates.getY(index);
      const across = x / (paperWidth / 2);
      const crease = 0.12 * Math.exp(-Math.abs(y + 0.14) * 9.1);
      const corner = 0.21 * Math.max(0, across) ** 4 * (0.68 - y * 0.2);
      coordinates.setZ(index, crease + corner + 0.054 * across ** 4 - y ** 2 * 0.028);
    }
    geometry.computeVertexNormals();
    return geometry;
  }, []);
  useEffect(() => () => sheet.dispose(), [sheet]);
  return sheet;
}

function FoldedPaper({ headline }: { headline: string }) {
  const engraving = useLoader(ImageLoader, "/pud-log-engraving.webp");
  const paint = useCallback((ink: CanvasRenderingContext2D) => drawCover(ink, engraving, headline), [engraving, headline]);
  const cover = usePrint(800, 568, paint);
  const sheet = useFoldedSheet();
  return (
    <group rotation={[-0.65, -0.135, 0.11]}>
      {pages.map(page => (
        <mesh key={page} geometry={sheet} position={[page * 0.011, -page * 0.019, -page * 0.021]}>
          <meshStandardMaterial map={page === 0 ? cover : undefined} color={page === 0 ? "#ffffff" : page % 2 ? "#ac9677" : "#e4d1ac"}
            side={DoubleSide} roughness={0.93} />
        </mesh>
      ))}
    </group>
  );
}

export default function NewspaperScene({ headline, fallback }: { headline: string; fallback: ReactNode }) {
  return (
    <Canvas frameloop="demand" dpr={[1, 1.7]} fallback={fallback}>
      <FittedCamera width={4.15} height={2.95} position={[1.52, 2.25, 8.7]} target={[0, 0, 0]} />
      <hemisphereLight args={["#fff6e8", "#988570", 1.35]} />
      <directionalLight position={[-4, 6, 4]} intensity={2.1} color="#fff1dc" />
      <FoldedPaper headline={headline} />
    </Canvas>
  );
}
