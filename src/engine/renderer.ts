import type { Sprite } from "./atlas";

const SHADER = /* wgsl */ `
struct U { cam: vec4f, view: vec4f };
@group(0) @binding(0) var<uniform> u: U;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var tex: texture_2d_array<f32>;

struct VOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
  @location(1) col: vec4f,
  @location(2) @interpolate(flat) layer: u32,
};

@vertex
fn vs(@builtin(vertex_index) vi: u32,
      @location(0) rect: vec4f,
      @location(1) uvr: vec4f,
      @location(2) col: vec4f,
      @location(3) layer: f32) -> VOut {
  var corners = array<vec2f, 6>(
    vec2f(0.0, 0.0), vec2f(1.0, 0.0), vec2f(0.0, 1.0),
    vec2f(0.0, 1.0), vec2f(1.0, 0.0), vec2f(1.0, 1.0));
  let c = corners[vi];
  let world = rect.xy + c * rect.zw;
  let p = (world - u.cam.xy) * u.cam.z;
  var o: VOut;
  o.pos = vec4f(p.x / (u.view.x * 0.5), -p.y / (u.view.y * 0.5), 0.0, 1.0);
  o.uv = mix(uvr.xy, uvr.zw, c);
  o.col = col;
  o.layer = u32(layer);
  return o;
}

@fragment
fn fs(i: VOut) -> @location(0) vec4f {
  let t = textureSample(tex, samp, i.uv, i.layer);
  let rgb = min(t.rgb * i.col.rgb, vec3f(t.a));
  return vec4f(rgb, t.a) * i.col.a;
}
`;

const FLOATS = 13;
const MAX_INSTANCES = 32768;

/** Batched, single-draw-call sprite renderer. Sprites are pushed in back-to-front order. */
export class Renderer {
  private pipeline: GPURenderPipeline;
  private bindGroup!: GPUBindGroup;
  private uniforms: GPUBuffer;
  private instances: GPUBuffer;
  private data = new Float32Array(MAX_INSTANCES * FLOATS);
  private count = 0;
  private sampler: GPUSampler;

  static async create(canvas: HTMLCanvasElement): Promise<Renderer> {
    if (!navigator.gpu) throw new Error("WebGPU is not available in this browser.");
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) throw new Error("No WebGPU adapter found.");
    const device = await adapter.requestDevice();
    const context = canvas.getContext("webgpu");
    if (!context) throw new Error("Could not create a WebGPU canvas context.");
    const format = navigator.gpu.getPreferredCanvasFormat();
    context.configure({ device, format, alphaMode: "opaque" });
    return new Renderer(device, context, format);
  }

  private constructor(
    readonly device: GPUDevice,
    private context: GPUCanvasContext,
    format: GPUTextureFormat,
  ) {
    const module = device.createShaderModule({ code: SHADER });
    this.pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: {
        module,
        entryPoint: "vs",
        buffers: [
          {
            arrayStride: FLOATS * 4,
            stepMode: "instance",
            attributes: [
              { shaderLocation: 0, offset: 0, format: "float32x4" },
              { shaderLocation: 1, offset: 16, format: "float32x4" },
              { shaderLocation: 2, offset: 32, format: "float32x4" },
              { shaderLocation: 3, offset: 48, format: "float32" },
            ],
          },
        ],
      },
      fragment: {
        module,
        entryPoint: "fs",
        targets: [
          {
            format,
            blend: {
              color: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
              alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha" },
            },
          },
        ],
      },
      primitive: { topology: "triangle-list" },
    });
    this.uniforms = device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST });
    this.instances = device.createBuffer({
      size: this.data.byteLength,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
    });
    this.sampler = device.createSampler({ magFilter: "linear", minFilter: "linear" });
  }

  setTexture(texture: GPUTexture): void {
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniforms } },
        { binding: 1, resource: this.sampler },
        { binding: 2, resource: texture.createView({ dimension: "2d-array" }) },
      ],
    });
  }

  begin(): void {
    this.count = 0;
  }

  /** Draw a sprite with its anchor at world-px (x, y). tint > 1 brightens. */
  draw(s: Sprite, x: number, y: number, r = 1, g = 1, b = 1, a = 1): void {
    if (this.count >= MAX_INSTANCES) return;
    const o = this.count++ * FLOATS;
    const d = this.data;
    d[o] = x - s.ax;
    d[o + 1] = y - s.ay;
    d[o + 2] = s.w;
    d[o + 3] = s.h;
    d[o + 4] = s.u0;
    d[o + 5] = s.v0;
    d[o + 6] = s.u1;
    d[o + 7] = s.v1;
    d[o + 8] = r;
    d[o + 9] = g;
    d[o + 10] = b;
    d[o + 11] = a;
    d[o + 12] = s.layer;
  }

  end(camX: number, camY: number, zoom: number, viewW: number, viewH: number, clear: [number, number, number]): void {
    const { device } = this;
    device.queue.writeBuffer(this.uniforms, 0, new Float32Array([camX, camY, zoom, 0, viewW, viewH, 0, 0]));
    if (this.count) device.queue.writeBuffer(this.instances, 0, this.data, 0, this.count * FLOATS);
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: this.context.getCurrentTexture().createView(),
          clearValue: { r: clear[0], g: clear[1], b: clear[2], a: 1 },
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    if (this.count) {
      pass.setPipeline(this.pipeline);
      pass.setBindGroup(0, this.bindGroup);
      pass.setVertexBuffer(0, this.instances);
      pass.draw(6, this.count);
    }
    pass.end();
    device.queue.submit([enc.finish()]);
  }
}
