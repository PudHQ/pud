import { createPortal } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef, type ReactNode } from "react";
import {
  BufferAttribute, BufferGeometry, Color, Group, Matrix3, Matrix4, Mesh, MeshBasicMaterial,
  MeshMatcapMaterial, MeshStandardMaterial, Uint32BufferAttribute, Vector3, Vector4, type Material, type Side, type Texture,
} from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { conveyorDeck, factoryFloor, factoryGround, factoryLampColor, fixtures } from "./factory-layout";

const lamps = fixtures.map(({ position: [x, y, z], power, task }) => ({
  origin: new Vector3(x, y - 0.22, z),
  power,
  task,
}));
const lampColor = new Color(factoryLampColor);
const upperLight = new Color("#99aebf");
const lowerLight = new Color("#535860");

const nearHaze = { value: new Color("#151f2a") };
const farHaze = { value: new Color("#263642") };
const floorHaze = { value: new Color("#334855") };
const fogLampTint = { value: lampColor };
const fogLamps = { value: fixtures.filter(fixture => fixture.task).map(({ position: [x, y, z] }) => new Vector3(x, y - 0.08, z)) };

const volumeFog: Material["onBeforeCompile"] = shader => {
  Object.assign(shader.uniforms, { nearHaze, farHaze, floorHaze, fogLampTint, fogLamps });
  shader.vertexShader = shader.vertexShader
    .replace("#include <fog_pars_vertex>", "varying vec3 vFactoryPosition;")
    .replace("#include <fog_vertex>", `
      vec4 fogPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        fogPosition = instanceMatrix * fogPosition;
      #endif
      vFactoryPosition = (modelMatrix * fogPosition).xyz;
    `);
  shader.fragmentShader = shader.fragmentShader
    .replace("#include <fog_pars_fragment>", `
      varying vec3 vFactoryPosition;
      uniform vec3 nearHaze;
      uniform vec3 farHaze;
      uniform vec3 floorHaze;
      uniform vec3 fogLampTint;
      uniform vec3 fogLamps[${fogLamps.value.length}];

      float fogLampScatter(vec3 point) {
        float light = 0.0;
        for (int i = 0; i < ${fogLamps.value.length}; i++) {
          vec3 toLamp = fogLamps[i] - point;
          float distance2 = max(dot(toLamp, toLamp), 0.10);
          float cone = smoothstep(0.85, 0.98, toLamp.y * inversesqrt(distance2));
          light += 1.48 * cone / (3.0 + distance2);
        }
        return light;
      }
    `)
    .replace("#include <fog_fragment>", `
      // Start at the factory entrance so the office stays outside the volume.
      float ingress = clamp((cameraPosition.z + 4.1) / max(cameraPosition.z - vFactoryPosition.z, 0.001), 0.0, 1.0);
      vec3 entry = mix(cameraPosition, vFactoryPosition, ingress);
      float travel = length(vFactoryPosition - entry);
      float distanceFog = (0.052 + 0.0014 * travel) * travel;

      // Integrate the exponential falloff in density along the ray's change in height.
      float startHeight = max(entry.y - (${factoryFloor}), 0.0) * 0.94;
      float endHeight = max(vFactoryPosition.y - (${factoryFloor}), 0.0) * 0.94;
      float span = endHeight - startHeight;
      float startDensity = exp(-startHeight);
      float lowDensity = abs(span) < 0.01 ? startDensity : (startDensity - exp(-endHeight)) / span;
      float groundFog = 0.42 * travel * lowDensity;

      float extinction = distanceFog + groundFog;
      vec3 air = mix(nearHaze, farHaze, smoothstep(7.0, 26.0, travel));
      air = mix(air, floorHaze, groundFog / max(extinction, 0.001));
      float glow = mix(fogLampScatter(mix(entry, vFactoryPosition, 0.59)), fogLampScatter(mix(entry, vFactoryPosition, 0.87)), 0.62);
      air += fogLampTint * glow;
      gl_FragColor.rgb = mix(gl_FragColor.rgb, linearToOutputTexel(vec4(air, 1.0)).rgb, 1.0 - exp(-extinction));
    `);
};

export function applyFactoryFog(material: Material) {
  if (material.onBeforeCompile === volumeFog) return;
  material.onBeforeCompile = volumeFog;
  material.needsUpdate = true;
}

const deckBounds = { value: new Vector4(conveyorDeck.position[0], conveyorDeck.position[2], ...conveyorDeck.area) };
const groundBounds = { value: new Vector4(factoryGround.position[0], factoryGround.position[2], ...factoryGround.area) };

export function applyConveyorLighting(material: Material, deckLight: Texture, groundLight: Texture) {
  const finish = material instanceof MeshMatcapMaterial
    ? "outgoingLight *= 0.10 + 2.18 * bakedLight;"
    : `
      float facingUp = max(0.0, dot(normal, mat3(viewMatrix) * vec3(0.0, 1.0, 0.0)));
      outgoingLight = outgoingLight * 0.19 + diffuseColor.rgb * bakedLight * (0.24 + 1.06 * facingUp);
    `;
  material.onBeforeCompile = (shader, renderer) => {
    volumeFog(shader, renderer);
    Object.assign(shader.uniforms, { deckLight: { value: deckLight }, groundLight: { value: groundLight }, deckBounds, groundBounds });
    shader.fragmentShader = shader.fragmentShader
      .replace("varying vec3 vFactoryPosition;", `
        varying vec3 vFactoryPosition;
        uniform sampler2D deckLight;
        uniform sampler2D groundLight;
        uniform vec4 deckBounds;
        uniform vec4 groundBounds;
      `)
      .replace("#include <opaque_fragment>", `
        // Sample the fixed bake in world space, including on the moving slats and plates.
        vec2 deckUv = (vFactoryPosition.xz - deckBounds.xy) * vec2(1.0, -1.0) / deckBounds.zw + 0.5;
        vec2 groundUv = (vFactoryPosition.xz - groundBounds.xy) * vec2(1.0, -1.0) / groundBounds.zw + 0.5;
        float aboveGround = smoothstep(${factoryFloor}, ${conveyorDeck.position[1]}, vFactoryPosition.y);
        vec3 bakedLight = mix(texture2D(groundLight, groundUv).rgb, texture2D(deckLight, deckUv).rgb, aboveGround);
        ${finish}
        #include <opaque_fragment>
      `);
  };
  material.needsUpdate = true;
}

function makeFactoryShading() {
  const direction = new Vector3();
  const color = new Color();
  const irradiance = new Color();
  return (position: Vector3, normal: Vector3, material: MeshBasicMaterial | MeshStandardMaterial) => {
    if (!(material instanceof MeshStandardMaterial)) return material.color;
    irradiance.copy(lowerLight).lerp(upperLight, normal.y * 0.5 + 0.5);
    irradiance.multiplyScalar(0.10);
    for (const lamp of lamps) {
      direction.subVectors(lamp.origin, position);
      const distance = Math.max(direction.length(), 0.65);
      direction.divideScalar(distance);
      const facing = Math.max(0, normal.dot(direction));
      const cone = Math.min(1, Math.max(0, (direction.y - 0.71) / 0.26));
      const intensity = lamp.task ? 0.06 + 1.82 * cone * cone * (3 - 2 * cone) : 0.33;
      const range = Math.max(0, 1 - (distance / 9.5) ** 4);
      const energy = facing * intensity * lamp.power * range * range / (Math.PI * distance * distance);
      irradiance.r += lampColor.r * energy;
      irradiance.g += lampColor.g * energy;
      irradiance.b += lampColor.b * energy;
    }
    irradiance.multiplyScalar(1 - material.metalness * 0.33);
    color.copy(material.color).multiply(irradiance);
    color.r += material.emissive.r * material.emissiveIntensity;
    color.g += material.emissive.g * material.emissiveIntensity;
    color.b += material.emissive.b * material.emissiveIntensity;
    return color;
  };
}

type Batch = { side: Side; toneMapped: boolean; fog: boolean; geometries: BufferGeometry[] };

function bakeMeshes(root: Group) {
  root.updateWorldMatrix(true, true);
  const worldToRoot = root.matrixWorld.clone().invert();
  const local = new Matrix4();
  const normalMatrix = new Matrix3();
  const position = new Vector3();
  const normal = new Vector3();
  const shade = makeFactoryShading();
  const batches = new Map<string, Batch>();

  root.traverse(object => {
    if (!(object instanceof Mesh)) return;
    const material = object.material;
    if (!(material instanceof MeshStandardMaterial || material instanceof MeshBasicMaterial)) return;
    const { attributes, index } = object.geometry;
    const vertices = attributes.position;
    const colors = new Float32Array(vertices.count * 3);
    normalMatrix.getNormalMatrix(object.matrixWorld);
    for (let i = 0; i < vertices.count; i++) {
      position.fromBufferAttribute(vertices, i).applyMatrix4(object.matrixWorld);
      normal.fromBufferAttribute(attributes.normal, i).applyNormalMatrix(normalMatrix);
      shade(position, normal, material).toArray(colors, i * 3);
    }
    local.multiplyMatrices(worldToRoot, object.matrixWorld);
    const baked = new BufferGeometry();
    baked.setAttribute("position", vertices.clone().applyMatrix4(local));
    baked.setAttribute("color", new BufferAttribute(colors, 3));
    baked.setIndex(index ?? new Uint32BufferAttribute(Uint32Array.from({ length: vertices.count }, (_, i) => i), 1));
    const { side, toneMapped, fog } = material;
    baked.computeBoundingBox();
    const { min, max } = baked.boundingBox!;
    const column = max.x - min.x > 8 ? "wide" : Math.round((min.x + max.x) / 16);
    const row = max.z - min.z > 8 ? "deep" : Math.round((min.z + max.z) / 16);
    // Local batches let the camera cull hardware beyond the sides of the window.
    const key = `${side}/${toneMapped}/${fog}/${column}/${row}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { side, toneMapped, fog, geometries: [] };
      batches.set(key, batch);
    }
    batch.geometries.push(baked);
  });

  return Array.from(batches.values(), ({ side, toneMapped, fog, geometries }) => {
    const geometry = mergeGeometries(geometries);
    geometry.computeBoundingSphere();
    const material = new MeshBasicMaterial({ side, toneMapped, fog, vertexColors: true });
    if (fog) applyFactoryFog(material);
    return new Mesh(geometry, material);
  });
}

// This group contains opaque factory hardware with solid material colors.
export function BakedFactory({ children }: { children: ReactNode }) {
  const source = useMemo(() => new Group(), []);
  const output = useRef<Group>(null);
  useLayoutEffect(() => {
    if (!output.current) return;
    const target = output.current;
    const meshes = bakeMeshes(source);
    target.add(...meshes);
    return () => {
      target.remove(...meshes);
      for (const mesh of meshes) {
        mesh.geometry.dispose();
        mesh.material.dispose();
      }
    };
  }, [source]);
  return <>{createPortal(children, source)}<group ref={output} /></>;
}
