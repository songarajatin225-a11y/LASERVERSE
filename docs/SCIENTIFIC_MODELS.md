# Scientific models

Every number LASERVERSE computes comes from a small, pure, unit-tested function in `lib/physics/`. Visualisations call the same functions as the calculators. This document lists the models, their conventions, assumptions and limits, and how each is labelled in the UI.

## Labels

| Label | Meaning |
|---|---|
| **Handbook source** | Text, tables and values taken from *The Complete Laser Handbook* (wording preserved when quoted). |
| **Derived calculation** | Computed from a documented equation with explicit inputs, units and a tested implementation. |
| **Additional explanation** | Teaching text written for LASERVERSE, not a finding of the handbook. |
| **Conceptual visualization** | Qualitative illustration of a mechanism. It predicts nothing. |
| **Unverified / review** | Needs technical review (transcribed equations and diagrams, reconstructions). |

No content carries "Experimentally validated": nothing in this release has been validated against experiments.

## Units and validation

- All values are stored in coherent SI internally (`lib/physics/units.ts`); handbook units (nm, µm, J/cm², W/cm², mm·mrad, m/min …) are offered for input and display only.
- Inputs are validated by `req/pos/nonNeg/frac/atLeast` (`lib/physics/core.ts`). Invalid input raises a `CalcError` naming the field; the UI shows the message instead of a number. Outputs are guarded against NaN/Infinity.
- Constants are the exact SI 2019 defining values (ε₀ from CODATA 2022). The handbook rounds some constants; tests compare against the handbook's examples within its stated precision.

## Photons and waves — `photon.ts`

E = hc/λ; ν = c/λ; λ/n in a medium (frequency unchanged); photon flux Ṅ = Pλ/(hc); p = h/λ; radiation force P/c (absorbed) or 2P/c (reflected); field amplitude from I = ½nε₀cE₀²; edge wavelength λ = hc/E_g; kT. Spectral-region names use the boundaries printed in §1.10. `wavelengthColor()` is a display convention (approximate sRGB for 380–780 nm; false colours outside) — conceptual.

## Laser physics — `laser.ts`

Quantum defect 1 − λ_pump/λ_laser; free spectral range c/(2nL) (linear cavity); coherence length λ²/Δλ ≈ c/Δν; natural linewidth 1/(2πτ); threshold gain g_th = α + (1/2L)ln(1/(R₁R₂)); round-trip gain; output power above threshold; brightness ≈ P/((M²)²λ²); Boltzmann ratio; Q-switched pulse energy E_p(f) ≈ E_p,0(1 − e^(−1/(fτ))); saturation intensity hν/(στ).

The **energy-level, cavity and wave animations** in the Physics Lab are conceptual: a few half-waves stand in for the ~10⁵ of a real cavity; level spacings are drawn to the handbook's values but populations are illustrative.

## Pulses — `pulse.ts`

E_p = P_avg/f; P_peak ≈ k·E_p/τ with k = 1 (rectangular), 0.94 (Gaussian), 0.88 (sech²); duty cycle τf (rejects τ > 1/f); time–bandwidth minimum 0.441 (Gaussian) / 0.315 (sech²).

**Rectangular approximation.** The default pulse shape is rectangular in time (k = 1), as in the handbook's ns examples. The handbook's ps/fs rows use 0.94; the UI always states which factor is used (review flag `peak-power-shape`). Peak intensity I₀ ≈ F₀/τ also assumes a rectangular temporal shape.

## Beams — `beam.ts`

Conventions: w = 1/e² radius, d = 2w, θ = far-field half-angle, BPP = w₀θ = M²λ/π. z_R = πw₀²/(M²λ); w(z) = w₀√(1 + (z/z_R)²); R(z); d₀ = 4M²λf/(πD); DOF ≈ 2z_R; practical tolerance band z_±x = z_R√((1+x)² − 1) (0.32 z_R at 5 %); fiber imaging d₀ ≈ d_core·f_focus/f_coll; collimated diameter 2f·NA; fiber BPP a·NA; V-number; Gaussian aperture transmission 1 − exp(−2(A/D)²); peak intensity 2P/(πw₀²) and mean intensity P/(πw²). Multimode beams are approximated through M² or BPP (embedded-Gaussian model).

## Optics — `optics.ts`

Normal-incidence Fresnel; absorbing-medium reflectance ((n−1)² + k²)/((n+1)² + k²); penetration depth λ/(4πk); Beer–Lambert transmission; Hagen–Rubens IR absorptance (valid where ωτ ≪ 1; underestimates rough or hot surfaces); Brewster angle; pulsed LIDT √τ scaling (flagged out-of-range below ~10 ps).

## Laser–material interaction — `interaction.ts`

| Model | Equation | Notes |
|---|---|---|
| Peak / mean fluence | F₀ = 2E_p/(πw₀²); E_p/(πw₀²) | Gaussian on-axis peak vs area mean |
| Heat input per length | Q = ηP/v | η is a user input; presets cite §9.2 (steel ~35 % at 1 µm, keyhole 60–90 %, cold Cu ~4 %) |
| Pulse spacing / overlap | Δx = v/f; O = 1 − v/(fd) | negative overlap = gaps (returned, not clamped) |
| Hatch overlap | 1 − h/d | |
| Thermal diffusion length | L_th ≈ 2√(κτ) | reproduces the §9.4 table to its printed digits (tested); below ~10 ps the two-temperature model applies (quoted) |
| Ablation depth per pulse | d ≈ δ ln(F₀/F_th) | |
| Specific removal rate (Gaussian spot) | V/E = (δ/2F₀)·ln²(F₀/F_th) | maximum at F₀ = e²F_th, the optimum stated in §9.5 (tested) |
| Incubation | F_th(N) = F_th(1)·N^(S−1) | |
| Crater radius | w₀√(½ ln(F₀/F_th)) | |
| Self-focusing critical power | 3.77λ²/(8πn₀n₂) | |
| Welding-mode indicator | mean intensity vs ~10⁶ W/cm² | conduction < 5 × 10⁵, transition 5 × 10⁵ – 2 × 10⁶, keyhole ≥ 2 × 10⁶ W/cm². The handbook gives "~10⁶ for steel"; the transition band is LASERVERSE's rendering and is stated in the UI. Other metals differ. |
| Pulse regime | fs < 1 ps ≤ ps < 1 ns ≤ ns < 1 µs ≤ µs < 100 µs ≤ CW/ms | labels from §27.1 |

**No absorption database is invented.** The handbook gives no absorption coefficients for non-metals; the Material lab encodes the §9.3 statements ("absorbs well at", "largely transparent at") as wavelength bands, keyed to the exact handbook wording (a test fails if the wording changes), and labels the result "derived". Where the handbook makes both statements for one wavelength (e.g. melanin absorbs UV–NIR while tissue has a 700–900 nm window) the result is "mixed statements". The only metal absorptance values shown are those tabulated in §15.4 (cold Cu and Al by source) and the figures quoted in §9.2's text. The §9.2 chart is missing and is not reconstructed.

**Process regime map (§9.7).** The original chart is missing. The regime explorer places only what the text states: the §27.1 pulse-duration regimes, the ~10 ps non-thermal limit (§9.5) and the ~10⁶ W/cm² keyhole threshold for steel (§9.4/§10.4). It is labelled "Reconstruction — not the handbook's chart".

## Process and machine models — `process.ts`

Hatch-fill time for a rectangle (lines × length / mark speed + jumps + per-line overheads); cycle-time split and bottleneck; throughput 3600/t·OEE; galvo addressing resolution field/2^bits; vision resolution FOV/pixels and minimum feature ≈ 3 px. These ignore acceleration profiles, skywriting and controller latency unless the user adds them as overheads.

## Safety — `safety.ts`

Required optical density OD ≥ log₁₀(H₀/MPE); NOHD = (1/φ)(√(4P/(π·MPE)) − a); top-hat irradiance 4P/(πd²). **MPE values are not provided** — they must come from IEC 60825-1 / ANSI Z136.1 for the actual wavelength, exposure and pulse format. The tools do not classify products or certify eyewear, and the site does not certify machines or demonstrate compliance.

## Economics — `economics.ts`

Cost per good part follows §23.2/B.3 exactly: C_part = (CAPEX·CRF + OPEX)/N_good with CRF = i(1+i)ⁿ/((1+i)ⁿ − 1). ROI, payback, NPV and IRR are standard finance definitions (additional explanation — the handbook names them but gives no formulas). IRR returns `null` when undefined rather than a fabricated number.

## 3D machine explorer

Geometry is generic and illustrative (not a vendor design, not to scale in every detail). Two physical relations are modelled: galvo mirror rotation = half the optical scan angle, and θ = s/f with f = 160 mm (§5.1, §26.1). The 1064 nm beam is drawn in false colour; the beam cone and spot are enlarged. The marking job is an illustrative 2D-code-like grid, not an encoded DataMatrix. The interlock logic (`emissionPermitted`) is a teaching simplification — key, E-stop, door, extraction and a job request must all be satisfied — and is not a functional-safety design (§11.4, §11.6).

## Process simulators

Overlap, fluence, intensity, heat input, spot size and photon energy are derived calculations. The spot footprints in the overlap simulator are drawn to scale. Weld cross-sections, cut-front animations and drilling animations are conceptual: weld shapes use a representative aspect ratio from the §10.4 mode table and do not predict depth.

## Verification of the models

`tests/unit/physics.test.ts`, `economics.test.ts`, `units.test.ts` and `calculators.test.ts` reproduce the handbook's worked examples (photon table, quantum defects, FSR, pulse examples, focusing table, thermal-diffusion table, galvo and vision resolution, cost per panel, critical power, Hagen–Rubens) and test validation errors and edge cases. Where a handbook example does not match its own equation, the test documents the difference and a review flag is raised instead of changing either.
