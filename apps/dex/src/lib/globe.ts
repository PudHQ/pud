// A low-resolution indexed-color globe. The poster and the interactive frame
// use the same pixels so the masthead also works before JavaScript loads.
export const width = 176;
export const height = 100;
export const radius = 39;
export const ring = { cx: 88, cy: 49, rx: 72, ry: 12, angle: -20 };
export const palette = [
  "", "#102447", "#153867", "#204e8b", "#3269a4", "#5790c2", "#99c6e4",
  "#764128", "#a05735", "#c76a3a", "#e98749", "#ffaf71", "#ffdab0",
  "#7f9cb9", "#daedfb", "#ffe4be",
];

// Longitude and latitude outlines sampled into a small equirectangular map.
const continents = [
  [[-168,67],[-145,71],[-125,68],[-98,74],[-84,70],[-79,62],[-61,65],[-53,52],[-65,45],[-79,33],[-81,25],[-86,30],[-99,22],[-91,18],[-87,21],[-83,11],[-78,8],[-84,8],[-105,20],[-117,32],[-124,43],[-125,52],[-145,60],[-164,54],[-157,61]],
  [[-81,12],[-71,12],[-60,8],[-50,1],[-35,-5],[-40,-21],[-48,-28],[-54,-34],[-60,-40],[-66,-55],[-73,-50],[-75,-34],[-70,-18],[-78,-8]],
  [[-73,82],[-28,83],[-17,73],[-31,68],[-44,59],[-51,64],[-54,74]],
  [[-18,15],[-15,28],[-6,36],[9,37],[17,32],[31,31],[34,23],[43,12],[51,11],[47,1],[40,-10],[40,-17],[32,-27],[27,-34],[18,-35],[12,-20],[12,-7],[7,4],[-4,5],[-13,9]],
  [[-10,36],[-9,44],[-2,44],[-5,49],[4,52],[9,55],[5,59],[15,69],[28,71],[31,65],[49,69],[69,72],[99,77],[125,72],[147,72],[178,65],[168,60],[154,50],[142,46],[135,36],[126,34],[121,23],[109,18],[105,10],[99,7],[102,1],[97,5],[93,17],[87,22],[79,8],[74,12],[69,23],[60,25],[56,18],[44,12],[36,29],[29,36],[21,38],[24,34],[18,38],[13,45],[15,37],[11,41],[8,44],[1,41],[-1,37]],
  [[112,-22],[121,-18],[129,-14],[137,-12],[142,-11],[145,-17],[154,-27],[151,-37],[144,-39],[135,-34],[129,-32],[116,-35]],
  [[-11,51],[-8,58],[-4,59],[1,52],[-5,50]],
  [[43,-13],[51,-12],[49,-24],[45,-26]],
  [[130,32],[135,35],[141,44],[145,44],[141,36],[134,32]],
];

function contains(points: number[][], x: number, y: number) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const [a, b] = points[i];
    const [c, d] = points[j];
    if ((b > y) !== (d > y) && x < (c - a) * (y - b) / (d - b) + a) inside = !inside;
  }
  return inside;
}

const map = Uint8Array.from({ length: 180 * 90 }, (_, i) => {
  const lon = (i % 180) * 2 - 180;
  const lat = 90 - Math.floor(i / 180) * 2;
  return Number(lat < -72 || continents.some(polygon => contains(polygon, lon, lat)));
});
const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const ditherThreshold = (x: number, y: number) => bayer[(y & 3) * 4 + (x & 3)] / 16;
const tau = 2 * Math.PI;
const ringCos = Math.cos(ring.angle * Math.PI / 180);
const ringSin = Math.sin(ring.angle * Math.PI / 180);

export function globeFrame(turn = 0, tilt = 0): Uint8Array {
  const pixels = new Uint8Array(width * height);
  const { cx, cy } = ring;
  function dot(x: number, y: number, color: number) {
    x = Math.round(x); y = Math.round(y);
    if (x >= 0 && x < width && y >= 0 && y < height) pixels[y * width + x] = color;
  }
  function drawRing(front: boolean) {
    for (let i = 0; i < 580; i++) {
      const phase = i / 580 * tau;
      if ((Math.sin(phase) > 0) !== front) continue;
      const x = ring.rx * Math.cos(phase), y = ring.ry * Math.sin(phase);
      const dx = cx + x * ringCos - y * ringSin;
      const dy = cy + x * ringSin + y * ringCos;
      const reflection = ditherThreshold(Math.round(dx), Math.round(dy)) < .7 + .24 * Math.cos(phase + .65);
      dot(dx, dy + 1, front ? 13 : 3);
      dot(dx, dy, front ? (reflection ? 15 : 14) : 5);
    }
  }
  drawRing(false);
  const pitch = 0.28 + tilt;
  const cos = Math.cos(pitch), sin = Math.sin(pitch);
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const vx = (x - cx) / radius, vy = (cy - y) / radius;
      const depth = 1 - vx * vx - vy * vy;
      if (depth < 0) continue;
      const vz = Math.sqrt(depth);
      const lon = Math.atan2(vx, vz * cos - vy * sin) / tau + turn - 0.043;
      const lat = Math.asin(vy * cos + vz * sin) / Math.PI;
      const col = ((Math.floor((lon + 0.5) * 180) % 180) + 180) % 180;
      const row = Math.min(89, Math.max(0, Math.floor((0.5 - lat) * 90)));
      const land = map[row * 180 + col];
      const light = (0.25 - vx * 0.46 + vy * 0.42 + vz * 0.43) * 4.3;
      const screen = ditherThreshold(x, y);
      let tone = Math.max(0, Math.min(5, Math.floor(light + screen)));
      if (!land && ((col % 15 === 0 && row % 2 === 0) || (row % 15 === 0 && col % 2 === 0))) tone = Math.min(5, tone + 1);
      dot(x, y, (land ? 7 : 1) + tone);
    }
  }
  drawRing(true);
  return pixels;
}
