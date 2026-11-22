precision highp float;

uniform vec2 mapSize;
uniform vec2 displacementRange;
uniform float heat;
varying vec2 pagePoint;
varying vec3 surfaceNormal;

void main() {
  vec2 screenPoint = vec2(gl_FragCoord.x / mapSize.x, 1.0 - gl_FragCoord.y / mapSize.y);
  vec2 displacement = 0.5 + (pagePoint - screenPoint) * displacementRange;
  float noise = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  vec2 dither = (vec2(noise, fract(noise + 0.382)) - 0.5) / 255.0;
  displacement += dither * smoothstep(0.33, 0.97, heat);
  vec3 normal = normalize(surfaceNormal);
  vec3 light = normalize(vec3(-0.45, -0.54, 0.72));
  float diffuse = 0.37 + 0.55 * max(dot(normal, light), 0.0);
  float glint = 0.48 * pow(max(0.0, dot(normal, normalize(light + vec3(0.0, 0.0, 1.0)))), 30.0);
  float lighting = mix(1.0, min(1.0, diffuse + glint), smoothstep(0.0, 0.58, heat));

  // SVG uses red and green to look up the live page and blue to shade the sheet.
  gl_FragColor = vec4(displacement, lighting, 1.0);
}
