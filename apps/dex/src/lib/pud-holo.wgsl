struct Sheet {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@vertex fn vertex(@location(0) position: vec2f, @location(1) uv: vec2f, @location(2) normal: vec3f) -> Sheet {
  return Sheet(vec4f(position, 0.0, 1.0), uv, normal);
}

struct Lighting {
  view: vec2f, bend: f32, extended: f32,
  foldAxis: vec2f, _pad: vec2f,
};
@group(0) @binding(0) var sprite: texture_2d<f32>;
@group(0) @binding(1) var<uniform> light: Lighting;

fn pigmentAt(p: vec2i) -> vec4f {
  return textureLoad(sprite, clamp(p, vec2i(0), vec2i(textureDimensions(sprite)) - 1), 0);
}

// A rectangular studio light seen in reflection. Its long side runs diagonally
// across the sheet. The different widths give chrome its sharp light/dark edges.
fn strip(distance: f32, width: f32) -> f32 {
  let t = distance / width;
  return exp(-t * t);
}

fn displayColor(radiance: vec3f) -> vec3f {
  var rgb = radiance;
  if (light.extended > 0.5) {
    // Keep the paper near reference white, with up to four stops of input
    // compressed into the display's specular headroom.
    let over = max(rgb - 1.0, vec3f(0.0));
    rgb = min(rgb, vec3f(1.0)) + 3.0 * over / (3.0 + over);
  } else {
    rgb = clamp((rgb * (2.51 * rgb + 0.03)) / (rgb * (2.43 * rgb + 0.59) + 0.14), vec3f(0.0), vec3f(1.0));
  }
  return select(12.92 * rgb, 1.055 * pow(rgb, vec3f(1.0 / 2.4)) - 0.055, rgb > vec3f(0.0031308));
}

@fragment fn fragment(sheet: Sheet, @builtin(front_facing) faceUp: bool) -> @location(0) vec4f {
  let p = vec2i(floor(sheet.uv * vec2f(textureDimensions(sprite))));
  let texel = pigmentAt(p);
  if (texel.a < 0.005) { discard; }

  // The original ink acts as a tiny relief map. Lenses, the cap and the bow
  // each catch a highlight, while the printed pixels keep their exact shape.
  let ink = texel.r;
  let slope = vec2f(pigmentAt(p - vec2i(1, 0)).r - pigmentAt(p + vec2i(1, 0)).r,
                    pigmentAt(p - vec2i(0, 1)).r - pigmentAt(p + vec2i(0, 1)).r);
  let curve = (sheet.uv - vec2f(0.49, 0.50)) * vec2f(0.94, 0.75);
  let emboss = curve + 0.19 * slope;
  let axis = light.foldAxis;
  let crossAxis = vec2f(-axis.y, axis.x);
  let flat = normalize(sheet.normal);
  let tangent = vec3f(axis * flat.z, -dot(flat.xy, axis));
  let normal = normalize(flat + dot(emboss, axis) * tangent + dot(emboss, crossAxis) * vec3f(crossAxis, 0.0));
  let view = normalize(vec3f(light.view, 1.0));
  let reflection = reflect(-view, normal);
  let stripe = dot(reflection.xy, vec2f(0.92, 0.39));
  let white = 3.7 * strip(stripe + 0.36, 0.085) + 0.8 * strip(stripe + 0.35, 0.25);
  let gold = 1.75 * strip(stripe - 0.55, 0.16);
  let glance = abs(dot(normal, view));

  if (!faceUp) {
    let redFilm = vec3f(0.43 + 0.32 * ink, 0.019 + 0.043 * ink, 0.012 + 0.026 * ink);
    let gleam = 0.20 * white + 0.42 * pow(1.0 - min(glance, 1.0), 4.0);
    let opacity = texel.a * (0.86 - 0.12 * ink);
    return vec4f(displayColor(redFilm + gleam * vec3f(1.0, 0.48, 0.29)) * opacity, opacity);
  }

  // Approximate thin-film interference at three visible wavelengths (nm).
  // Thickness varies across the stamped foil; angle changes the optical path.
  let thickness = 350.0 + 185.0 * sheet.uv.x + 72.0 * sheet.uv.y + 33.0 * sin(9.0 * sheet.uv.y);
  let opticalPath = 2.0 * 1.45 * thickness * sqrt(1.0 - (1.0 - glance * glance) / (1.45 * 1.45));
  let spectrum = pow(0.5 + 0.5 * cos(6.2831853 * opticalPath / vec3f(650.0, 535.0, 455.0)), vec3f(2.0));
  let holo = strip(stripe - 0.09, 0.16 + 0.10 * abs(light.bend));
  let etched = 0.93 + 0.07 * cos(1.5 * f32(p.x) - 0.8 * f32(p.y));
  let coating = smoothstep(0.065, 0.23, ink);
  let silver = mix(vec3f(0.33, 0.42, 0.56), vec3f(0.89, 0.92, 0.95), smoothstep(-0.78, 0.46, reflection.y));
  let paper = pow(ink, 2.15) * silver * (1.0 - 0.59 * holo);
  let reflected = white * vec3f(0.92, 0.96, 1.0) + gold * vec3f(1.0, 0.50, 0.115) + 1.8 * holo * etched * spectrum;
  let chrome = paper + coating * (0.24 + 0.58 * ink) * reflected + vec3f(0.008);
  return vec4f(displayColor(chrome) * texel.a, texel.a);
}
