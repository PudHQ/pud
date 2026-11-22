import fragmentSource from "./melt-scene.frag?raw";
import vertexSource from "./melt-scene.vert?raw";
import { linkWebGLProgram } from "./webgl-program";

function sheetMesh(columns: number, rows: number) {
  const points = new Float32Array((columns + 1) * (rows + 1) * 2);
  const faces = new Uint16Array(columns * rows * 6);
  let point = 0;
  for (let y = 0; y <= rows; y++) {
    for (let x = 0; x <= columns; x++) {
      points[point++] = x / columns;
      points[point++] = y / rows;
    }
  }
  let face = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const top = y * (columns + 1) + x;
      const bottom = top + columns + 1;
      faces.set([top, bottom, top + 1, top + 1, bottom, bottom + 1], face);
      face += 6;
    }
  }
  return { points, faces };
}

export function createMeltScene() {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("webgl", { premultipliedAlpha: false, powerPreference: "low-power" });
  if (!context) return;
  const gl = context;
  const program = linkWebGLProgram(gl, vertexSource, fragmentSource);
  if (!program) return;
  const vertices = gl.createBuffer();
  const indices = gl.createBuffer();

  function destroy() {
    gl.deleteBuffer(vertices);
    gl.deleteBuffer(indices);
    gl.deleteProgram(program ?? null);
    canvas.width = canvas.height = 1;
  }

  if (!vertices || !indices) {
    destroy();
    return;
  }

  const { points, faces } = sheetMesh(64, 52);
  gl.clearColor(.5, .5, 0, 0);
  gl.disable(gl.DITHER);
  gl.enable(gl.DEPTH_TEST);
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, vertices);
  gl.bufferData(gl.ARRAY_BUFFER, points, gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indices);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, faces, gl.STATIC_DRAW);
  const source = gl.getAttribLocation(program, "source");
  gl.enableVertexAttribArray(source);
  gl.vertexAttribPointer(source, 2, gl.FLOAT, false, 0, 0);
  const mapSize = gl.getUniformLocation(program, "mapSize");
  const heat = gl.getUniformLocation(program, "heat");
  const range = gl.getUniformLocation(program, "displacementRange");

  function draw(travel: number, width: number, height: number) {
    if (gl.isContextLost()) return;
    const longestSide = Math.max(width, height);
    const resolution = Math.min(1, (travel === 1 ? 704 : 352) / longestSide);
    const mapWidth = Math.max(1, Math.round(width * resolution));
    const mapHeight = Math.max(1, Math.round(height * resolution));
    if (canvas.width !== mapWidth || canvas.height !== mapHeight) {
      canvas.width = mapWidth;
      canvas.height = mapHeight;
    }
    gl.viewport(0, 0, mapWidth, mapHeight);
    gl.uniform2f(mapSize, mapWidth, mapHeight);
    const spread = travel * travel * (3 - 2 * travel);
    const scale = longestSide * (0.045 + 0.805 * spread);
    gl.uniform1f(heat, travel);
    gl.uniform2f(range, width / scale, height / scale);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.drawElements(gl.TRIANGLES, faces.length, gl.UNSIGNED_SHORT, 0);
    return { href: canvas.toDataURL(), scale };
  }

  return { draw, destroy };
}
