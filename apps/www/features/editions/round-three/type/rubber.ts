export type Dent = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  depth: number;
};

type Pt = { x: number; y: number };
/** A regular mesh is continuous through every triangle, even when a letter crosses the pointer. */
export function drawRubber(
  ctx: CanvasRenderingContext2D,
  art: HTMLCanvasElement,
  width: number,
  height: number,
  dent: Dent,
) {
  ctx.clearRect(0, 0, width, height);
  if (Math.abs(dent.dx) + Math.abs(dent.dy) + Math.abs(dent.depth) < 0.001) {
    ctx.drawImage(art, 0, 0, width, height);
    return;
  }
  const columns = 22,
    rows = 8;
  const sw = art.width / columns,
    sh = art.height / rows;
  const ratio = width / height;
  function point(col: number, row: number): Pt {
    const x = col / columns,
      y = row / rows;
    const ox = (x - dent.x) * ratio,
      oy = y - dent.y;
    const influence = Math.exp(-(ox * ox + oy * oy) * 4);
    return {
      x: (x + dent.dx * influence - (ox / ratio) * dent.depth * 0.37 * influence) * width,
      y: (y + dent.dy * influence - oy * dent.depth * 0.37 * influence) * height,
    };
  }
  // Affine patches share all four displaced vertices. Source rectangles keep raster work bounded.
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const a = point(col, row),
        b = point(col + 1, row),
        d = point(col, row + 1),
        c = point(col + 1, row + 1);
      const sx = col * sw,
        sy = row * sh;
      for (const second of [false, true]) {
        const origin = second ? c : a;
        const ex = second ? d : b,
          ey = second ? b : d;
        const sign = second ? -1 : 1;
        ctx.save();
        ctx.beginPath();
        // Adjacent antialiased clip paths leave a hairline at their shared edge.
        // Bleed both the sampling rectangle and its clip by a pair of device pixels.
        const mid = {
          x: (origin.x + ex.x + ey.x) / 3,
          y: (origin.y + ex.y + ey.y) / 3,
        };
        const bleed = 1 + 7 / Math.max(15, Math.min(width / columns, height / rows));
        ctx.moveTo(mid.x + (origin.x - mid.x) * bleed, mid.y + (origin.y - mid.y) * bleed);
        ctx.lineTo(mid.x + (ex.x - mid.x) * bleed, mid.y + (ex.y - mid.y) * bleed);
        ctx.lineTo(mid.x + (ey.x - mid.x) * bleed, mid.y + (ey.y - mid.y) * bleed);
        ctx.closePath();
        ctx.clip();
        ctx.transform(
          ((ex.x - origin.x) / sw) * sign,
          ((ex.y - origin.y) / sw) * sign,
          ((ey.x - origin.x) / sh) * sign,
          ((ey.y - origin.y) / sh) * sign,
          origin.x,
          origin.y,
        );
        const padX = sw * (bleed - 1),
          padY = sh * (bleed - 1);
        const left = Math.max(0, sx - padX),
          top = Math.max(0, sy - padY);
        const dw = Math.min(art.width, sx + sw + padX) - left,
          dh = Math.min(art.height, sy + sh + padY) - top;
        ctx.drawImage(
          art,
          left,
          top,
          dw,
          dh,
          (second ? -sw : 0) + left - sx,
          (second ? -sh : 0) + top - sy,
          dw,
          dh,
        );
        ctx.restore();
      }
    }
  }
}

/** One textured triangle mesh on hardware. The clipped 2D patches above use the same deformation. */
export function rubberGpu(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", {
    alpha: true,
    antialias: true,
    depth: false,
    stencil: false,
  });
  if (!gl) return null;
  const vertex = gl.createShader(gl.VERTEX_SHADER),
    fragment = gl.createShader(gl.FRAGMENT_SHADER);
  const program = gl.createProgram(),
    mesh = gl.createBuffer(),
    texture = gl.createTexture();
  if (!vertex || !fragment || !program || !mesh || !texture) return null;
  gl.shaderSource(
    vertex,
    `attribute vec2 uv;
    uniform vec4 grip;
    uniform float depth,aspect;
    varying vec2 sampleAt;
    void main() {
      vec2 d=uv-grip.xy;
      vec2 distanceInHeight=vec2(d.x*aspect,d.y);
      float influence=exp(-4.0*dot(distanceInHeight,distanceInHeight));
      vec2 p=uv+influence*(grip.zw-d*depth*0.37);
      sampleAt=uv; gl_Position=vec4(p.x*2.0-1.0,1.0-p.y*2.0,0.,1.);
    }`,
  );
  gl.shaderSource(
    fragment,
    `precision mediump float;
    uniform sampler2D mould; varying vec2 sampleAt;
    void main(){gl_FragColor=texture2D(mould,sampleAt);}`,
  );
  gl.compileShader(vertex);
  gl.compileShader(fragment);
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    gl.deleteBuffer(mesh);
    gl.deleteTexture(texture);
    return null;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, mesh);
  const cells: number[] = [],
    columns = 72,
    rows = 34;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < columns; c++) {
      const x = c / columns,
        y = r / rows,
        x1 = (c + 1) / columns,
        y1 = (r + 1) / rows;
      cells.push(x, y, x1, y, x, y1, x1, y, x1, y1, x, y1);
    }
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cells), gl.STATIC_DRAW);
  const uv = gl.getAttribLocation(program, "uv");
  gl.enableVertexAttribArray(uv);
  gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const grip = gl.getUniformLocation(program, "grip"),
    depth = gl.getUniformLocation(program, "depth"),
    aspect = gl.getUniformLocation(program, "aspect");
  let previous = "";
  return {
    draw(art: HTMLCanvasElement, source: string, w: number, h: number, dent: Dent) {
      if (previous !== source) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, art);
        previous = source;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform4f(grip, dent.x, dent.y, dent.dx, dent.dy);
      gl.uniform1f(depth, dent.depth);
      gl.uniform1f(aspect, w / h);
      gl.drawArrays(gl.TRIANGLES, 0, cells.length / 2);
    },
    dispose() {
      gl.deleteBuffer(mesh);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    },
  };
}
