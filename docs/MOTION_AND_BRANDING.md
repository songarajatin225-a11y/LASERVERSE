# Motion and branding

## Brand assets

- **TEAL logo** — the supplied file, unmodified, at `public/brand/teal-logo.webp` (2000 × 450 px, transparent). It is rendered only through `TealLogo` in `components/brand/Brand.tsx`:
  - never recoloured, redrawn, cropped, filtered, stretched or animated; width is always derived from height at the native 40 : 9 ratio;
  - the grey wordmark (#5F5D5B / #75797C) lacks contrast on the dark UI, so the logo always sits on a warm-white plate (`#f4f2ed`) with clear space of about half the T-mark height;
  - it is never placed on 3D geometry, beams or images.
- **Attribution** — "A laser knowledge platform by Titan Engineering & Automation Limited (TEAL)" appears in the sidebar, the landing page and the footer. The site does not describe itself as an officially launched or endorsed corporate product beyond that line.
- **LASERVERSE wordmark** — an original typographic mark (`Wordmark`), not derived from the TEAL logo.

## Colour

Tokens live in `app/globals.css` (`@theme`). Surfaces are deep navy/graphite (`ink-*`) so beams and scientific visuals read clearly. The brand teal `#009590` (sampled from the logo) is the interactive accent; graphite `#5F5D5B` and steel `#75797C` are secondary.

Wavelength colours carry meaning in visualisations and are always paired with a text label. Visible wavelengths use an approximate sRGB mapping; UV and IR use **false colours** (`wavelengthColor()` in `lib/physics/photon.ts`) and every view that shows an invisible beam says "drawn in false colour". 1064/1070 nm beams are rendered magenta (`#ff3d7f`), CO₂ and other long-wave IR amber.

## Reference site

The brief named motionsites.ai as a creative reference for motion quality. The site could not be inspected from the build environment (the request was blocked by the environment's network policy), so no layout, code, text or asset from it was viewed or reused. The motion system below is original.

## Motion language

Defined in `components/motion/tokens.ts`:

| Token | Use |
|---|---|
| `ease.out` (expo-out) | entrances — fast start, long settle, reads as precise |
| `ease.inOut` | camera and large state transitions |
| `duration.fast … cinematic` | scaled by travel distance and importance (0.12 s – 1.1 s) |
| `spring.snappy / layout` | direct manipulation only (tabs, toggles, selections) |
| `stagger` | list and grid reveals |

Framer Motion owns DOM/SVG animation; React Three Fiber's frame loop owns 3D. Calculator results never tween through intermediate numbers (they cross-fade, `ResultFlash`), because interpolated values would be physically meaningless.

### Landing narrative

The landing page is a sticky 3D stage with six scroll chapters (A Photon, B Laser, C Beam, D Material, E Machine, F Product). Scroll position maps to a chapter value `c ∈ [0, 6]` that drives camera keyframes and element visibility (`features/landing/HeroScene.tsx`). The story is skippable at any time ("Skip intro", chapter rail, "Enter the Laboratory" in the header and hero). Each chapter quotes the handbook verbatim (resolved at build time by `quote()`); scales are exaggerated and labelled conceptual.

### Reduced motion

A three-way preference (System / Reduce / Full) in the top bar is stored locally and applied everywhere:

- Framer Motion via `MotionConfig reducedMotion`;
- CSS via `html[data-motion="reduce"]` and `prefers-reduced-motion` (animations and transitions collapse to ~0);
- canvas labs via `useCanvas` (single static frame instead of a loop);
- 3D scenes via `useMotionAllowed()`: no autonomous animation, no damping; the landing camera snaps to the nearest chapter keyframe instead of flying; the machine explorer's camera presets jump.

### Performance safeguards

- 3D scenes are code-split (`next/dynamic`, `ssr: false`), use `frameloop="demand"` (machine) or pause when off-screen (`frameloop="never"`), cap DPR at 1.6–1.75, bake contact shadows once and use procedural `Lightformer` environments (no HDR downloads).
- Canvas labs pause when off-screen or when the tab is hidden.
- No performance measurements (FPS, Lighthouse, bundle budgets) have been recorded for this release; see `docs/IMPLEMENTATION_STATUS.md`.

### Fallbacks

- No WebGL → the machine explorer shows the same components, optical path, signals and interlock logic as an accessible 2D schematic, with an explanation; the landing stage shows a labelled 2D beam-line illustration. Static imagery is never presented as interactive 3D.
- WebGL context loss or a renderer error → the 2D schematic with a message.
