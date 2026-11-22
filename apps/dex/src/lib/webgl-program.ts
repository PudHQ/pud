function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
  gl.deleteShader(shader);
}

export function linkWebGLProgram(gl: WebGLRenderingContext, vertexSource: string, fragmentSource: string) {
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
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) return program;
  gl.deleteProgram(program);
}
