// Screen-space ink outline: a normal/depth pre-pass finds silhouettes and creases, then a
// full-screen pass draws them over the lit image. This is what gives the bench its drawn look.
import * as THREE from 'three';
import { FLAT, OUTLINED } from './materials';

const vertex = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}`;
const fragment = /* glsl */ `
uniform sampler2D tColor;
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform vec2 texel;
uniform float thickness;
uniform float depthRange;
uniform float depthThreshold;
uniform vec3 lineColor;
varying vec2 vUv;

float edgeAt(vec2 uv, vec4 centerNormal, float centerDepth, vec2 offset) {
  vec4 n = texture2D(tNormal, uv + offset);
  float d = texture2D(tDepth, uv + offset).x * depthRange;
  float coverage = abs(centerNormal.a - n.a);
  if (centerNormal.a < 0.5 && n.a < 0.5) return 0.0;
  if (coverage > 0.5) return 1.0;
  float depthEdge = step(depthThreshold, abs(centerDepth - d));
  vec3 a = normalize(centerNormal.rgb * 2.0 - 1.0);
  vec3 b = normalize(n.rgb * 2.0 - 1.0);
  float normalEdge = step(0.22, 1.0 - dot(a, b));
  return max(depthEdge, normalEdge);
}

void main() {
  vec4 color = texture2D(tColor, vUv);
  vec4 n = texture2D(tNormal, vUv);
  float d = texture2D(tDepth, vUv).x * depthRange;
  float edge = 0.0;
  vec2 step1 = texel * thickness;
  edge = max(edge, edgeAt(vUv, n, d, vec2(step1.x, 0.0)));
  edge = max(edge, edgeAt(vUv, n, d, vec2(-step1.x, 0.0)));
  edge = max(edge, edgeAt(vUv, n, d, vec2(0.0, step1.y)));
  edge = max(edge, edgeAt(vUv, n, d, vec2(0.0, -step1.y)));
  vec2 step2 = step1 * 1.5;
  float soft = 0.0;
  soft = max(soft, edgeAt(vUv, n, d, vec2(step2.x, step2.y)));
  soft = max(soft, edgeAt(vUv, n, d, vec2(-step2.x, step2.y)));
  soft = max(soft, edgeAt(vUv, n, d, vec2(step2.x, -step2.y)));
  soft = max(soft, edgeAt(vUv, n, d, vec2(-step2.x, -step2.y)));
  edge = max(edge, soft * 0.35);
  // The colour target holds premultiplied values; convert to display space before inking.
  vec3 rgb = color.a > 0.0 ? color.rgb / color.a : vec3(0.0);
  gl_FragColor = vec4(rgb, 1.0);
  #include <colorspace_fragment>
  float alpha = max(color.a, edge);
  vec3 inked = mix(gl_FragColor.rgb * color.a, lineColor * alpha, edge / max(alpha, 1e-4));
  gl_FragColor = vec4(inked, alpha);
}`;

export class OutlineRenderer {
  private normal: THREE.WebGLRenderTarget;
  private color: THREE.WebGLRenderTarget;
  private normalMaterial = new THREE.MeshNormalMaterial();
  private quad: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private quadScene = new THREE.Scene();
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  constructor(private renderer: THREE.WebGLRenderer) {
    const size = renderer.getDrawingBufferSize(new THREE.Vector2());
    this.normal = new THREE.WebGLRenderTarget(size.x, size.y, {
      depthTexture: new THREE.DepthTexture(size.x, size.y),
    });
    this.color = new THREE.WebGLRenderTarget(size.x, size.y, {
      samples: 4,
      type: THREE.HalfFloatType,
    });
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        vertexShader: vertex,
        fragmentShader: fragment,
        uniforms: {
          tColor: { value: this.color.texture },
          tNormal: { value: this.normal.texture },
          tDepth: { value: this.normal.depthTexture },
          texel: { value: new THREE.Vector2(1 / size.x, 1 / size.y) },
          thickness: { value: 1.3 },
          depthRange: { value: 1 },
          depthThreshold: { value: 1 },
          lineColor: { value: new THREE.Color('#141a2c') },
        },
        depthTest: false,
        depthWrite: false,
        blending: THREE.NoBlending,
      }),
    );
    this.quad.frustumCulled = false;
    this.quadScene.add(this.quad);
  }
  setSize(width: number, height: number) {
    this.normal.setSize(width, height);
    this.color.setSize(width, height);
    this.quad.material.uniforms.texel!.value.set(1 / width, 1 / height);
  }
  setLineColor(color: string) {
    this.quad.material.uniforms.lineColor!.value.set(color);
  }
  render(scene: THREE.Scene, camera: THREE.OrthographicCamera, zoom: number, pixelRatio: number) {
    const { renderer } = this,
      uniforms = this.quad.material.uniforms;
    uniforms.thickness!.value = 1.3 * pixelRatio * Math.min(1, Math.max(0.6, Math.sqrt(zoom / 6)));
    uniforms.depthRange!.value = camera.far - camera.near;
    // Neighbouring pixels on a sloped face differ by about one pixel footprint in depth.
    uniforms.depthThreshold!.value = 0.6 + 3 / zoom;
    renderer.setClearColor(0x000000, 0);
    camera.layers.set(OUTLINED);
    scene.overrideMaterial = this.normalMaterial;
    renderer.setRenderTarget(this.normal);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = null;
    camera.layers.enable(FLAT);
    renderer.setRenderTarget(this.color);
    renderer.clear();
    renderer.render(scene, camera);
    renderer.setRenderTarget(null);
    renderer.clear();
    renderer.render(this.quadScene, this.quadCamera);
  }
  dispose() {
    this.normal.depthTexture?.dispose();
    this.normal.dispose();
    this.color.dispose();
    this.normalMaterial.dispose();
    this.quad.geometry.dispose();
    this.quad.material.dispose();
  }
}
