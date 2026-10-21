import { describe, it, expect } from "vitest";
import * as ph from "@/lib/physics/photon";
import * as la from "@/lib/physics/laser";
import * as pu from "@/lib/physics/pulse";
import * as be from "@/lib/physics/beam";
import * as op from "@/lib/physics/optics";
import * as ia from "@/lib/physics/interaction";
import * as pr from "@/lib/physics/process";
import * as sa from "@/lib/physics/safety";
import { CalcError, C } from "@/lib/physics/core";

/** relative closeness helper */
const near = (actual: number, expected: number, relTol = 0.01) => {
  expect(Math.abs(actual - expected) / Math.abs(expected)).toBeLessThanOrEqual(relTol);
};
const nm = 1e-9, um = 1e-6, mm = 1e-3;

describe("photons — handbook §1.6 table", () => {
  // [λ, frequency THz, energy eV, photons/s per W] exactly as printed in the handbook
  const rows: Array<[number, number, number, number]> = [
    [193 * nm, 1553, 6.42, 9.7e17],
    [248 * nm, 1209, 5.0, 1.25e18],
    [266 * nm, 1127, 4.66, 1.34e18],
    [355 * nm, 845, 3.49, 1.79e18],
    [532 * nm, 564, 2.33, 2.68e18],
    [1064 * nm, 282, 1.17, 5.36e18],
    [1550 * nm, 193, 0.8, 7.8e18],
    [10.6 * um, 28.3, 0.117, 5.34e19],
  ];
  it.each(rows)("λ = %s m", (lambda, thz, ev, flux) => {
    near(ph.frequencyFromWavelength(lambda) / 1e12, thz, 0.005);
    near(ph.photonEnergyEv(lambda), ev, 0.006);
    near(ph.photonFlux(1, lambda), flux, 0.006);
  });

  it("E[eV] ≈ 1239.84/λ[nm] (B.3) and Si edge 1.12 eV ↔ 1107 nm", () => {
    near(C.hcEvNm, 1239.84, 1e-5);
    near(ph.edgeWavelength(1.12) / nm, 1107, 0.001);
  });
  it("J ↔ eV round-trip", () => {
    near(ph.joulesToEv(ph.evToJoules(3.49)), 3.49, 1e-12);
  });
  it("photon momentum: 1 kW absorbed exerts ≈ 3.3 µN (§1.9)", () => {
    near(ph.radiationForce(1000, "absorbed") / 1e-6, 3.34, 0.01);
    near(ph.radiationForce(1000, "reflected"), 2 * ph.radiationForce(1000, "absorbed"), 1e-12);
  });
  it("field at 10¹⁴ W/cm² ≈ 2.7 × 10¹⁰ V/m (§1.10)", () => {
    near(ph.fieldAmplitude(1e14 * 1e4), 2.7e10, 0.02);
  });
  it("kT at 300 K ≈ 0.026 eV (§1.4)", () => {
    near(ph.thermalEnergyEv(300), 0.026, 0.01);
  });
  it("medium: wavelength scales by 1/n, frequency unchanged", () => {
    near(ph.wavelengthInMedium(1064 * nm, 1.45), 733.8 * nm, 0.001);
  });
  it("photons in a 1 mJ pulse at 1064 nm", () => {
    near(ph.photonsIn(1e-3, 1064 * nm), 5.36e15, 0.005);
  });
  it("rejects invalid input", () => {
    expect(() => ph.photonEnergyJ(0)).toThrow(CalcError);
    expect(() => ph.photonEnergyJ(-5)).toThrow(CalcError);
    expect(() => ph.photonEnergyJ(Number.NaN)).toThrow(CalcError);
    expect(() => ph.wavelengthInMedium(1e-6, 0.5)).toThrow(CalcError);
  });
  it("spectral regions follow §1.10 boundaries", () => {
    expect(ph.spectralRegion(355 * nm)).toBe("UV-A");
    expect(ph.spectralRegion(1064 * nm)).toBe("NIR (IR-A)");
    expect(ph.spectralRegion(10.6 * um)).toBe("LWIR");
    expect(ph.wavelengthColor(532 * nm).visible).toBe(true);
    expect(ph.wavelengthColor(1064 * nm).visible).toBe(false);
  });
});

describe("laser physics — §2.2–2.5", () => {
  it.each([
    [976, 1030, 0.052],
    [915, 1070, 0.145],
    [808, 1064, 0.24],
    [980, 1550, 0.37],
    [1480, 1550, 0.045],
    [793, 1940, 0.59],
    [1940, 2100, 0.076],
  ])("quantum defect %s → %s nm ≈ %s", (p, l, q) => {
    near(la.quantumDefect(p * nm, l * nm), q, 0.02);
  });
  it("quantum defect rejects pump longer than laser", () => {
    expect(() => la.quantumDefect(1100 * nm, 1064 * nm)).toThrow(CalcError);
  });
  it("FSR examples: 0.5 m → 300 MHz; 10 m fiber → ~10 MHz; 1 mm diode → ~43 GHz", () => {
    near(la.freeSpectralRange(1, 0.5) / 1e6, 300, 0.001);
    near(la.freeSpectralRange(1.45, 10) / 1e6, 10.3, 0.01);
    near(la.freeSpectralRange(3.5, 1e-3) / 1e9, 42.8, 0.01);
  });
  it("coherence lengths (§2.5 table)", () => {
    near(la.coherenceLengthFromLinewidth(1.5e9), 0.2, 0.01); // multimode He-Ne
    near(la.coherenceLengthFromBandwidth(1030 * nm, 10 * nm) / mm, 0.106, 0.01); // 100 fs at 1030 nm
    const yb = la.coherenceLengthFromBandwidth(1070 * nm, 3.5 * nm) / mm;
    expect(yb).toBeGreaterThan(0.2);
    expect(yb).toBeLessThan(0.6); // "~0.3 mm" for 2–5 nm
  });
  it("He-Ne 0.4 mm waist diverges ~0.5 mrad", () => {
    near(be.divergenceHalfAngle(0.4 * mm, 632.8 * nm, 1) / 1e-3, 0.5, 0.01);
  });
  it("1 kW single-mode fiber laser B ≈ 9 × 10¹⁰ W/(cm²·sr) (§2.5)", () => {
    near(la.brightness(1000, 1, 1.07 * um) / 1e4, 8.7e10, 0.01);
  });
  it("Q-switched Nd:YVO₄ (τ ≈ 100 µs) at 100 kHz keeps ≈ 10% of low-rate energy (§2.8)", () => {
    near(la.qSwitchPulseEnergy(1, 100e3, 100e-6), 0.095, 0.01);
    expect(la.qSwitchPulseEnergy(1, 100, 100e-6)).toBeGreaterThan(0.9999);
  });
  it("threshold gain and round-trip condition are consistent", () => {
    const g = la.thresholdGain(0.5, 0.1, 0.999, 0.9);
    near(la.roundTripGain(g, 0.5, 0.1, 0.999, 0.9), 1, 1e-9);
    expect(() => la.thresholdGain(0, 0.1, 0, 0.9)).toThrow(CalcError);
    expect(() => la.thresholdGain(0, 0.1, 1.2, 0.9)).toThrow(CalcError);
  });
  it("Boltzmann: a level 1 eV up is essentially empty at 300 K", () => {
    expect(la.boltzmannRatio(1 * C.e, 300)).toBeLessThan(1e-16);
  });
  it("lifetime → linewidth Δν ≈ 1/(2πτ)", () => {
    near(la.linewidthFromLifetime(1e-9), 1.59e8, 0.01);
  });
});

describe("pulses — §2.9 worked examples", () => {
  it("20 W MOPA, 100 kHz, 100 ns: 0.2 mJ, ~2 kW, 1% duty, 57 J/cm² at w₀ = 15 µm", () => {
    const s = pu.pulseSummary(20, 100e3, 100e-9, "square");
    near(s.pulseEnergy, 0.2e-3, 1e-9);
    near(s.peakPower, 2000, 1e-9);
    near(s.dutyCycle, 0.01, 1e-9);
    near(ia.peakFluence(s.pulseEnergy, 15 * um) / 1e4, 57, 0.01);
  });
  it("same laser at 600 kHz, 4 ns: 33 µJ, ≈ 8 kW, 9.4 J/cm²", () => {
    const ep = pu.pulseEnergy(20, 600e3);
    near(ep, 33.3e-6, 0.01);
    const pk = pu.peakPower(ep, 4e-9, "square");
    expect(pk / 1e3).toBeGreaterThan(7.5);
    expect(pk / 1e3).toBeLessThan(8.5);
    near(ia.peakFluence(ep, 15 * um) / 1e4, 9.4, 0.01);
  });
  it("50 W ps at 1 MHz, 10 ps: 50 µJ, 4.7 MW (Gaussian), 5.1 J/cm² at w₀ = 25 µm", () => {
    const ep = pu.pulseEnergy(50, 1e6);
    near(pu.peakPower(ep, 10e-12, "gaussian") / 1e6, 4.7, 0.001);
    near(ia.peakFluence(ep, 25 * um) / 1e4, 5.1, 0.01);
  });
  it("20 W fs at 200 kHz, 300 fs: 100 µJ, ~310 MW, 16 J/cm², ~5 × 10¹³ W/cm²", () => {
    const ep = pu.pulseEnergy(20, 200e3);
    near(pu.peakPower(ep, 300e-15, "gaussian") / 1e6, 313, 0.01);
    const F0 = ia.peakFluence(ep, 20 * um);
    near(F0 / 1e4, 16, 0.01);
    near(ia.pulsePeakIntensity(F0, 300e-15) / 1e4, 5.3e13, 0.01);
  });
  it("150 W QCW at 20 Hz, 5 ms: 7.5 J and 1.5 kW", () => {
    const ep = pu.pulseEnergy(150, 20);
    near(ep, 7.5, 1e-12);
    near(pu.peakPower(ep, 5e-3, "square"), 1500, 1e-12);
  });
  it("300 fs sech² pulse at 1030 nm needs ≥ 3.7 nm bandwidth (§10.15)", () => {
    near(pu.bandwidthToWavelength(pu.minimumBandwidthHz(300e-15, "sech2"), 1030 * nm) / nm, 3.7, 0.01);
  });
  it("consistency: P_avg = E_p·f inverts E_p = P_avg/f", () => {
    near(pu.averagePower(pu.pulseEnergy(37, 123e3), 123e3), 37, 1e-12);
  });
  it("rejects duty cycle > 1 and zero repetition rate", () => {
    expect(() => pu.dutyCycle(20e-6, 100e3)).toThrow(CalcError);
    expect(() => pu.pulseEnergy(20, 0)).toThrow(CalcError);
  });
});

describe("beams — §4.3–4.6 worked examples", () => {
  const cases: Array<[string, number, number, number, number, number, number]> = [
    // label, λ, M², D, f, expected d0 (µm), expected 2zR (mm)
    ["fiber marker 7 mm", 1.064 * um, 1.3, 7 * mm, 160 * mm, 40, 1.8],
    ["fiber marker 10 mm", 1.064 * um, 1.3, 10 * mm, 160 * mm, 28, 0.9],
    ["CO₂ PCB 10.6 µm", 10.6 * um, 1.2, 12 * mm, 100 * mm, 135, 2.3],
    ["CO₂ PCB 9.3 µm", 9.3 * um, 1.2, 12 * mm, 100 * mm, 118, 2.0],
    ["ultrafast glass", 1.03 * um, 1.2, 6 * mm, 50 * mm, 13, 0.22],
  ];
  it.each(cases)("%s", (_l, lambda, m2, D, f, d0um, dofmm) => {
    const d = be.focusDesign(lambda, m2, f, D);
    near(d.spotDiameter / um, d0um, 0.02);
    near(d.dofTwoZr / mm, dofmm, 0.03);
  });
  it("±5% spot band on a 2z_R = 1.8 mm lens is about ±0.3 mm (§4.3)", () => {
    const d = be.focusDesign(1.064 * um, 1.3, 160 * mm, 7 * mm);
    near(d.dofPm5 / 2 / mm, 0.29, 0.03);
    near(be.toleranceHalfRange(1, 0.05), 0.32, 0.01);
    near(be.toleranceHalfRange(1, 0.1), 0.46, 0.01);
  });
  it("6 kW cutting head: 100 µm core, f_coll 100, f_focus 200 → 200 µm spot, 2z_R ≈ 5.7 mm, ≈1.9 × 10⁷ W/cm²", () => {
    const d0 = be.fiberImageSpot(100 * um, 200 * mm, 100 * mm);
    near(d0 / um, 200, 1e-9);
    near((2 * be.rayleighRangeFromBpp(d0 / 2, 3.5e-6)) / mm, 5.7, 0.01);
    // the handbook value corresponds to the mean (top-hat) intensity P/(πw²), see review flags
    near(be.meanIntensity(6000, d0 / 2) / 1e4, 1.9e7, 0.01);
  });
  it("remote welding: 50 µm fiber (BPP 2) → 24 mm beam; 100 µm (BPP 3.5) → 42 mm (§4.6)", () => {
    near(be.collimatedDiameter(150 * mm, 2e-6 / (25 * um)) / mm, 24, 1e-9);
    near(be.collimatedDiameter(300 * mm, 3.5e-6 / (50 * um)) / mm, 42, 1e-9);
  });
  it("BPP from M² (§4.4 table)", () => {
    near(be.bppFromM2(1.05, 1.07 * um) / 1e-6, 0.36, 0.01);
    near(be.bppFromM2(1.2, 1.03 * um) / 1e-6, 0.39, 0.01);
    near(be.bppFromM2(1.1, 10.6 * um) / 1e-6, 3.7, 0.01);
    near(be.m2FromBpp(be.bppFromM2(1.7, 1 * um), 1 * um), 1.7, 1e-12);
  });
  it("aperture 1.5 × the 1/e² diameter passes ≈ 98.9% (§4.5)", () => {
    near(be.apertureTransmission(1.5, 1), 0.989, 0.001);
  });
  it("1/e² radius contains 86.5% of the power (§4.1)", () => {
    near(be.apertureTransmission(1, 1), 0.865, 0.001);
  });
  it("w(z_R) = √2 w₀ and R(z) is infinite at the waist", () => {
    near(be.beamRadiusAt(2, 1, 2), Math.SQRT2, 1e-12);
    expect(be.wavefrontRadius(0, 1)).toBe(Number.POSITIVE_INFINITY);
  });
  it("single-mode cut-off V < 2.405", () => {
    expect(be.vNumber(3e-6, 0.12, 1.064 * um)).toBeLessThan(2.405);
    expect(be.vNumber(25e-6, 0.12, 1.064 * um)).toBeGreaterThan(2.405);
  });
  it("UV spot is ~3× smaller than 1064 nm with the same optics; 9.3 µm is ~12% smaller than 10.6 µm", () => {
    near(be.focusedSpotDiameter(1064 * nm, 1, 0.1, 0.01) / be.focusedSpotDiameter(355 * nm, 1, 0.1, 0.01), 3, 0.01);
    near(1 - be.focusedSpotDiameter(9.3 * um, 1, 0.1, 0.01) / be.focusedSpotDiameter(10.6 * um, 1, 0.1, 0.01), 0.12, 0.03);
  });
  it("rejects M² < 1 and non-positive geometry", () => {
    expect(() => be.focusDesign(1e-6, 0.8, 0.1, 0.01)).toThrow(CalcError);
    expect(() => be.focusDesign(1e-6, 1.1, 0.1, 0)).toThrow(CalcError);
    expect(() => be.toleranceHalfRange(1, 0)).toThrow(CalcError);
  });
});

describe("optics and materials — §1.8, §1.11, §5.2, §5.3", () => {
  it("uncoated surface reflectance: fused silica ~3.5%, ZnSe ~17%, Ge ~36%", () => {
    near(op.fresnelNormal(1.45), 0.034, 0.02);
    near(op.fresnelNormal(2.4), 0.17, 0.01);
    near(op.fresnelNormal(4), 0.36, 1e-9);
  });
  it("Brewster angle for glass n = 1.5 ≈ 56°", () => {
    near((op.brewsterAngle(1.5) * 180) / Math.PI, 56.3, 0.002);
  });
  it("Hagen–Rubens at 10.6 µm: Cu ≈ 1.5%, stainless ≈ 9% (σ values are external inputs)", () => {
    near(op.hagenRubensAbsorptance(5.96e7, 10.6 * um), 0.0145, 0.03);
    near(op.hagenRubensAbsorptance(1.39e6, 10.6 * um), 0.095, 0.03);
  });
  it("complex reflectance reduces to Fresnel at k = 0; penetration depth δ = λ/4πk", () => {
    near(op.reflectanceComplex(1.5, 0), op.fresnelNormal(1.5), 1e-12);
    near(op.penetrationDepth(1 * um, 1 / (4 * Math.PI)), 1 * um, 1e-12);
  });
  it("LIDT √τ scaling and validity flag", () => {
    const a = op.lidtScale(10, 10e-9, 40e-9);
    near(a.value, 20, 1e-12);
    expect(a.inRange).toBe(true);
    expect(op.lidtScale(10, 10e-9, 1e-12).inRange).toBe(false);
  });
});

describe("interaction — §9.4 thermal diffusion table, §9.5, §2.9 overlap", () => {
  // κ (mm²/s) and the four printed lengths for 10 ps, 10 ns, 100 ns, 1 ms
  const table: Array<[string, number, [number, number, number, number]]> = [
    ["Copper", 117, [68e-9, 2.2e-6, 6.8e-6, 0.68e-3]],
    ["Silicon", 88, [59e-9, 1.9e-6, 5.9e-6, 0.59e-3]],
    ["Stainless steel", 4, [13e-9, 0.4e-6, 1.3e-6, 0.13e-3]],
    ["Glass", 0.8, [6e-9, 0.18e-6, 0.57e-6, 57e-6]],
    ["Polymer (PC)", 0.14, [2e-9, 75e-9, 0.24e-6, 24e-6]],
  ];
  const taus = [10e-12, 10e-9, 100e-9, 1e-3];
  it.each(table)("%s", (_m, kappa, lengths) => {
    taus.forEach((tau, i) => {
      // printed values are rounded to 1–2 significant figures
      near(ia.thermalDiffusionLength(kappa * 1e-6, tau), lengths[i]!, 0.2);
    });
  });
  it("pulse overlap: 1000 mm/s, 100 kHz, 30 µm → 10 µm spacing, 67% overlap", () => {
    near(ia.pulseSpacing(1, 100e3), 10 * um, 1e-12);
    near(ia.pulseOverlap(1, 100e3, 30 * um), 0.667, 0.001);
    expect(ia.pulseOverlap(10, 100e3, 30 * um)).toBeLessThan(0); // gaps, not clamped
  });
  it("hatch overlap at 0.5–0.8 × spot diameter (§7.3)", () => {
    near(ia.hatchOverlap(15 * um, 30 * um), 0.5, 1e-12);
  });
  it("optimum fluence e²·F_th ≈ 7.4 F_th", () => {
    near(ia.optimumFluence(1), 7.389, 0.001);
  });
  it("ablation depth is zero below threshold and logarithmic above", () => {
    expect(ia.ablationDepthPerPulse(10e-9, 0.5, 1)).toBe(0);
    near(ia.ablationDepthPerPulse(10e-9, Math.E ** 2, 1), 20e-9, 1e-12);
  });
  it("incubation lowers the threshold with pulse count", () => {
    expect(ia.incubatedThreshold(1, 100, 0.8)).toBeLessThan(1);
    expect(() => ia.incubatedThreshold(1, 100, 1.2)).toThrow(CalcError);
  });
  it("critical power ≈ 4 MW in fused silica, ≈ 5 GW in air at 1030 nm (n₂ external)", () => {
    near(ia.criticalPowerSelfFocusing(1030 * nm, 1.45, 2.7e-20) / 1e6, 4.06, 0.02);
    near(ia.criticalPowerSelfFocusing(1030 * nm, 1.0, 3.2e-23) / 1e9, 5.0, 0.02);
  });
  it("heat input per unit length Q = ηP/v", () => {
    near(ia.heatInputPerLength(0.4, 3000, 0.1) / 1e3, 12, 1e-12); // 12 J/mm
    expect(() => ia.heatInputPerLength(1.5, 3000, 0.1)).toThrow(CalcError);
  });
  it("welding mode indicator around ~10⁶ W/cm²", () => {
    expect(ia.weldingModeIndicator(1e5 * 1e4)).toBe("conduction");
    expect(ia.weldingModeIndicator(1e6 * 1e4)).toBe("transition");
    expect(ia.weldingModeIndicator(1e7 * 1e4)).toBe("keyhole");
  });
});

describe("process and machine — §7.2, §12.1", () => {
  it("16-bit on a 110 mm field ≈ 1.7 µm; 20-bit ≈ 0.1 µm", () => {
    near(pr.galvoResolution(110 * mm, 16) / um, 1.68, 0.01);
    near(pr.galvoResolution(110 * mm, 20) / um, 0.105, 0.01);
  });
  it("5 MP (2448 px) over 20 mm ≈ 8 µm/pixel", () => {
    near(pr.visionResolution(20 * mm, 2448) / um, 8.2, 0.01);
  });
  it("hatch fill time sums mark, jump and overhead", () => {
    const r = pr.hatchFillTime({ width: 10 * mm, height: 10 * mm, hatch: 0.05 * mm, markSpeed: 1, jumpSpeed: 5, passes: 1, perLineOverhead: 0, bidirectional: true });
    expect(r.lines).toBe(201);
    near(r.markTime, 201 * 0.01, 1e-9);
    near(r.totalTime, r.markTime + r.jumpTime, 1e-12);
  });
  it("cycle time bottleneck and throughput", () => {
    const c = pr.cycleTime({ process: 2, handling: 3, vision: 0.5, indexing: 0.5, other: 0 });
    expect(c.bottleneck).toBe("handling");
    near(pr.throughputPerHour(c.total, 0.8), 480, 1e-12);
  });
});

describe("safety — §24.2", () => {
  it("OD = log₁₀(H₀/MPE)", () => {
    near(sa.requiredOpticalDensity(1e6, 10), 5, 1e-12);
    expect(sa.requiredOpticalDensity(1, 10)).toBe(0);
  });
  it("NOHD is zero when the exit beam is already below the MPE and grows with power", () => {
    expect(sa.nohd(1e-3, 1e6, 1e-3, 0.01)).toBe(0);
    expect(sa.nohd(10, 10, 1e-3, 1e-3)).toBeGreaterThan(sa.nohd(1, 10, 1e-3, 1e-3));
    expect(() => sa.nohd(1, 0, 1e-3, 1e-3)).toThrow(CalcError);
  });
});
