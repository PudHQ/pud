---
name: webgl-scenes
description: Build, edit, or review WebGL scenes in Pud with a measured 60 fps target. Use for changes to scene geometry, materials, lighting, shadows, fog, CRT compositing, or animation.
---

# WebGL scenes

Require sustained 60 fps for every scene change, including visual-only work. A 60 Hz display provides about 16.7 ms per frame for the whole page. Leave headroom for input and compositing.

## Measure before and after

- Use the running app on its assigned port and the hardware-backed in-app browser. Match browser, GPU, viewport, device pixel ratio, and scene state between measurements. Keep other test runs out of the timing window.
- Sample several seconds of actual scene renders after the first load and shader compilation. Check steady animation and continuous interaction, including camera movement and any moving shadows or embedded content. Check a narrow viewport when the camera or UI changes with the aspect ratio.
- Record frame rate, 95th-percentile frame interval, frames over 25 ms, render resolution, draw calls, and triangles. Where supported, use asynchronous GPU timer queries and measure CPU submission separately. A requestAnimationFrame counter only measures scene rendering if the scene draws on every callback.
- Check cold load and first interaction separately for shader compilation, model or texture upload, synchronous readbacks, and other stalls. Verify the offscreen and reduced-motion paths idle.

## Keep rendering within budget

- Isolate GPU fill, geometry, shadow passes, JavaScript, and page compositing with focused comparisons before changing fidelity. Recheck the full scene with its overlays and embeds active before accepting the result.
- Bake static lighting and shadow data where possible. Keep static meshes and textures off the per-frame update path. Batch nearby geometry, cull outside the camera, and size tessellation to projected detail.
- Keep shadow refresh tied to caster changes. Check both moving and final contact shadows. Prefer a measured render-resolution fallback for slower GPUs and keep the sharper tier where there is headroom.
- Compare screenshots and interaction behavior alongside timings. Preserve the scene's intended lighting and controls while fixing the measured bottleneck. Include screenshots of visible scene changes in the PR. [PR screenshot workflow](../../engineering/devops/workflow-general.md#screenshots-for-ui-changes)

Use the device and viewport evidence to support any 60 fps claim. If a supported configuration misses the target, keep profiling and fixing it within scope. Report a concrete blocker and the measured result when further verification or improvement is unavailable.
