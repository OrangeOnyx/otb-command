/* A-8 Illustrated mode (2026-10-06, operator: "a stylized version that would
   look like the photo"). A post-process pass over the Photo-mode splat render:
   a 4-sector Kuwahara filter (flattens texture into painted strokes while
   keeping edges), soft ink edges from a Sobel on luminance, and a warm
   presentation grade. It paints the real capture, so it reads as the photo
   but is not an exact match. */
export const IllustrateShader = {
  name: "IllustrateShader",
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: [1, 1] },
    ink: { value: 0.55 },
    warmth: { value: 1.0 }
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform vec2 resolution; uniform float ink; uniform float warmth;
    varying vec2 vUv;
    const int R = 4;
    float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }
    void main() {
      vec2 px = 1.0 / resolution;
      vec3 mean[4]; vec3 sq[4];
      for (int k = 0; k < 4; k++) { mean[k] = vec3(0.0); sq[k] = vec3(0.0); }
      for (int j = 0; j <= R; j++) for (int i = 0; i <= R; i++) {
        vec3 a = texture2D(tDiffuse, vUv + vec2(-i, -j) * px).rgb; mean[0] += a; sq[0] += a * a;
        vec3 b = texture2D(tDiffuse, vUv + vec2( i, -j) * px).rgb; mean[1] += b; sq[1] += b * b;
        vec3 c = texture2D(tDiffuse, vUv + vec2(-i,  j) * px).rgb; mean[2] += c; sq[2] += c * c;
        vec3 d = texture2D(tDiffuse, vUv + vec2( i,  j) * px).rgb; mean[3] += d; sq[3] += d * d;
      }
      float n = float((R + 1) * (R + 1)), best = 1e9; vec3 col = vec3(0.0);
      for (int k = 0; k < 4; k++) {
        vec3 m = mean[k] / n; vec3 v = abs(sq[k] / n - m * m);
        float s = v.r + v.g + v.b;
        if (s < best) { best = s; col = m; }
      }
      // Sobel ink lines on luminance.
      float tl = luma(texture2D(tDiffuse, vUv + vec2(-1, 1) * px).rgb), t = luma(texture2D(tDiffuse, vUv + vec2(0, 1) * px).rgb), tr = luma(texture2D(tDiffuse, vUv + vec2(1, 1) * px).rgb);
      float l = luma(texture2D(tDiffuse, vUv + vec2(-1, 0) * px).rgb), r = luma(texture2D(tDiffuse, vUv + vec2(1, 0) * px).rgb);
      float bl = luma(texture2D(tDiffuse, vUv + vec2(-1, -1) * px).rgb), b = luma(texture2D(tDiffuse, vUv + vec2(0, -1) * px).rgb), br = luma(texture2D(tDiffuse, vUv + vec2(1, -1) * px).rgb);
      float gx = -tl - 2.0 * l - bl + tr + 2.0 * r + br, gy = -bl - 2.0 * b - br + tl + 2.0 * t + tr;
      float edge = smoothstep(0.12, 0.42, length(vec2(gx, gy)));
      // Presentation grade: gentle saturation lift and a warm, golden cast.
      float y = luma(col);
      col = mix(vec3(y), col, 1.18);
      col *= mix(vec3(1.0), vec3(1.07, 1.0, 0.88), warmth);
      col = mix(col, col * 0.32, edge * ink);
      gl_FragColor = vec4(col, 1.0);
    }`
};
