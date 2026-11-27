import { useEffect, useMemo } from "react";
import { DataTexture, LinearFilter, LinearMipmapLinearFilter, RedFormat, RepeatWrapping } from "three";

export function useSurfaceGrain(repeatX: number, repeatY: number, brushed = false) {
  const texture = useMemo(() => {
    const size = 128;
    const grain = new Uint8Array(size * size);
    let seed = 37779;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return (seed >>> 24) / 255;
    };
    for (let row = 0; row < size; row++) {
      const streak = brushed ? (random() - 0.5) * 63 : 0;
      for (let column = 0; column < size; column++) grain[row * size + column] = 128 + streak + (random() - 0.5) * 72;
    }
    const map = new DataTexture(grain, size, size, RedFormat);
    map.wrapS = map.wrapT = RepeatWrapping;
    map.repeat.set(repeatX, repeatY);
    map.generateMipmaps = true;
    map.minFilter = LinearMipmapLinearFilter;
    map.magFilter = LinearFilter;
    map.needsUpdate = true;
    return map;
  }, [repeatX, repeatY, brushed]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}
