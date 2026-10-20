import type { CalculatorDef } from "./types";
import * as ph from "@/lib/physics/photon";
import * as la from "@/lib/physics/laser";
import * as pu from "@/lib/physics/pulse";
import * as be from "@/lib/physics/beam";
import * as op from "@/lib/physics/optics";
import * as ia from "@/lib/physics/interaction";
import * as pr from "@/lib/physics/process";
import * as sa from "@/lib/physics/safety";
import * as ec from "@/lib/physics/economics";
import { C } from "@/lib/physics/core";
import { formatWithUnit, formatNumber } from "@/lib/physics/units";

const pct = (x: number) => `${formatNumber(x * 100, 3)}%`;

export const CALCULATORS: CalculatorDef[] = [
  /* ============================================================ PHYSICS */
  {
    id: "photon-energy",
    title: "Photon energy, frequency and flux",
    category: "physics",
    summary: "Photon energy, frequency, in-medium wavelength and photons per second per watt for a vacuum wavelength.",
    inputs: [
      { key: "lambda", label: "Vacuum wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1064 },
      { key: "n", label: "Refractive index of medium", symbol: "n", quantity: "ratio", unit: "1", value: 1, help: "Frequency is unchanged in a medium; wavelength becomes λ/n." },
    ],
    outputs: [
      { key: "ev", label: "Photon energy", symbol: "E", quantity: "photonEnergy", unit: "eV", primary: true },
      { key: "joule", label: "Photon energy", symbol: "E", quantity: "photonEnergy", unit: "J" },
      { key: "nu", label: "Frequency", symbol: "ν", quantity: "frequency" },
      { key: "lambdaMedium", label: "Wavelength in medium", symbol: "λ/n", quantity: "length" },
      { key: "flux", label: "Photons per second per watt", symbol: "Ṅ/P", quantity: "count", unitLabel: "s⁻¹·W⁻¹" },
      { key: "momentum", label: "Photon momentum", symbol: "p", quantity: "count", unitLabel: "kg·m/s" },
      { key: "region", label: "Spectral region (§1.10)" },
    ],
    compute: (v) => ({
      ev: ph.photonEnergyEv(v.lambda!) * C.e,
      joule: ph.photonEnergyJ(v.lambda!),
      nu: ph.frequencyFromWavelength(v.lambda!),
      lambdaMedium: ph.wavelengthInMedium(v.lambda!, v.n!),
      flux: ph.photonFlux(1, v.lambda!),
      momentum: ph.photonMomentum(v.lambda!),
      region: ph.spectralRegion(v.lambda!),
    }),
    equations: ["E = h\\nu = \\frac{hc}{\\lambda}", "E\\,[\\mathrm{eV}] \\approx \\frac{1239.84}{\\lambda\\,[\\mathrm{nm}]}", "\\dot N = \\frac{P\\lambda}{hc}", "p = \\frac{h}{\\lambda}"],
    variables: [
      { symbol: "h", meaning: "Planck constant 6.62607015 × 10⁻³⁴", unit: "J·s" },
      { symbol: "c", meaning: "Speed of light in vacuum 299 792 458", unit: "m/s" },
      { symbol: "λ", meaning: "Vacuum wavelength", unit: "m" },
      { symbol: "ν", meaning: "Optical frequency", unit: "Hz" },
      { symbol: "Ṅ", meaning: "Photon rate for optical power P", unit: "s⁻¹" },
    ],
    assumptions: ["Vacuum wavelength is entered; in a medium only the wavelength changes, not the frequency or photon energy.", "Monochromatic light (a single wavelength)."],
    limitations: ["Photon energy is the energy of one quantum. It says nothing about total pulse energy, power or the damage a beam does — those depend on how many photons arrive per area and time."],
    interpret: (r) => {
      const ev = Number(r.ev) / C.e;
      const out = [`Compare with handbook reference energies (§1.6): Si band gap 1.12 eV, GaN 3.4 eV, C–C bond 3.6 eV, C–H 4.3 eV.`];
      if (ev < 1.12) out.push("Below the silicon band gap: silicon is transparent at this wavelength (§1.11).");
      if (ev > 3.6) out.push("Above the C–C bond energy: single photons can break C–C bonds (photochemical regime is mainly a 193/248 nm phenomenon, §1.6).");
      return out;
    },
    sources: [{ section: "1.6", note: "photon energy table" }, { section: "1.9", note: "momentum" }, { section: "1.10", note: "spectral regions" }, { section: "B.3" }],
    classification: "derived",
    examples: [
      { label: "193 nm ArF", values: { lambda: 193, n: 1 } },
      { label: "355 nm (3ω Nd)", values: { lambda: 355, n: 1 } },
      { label: "532 nm (2ω Nd)", values: { lambda: 532, n: 1 } },
      { label: "1064 nm Nd/Yb", values: { lambda: 1064, n: 1 } },
      { label: "1550 nm Er", values: { lambda: 1550, n: 1 } },
      { label: "10.6 µm CO₂", values: { lambda: 10600, n: 1 } },
      { label: "1064 nm in fused silica", values: { lambda: 1064, n: 1.45 }, note: "n ≈ 1.45 at 1064 nm (§5.5)" },
    ],
    related: { calculators: ["energy-units", "photons-in-pulse"], tools: [{ label: "Photon explorer", href: "/physics-lab?tab=photon" }] },
    keywords: "E = h nu hc lambda eV wavelength frequency photon",
  },
  {
    id: "wavelength-frequency",
    title: "Frequency → wavelength",
    category: "physics",
    summary: "Convert an optical frequency to vacuum wavelength and photon energy.",
    inputs: [{ key: "nu", label: "Frequency", symbol: "ν", quantity: "frequency", unit: "THz", value: 282 }],
    outputs: [
      { key: "lambda", label: "Vacuum wavelength", symbol: "λ", quantity: "length", primary: true },
      { key: "ev", label: "Photon energy", symbol: "E", quantity: "photonEnergy", unit: "eV" },
    ],
    compute: (v) => ({ lambda: ph.wavelengthFromFrequency(v.nu!), ev: C.h * v.nu! }),
    equations: ["\\lambda = \\frac{c}{\\nu}", "E = h\\nu"],
    variables: [
      { symbol: "ν", meaning: "Optical frequency", unit: "Hz" },
      { symbol: "c", meaning: "Speed of light in vacuum", unit: "m/s" },
    ],
    assumptions: ["Vacuum propagation."],
    sources: [{ section: "1.6" }, { section: "B.3" }],
    classification: "derived",
    examples: [
      { label: "1553 THz (193 nm)", values: { nu: 1553 } },
      { label: "282 THz (1064 nm)", values: { nu: 282 } },
      { label: "28.3 THz (10.6 µm)", values: { nu: 28.3 } },
    ],
    related: { calculators: ["photon-energy"] },
  },
  {
    id: "energy-units",
    title: "Electron-volts ↔ joules ↔ edge wavelength",
    category: "physics",
    summary: "Convert an energy in eV (band gap, bond or photon energy) to joules and to the equivalent photon wavelength.",
    inputs: [{ key: "ev", label: "Energy", symbol: "E", quantity: "ratio", unit: "1", unitLabel: "eV", value: 1.12 }],
    outputs: [
      { key: "joule", label: "Energy", symbol: "E", quantity: "photonEnergy", unit: "J", primary: true },
      { key: "lambda", label: "Equivalent photon wavelength (absorption edge)", symbol: "λ = hc/E", quantity: "length" },
      { key: "nu", label: "Equivalent frequency", symbol: "ν", quantity: "frequency" },
    ],
    compute: (v) => ({ joule: ph.evToJoules(v.ev!), lambda: ph.edgeWavelength(v.ev!), nu: (v.ev! * C.e) / C.h }),
    equations: ["1\\,\\mathrm{eV} = 1.602176634\\times10^{-19}\\,\\mathrm{J}", "\\lambda_{edge} = \\frac{hc}{E_g}"],
    variables: [{ symbol: "E_g", meaning: "Band-gap (or bond) energy", unit: "eV" }],
    assumptions: ["A photon is absorbed across a band gap only if hν > E_g (§1.11); the edge wavelength is where hν = E_g."],
    limitations: ["Real absorption edges are not sharp; indirect-gap semiconductors such as Si absorb weakly just above the gap (§1.6)."],
    sources: [{ section: "1.1", note: "1 eV = 1.602 × 10⁻¹⁹ J" }, { section: "1.6", note: "reference energies" }],
    classification: "derived",
    examples: [
      { label: "Si 1.12 eV", values: { ev: 1.12 } },
      { label: "GaAs 1.42 eV", values: { ev: 1.42 } },
      { label: "4H-SiC 3.26 eV", values: { ev: 3.26 } },
      { label: "GaN 3.4 eV", values: { ev: 3.4 } },
      { label: "C–C bond 3.6 eV", values: { ev: 3.6 } },
      { label: "C–H bond 4.3 eV", values: { ev: 4.3 } },
    ],
    related: { calculators: ["photon-energy"] },
  },
  {
    id: "photons-in-pulse",
    title: "Photons in a pulse",
    category: "physics",
    summary: "How many photons a pulse (or any optical energy) contains — the distinction between photon energy and total energy.",
    inputs: [
      { key: "ep", label: "Pulse energy", symbol: "E_p", quantity: "energy", unit: "mJ", value: 1 },
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1064 },
    ],
    outputs: [
      { key: "n", label: "Photons in the pulse", symbol: "N", quantity: "count", primary: true },
      { key: "ev", label: "Energy per photon", symbol: "hν", quantity: "photonEnergy", unit: "eV" },
    ],
    compute: (v) => ({ n: ph.photonsIn(v.ep!, v.lambda!), ev: ph.photonEnergyJ(v.lambda!) }),
    equations: ["N = \\frac{E_p}{h\\nu} = \\frac{E_p\\,\\lambda}{hc}"],
    variables: [
      { symbol: "E_p", meaning: "Pulse (or total optical) energy", unit: "J" },
      { symbol: "hν", meaning: "Energy of one photon", unit: "J" },
    ],
    assumptions: ["Monochromatic light."],
    sources: [{ section: "1.6" }, { section: "2.9" }],
    classification: "derived",
    examples: [
      { label: "1 mJ at 1064 nm", values: { ep: 1, lambda: 1064 } },
      { label: "50 µJ at 355 nm", values: { ep: 0.05, lambda: 355 } },
    ],
  },
  {
    id: "radiation-force",
    title: "Radiation force of a beam",
    category: "physics",
    summary: "Force exerted by photon momentum when a beam is absorbed or reflected.",
    inputs: [
      { key: "p", label: "Optical power", symbol: "P", quantity: "power", unit: "kW", value: 1 },
      { key: "mode", label: "Surface", choice: [{ value: "absorbed", label: "Absorbed (F = P/c)" }, { value: "reflected", label: "Reflected (F = 2P/c)" }], value: "absorbed" },
    ],
    outputs: [{ key: "f", label: "Force", symbol: "F", quantity: "force", primary: true }],
    compute: (v, c) => ({ f: ph.radiationForce(v.p!, c.mode === "reflected" ? "reflected" : "absorbed") }),
    equations: ["F = \\frac{P}{c}\\ (\\text{absorbed}),\\qquad F = \\frac{2P}{c}\\ (\\text{reflected})"],
    variables: [{ symbol: "P", meaning: "Optical power", unit: "W" }],
    assumptions: ["Normal incidence, perfect absorber or perfect reflector."],
    limitations: ["In welding and drilling the pressure that opens a keyhole is vapour recoil, not photon momentum (§1.9)."],
    sources: [{ section: "1.9" }],
    classification: "derived",
    examples: [{ label: "1 kW absorbed (§1.9: 3.3 µN)", values: { p: 1, mode: "absorbed" } }],
  },
  {
    id: "field-amplitude",
    title: "Electric field from intensity",
    category: "physics",
    summary: "Peak electric-field amplitude of light at a given intensity — why focused ultrafast pulses ionise transparent materials.",
    inputs: [
      { key: "i", label: "Intensity", symbol: "I", quantity: "intensity", unit: "W/cm2", value: 1e14 },
      { key: "n", label: "Refractive index", symbol: "n", quantity: "ratio", unit: "1", value: 1 },
    ],
    outputs: [{ key: "e0", label: "Field amplitude", symbol: "E₀", quantity: "efield", primary: true }],
    compute: (v) => ({ e0: ph.fieldAmplitude(v.i!, v.n!) }),
    equations: ["I = \\tfrac{1}{2}\\, n\\, \\varepsilon_0\\, c\\, E_0^2 \\;\\Rightarrow\\; E_0 = \\sqrt{\\frac{2I}{n\\varepsilon_0 c}}"],
    variables: [
      { symbol: "I", meaning: "Intensity (irradiance)", unit: "W/m²" },
      { symbol: "ε₀", meaning: "Vacuum permittivity 8.854 × 10⁻¹²", unit: "F/m" },
    ],
    assumptions: ["Plane-wave relation between cycle-averaged intensity and field amplitude."],
    sources: [{ section: "1.10" }],
    classification: "derived",
    examples: [{ label: "10¹⁴ W/cm² (focused fs)", values: { i: 1e14, n: 1 }, note: "§1.10: ≈ 2.7 × 10¹⁰ V/m" }],
  },

  /* ============================================================ LASER */
  {
    id: "quantum-defect",
    title: "Quantum defect",
    category: "laser",
    summary: "Fraction of pump-photon energy lost as heat — the key efficiency and thermal-management number of a gain medium.",
    inputs: [
      { key: "lp", label: "Pump wavelength", symbol: "λ_pump", quantity: "length", unit: "nm", value: 976 },
      { key: "ll", label: "Laser wavelength", symbol: "λ_laser", quantity: "length", unit: "nm", value: 1030 },
    ],
    outputs: [
      { key: "qd", label: "Quantum defect", symbol: "η_QD", quantity: "percent", unit: "%", primary: true },
      { key: "heat", label: "Minimum heat per watt of laser output", quantity: "ratio", unitLabel: "W/W" },
    ],
    compute: (v) => {
      const q = la.quantumDefect(v.lp!, v.ll!);
      return { qd: q, heat: q / (1 - q) };
    },
    equations: ["\\eta_{QD} = 1 - \\frac{\\lambda_{pump}}{\\lambda_{laser}}"],
    variables: [
      { symbol: "λ_pump", meaning: "Pump wavelength", unit: "m" },
      { symbol: "λ_laser", meaning: "Laser wavelength", unit: "m" },
    ],
    assumptions: ["One laser photon per absorbed pump photon (no cross-relaxation, no other losses)."],
    limitations: ["Real heat load is higher: non-radiative decay, imperfect overlap and other losses add to it. Tm's two-for-one cross-relaxation lifts practical efficiency above this estimate (§2.2)."],
    sources: [{ section: "2.2", note: "quantum defect table" }],
    classification: "derived",
    examples: [
      { label: "Yb 976 → 1030 nm", values: { lp: 976, ll: 1030 } },
      { label: "Yb fiber 915 → 1070 nm", values: { lp: 915, ll: 1070 } },
      { label: "Nd 808 → 1064 nm", values: { lp: 808, ll: 1064 } },
      { label: "Er 980 → 1550 nm", values: { lp: 980, ll: 1550 } },
      { label: "Tm 793 → 1940 nm", values: { lp: 793, ll: 1940 } },
    ],
    related: { tools: [{ label: "Energy-level explorer", href: "/physics-lab?tab=levels" }] },
  },
  {
    id: "cavity-modes",
    title: "Cavity mode spacing and mode-locked repetition rate",
    category: "laser",
    summary: "Free spectral range of a linear cavity, which is also the pulse repetition rate of a mode-locked laser.",
    inputs: [
      { key: "L", label: "Cavity length", symbol: "L", quantity: "length", unit: "m", value: 0.5 },
      { key: "n", label: "Refractive index", symbol: "n", quantity: "ratio", unit: "1", value: 1 },
    ],
    outputs: [
      { key: "fsr", label: "Mode spacing (FSR)", symbol: "Δν_FSR", quantity: "frequency", primary: true },
      { key: "rt", label: "Round-trip time", symbol: "2nL/c", quantity: "time" },
    ],
    compute: (v) => {
      const f = la.freeSpectralRange(v.n!, v.L!);
      return { fsr: f, rt: 1 / f };
    },
    equations: ["\\Delta\\nu_{FSR} = \\frac{c}{2nL}"],
    variables: [
      { symbol: "L", meaning: "Cavity length (mirror to mirror)", unit: "m" },
      { symbol: "n", meaning: "Refractive index in the cavity", unit: "—" },
    ],
    assumptions: ["Linear (standing-wave) cavity, as used in the handbook examples. A ring cavity has FSR = c/(nL)."],
    sources: [{ section: "2.5" }, { section: "2.8", note: "mode-locking" }],
    classification: "derived",
    examples: [
      { label: "0.5 m free space (300 MHz)", values: { L: 0.5, n: 1 } },
      { label: "10 m fiber, n = 1.45 (~10 MHz)", values: { L: 10, n: 1.45 } },
      { label: "1 mm diode chip, n ≈ 3.5 (~43 GHz)", values: { L: 0.001, n: 3.5 } },
    ],
    related: { tools: [{ label: "Cavity explorer", href: "/physics-lab?tab=cavity" }] },
  },
  {
    id: "coherence-length",
    title: "Coherence length",
    category: "laser",
    summary: "Distance over which light keeps a fixed phase relation, from spectral width.",
    inputs: [
      { key: "lambda", label: "Centre wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1070 },
      { key: "dl", label: "Spectral width", symbol: "Δλ", quantity: "length", unit: "nm", value: 3 },
    ],
    outputs: [
      { key: "lc", label: "Coherence length", symbol: "L_c", quantity: "length", primary: true },
      { key: "dnu", label: "Linewidth", symbol: "Δν", quantity: "frequency" },
    ],
    compute: (v) => ({ lc: la.coherenceLengthFromBandwidth(v.lambda!, v.dl!), dnu: (C.c * v.dl!) / v.lambda! ** 2 }),
    equations: ["L_c \\approx \\frac{c}{\\Delta\\nu} \\approx \\frac{\\lambda^2}{\\Delta\\lambda}"],
    variables: [
      { symbol: "Δλ", meaning: "Spectral width (FWHM)", unit: "m" },
      { symbol: "Δν", meaning: "Frequency linewidth", unit: "Hz" },
    ],
    assumptions: ["Order-of-magnitude relation; the exact prefactor depends on line shape."],
    sources: [{ section: "2.5", note: "linewidth / coherence table" }],
    classification: "derived",
    examples: [
      { label: "Multi-kW Yb fiber, 3 nm", values: { lambda: 1070, dl: 3 } },
      { label: "100 fs at 1030 nm, ~10 nm", values: { lambda: 1030, dl: 10 } },
    ],
  },
  {
    id: "threshold-gain",
    title: "Laser threshold gain",
    category: "laser",
    summary: "Gain coefficient needed for round-trip gain to equal round-trip loss.",
    inputs: [
      { key: "alpha", label: "Distributed loss", symbol: "α", quantity: "inverseLength", unit: "1/m", value: 0.5 },
      { key: "L", label: "Gain-medium length", symbol: "L", quantity: "length", unit: "mm", value: 100 },
      { key: "r1", label: "HR mirror reflectance", symbol: "R₁", quantity: "percent", unit: "%", value: 99.9 },
      { key: "r2", label: "Output-coupler reflectance", symbol: "R₂", quantity: "percent", unit: "%", value: 90 },
    ],
    outputs: [
      { key: "gth", label: "Threshold gain coefficient", symbol: "g_th", quantity: "inverseLength", primary: true },
      { key: "single", label: "Single-pass gain at threshold", symbol: "exp(g_th·L)", quantity: "ratio" },
    ],
    compute: (v) => {
      const g = la.thresholdGain(v.alpha!, v.L!, v.r1!, v.r2!);
      return { gth: g, single: Math.exp(g * v.L!) };
    },
    equations: ["R_1R_2\\,e^{2(g_{th}-\\alpha)L} = 1 \\;\\Rightarrow\\; g_{th} = \\alpha + \\frac{1}{2L}\\ln\\frac{1}{R_1R_2}"],
    variables: [
      { symbol: "α", meaning: "Distributed (internal) loss coefficient", unit: "m⁻¹" },
      { symbol: "L", meaning: "Gain length", unit: "m" },
      { symbol: "R₁, R₂", meaning: "Mirror reflectances", unit: "—" },
    ],
    assumptions: ["Gain medium fills the cavity length L; uniform gain and loss."],
    sources: [{ section: "2.4" }],
    classification: "derived",
    examples: [
      { label: "DPSS-like: OC 90%", values: { alpha: 0.5, L: 100, r1: 99.9, r2: 90 } },
      { label: "He-Ne-like: OC 99%", values: { alpha: 0.1, L: 300, r1: 99.9, r2: 99 } },
      { label: "Fiber-like: OC 10%", values: { alpha: 0.01, L: 10000, r1: 99.9, r2: 10 } },
    ],
    related: { tools: [{ label: "Cavity explorer", href: "/physics-lab?tab=cavity" }] },
  },
  {
    id: "brightness",
    title: "Brightness (radiance) and BPP",
    category: "laser",
    summary: "Power per area per solid angle — why brightness, not power, buys working distance.",
    inputs: [
      { key: "p", label: "Power", symbol: "P", quantity: "power", unit: "kW", value: 1 },
      { key: "m2", label: "Beam quality", symbol: "M²", quantity: "ratio", unit: "1", value: 1 },
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1070 },
    ],
    outputs: [
      { key: "b", label: "Brightness", symbol: "B", quantity: "radiance", unit: "W/(cm2.sr)", primary: true },
      { key: "bpp", label: "Beam parameter product", symbol: "BPP", quantity: "bpp", unit: "mm.mrad" },
    ],
    compute: (v) => ({ b: la.brightness(v.p!, v.m2!, v.lambda!), bpp: be.bppFromM2(v.m2!, v.lambda!) }),
    equations: ["B = \\frac{P}{A\\,\\Omega} \\approx \\frac{P}{(M^2)^2\\lambda^2}", "BPP = \\frac{M^2\\lambda}{\\pi}"],
    variables: [
      { symbol: "P", meaning: "Optical power", unit: "W" },
      { symbol: "M²", meaning: "Beam propagation ratio (ISO 11146)", unit: "—" },
    ],
    assumptions: ["Round beam, embedded-Gaussian model."],
    sources: [{ section: "2.5" }, { section: "4.4" }],
    classification: "derived",
    examples: [
      { label: "1 kW single-mode Yb", values: { p: 1, m2: 1, lambda: 1070 }, note: "§2.5: ≈ 9 × 10¹⁰ W/(cm²·sr)" },
      { label: "6 kW, M² ≈ 10", values: { p: 6, m2: 10, lambda: 1070 } },
    ],
  },
  {
    id: "qswitch-rep-rate",
    title: "Q-switched pulse energy vs repetition rate",
    category: "laser",
    summary: "Why a Q-switched laser's pulse energy falls when the repetition rate exceeds ~1/τ.",
    inputs: [
      { key: "ep0", label: "Low-rate pulse energy", symbol: "E_p,0", quantity: "energy", unit: "mJ", value: 1 },
      { key: "f", label: "Repetition rate", symbol: "f", quantity: "frequency", unit: "kHz", value: 100 },
      { key: "tau", label: "Upper-state lifetime", symbol: "τ", quantity: "time", unit: "us", value: 100 },
    ],
    outputs: [
      { key: "ep", label: "Pulse energy at f", symbol: "E_p(f)", quantity: "energy", primary: true },
      { key: "frac", label: "Fraction of low-rate energy", quantity: "percent", unit: "%" },
      { key: "pavg", label: "Average power", symbol: "E_p f", quantity: "power" },
    ],
    compute: (v) => {
      const ep = la.qSwitchPulseEnergy(v.ep0!, v.f!, v.tau!);
      return { ep, frac: ep / v.ep0!, pavg: ep * v.f! };
    },
    equations: ["E_p(f) \\approx E_{p,0}\\left(1 - e^{-1/(f\\tau)}\\right)"],
    variables: [
      { symbol: "τ", meaning: "Upper-state (storage) lifetime", unit: "s" },
      { symbol: "f", meaning: "Repetition rate", unit: "Hz" },
    ],
    assumptions: ["Gain recovers exponentially with the upper-state lifetime between pulses; constant pump."],
    limitations: ["Pulses also lengthen at high repetition rate (§2.8); this relation does not model pulse duration. Fiber MOPA sources decouple pulse energy from repetition rate."],
    sources: [{ section: "2.8" }, { section: "2.3", note: "lifetimes table" }],
    classification: "derived",
    examples: [
      { label: "Nd:YVO₄ (τ ≈ 100 µs) at 100 kHz", values: { ep0: 1, f: 100, tau: 100 } },
      { label: "Nd:YAG (τ ≈ 230 µs) at 20 kHz", values: { ep0: 1, f: 20, tau: 230 } },
      { label: "Yb:YAG (τ ≈ 1 ms) at 10 kHz", values: { ep0: 1, f: 10, tau: 1000 } },
    ],
    related: { tools: [{ label: "Pulse explorer", href: "/physics-lab?tab=pulse" }] },
  },

  /* ============================================================ PULSE */
  {
    id: "pulse-parameters",
    title: "Pulse energy, peak power and duty cycle",
    category: "pulse",
    summary: "Consistent pulse quantities from average power, repetition rate and pulse duration.",
    inputs: [
      { key: "pavg", label: "Average power", symbol: "P_avg", quantity: "power", unit: "W", value: 20 },
      { key: "f", label: "Repetition rate", symbol: "f", quantity: "frequency", unit: "kHz", value: 100 },
      { key: "tau", label: "Pulse duration (FWHM)", symbol: "τ", quantity: "time", unit: "ns", value: 100 },
      {
        key: "shape",
        label: "Temporal pulse shape",
        choice: [
          { value: "square", label: "Rectangular (k = 1)" },
          { value: "gaussian", label: "Gaussian (k = 0.94)" },
          { value: "sech2", label: "sech² (k = 0.88)" },
        ],
        value: "square",
      },
    ],
    outputs: [
      { key: "ep", label: "Pulse energy", symbol: "E_p", quantity: "energy", primary: true },
      { key: "ppk", label: "Peak power", symbol: "P_peak", quantity: "power", primary: true },
      { key: "d", label: "Duty cycle", symbol: "D", quantity: "percent", unit: "%" },
      { key: "period", label: "Pulse period", symbol: "1/f", quantity: "time" },
      { key: "ratio", label: "Peak / average power", quantity: "ratio" },
    ],
    compute: (v, c) => {
      const s = pu.pulseSummary(v.pavg!, v.f!, v.tau!, (c.shape as pu.PulseShape) ?? "square");
      return { ep: s.pulseEnergy, ppk: s.peakPower, d: s.dutyCycle, period: s.period, ratio: s.peakToAverage };
    },
    equations: ["E_p = \\frac{P_{avg}}{f}", "P_{peak} \\approx k\\,\\frac{E_p}{\\tau}", "D = \\tau f"],
    variables: [
      { symbol: "P_avg", meaning: "Average power", unit: "W" },
      { symbol: "f", meaning: "Repetition rate", unit: "Hz" },
      { symbol: "τ", meaning: "Pulse duration, full width at half maximum", unit: "s" },
      { symbol: "k", meaning: "Shape factor: 1 rectangular, 0.94 Gaussian, 0.88 sech²", unit: "—" },
    ],
    assumptions: ["Identical pulses at a constant repetition rate.", "Peak power uses the stated shape factor on the FWHM duration; the rectangular case (k = 1) is the simplest approximation."],
    limitations: ["Real pulse shapes (MOPA tailored pulses, Q-switched tails) differ; use measured temporal profiles for accurate peak power (§24.4)."],
    interpret: (r) => [`The laser emits for ${pct(Number(r.d))} of the time at ≈ ${formatNumber(Number(r.ratio), 3)}× its average power (§2.9). Average power sets throughput; peak power, fluence and pulse duration set the mechanism (handbook working rule 5).`],
    sources: [{ section: "2.9", note: "definitions and worked examples" }, { section: "B.3" }],
    classification: "derived",
    examples: [
      { label: "20 W MOPA, long pulse", values: { pavg: 20, f: 100, tau: 100, shape: "square" } },
      { label: "20 W MOPA, short pulse", values: { pavg: 20, f: 600, tau: 4, shape: "square" } },
      { label: "50 W picosecond", values: { pavg: 50, f: 1000, tau: 0.01, shape: "gaussian" } },
      { label: "20 W femtosecond", values: { pavg: 20, f: 200, tau: 0.0003, shape: "gaussian" } },
      { label: "150 W QCW spot weld", values: { pavg: 150, f: 0.02, tau: 5e6, shape: "square" } },
    ],
    related: { calculators: ["fluence", "pulse-overlap"], tools: [{ label: "Pulse explorer", href: "/physics-lab?tab=pulse" }] },
  },
  {
    id: "average-power",
    title: "Average power from pulse energy",
    category: "pulse",
    summary: "Average power delivered by a pulse train.",
    inputs: [
      { key: "ep", label: "Pulse energy", symbol: "E_p", quantity: "energy", unit: "uJ", value: 50 },
      { key: "f", label: "Repetition rate", symbol: "f", quantity: "frequency", unit: "kHz", value: 1000 },
    ],
    outputs: [{ key: "p", label: "Average power", symbol: "P_avg", quantity: "power", primary: true }],
    compute: (v) => ({ p: pu.averagePower(v.ep!, v.f!) }),
    equations: ["P_{avg} = E_p\\, f"],
    variables: [{ symbol: "E_p", meaning: "Pulse energy", unit: "J" }],
    assumptions: ["Identical pulses."],
    sources: [{ section: "2.9" }],
    classification: "derived",
  },
  {
    id: "time-bandwidth",
    title: "Transform-limited bandwidth",
    category: "pulse",
    summary: "Minimum spectral bandwidth an ultrashort pulse needs.",
    inputs: [
      { key: "tau", label: "Pulse duration (FWHM)", symbol: "Δτ", quantity: "time", unit: "fs", value: 300 },
      { key: "lambda", label: "Centre wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1030 },
      { key: "shape", label: "Pulse shape", choice: [{ value: "sech2", label: "sech² (0.315)" }, { value: "gaussian", label: "Gaussian (0.441)" }], value: "sech2" },
    ],
    outputs: [
      { key: "dl", label: "Minimum spectral width", symbol: "Δλ", quantity: "length", primary: true },
      { key: "dnu", label: "Minimum bandwidth", symbol: "Δν", quantity: "frequency" },
    ],
    compute: (v, c) => {
      const dnu = pu.minimumBandwidthHz(v.tau!, c.shape === "gaussian" ? "gaussian" : "sech2");
      return { dnu, dl: pu.bandwidthToWavelength(dnu, v.lambda!) };
    },
    equations: ["\\Delta\\nu\\,\\Delta\\tau \\ge 0.441\\ (\\text{Gaussian}),\\ 0.315\\ (\\text{sech}^2)", "\\Delta\\lambda = \\frac{\\lambda^2\\Delta\\nu}{c}"],
    variables: [{ symbol: "Δτ", meaning: "Pulse duration FWHM", unit: "s" }],
    assumptions: ["Transform-limited (unchirped) pulse; real pulses need more bandwidth."],
    sources: [{ section: "10.15" }],
    classification: "derived",
    examples: [{ label: "300 fs sech² at 1030 nm (§10.15: ≥ 3.7 nm)", values: { tau: 300, lambda: 1030, shape: "sech2" } }],
  },

  /* ============================================================ BEAM */
  {
    id: "focus-spot",
    title: "Focused spot size and depth of focus",
    category: "beam",
    summary: "Spot diameter, Rayleigh range, practical depth of focus, divergence and BPP for a collimated beam focused by a lens.",
    inputs: [
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1064 },
      { key: "m2", label: "Beam quality", symbol: "M²", quantity: "ratio", unit: "1", value: 1.3 },
      { key: "D", label: "Beam diameter at lens (1/e²)", symbol: "D", quantity: "length", unit: "mm", value: 7 },
      { key: "f", label: "Focal length", symbol: "f", quantity: "length", unit: "mm", value: 160 },
      { key: "p", label: "Power (optional, for intensity)", symbol: "P", quantity: "power", unit: "W", value: 20 },
    ],
    outputs: [
      { key: "d0", label: "Spot diameter (1/e²)", symbol: "d₀", quantity: "length", primary: true },
      { key: "dof5", label: "Depth of focus for ±5% spot growth", symbol: "2z_{±5%}", quantity: "length", primary: true },
      { key: "dof", label: "Textbook depth of focus", symbol: "2z_R", quantity: "length" },
      { key: "dof10", label: "Depth of focus for ±10% spot growth", symbol: "2z_{±10%}", quantity: "length" },
      { key: "zr", label: "Rayleigh range", symbol: "z_R", quantity: "length" },
      { key: "theta", label: "Far-field half-angle", symbol: "θ", quantity: "angle" },
      { key: "bpp", label: "Beam parameter product", symbol: "BPP", quantity: "bpp", unit: "mm.mrad" },
      { key: "i0", label: "Peak intensity at focus", symbol: "I₀", quantity: "intensity", unit: "W/cm2" },
    ],
    compute: (v) => {
      const d = be.focusDesign(v.lambda!, v.m2!, v.f!, v.D!, v.p! > 0 ? v.p! : undefined);
      return { d0: d.spotDiameter, dof5: d.dofPm5, dof: d.dofTwoZr, dof10: d.dofPm10, zr: d.rayleighRange, theta: d.divergenceHalfAngle, bpp: d.bpp, i0: d.peakIntensity ?? null };
    },
    equations: ["d_0 = \\frac{4M^2\\lambda f}{\\pi D}", "z_R = \\frac{\\pi w_0^2}{M^2\\lambda},\\quad 2z_R = \\frac{\\pi d_0^2}{2M^2\\lambda}", "z_{\\pm x} = z_R\\sqrt{(1+x)^2-1}", "I_0 = \\frac{2P}{\\pi w_0^2}"],
    variables: [
      { symbol: "D", meaning: "Collimated 1/e² beam DIAMETER at the lens", unit: "m" },
      { symbol: "d₀ = 2w₀", meaning: "Focused 1/e² spot DIAMETER (w₀ is the radius)", unit: "m" },
      { symbol: "f", meaning: "Focal length of the lens (or F-theta)", unit: "m" },
      { symbol: "z_R", meaning: "Rayleigh range: radius grows by √2", unit: "m" },
      { symbol: "x", meaning: "Allowed fractional spot growth (0.05 = ±5%)", unit: "—" },
    ],
    assumptions: ["Embedded-Gaussian (M²) model with an aberration-free lens and the waist formed at the focal plane.", "Diameters follow the 1/e² convention (D4σ is identical for a Gaussian; FWHM = 0.589 × 1/e², §4.1)."],
    limitations: ["Lens aberrations, clipping, thermal lensing and F-theta field effects enlarge real spots. The textbook 2z_R is usually too generous for processing; use the ±5% band (§4.3)."],
    interpret: (r) => [`The part surface must stay within ±${formatWithUnit(Number(r.dof5) / 2, "length")} of focus to keep the spot within ±5% (§4.3). Halving the spot quadruples intensity and cuts depth of focus about four-fold (working rule 4).`],
    sources: [{ section: "4.3" }, { section: "4.5", note: "design equations" }, { section: "4.6", note: "worked examples" }],
    classification: "derived",
    examples: [
      { label: "Fiber marker, 7 mm beam, f 160", values: { lambda: 1064, m2: 1.3, D: 7, f: 160, p: 20 } },
      { label: "Fiber marker, 10 mm expander", values: { lambda: 1064, m2: 1.3, D: 10, f: 160, p: 20 } },
      { label: "CO₂ PCB marker 10.6 µm", values: { lambda: 10600, m2: 1.2, D: 12, f: 100, p: 20 } },
      { label: "CO₂ PCB marker 9.3 µm", values: { lambda: 9300, m2: 1.2, D: 12, f: 100, p: 20 } },
      { label: "Ultrafast glass processing", values: { lambda: 1030, m2: 1.2, D: 6, f: 50, p: 20 } },
    ],
    related: { calculators: ["gaussian-propagation", "fiber-imaging"], tools: [{ label: "Beam & Optics Lab", href: "/beam-optics" }] },
    keywords: "spot size depth of focus Rayleigh DOF F-theta focusing",
  },
  {
    id: "gaussian-propagation",
    title: "Gaussian beam propagation",
    category: "beam",
    summary: "Beam radius and wavefront curvature at a distance from the waist.",
    inputs: [
      { key: "w0", label: "Waist radius (1/e²)", symbol: "w₀", quantity: "length", unit: "um", value: 20 },
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1064 },
      { key: "m2", label: "Beam quality", symbol: "M²", quantity: "ratio", unit: "1", value: 1.3 },
      { key: "z", label: "Distance from waist", symbol: "z", quantity: "length", unit: "mm", value: 0.5 },
    ],
    outputs: [
      { key: "wz", label: "Beam radius at z", symbol: "w(z)", quantity: "length", primary: true },
      { key: "dz", label: "Beam diameter at z", symbol: "2w(z)", quantity: "length" },
      { key: "growth", label: "Growth relative to waist", symbol: "w/w₀", quantity: "ratio" },
      { key: "zr", label: "Rayleigh range", symbol: "z_R", quantity: "length" },
      { key: "rz", label: "Wavefront radius of curvature", symbol: "R(z)", quantity: "length" },
    ],
    compute: (v) => {
      const zr = be.rayleighRange(v.w0!, v.lambda!, v.m2!);
      const wz = be.beamRadiusAt(v.z!, v.w0!, zr);
      const R = be.wavefrontRadius(v.z!, zr);
      return { wz, dz: 2 * wz, growth: wz / v.w0!, zr, rz: Number.isFinite(R) ? R : null };
    },
    equations: ["w(z) = w_0\\sqrt{1 + (z/z_R)^2}", "z_R = \\frac{\\pi w_0^2}{M^2\\lambda}", "R(z) = z\\left[1 + (z_R/z)^2\\right]"],
    variables: [
      { symbol: "w₀", meaning: "Waist RADIUS (1/e²)", unit: "m" },
      { symbol: "z", meaning: "Axial distance from the waist", unit: "m" },
    ],
    assumptions: ["Embedded-Gaussian model; R(z) is reported for the equivalent ideal beam."],
    sources: [{ section: "4.1" }, { section: "4.3" }],
    classification: "derived",
    examples: [{ label: "40 µm marker spot, 0.3 mm defocus", values: { w0: 20.1, lambda: 1064, m2: 1.3, z: 0.3 } }],
    related: { tools: [{ label: "Beam caustic", href: "/beam-optics" }] },
  },
  {
    id: "fiber-imaging",
    title: "Multimode fiber: imaged spot, collimated beam and BPP",
    category: "beam",
    summary: "Spot size from core imaging, collimated beam diameter and Rayleigh range for fiber-delivered lasers.",
    inputs: [
      { key: "core", label: "Fiber core diameter", symbol: "d_core", quantity: "length", unit: "um", value: 100 },
      { key: "na", label: "Effective beam NA", symbol: "NA_eff", quantity: "ratio", unit: "1", value: 0.07, help: "Beam NA is often 0.08–0.12 for a 0.22 NA fiber (§6.3). NA_eff = BPP / core radius." },
      { key: "fc", label: "Collimator focal length", symbol: "f_coll", quantity: "length", unit: "mm", value: 100 },
      { key: "ff", label: "Focusing focal length", symbol: "f_focus", quantity: "length", unit: "mm", value: 200 },
      { key: "p", label: "Power", symbol: "P", quantity: "power", unit: "kW", value: 6 },
    ],
    outputs: [
      { key: "d0", label: "Imaged spot diameter", symbol: "d₀", quantity: "length", primary: true },
      { key: "dcoll", label: "Collimated beam diameter", symbol: "D_coll", quantity: "length" },
      { key: "bpp", label: "BPP (conserved)", symbol: "BPP", quantity: "bpp", unit: "mm.mrad" },
      { key: "dof", label: "Depth of focus", symbol: "2z_R", quantity: "length" },
      { key: "imean", label: "Mean intensity over spot", symbol: "P/(πw₀²)", quantity: "intensity", unit: "W/cm2" },
      { key: "mag", label: "Magnification", symbol: "f_focus/f_coll", quantity: "ratio" },
    ],
    compute: (v) => {
      const d0 = be.fiberImageSpot(v.core!, v.ff!, v.fc!);
      const bpp = be.fiberBpp(v.core! / 2, v.na!);
      return { d0, dcoll: be.collimatedDiameter(v.fc!, v.na!), bpp, dof: 2 * be.rayleighRangeFromBpp(d0 / 2, bpp), imean: be.meanIntensity(v.p!, d0 / 2), mag: v.ff! / v.fc! };
    },
    equations: ["d_0 \\approx d_{core}\\,\\frac{f_{focus}}{f_{coll}}", "D_{coll} \\approx 2 f_{coll}\\, NA_{eff}", "BPP_{fiber} \\approx a_{core}\\cdot NA_{eff}", "z_R = \\frac{w_0^2}{BPP}"],
    variables: [
      { symbol: "a_core", meaning: "Core RADIUS = d_core/2", unit: "m" },
      { symbol: "NA_eff", meaning: "Effective NA of the emitted beam", unit: "—" },
    ],
    assumptions: ["The focus is an image of the fiber core (multimode, near top-hat near-field).", "BPP is conserved by passive optics (§4.4); intensity is the mean over the spot, appropriate to a near top-hat profile."],
    limitations: ["Ignores aberrations and clipping; size the collimator to the fiber NA with margin (§6.5)."],
    sources: [{ section: "4.5" }, { section: "4.6", note: "cutting head and remote-welding examples" }, { section: "6.3" }],
    classification: "derived",
    examples: [
      { label: "6 kW cutting head, 100 µm (BPP 3.5)", values: { core: 100, na: 0.07, fc: 100, ff: 200, p: 6 } },
      { label: "Remote weld, 50 µm (BPP ≈ 2), f 450", values: { core: 50, na: 0.08, fc: 150, ff: 450, p: 4 } },
      { label: "Remote weld, 100 µm (BPP ≈ 3.5), f 450", values: { core: 100, na: 0.07, fc: 300, ff: 450, p: 4 } },
    ],
    related: { calculators: ["focus-spot", "bpp-m2"] },
  },
  {
    id: "bpp-m2",
    title: "M² ↔ beam parameter product",
    category: "beam",
    summary: "Convert between M² and BPP at a wavelength.",
    inputs: [
      { key: "mode", label: "Convert", choice: [{ value: "m2", label: "M² → BPP" }, { value: "bpp", label: "BPP → M²" }], value: "m2" },
      { key: "x", label: "M² (or BPP in mm·mrad)", quantity: "ratio", unit: "1", value: 1.1 },
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 10600 },
    ],
    outputs: [
      { key: "bpp", label: "BPP", symbol: "BPP", quantity: "bpp", unit: "mm.mrad", primary: true },
      { key: "m2", label: "M²", symbol: "M²", quantity: "ratio", primary: true },
    ],
    compute: (v, c) => {
      if (c.mode === "bpp") return { bpp: v.x! * 1e-6, m2: be.m2FromBpp(v.x! * 1e-6, v.lambda!) };
      return { bpp: be.bppFromM2(v.x!, v.lambda!), m2: v.x! };
    },
    equations: ["BPP = w_0\\theta = \\frac{M^2\\lambda}{\\pi}"],
    variables: [{ symbol: "BPP", meaning: "Waist radius × far-field half-angle", unit: "mm·mrad" }],
    assumptions: ["Radius × half-angle convention for BPP and ISO 11146 second-moment M²."],
    limitations: ["Do not mix diameter × full-angle conventions (4× larger) with this definition."],
    sources: [{ section: "4.4", note: "BPP table" }],
    classification: "derived",
    examples: [
      { label: "CO₂ M² 1.1 at 10.6 µm (3.7)", values: { mode: "m2", x: 1.1, lambda: 10600 } },
      { label: "Single-mode Yb M² 1.05", values: { mode: "m2", x: 1.05, lambda: 1070 } },
      { label: "100 µm fiber BPP 3.5 → M²", values: { mode: "bpp", x: 3.5, lambda: 1070 } },
    ],
  },
  {
    id: "v-number",
    title: "Fiber V-number (single-mode check)",
    category: "beam",
    summary: "Whether a step-index fiber is single-mode at a wavelength.",
    inputs: [
      { key: "core", label: "Core diameter", symbol: "2a", quantity: "length", unit: "um", value: 6 },
      { key: "na", label: "Fiber NA", symbol: "NA", quantity: "ratio", unit: "1", value: 0.12 },
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1064 },
    ],
    outputs: [
      { key: "v", label: "V-number", symbol: "V", quantity: "ratio", primary: true },
      { key: "sm", label: "Guidance" },
    ],
    compute: (v) => {
      const V = be.vNumber(v.core! / 2, v.na!, v.lambda!);
      return { v: V, sm: V < 2.405 ? "Single-mode (V < 2.405)" : "Multimode (V ≥ 2.405)" };
    },
    equations: ["V = \\frac{2\\pi a\\, NA}{\\lambda}"],
    variables: [{ symbol: "a", meaning: "Core radius", unit: "m" }],
    assumptions: ["Step-index fiber."],
    sources: [{ section: "2.5" }, { section: "6.3" }],
    classification: "derived",
  },
  {
    id: "aperture-clipping",
    title: "Clear aperture and clipping",
    category: "beam",
    summary: "Fraction of a Gaussian beam passing a circular aperture.",
    inputs: [
      { key: "a", label: "Aperture diameter", symbol: "A", quantity: "length", unit: "mm", value: 15 },
      { key: "d", label: "Beam 1/e² diameter", symbol: "D", quantity: "length", unit: "mm", value: 10 },
    ],
    outputs: [
      { key: "t", label: "Transmitted fraction", quantity: "percent", unit: "%", primary: true, sig: 5 },
      { key: "ratio", label: "Aperture / beam diameter", quantity: "ratio" },
    ],
    compute: (v) => ({ t: be.apertureTransmission(v.a!, v.d!), ratio: v.a! / v.d! }),
    equations: ["T = 1 - \\exp\\!\\left(-2\\left(\\frac{A}{D}\\right)^2\\right)"],
    variables: [{ symbol: "A/D", meaning: "Aperture-to-beam diameter ratio", unit: "—" }],
    assumptions: ["Centred, ideal Gaussian beam; ignores diffraction ripple."],
    interpret: () => ["Handbook rule: 1.5× the 1/e² diameter passes ~98.9%; use ~2× on high-power paths to avoid clipping, diffraction ripple and heating of mounts (§4.5)."],
    sources: [{ section: "4.5", note: "clear aperture rule" }, { section: "4.1" }],
    classification: "derived",
    examples: [
      { label: "1.5 × D", values: { a: 15, d: 10 } },
      { label: "2 × D", values: { a: 20, d: 10 } },
      { label: "1 × D (86.5%)", values: { a: 10, d: 10 } },
    ],
  },

  /* ============================================================ INTERACTION */
  {
    id: "fluence",
    title: "Fluence and peak intensity of a pulse",
    category: "interaction",
    summary: "Gaussian peak fluence, mean fluence and peak intensity on the workpiece.",
    inputs: [
      { key: "ep", label: "Pulse energy", symbol: "E_p", quantity: "energy", unit: "uJ", value: 200 },
      { key: "d", label: "Spot diameter (1/e²)", symbol: "2w₀", quantity: "length", unit: "um", value: 30 },
      { key: "tau", label: "Pulse duration", symbol: "τ", quantity: "time", unit: "ns", value: 100 },
    ],
    outputs: [
      { key: "f0", label: "Peak fluence (Gaussian)", symbol: "F₀", quantity: "fluence", unit: "J/cm2", primary: true },
      { key: "fm", label: "Mean fluence over 1/e² area", symbol: "E_p/(πw₀²)", quantity: "fluence", unit: "J/cm2" },
      { key: "i0", label: "Peak intensity", symbol: "I₀ ≈ F₀/τ", quantity: "intensity", unit: "W/cm2" },
    ],
    compute: (v) => {
      const w0 = v.d! / 2;
      const f0 = ia.peakFluence(v.ep!, w0);
      return { f0, fm: ia.meanFluence(v.ep!, w0), i0: ia.pulsePeakIntensity(f0, v.tau!) };
    },
    equations: ["F_0 = \\frac{2E_p}{\\pi w_0^2}", "I_0 \\approx \\frac{F_0}{\\tau}"],
    variables: [
      { symbol: "w₀", meaning: "1/e² spot RADIUS (half the entered diameter)", unit: "m" },
      { symbol: "τ", meaning: "Pulse duration", unit: "s" },
    ],
    assumptions: ["Gaussian spatial profile at the focal plane; rectangular-in-time intensity estimate."],
    limitations: ["Process thresholds are material- and pulse-specific and are not provided by the handbook for most materials — they must be measured (DOE, §23.6)."],
    interpret: () => ["Work in derived quantities (fluence, intensity, J/mm, overlap) so results transfer between machines (§23.6)."],
    sources: [{ section: "2.9" }, { section: "9.5" }, { section: "23.6" }],
    classification: "derived",
    examples: [
      { label: "20 W MOPA long pulse (w₀ 15 µm)", values: { ep: 200, d: 30, tau: 100 } },
      { label: "50 W ps (w₀ 25 µm)", values: { ep: 50, d: 50, tau: 0.01 } },
      { label: "20 W fs glass (w₀ 20 µm)", values: { ep: 100, d: 40, tau: 0.0003 } },
    ],
    related: { calculators: ["pulse-parameters", "ablation-depth"], tools: [{ label: "Material Interaction Lab", href: "/materials" }] },
  },
  {
    id: "cw-intensity",
    title: "CW spot intensity and welding-mode indicator",
    category: "interaction",
    summary: "Peak and mean intensity of a CW spot, compared with the handbook's ~10⁶ W/cm² conduction/keyhole boundary.",
    inputs: [
      { key: "p", label: "Power", symbol: "P", quantity: "power", unit: "kW", value: 2 },
      { key: "d", label: "Spot diameter (1/e²)", symbol: "d", quantity: "length", unit: "um", value: 300 },
    ],
    outputs: [
      { key: "imean", label: "Mean intensity P/(πw²)", symbol: "Ī", quantity: "intensity", unit: "W/cm2", primary: true },
      { key: "ipeak", label: "Gaussian peak intensity", symbol: "I₀", quantity: "intensity", unit: "W/cm2" },
      { key: "mode", label: "Indicative regime (steel, §10.4)" },
    ],
    compute: (v) => {
      const w = v.d! / 2;
      const imean = be.meanIntensity(v.p!, w);
      return { imean, ipeak: be.gaussianPeakIntensity(v.p!, w), mode: ia.weldingModeIndicator(imean) };
    },
    equations: ["\\bar I = \\frac{P}{\\pi w^2},\\qquad I_0 = \\frac{2P}{\\pi w^2}"],
    variables: [{ symbol: "w", meaning: "Spot radius", unit: "m" }],
    assumptions: ["Regime bands: conduction below 0.5 × 10⁶, transition 0.5–2 × 10⁶, keyhole above 2 × 10⁶ W/cm² — an LASERVERSE banding of the handbook's single ~10⁶ W/cm² boundary."],
    limitations: ["The indicator is not a prediction: the real mode depends on material, absorptance, speed, spot and shielding. Penetration depth is not computed."],
    sources: [{ section: "10.4", note: "welding modes table" }, { section: "9.4" }],
    classification: "derived",
    examples: [
      { label: "Conduction: 500 W, 1 mm spot", values: { p: 0.5, d: 1000 } },
      { label: "Keyhole: 3 kW, 200 µm", values: { p: 3, d: 200 } },
    ],
    related: { tools: [{ label: "Welding workspace", href: "/processes/welding" }] },
  },
  {
    id: "energy-per-length",
    title: "Heat input per unit length",
    category: "interaction",
    summary: "Q = ηP/v, the governing parameter for distortion, grain growth and HAZ width in welding.",
    inputs: [
      { key: "eta", label: "Absorbed fraction", symbol: "η", quantity: "percent", unit: "%", value: 40 },
      { key: "p", label: "Power", symbol: "P", quantity: "power", unit: "kW", value: 3 },
      { key: "v", label: "Travel speed", symbol: "v", quantity: "velocity", unit: "mm/s", value: 100 },
    ],
    outputs: [
      { key: "q", label: "Heat input per length", symbol: "Q", quantity: "linearEnergy", unit: "J/mm", primary: true },
      { key: "qline", label: "Line energy (incident) P/v", quantity: "linearEnergy", unit: "J/mm" },
    ],
    compute: (v) => ({ q: ia.heatInputPerLength(v.eta!, v.p!, v.v!), qline: v.p! / v.v! }),
    equations: ["Q = \\frac{\\eta P}{v}"],
    variables: [
      { symbol: "η", meaning: "Absorbed (coupled) fraction of power", unit: "—" },
      { symbol: "v", meaning: "Travel speed", unit: "m/s" },
    ],
    assumptions: ["η is user-supplied; in keyhole mode coupling can reach ~60–90% even on copper (§9.2)."],
    sources: [{ section: "9.4" }, { section: "10.4" }],
    classification: "derived",
  },
  {
    id: "pulse-overlap",
    title: "Pulse and hatch overlap",
    category: "interaction",
    summary: "Pulse spacing, overlap and hatch overlap for scanned pulsed processing.",
    inputs: [
      { key: "v", label: "Scan speed", symbol: "v", quantity: "velocity", unit: "mm/s", value: 1000 },
      { key: "f", label: "Repetition rate", symbol: "f", quantity: "frequency", unit: "kHz", value: 100 },
      { key: "d", label: "Spot diameter", symbol: "d", quantity: "length", unit: "um", value: 30 },
      { key: "h", label: "Hatch spacing", symbol: "h", quantity: "length", unit: "um", value: 20 },
    ],
    outputs: [
      { key: "o", label: "Pulse overlap", symbol: "O", quantity: "percent", unit: "%", primary: true },
      { key: "dx", label: "Pulse spacing", symbol: "v/f", quantity: "length" },
      { key: "ho", label: "Hatch overlap", symbol: "1 − h/d", quantity: "percent", unit: "%" },
      { key: "n", label: "Pulses per spot diameter", symbol: "d·f/v", quantity: "ratio" },
    ],
    compute: (v) => ({ o: ia.pulseOverlap(v.v!, v.f!, v.d!), dx: ia.pulseSpacing(v.v!, v.f!), ho: ia.hatchOverlap(v.h!, v.d!), n: ia.pulsesPerSpot(v.v!, v.f!, v.d!) }),
    equations: ["O = 1 - \\frac{v}{f\\,d}"],
    variables: [
      { symbol: "v", meaning: "Scan speed", unit: "m/s" },
      { symbol: "f", meaning: "Repetition rate", unit: "Hz" },
      { symbol: "d", meaning: "Spot diameter", unit: "m" },
    ],
    assumptions: ["Constant speed (skywriting, §7.2); overlap defined on the spot diameter."],
    interpret: (r) => {
      const spacing = 1 - Number(r.o);
      const out = ["Handbook rule: hatch and pulse spacing are normally 0.5–0.8 × the spot diameter for uniform area removal (§7.3)."];
      if (spacing > 1) out.push("Spacing exceeds the spot diameter — isolated spots with gaps between them.");
      else if (spacing < 0.5) out.push("Spacing below 0.5 × d — heavy overlap; watch for heat accumulation.");
      else if (spacing <= 0.8) out.push("Spacing within the 0.5–0.8 × d band.");
      return out;
    },
    sources: [{ section: "2.9", note: "overlap example" }, { section: "7.3", note: "hatch rule" }],
    classification: "derived",
    examples: [{ label: "1000 mm/s, 100 kHz, 30 µm (§2.9: 67%)", values: { v: 1000, f: 100, d: 30, h: 20 } }],
    related: { tools: [{ label: "Marking workspace", href: "/processes/marking" }] },
  },
  {
    id: "thermal-diffusion",
    title: "Thermal diffusion length",
    category: "interaction",
    summary: "How far heat spreads during the interaction time — the physical floor of the heat-affected zone.",
    inputs: [
      { key: "k", label: "Thermal diffusivity", symbol: "κ", quantity: "diffusivity", unit: "mm2/s", value: 4, help: "Handbook §9.4 values: Cu 117, Si 88, stainless 4, glass 0.8, PC 0.14 mm²/s." },
      { key: "tau", label: "Interaction time (pulse or dwell)", symbol: "τ", quantity: "time", unit: "ns", value: 100 },
    ],
    outputs: [{ key: "l", label: "Thermal diffusion length", symbol: "L_th", quantity: "length", primary: true }],
    compute: (v) => ({ l: ia.thermalDiffusionLength(v.k!, v.tau!) }),
    equations: ["L_{th} \\approx 2\\sqrt{\\kappa\\,\\tau}", "\\kappa = \\frac{K}{\\rho c_p}"],
    variables: [
      { symbol: "κ", meaning: "Thermal diffusivity", unit: "m²/s" },
      { symbol: "τ", meaning: "Pulse duration or dwell time", unit: "s" },
    ],
    assumptions: ["One-dimensional diffusion estimate; constant properties."],
    limitations: ["For ps/fs pulses in metals, hot electrons carry energy some tens of nm first (two-temperature model); the practical minimum HAZ is ~0.1–1 µm (§9.4). At MHz rates heat accumulation can rebuild a HAZ (§9.5)."],
    sources: [{ section: "9.4", note: "diffusivity table" }],
    classification: "derived",
    examples: [
      { label: "Copper, 10 ns", values: { k: 117, tau: 10 } },
      { label: "Silicon, 10 ns", values: { k: 88, tau: 10 } },
      { label: "Stainless, 100 ns", values: { k: 4, tau: 100 } },
      { label: "Stainless, 10 ps", values: { k: 4, tau: 0.01 } },
      { label: "Stainless, 1 ms", values: { k: 4, tau: 1e6 } },
      { label: "Glass, 100 ns", values: { k: 0.8, tau: 100 } },
      { label: "Polycarbonate, 1 ms", values: { k: 0.14, tau: 1e6 } },
    ],
    related: { calculators: ["diffusivity"], tools: [{ label: "Material Interaction Lab", href: "/materials" }] },
  },
  {
    id: "diffusivity",
    title: "Thermal diffusivity from material properties",
    category: "interaction",
    summary: "κ = K/(ρc_p) from conductivity, density and specific heat.",
    inputs: [
      { key: "K", label: "Thermal conductivity", symbol: "K", quantity: "ratio", unit: "1", unitLabel: "W/(m·K)", value: 16 },
      { key: "rho", label: "Density", symbol: "ρ", quantity: "ratio", unit: "1", unitLabel: "kg/m³", value: 8000 },
      { key: "cp", label: "Specific heat", symbol: "c_p", quantity: "ratio", unit: "1", unitLabel: "J/(kg·K)", value: 500 },
    ],
    outputs: [{ key: "k", label: "Thermal diffusivity", symbol: "κ", quantity: "diffusivity", unit: "mm2/s", primary: true }],
    compute: (v) => ({ k: ia.thermalDiffusivity(v.K!, v.rho!, v.cp!) }),
    equations: ["\\kappa = \\frac{K}{\\rho\\,c_p}"],
    variables: [{ symbol: "K", meaning: "Thermal conductivity", unit: "W/(m·K)" }],
    assumptions: ["Room-temperature properties; properties change with temperature."],
    externalNote: "Default property values are typical literature figures for austenitic stainless steel (not from the handbook) — replace them with your material's data.",
    sources: [{ section: "9.4" }],
    classification: "derived",
  },
  {
    id: "ablation-depth",
    title: "Ablation depth per pulse and optimum fluence",
    category: "interaction",
    summary: "Logarithmic ablation model and the energy-efficient optimum fluence e²·F_th.",
    inputs: [
      { key: "delta", label: "Effective penetration depth", symbol: "δ", quantity: "length", unit: "nm", value: 20 },
      { key: "f0", label: "Peak fluence", symbol: "F₀", quantity: "fluence", unit: "J/cm2", value: 2 },
      { key: "fth", label: "Threshold fluence", symbol: "F_th", quantity: "fluence", unit: "J/cm2", value: 0.2 },
      { key: "n", label: "Number of pulses", symbol: "N", quantity: "count", unit: "1", value: 100 },
    ],
    outputs: [
      { key: "d", label: "Depth per pulse", symbol: "d_pulse", quantity: "length", primary: true },
      { key: "total", label: "Depth after N pulses (no incubation, no shielding)", quantity: "length" },
      { key: "fopt", label: "Optimum peak fluence", symbol: "e²F_th", quantity: "fluence", unit: "J/cm2" },
      { key: "ratio", label: "F₀ / F_th", quantity: "ratio" },
    ],
    compute: (v) => {
      const d = ia.ablationDepthPerPulse(v.delta!, v.f0!, v.fth!);
      return { d, total: d * v.n!, fopt: ia.optimumFluence(v.fth!), ratio: v.f0! / v.fth! };
    },
    equations: ["d_{pulse} \\approx \\delta\\,\\ln\\!\\left(\\frac{F_0}{F_{th}}\\right)", "F_{opt} \\approx e^2 F_{th}"],
    variables: [
      { symbol: "δ", meaning: "Effective (optical or electron) penetration depth", unit: "m" },
      { symbol: "F_th", meaning: "Ablation threshold fluence (falls with pulse count — incubation)", unit: "J/m²" },
    ],
    assumptions: ["Logarithmic ablation law above threshold.", "Linear accumulation over N pulses ignores incubation, plasma shielding and heat accumulation."],
    limitations: ["δ and F_th are illustrative defaults, not handbook data: they must be measured for the material and pulse regime. Treat the depth as an order-of-magnitude guide, not a process prediction."],
    interpret: (r) => {
      const ratio = Number(r.ratio);
      if (ratio <= 1) return ["Below threshold: no ablation by this model."];
      return [ratio > 7.39 ? "Operating above e²·F_th: energy-specific removal falls; spread power over more pulses, bursts or spots instead (§9.5)." : "Below e²·F_th: raising fluence toward ≈7.4 F_th increases energy-specific removal (§9.5)."];
    },
    sources: [{ section: "9.5" }],
    classification: "derived",
    externalNote: "Default δ and F_th are illustrative placeholders, not material data.",
  },
  {
    id: "critical-power",
    title: "Critical power for self-focusing",
    category: "interaction",
    summary: "Peak power above which the Kerr effect collapses a beam into a filament.",
    inputs: [
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "nm", value: 1030 },
      { key: "n0", label: "Linear index", symbol: "n₀", quantity: "ratio", unit: "1", value: 1.45 },
      { key: "n2", label: "Nonlinear index", symbol: "n₂", quantity: "n2", unit: "m2/W", value: 2.7e-20 },
    ],
    outputs: [{ key: "pcr", label: "Critical power", symbol: "P_cr", quantity: "power", primary: true }],
    compute: (v) => ({ pcr: ia.criticalPowerSelfFocusing(v.lambda!, v.n0!, v.n2!) }),
    equations: ["P_{cr} \\approx \\frac{3.77\\,\\lambda^2}{8\\pi n_0 n_2}"],
    variables: [{ symbol: "n₂", meaning: "Kerr nonlinear refractive index", unit: "m²/W" }],
    assumptions: ["Gaussian beam, Kerr medium."],
    externalNote: "The default n₂ = 2.7 × 10⁻²⁰ m²/W for fused silica is a literature value, not from the handbook; the handbook states the result (~4 MW in fused silica, ~5 GW in air at 1030 nm).",
    sources: [{ section: "10.15" }],
    classification: "derived",
    examples: [
      { label: "Fused silica (n₂ external)", values: { lambda: 1030, n0: 1.45, n2: 2.7e-20 } },
      { label: "Air (n₂ ≈ 3.2 × 10⁻²³, external)", values: { lambda: 1030, n0: 1.0003, n2: 3.2e-23 } },
    ],
  },
  {
    id: "fresnel",
    title: "Fresnel reflectance and penetration depth",
    category: "interaction",
    summary: "Normal-incidence reflectance of dielectrics and absorbing media, Brewster angle and optical penetration depth.",
    inputs: [
      { key: "n", label: "Refractive index (real part)", symbol: "n", quantity: "ratio", unit: "1", value: 2.4 },
      { key: "k", label: "Extinction coefficient", symbol: "k", quantity: "ratio", unit: "1", value: 0, help: "0 for transparent dielectrics; metals have k of several units." },
      { key: "lambda", label: "Wavelength (for δ)", symbol: "λ", quantity: "length", unit: "nm", value: 10600 },
    ],
    outputs: [
      { key: "r", label: "Reflectance at normal incidence", symbol: "R", quantity: "percent", unit: "%", primary: true },
      { key: "brewster", label: "Brewster angle (dielectric)", symbol: "θ_B", quantity: "angle", unit: "deg" },
      { key: "delta", label: "Penetration depth", symbol: "δ", quantity: "length" },
    ],
    compute: (v) => ({ r: op.reflectanceComplex(v.n!, v.k!), brewster: v.k! === 0 ? op.brewsterAngle(v.n!) : null, delta: v.k! > 0 ? op.penetrationDepth(v.lambda!, v.k!) : null }),
    equations: ["R = \\frac{(n-1)^2 + k^2}{(n+1)^2 + k^2}", "\\delta = \\frac{\\lambda}{4\\pi k}", "\\tan\\theta_B = n"],
    variables: [
      { symbol: "n, k", meaning: "Complex refractive index ñ = n + ik", unit: "—" },
      { symbol: "δ", meaning: "Depth where intensity falls to 1/e", unit: "m" },
    ],
    assumptions: ["Light incident from air (n = 1) at normal incidence (Brewster angle excepted)."],
    sources: [{ section: "5.2", note: "uncoated reflectance" }, { section: "9.1" }, { section: "1.8", note: "Brewster" }],
    classification: "derived",
    examples: [
      { label: "Fused silica n ≈ 1.45 (~3.5%)", values: { n: 1.45, k: 0, lambda: 1064 } },
      { label: "ZnSe n ≈ 2.4 (~17%)", values: { n: 2.4, k: 0, lambda: 10600 } },
      { label: "Ge n ≈ 4 (~36%)", values: { n: 4, k: 0, lambda: 10600 } },
    ],
  },
  {
    id: "hagen-rubens",
    title: "Hagen–Rubens IR absorptance of metals",
    category: "interaction",
    summary: "Free-electron estimate of how much infrared light a polished metal absorbs.",
    inputs: [
      { key: "sigma", label: "Electrical conductivity", symbol: "σₑ", quantity: "conductivity", unit: "MS/m", value: 59.6 },
      { key: "lambda", label: "Wavelength", symbol: "λ", quantity: "length", unit: "um", value: 10.6 },
    ],
    outputs: [{ key: "a", label: "Absorptance", symbol: "A", quantity: "percent", unit: "%", primary: true }],
    compute: (v) => ({ a: op.hagenRubensAbsorptance(v.sigma!, v.lambda!) }),
    equations: ["A \\approx 2\\sqrt{\\frac{2\\varepsilon_0\\,\\omega}{\\sigma_e}},\\quad \\omega = \\frac{2\\pi c}{\\lambda}"],
    variables: [{ symbol: "σₑ", meaning: "DC electrical conductivity", unit: "S/m" }],
    assumptions: ["Infrared, polished, room-temperature metal (Drude low-frequency limit)."],
    limitations: ["Real absorption rises with temperature, roughness, oxides, angle, polarisation and keyhole multiple reflection (§1.11, §9.2). Not valid in the visible/UV where interband transitions dominate (Cu, Au)."],
    externalNote: "Conductivity defaults (Cu 59.6 MS/m; stainless ≈ 1.39 MS/m) are standard literature values, not handbook data.",
    sources: [{ section: "1.11", note: "Hagen–Rubens; Cu ≈ 1.5%, stainless ≈ 9% at 10.6 µm" }],
    classification: "derived",
    examples: [
      { label: "Copper at 10.6 µm", values: { sigma: 59.6, lambda: 10.6 } },
      { label: "Stainless at 10.6 µm", values: { sigma: 1.39, lambda: 10.6 } },
      { label: "Copper at 1.07 µm (model limit)", values: { sigma: 59.6, lambda: 1.07 } },
    ],
  },

  /* ============================================================ PROCESS */
  {
    id: "hatch-time",
    title: "Scan-path length and marking time",
    category: "process",
    summary: "Hatch-fill path length and estimated scan time for a rectangular area.",
    inputs: [
      { key: "w", label: "Fill width", symbol: "W", quantity: "length", unit: "mm", value: 10 },
      { key: "h", label: "Fill height", symbol: "H", quantity: "length", unit: "mm", value: 10 },
      { key: "hatch", label: "Hatch spacing", symbol: "h", quantity: "length", unit: "um", value: 30 },
      { key: "v", label: "Mark speed", symbol: "v_mark", quantity: "velocity", unit: "mm/s", value: 1000 },
      { key: "j", label: "Jump speed", symbol: "v_jump", quantity: "velocity", unit: "mm/s", value: 5000 },
      { key: "passes", label: "Passes", quantity: "count", unit: "1", value: 1 },
      { key: "oh", label: "Fixed delays per line", quantity: "time", unit: "us", value: 200 },
      { key: "dir", label: "Hatch strategy", choice: [{ value: "bi", label: "Bidirectional (zig-zag)" }, { value: "uni", label: "Unidirectional" }], value: "bi" },
    ],
    outputs: [
      { key: "t", label: "Estimated scan time", symbol: "t", quantity: "time", primary: true },
      { key: "lines", label: "Hatch lines per pass", quantity: "count" },
      { key: "len", label: "Marking path length", quantity: "length" },
      { key: "markt", label: "Time marking", quantity: "time" },
      { key: "jumpt", label: "Time jumping", quantity: "time" },
      { key: "oht", label: "Time in delays", quantity: "time" },
    ],
    compute: (v, c) => {
      const r = pr.hatchFillTime({ width: v.w!, height: v.h!, hatch: v.hatch!, markSpeed: v.v!, jumpSpeed: v.j!, passes: Math.round(v.passes!), perLineOverhead: v.oh!, bidirectional: c.dir !== "uni" });
      return { t: r.totalTime, lines: r.lines, len: r.markLength, markt: r.markTime, jumpt: r.jumpTime, oht: r.overheadTime };
    },
    equations: ["N_{lines} = \\lfloor H/h \\rfloor + 1", "t = \\frac{N W n_{pass}}{v_{mark}} + \\frac{L_{jump}}{v_{jump}} + N n_{pass} t_{delay}"],
    variables: [
      { symbol: "t_delay", meaning: "Laser-on/off, mark and polygon delays per vector (§7.2)", unit: "s" },
      { symbol: "L_jump", meaning: "Total jump length between lines and passes", unit: "m" },
    ],
    assumptions: ["Constant mark and jump speeds; acceleration lumped into the per-line delay.", "Bidirectional hatch jumps only one hatch step between lines; unidirectional returns across the width."],
    limitations: ["Real controllers use skywriting, corner delays and protocol limits; measure on the machine for quotes."],
    sources: [{ section: "7.2", note: "speeds and delays" }, { section: "7.3", note: "scan strategies" }],
    classification: "derived",
    related: { calculators: ["cycle-time", "pulse-overlap"], tools: [{ label: "Marking workspace", href: "/processes/marking" }] },
  },
  {
    id: "cycle-time",
    title: "Cycle-time breakdown and throughput",
    category: "process",
    summary: "Where the cycle goes — process, handling, vision, indexing — and parts per hour at a given OEE.",
    inputs: [
      { key: "process", label: "Laser process time", quantity: "duration", unit: "s", value: 2.5 },
      { key: "handling", label: "Handling (load/unload)", quantity: "duration", unit: "s", value: 2 },
      { key: "vision", label: "Vision (align, read)", quantity: "duration", unit: "s", value: 0.6 },
      { key: "indexing", label: "Indexing / motion", quantity: "duration", unit: "s", value: 0.6 },
      { key: "other", label: "Other (handshakes, MES)", quantity: "duration", unit: "s", value: 0.3 },
      { key: "oee", label: "OEE", quantity: "percent", unit: "%", value: 80 },
    ],
    outputs: [
      { key: "total", label: "Cycle time", quantity: "duration", unit: "s", primary: true },
      { key: "tph", label: "Throughput", quantity: "rate", unit: "/h", primary: true },
      { key: "share", label: "Laser share of cycle", quantity: "percent", unit: "%" },
      { key: "bottleneck", label: "Largest contributor" },
    ],
    compute: (v) => {
      const c = pr.cycleTime({ process: v.process!, handling: v.handling!, vision: v.vision!, indexing: v.indexing!, other: v.other! });
      return { total: c.total, tph: pr.throughputPerHour(c.total, v.oee!) / 3600, share: c.laserShare, bottleneck: c.bottleneck };
    },
    equations: ["t_{cycle} = t_{process} + t_{handling} + t_{vision} + t_{index} + t_{other}", "\\text{parts/h} = \\frac{3600}{t_{cycle}}\\cdot OEE"],
    variables: [{ symbol: "OEE", meaning: "Overall equipment effectiveness", unit: "—" }],
    assumptions: ["Steps are sequential (no overlap of handling with processing)."],
    interpret: () => ["In production, handling, vision and motion usually limit cycle time more than the laser does (working rule 6, §11–12)."],
    sources: [{ section: "23.5", note: "cycle time = process + handling + vision + indexing" }, { section: "12.4" }],
    classification: "derived",
  },
  {
    id: "galvo-resolution",
    title: "Galvo addressing resolution",
    category: "process",
    summary: "Position step size of a scan field for a given control-protocol bit depth.",
    inputs: [
      { key: "field", label: "Field size", quantity: "length", unit: "mm", value: 110 },
      { key: "bits", label: "Protocol bits", quantity: "count", unit: "1", value: 16, help: "XY2-100 is 16-bit; SL2-100 is 20-bit (§7.2)." },
    ],
    outputs: [{ key: "step", label: "Step size", quantity: "length", primary: true }],
    compute: (v) => ({ step: pr.galvoResolution(v.field!, Math.round(v.bits!)) }),
    equations: ["\\Delta x = \\frac{\\text{field}}{2^{bits}}"],
    variables: [{ symbol: "bits", meaning: "Command resolution of the scanner protocol", unit: "—" }],
    assumptions: ["Command quantisation only; real accuracy is set by calibration, drift and distortion (§7.2)."],
    sources: [{ section: "7.2" }],
    classification: "derived",
    examples: [
      { label: "110 mm, 16-bit", values: { field: 110, bits: 16 } },
      { label: "110 mm, 20-bit", values: { field: 110, bits: 20 } },
    ],
  },
  {
    id: "vision-resolution",
    title: "Vision resolution",
    category: "process",
    summary: "Object-space resolution of a camera and the smallest reliably resolved feature.",
    inputs: [
      { key: "fov", label: "Field of view", quantity: "length", unit: "mm", value: 20 },
      { key: "px", label: "Pixels across the field", quantity: "count", unit: "1", value: 2448 },
    ],
    outputs: [
      { key: "res", label: "Resolution", symbol: "µm/pixel", quantity: "length", primary: true },
      { key: "feat", label: "Smallest feature (≥ 3–4 px)", quantity: "length" },
      { key: "edge", label: "Edge location (~0.1 px)", quantity: "length" },
    ],
    compute: (v) => {
      const r = pr.visionResolution(v.fov!, v.px!);
      return { res: r, feat: r * 3.5, edge: r * 0.1 };
    },
    equations: ["\\text{resolution} = \\frac{FOV}{\\text{pixels}}"],
    variables: [{ symbol: "FOV", meaning: "Field of view along the axis", unit: "m" }],
    assumptions: ["Optics resolve at least the pixel pitch; features ≥ 3–4 pixels; sub-pixel edge location ~0.1 px (§12.1)."],
    sources: [{ section: "12.1" }],
    classification: "derived",
    examples: [{ label: "5 MP over 20 mm (§12.1: ≈ 8 µm/px)", values: { fov: 20, px: 2448 } }],
  },

  /* ============================================================ SAFETY */
  {
    id: "optical-density",
    title: "Eyewear optical density",
    category: "safety",
    summary: "Minimum optical density for a worst-case exposure and a maximum permissible exposure taken from the standard.",
    inputs: [
      { key: "h0", label: "Worst-case exposure", symbol: "H₀", quantity: "ratio", unit: "1", unitLabel: "W/m² (or J/m²)", value: 1e7 },
      { key: "mpe", label: "MPE from IEC 60825-1 / ANSI Z136.1", symbol: "MPE", quantity: "ratio", unit: "1", unitLabel: "same unit as H₀", value: 10 },
    ],
    outputs: [
      { key: "od", label: "Required optical density", symbol: "OD", quantity: "ratio", primary: true },
      { key: "att", label: "Required attenuation", quantity: "ratio" },
    ],
    compute: (v) => {
      const od = sa.requiredOpticalDensity(v.h0!, v.mpe!);
      return { od, att: 10 ** od };
    },
    equations: ["OD \\ge \\log_{10}\\!\\left(\\frac{H_0}{MPE}\\right)"],
    variables: [
      { symbol: "H₀", meaning: "Worst-case exposure at the eye", unit: "W/m² or J/m²" },
      { symbol: "MPE", meaning: "Maximum permissible exposure (standard tables)", unit: "same as H₀" },
    ],
    assumptions: ["H₀ and MPE are for the same wavelength, exposure duration and pulse format."],
    limitations: ["This tool does not provide MPE values or certify eyewear. Eyewear selection follows EN 207/EN 208 and the laser safety officer's assessment; engineering controls come first (Part XXIV)."],
    sources: [{ section: "24.2" }, { section: "24.3" }],
    classification: "derived",
  },
  {
    id: "nohd",
    title: "Nominal ocular hazard distance (NOHD)",
    category: "safety",
    summary: "Distance beyond which a freely propagating beam falls below the MPE.",
    inputs: [
      { key: "p", label: "Power", symbol: "P", quantity: "power", unit: "W", value: 1 },
      { key: "mpe", label: "MPE (irradiance) from the standard", symbol: "MPE", quantity: "intensity", unit: "W/m2", value: 10 },
      { key: "phi", label: "Full-angle divergence", symbol: "φ", quantity: "angle", unit: "mrad", value: 1 },
      { key: "a", label: "Exit beam diameter", symbol: "a", quantity: "length", unit: "mm", value: 5 },
    ],
    outputs: [{ key: "nohd", label: "NOHD", quantity: "length", primary: true }],
    compute: (v) => ({ nohd: sa.nohd(v.p!, v.mpe!, v.phi!, v.a!) }),
    equations: ["NOHD = \\frac{1}{\\phi}\\left(\\sqrt{\\frac{4P}{\\pi\\,MPE}} - a\\right)"],
    variables: [
      { symbol: "φ", meaning: "Full-angle beam divergence", unit: "rad" },
      { symbol: "a", meaning: "Exit beam diameter", unit: "m" },
    ],
    assumptions: ["Free, unfocused beam with constant divergence; top-hat equivalent irradiance."],
    limitations: ["MPE must come from IEC 60825-1 / ANSI Z136.1 for the wavelength and exposure time. Not a substitute for a hazard analysis by a laser safety officer."],
    sources: [{ section: "24.2" }],
    classification: "derived",
  },

  /* ============================================================ ECONOMICS */
  {
    id: "cost-per-part",
    title: "Cost per good part",
    category: "economics",
    summary: "Annualised capital plus operating cost divided by good parts — the handbook's measure for judging laser solutions.",
    inputs: [
      { key: "capex", label: "Machine CAPEX", quantity: "money", unit: "cur", unitLabel: "currency", value: 4500000 },
      { key: "years", label: "Depreciation life", quantity: "count", unit: "1", unitLabel: "years", value: 7 },
      { key: "rate", label: "Cost of capital", quantity: "percent", unit: "%", value: 10 },
      { key: "kw", label: "Electrical load", quantity: "ratio", unit: "1", unitLabel: "kW", value: 2 },
      { key: "tariff", label: "Electricity tariff", quantity: "money", unit: "cur", unitLabel: "currency/kWh", value: 9 },
      { key: "cons", label: "Consumables and filters per year", quantity: "money", unit: "cur", unitLabel: "currency/yr", value: 150000 },
      { key: "svc", label: "Service as % of CAPEX per year", quantity: "percent", unit: "%", value: 4 },
      { key: "labour", label: "Labour per year", quantity: "money", unit: "cur", unitLabel: "currency/yr", value: 150000 },
      { key: "other", label: "Other OPEX per year (gas, spares…)", quantity: "money", unit: "cur", unitLabel: "currency/yr", value: 0 },
      { key: "hours", label: "Operating hours per year", quantity: "count", unit: "1", unitLabel: "h/yr", value: 6000 },
      { key: "ct", label: "Cycle time per part", quantity: "duration", unit: "s", value: 6 },
      { key: "oee", label: "OEE", quantity: "percent", unit: "%", value: 80 },
      { key: "yield", label: "Yield", quantity: "percent", unit: "%", value: 99.5 },
    ],
    outputs: [
      { key: "cpp", label: "Cost per good part", quantity: "money", unitLabel: "currency", primary: true, sig: 3 },
      { key: "good", label: "Good parts per year", quantity: "count" },
      { key: "crf", label: "Capital recovery factor", quantity: "ratio" },
      { key: "cap", label: "Annualised capital", quantity: "money", unitLabel: "currency/yr" },
      { key: "opex", label: "Annual OPEX", quantity: "money", unitLabel: "currency/yr" },
      { key: "cpp100", label: "Cost per part at 100% yield", quantity: "money", unitLabel: "currency", sig: 3 },
    ],
    compute: (v) => {
      const m = ec.costPerPartModel({ capex: v.capex!, years: Math.round(v.years!), rate: v.rate!, electricityKw: v.kw!, tariffPerKwh: v.tariff!, consumables: v.cons!, servicePctOfCapex: v.svc!, labour: v.labour!, otherOpex: v.other!, hours: v.hours!, cycleTime: v.ct!, oee: v.oee!, yieldFraction: v.yield! });
      return { cpp: m.costPerGoodPart, good: m.goodParts, crf: m.crf, cap: m.annualCapital, opex: m.opex, cpp100: m.costPerPartAt100Yield };
    },
    equations: ["C_{part} = \\frac{C_{capex}\\cdot CRF + C_{opex}}{N_{good}}", "CRF = \\frac{i(1+i)^n}{(1+i)^n - 1}", "N_{good} = \\frac{H\\cdot 3600}{t_{cycle}}\\cdot OEE\\cdot Y"],
    variables: [
      { symbol: "i, n", meaning: "Cost of capital and years", unit: "—, years" },
      { symbol: "H", meaning: "Operating hours per year", unit: "h" },
      { symbol: "Y", meaning: "Yield (good / produced)", unit: "—" },
    ],
    assumptions: ["All monetary inputs are user assumptions in one currency; results are illustrative.", "Electricity = load × hours × tariff; service = % of CAPEX (handbook: often ~3–5%/yr)."],
    limitations: ["Excludes floor space, taxes, financing structure and ramp-up losses unless entered under other OPEX."],
    interpret: () => ["Cycle time and OEE move the answer far more than a ±20% change in laser price (§23.2). Judge a solution on cost per good part over its life, not on capex (working rule 10)."],
    sources: [{ section: "23.2", note: "formula and worked INR example" }, { section: "B.3" }],
    classification: "derived",
    examples: [{ label: "Handbook: CO₂ in-line PCB marker (₹)", values: { capex: 4500000, years: 7, rate: 10, kw: 2, tariff: 9, cons: 150000, svc: 4, labour: 150000, other: 0, hours: 6000, ct: 6, oee: 80, yield: 99.5 }, note: "§23.2: ≈ ₹0.53 per panel" }],
    related: { calculators: ["roi-payback", "cycle-time"] },
  },
  {
    id: "roi-payback",
    title: "ROI, payback, NPV and IRR",
    category: "economics",
    summary: "Investment appraisal of a laser solution from CAPEX and annual net savings.",
    inputs: [
      { key: "capex", label: "Investment (CAPEX)", quantity: "money", unit: "cur", unitLabel: "currency", value: 4500000 },
      { key: "saving", label: "Annual net saving", quantity: "money", unit: "cur", unitLabel: "currency/yr", value: 1500000, help: "Savings vs the current process minus the new solution's OPEX." },
      { key: "years", label: "Horizon", quantity: "count", unit: "1", unitLabel: "years", value: 7 },
      { key: "rate", label: "Discount rate", quantity: "percent", unit: "%", value: 10 },
    ],
    outputs: [
      { key: "payback", label: "Simple payback", quantity: "count", unitLabel: "years", primary: true, sig: 3 },
      { key: "npv", label: "NPV", quantity: "money", unitLabel: "currency", primary: true },
      { key: "irr", label: "IRR", quantity: "percent", unit: "%" },
      { key: "roi", label: "ROI over horizon (undiscounted)", quantity: "percent", unit: "%" },
    ],
    compute: (v) => {
      const cfs = ec.uniformCashflows(v.capex!, v.saving!, Math.round(v.years!));
      return { payback: ec.simplePayback(v.capex!, v.saving!), npv: ec.npv(v.rate!, cfs), irr: ec.irr(cfs), roi: ec.roi(v.capex!, v.saving!, Math.round(v.years!)) };
    },
    equations: ["\\text{Payback} = \\frac{C_{capex}}{S}", "NPV = -C_{capex} + \\sum_{t=1}^{n}\\frac{S}{(1+r)^t}", "NPV(IRR) = 0", "ROI = \\frac{nS - C_{capex}}{C_{capex}}"],
    variables: [
      { symbol: "S", meaning: "Annual net saving", unit: "currency/yr" },
      { symbol: "r", meaning: "Discount rate", unit: "—" },
    ],
    assumptions: ["Uniform annual savings from year 1; no residual value; pre-tax."],
    limitations: ["Standard finance definitions (the handbook lists ROI, payback, NPV/IRR in the feasibility template but defines no formulas). IRR is reported as undefined when no rate solves NPV = 0."],
    sources: [{ section: "23.5", note: "feasibility template item 12" }],
    classification: "derived",
    related: { calculators: ["cost-per-part"] },
  },
];

export const CALCULATOR_INDEX = new Map(CALCULATORS.map((c) => [c.id, c]));
export function getCalculator(id: string) {
  return CALCULATOR_INDEX.get(id);
}
