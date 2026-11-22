attribute vec2 source;
uniform float heat;
varying vec2 pagePoint;
varying vec3 surfaceNormal;

vec2 rolledEdge(float point, float start, float bend) {
  float arc = (1.0 - start) / max(bend, 0.001);
  float t = max(0.0, abs(point) - start) / arc;
  return vec2(sign(point) * (min(abs(point), start) + sin(t) * arc), (1.0 - cos(t)) * arc);
}

vec3 surface(vec2 p) {
  float curl = heat * (1.55 - 0.55 * heat);
  float collapse = smoothstep(0.15, 1.0, heat);
  vec2 across = rolledEdge(p.x, 0.64 + 0.074 * sin(3.4 * p.y + 0.7), curl * (2.91 + 0.23 * sin(3.1 * p.y + 1.0)));
  vec2 down = rolledEdge(p.y, 0.62 + 0.086 * sin(3.8 * p.x - 0.4), curl * (2.82 + 0.26 * sin(3.5 * p.x - 0.5)));

  float centre = (1.0 - 0.72 * p.x * p.x) * (1.0 - 0.67 * p.y * p.y);
  float fold = sin(p.x * 7.4 + p.y * 3.3 + 0.72 * sin(p.y * 5.1));
  float crease = sin(p.y * 8.2 - p.x * 4.4 + 0.9 * sin(p.x * 5.2));
  float gather = smoothstep(0.33, 0.97, heat);
  float pleat = p.y * 10.7 + p.x * 3.4 + 0.83 * sin(p.x * 5.8);
  float height = across.y + down.y - heat * 0.32 * centre
    + collapse * (0.079 * fold + 0.061 * crease) + gather * cos(pleat) * 0.057;

  vec2 plane = vec2(across.x, down.x);
  plane.x += collapse * (0.10 * sin(p.y * 3.2 + p.x * 1.8) + 0.056 * crease) + gather * sin(pleat) * 0.043;
  plane.y += heat * 0.19 * centre + collapse * (0.10 * fold + 0.035 * crease) + gather * sin(pleat) * 0.102;
  plane *= vec2(1.0 - 0.10 * collapse, 1.0 - 0.32 * collapse);
  plane += vec2(-0.027, 0.12 + 0.11 * p.x) * collapse;
  return vec3(plane, height);
}

void main() {
  vec2 p = 2.0 * source - 1.0;
  vec3 point = surface(p);
  vec3 tangentX = surface(p + vec2(0.008, 0.0)) - point;
  vec3 tangentY = surface(p + vec2(0.0, 0.008)) - point;
  surfaceNormal = normalize(cross(tangentX, tangentY));
  pagePoint = source;
  vec2 projected = point.xy / (1.0 - 0.24 * heat * point.z);
  gl_Position = vec4(projected.x, -projected.y, -point.z * 0.75, 1.0);
}
