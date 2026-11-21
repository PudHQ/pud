export interface Spark {
  x: number;
  y: number;
  size: number;
  opacity: number;
  warmth: number;
  pixel?: boolean;
}

const vertexSource = `
  attribute vec2 position;
  attribute vec4 spark;
  uniform vec2 viewport;
  uniform float pixelRatio;
  varying vec3 light;

  void main() {
    gl_Position = vec4(position / viewport * vec2(2.0, -2.0) + vec2(-1.0, 1.0), 0.0, 1.0);
    gl_PointSize = spark.x * pixelRatio;
    light = spark.yzw;
  }
`;

const fragmentSource = `
  precision mediump float;
  varying vec3 light;

  void main() {
    vec2 p = gl_PointCoord * 2.0 - 1.0;
    float distanceToCenter = length(p);
    vec2 arms = abs(mat2(0.97, -0.24, 0.24, 0.97) * p);
    float rays = exp(-min(26.0 * arms.x + 3.8 * arms.y, 26.0 * arms.y + 3.8 * arms.x));
    float halo = exp(-6.0 * dot(p, p));
    float core = 1.0 - smoothstep(0.02, 0.19, distanceToCenter);
    float fade = 1.0 - smoothstep(0.55, 1.0, distanceToCenter);
    float square = 1.0 - step(0.32, max(abs(p.x), abs(p.y)));
    float silhouette = mix(rays * 0.9 + halo * 0.26 + core, square + halo * 0.18, light.z);
    float alpha = min(1.0, silhouette * fade * light.x);
    vec3 rim = mix(vec3(0.35, 0.78, 1.0), vec3(1.0, 0.43, 0.16), light.y);
    vec3 color = mix(rim, vec3(1.0, 0.97, 0.88), mix(max(core, rays), 0.62, light.z));
    gl_FragColor = vec4(color * alpha, alpha);
  }
`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
}

export function createOrbitSparks(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("webgl", { depth: false, antialias: false, powerPreference: "low-power" });
  if (!context) return;
  const gl = context;
  const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
  const program = vertex && fragment && gl.createProgram();
  if (program) {
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
  }
  if (vertex) gl.deleteShader(vertex);
  if (fragment) gl.deleteShader(fragment);
  if (!program) return;

  const buffer = gl.getProgramParameter(program, gl.LINK_STATUS) && gl.createBuffer();
  if (!buffer) {
    gl.deleteProgram(program);
    return;
  }

  const stride = 6;
  let data = new Float32Array(32 * stride);
  const position = gl.getAttribLocation(program, "position");
  const spark = gl.getAttribLocation(program, "spark");
  const viewport = gl.getUniformLocation(program, "viewport");
  const pixelRatio = gl.getUniformLocation(program, "pixelRatio");
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.enableVertexAttribArray(spark);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, stride * 4, 0);
  gl.vertexAttribPointer(spark, 4, gl.FLOAT, false, stride * 4, 8);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

  function resize(width: number, height: number) {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const pixelsWide = Math.round(width * ratio), pixelsHigh = Math.round(height * ratio);
    if (canvas.width !== pixelsWide) canvas.width = pixelsWide;
    if (canvas.height !== pixelsHigh) canvas.height = pixelsHigh;
    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    gl.uniform2f(viewport, width, height);
    gl.uniform1f(pixelRatio, ratio);
  }

  function draw(sparks: Spark[]) {
    if (gl.isContextLost()) return;
    const count = sparks.length;
    if (count * stride > data.length) {
      data = new Float32Array(Math.max(data.length * 2, count * stride));
      gl.bufferData(gl.ARRAY_BUFFER, data.byteLength, gl.DYNAMIC_DRAW);
    }
    for (let i = 0; i < count; i++) {
      const { x, y, size, opacity, warmth, pixel } = sparks[i];
      const offset = i * stride;
      data[offset] = x;
      data[offset + 1] = y;
      data[offset + 2] = size;
      data[offset + 3] = opacity;
      data[offset + 4] = warmth;
      data[offset + 5] = pixel ? 1 : 0;
    }
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, data.subarray(0, count * stride));
    gl.drawArrays(gl.POINTS, 0, count);
  }

  return { resize, draw, destroy() { gl.deleteBuffer(buffer); gl.deleteProgram(program); } };
}
