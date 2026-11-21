/// <reference types="@webgpu/types" />
import shader from "./pud-holo.wgsl?raw";
import type { createFoilMesh } from "./pud-foil";

export async function createHologram(canvas: HTMLCanvasElement, print: ImageData, mesh: ReturnType<typeof createFoilMesh>, onLost: () => void) {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: "low-power" });
  if (!adapter) return;
  const context = canvas.getContext("webgpu");
  if (!context) return;
  const device = await adapter.requestDevice();
  try {
    const extended = matchMedia("(dynamic-range: high)").matches;
    let format: GPUTextureFormat = extended ? "rgba16float" : navigator.gpu.getPreferredCanvasFormat();
    const configure = (hdr: boolean) => context.configure({
      device, format, alphaMode: "premultiplied", colorSpace: "srgb", toneMapping: { mode: hdr ? "extended" : "standard" },
    });
    let hdr = false;
    if (extended) {
      device.pushErrorScope("validation");
      try {
        configure(true);
        hdr = context.getConfiguration?.()?.toneMapping?.mode === "extended";
      } catch { /* Older implementations only expose the standard canvas. */ }
      if (await device.popErrorScope()) hdr = false;
    }
    if (!hdr) {
      format = navigator.gpu.getPreferredCanvasFormat();
      configure(false);
    }

    const module = device.createShaderModule({ code: shader });
    const over: GPUBlendComponent = { srcFactor: "one", dstFactor: "one-minus-src-alpha" };
    const pipeline = await device.createRenderPipelineAsync({
      layout: "auto",
      vertex: { module, entryPoint: "vertex", buffers: [{ arrayStride: 28, attributes: [
        { shaderLocation: 0, offset: 0, format: "float32x2" },
        { shaderLocation: 1, offset: 8, format: "float32x2" },
        { shaderLocation: 2, offset: 16, format: "float32x3" },
      ] }] },
      fragment: { module, entryPoint: "fragment", targets: [{ format, blend: { color: over, alpha: over } }] },
      primitive: { topology: "triangle-list", frontFace: "cw" },
    });
    const texture = device.createTexture({ size: [print.width, print.height], format: "rgba8unorm",
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST });
    device.queue.writeTexture({ texture }, new Uint8Array(print.data), { bytesPerRow: print.width * 4 }, [print.width, print.height]);
    const points = new Float32Array(mesh.vertices.length * 7), order = new Uint16Array(mesh.triangles.length * 3);
    const lighting = new Float32Array(8);
    const buffer = (size: number, usage: GPUBufferUsageFlags) => device.createBuffer({ size, usage: usage | GPUBufferUsage.COPY_DST });
    const vertices = buffer(points.byteLength, GPUBufferUsage.VERTEX), indices = buffer(order.byteLength, GPUBufferUsage.INDEX);
    const uniforms = buffer(lighting.byteLength, GPUBufferUsage.UNIFORM);
    const bindings = device.createBindGroup({ layout: pipeline.getBindGroupLayout(0), entries: [
      { binding: 0, resource: texture.createView() }, { binding: 1, resource: { buffer: uniforms } },
    ] });

    function draw(bend: number, bearing: number, lightX: number, lightY: number) {
      mesh.pose(bend, bearing);
      let i = 0;
      for (const p of mesh.vertices) {
        points[i++] = 2 * p.x / mesh.width - 1; points[i++] = 1 - 2 * p.y / mesh.height;
        points[i++] = p.u; points[i++] = p.v;
        points[i++] = p.nx; points[i++] = p.ny; points[i++] = p.nz;
      }
      i = 0;
      for (const { a, b, c } of mesh.triangles) {
        order[i++] = a.index; order[i++] = b.index; order[i++] = c.index;
      }
      lighting.set([lightX, lightY, bend, Number(hdr), Math.cos(bearing), Math.sin(bearing)]);
      device.queue.writeBuffer(vertices, 0, points);
      device.queue.writeBuffer(indices, 0, order);
      device.queue.writeBuffer(uniforms, 0, lighting);
      const commands = device.createCommandEncoder();
      const pass = commands.beginRenderPass({ colorAttachments: [{ view: context!.getCurrentTexture().createView(),
        clearValue: [0, 0, 0, 0], loadOp: "clear", storeOp: "store" }] });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindings);
      pass.setVertexBuffer(0, vertices);
      pass.setIndexBuffer(indices, "uint16");
      pass.drawIndexed(order.length);
      pass.end();
      device.queue.submit([commands.finish()]);
    }

    void device.lost.then(onLost);
    return { draw, hdr, destroy: () => device.destroy() };
  } catch (error) {
    device.destroy();
    throw error;
  }
}
