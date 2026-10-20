import { describe, it, expect } from "vitest";
import { toSI, fromSI, autoUnit, formatNumber, formatWithUnit, UNITS } from "@/lib/physics/units";

describe("units", () => {
  it("equivalent units give consistent SI values", () => {
    expect(toSI(1064, "length", "nm")).toBeCloseTo(toSI(1.064, "length", "um"), 15);
    expect(toSI(1, "fluence", "J/cm2")).toBe(1e4);
    expect(toSI(1000, "fluence", "mJ/cm2")).toBe(toSI(1, "fluence", "J/cm2"));
    expect(toSI(1, "intensity", "W/cm2")).toBe(1e4);
    expect(toSI(3.5, "bpp", "mm.mrad")).toBeCloseTo(3.5e-6, 18);
    expect(toSI(117, "diffusivity", "mm2/s")).toBeCloseTo(1.17e-4, 15);
    expect(fromSI(toSI(12, "linearEnergy", "J/mm"), "linearEnergy", "J/cm")).toBeCloseTo(120, 9);
    expect(toSI(1, "photonEnergy", "eV")).toBeCloseTo(1.602176634e-19, 30);
  });
  it("auto unit picks a readable prefix", () => {
    expect(autoUnit(40.26e-6, "length").id).toBe("um");
    expect(autoUnit(2e3, "power").id).toBe("kW");
    expect(autoUnit(100e-15, "time").id).toBe("fs");
    expect(autoUnit(0, "length").id).toBe(UNITS.length[0]!.id);
  });
  it("number formatting", () => {
    expect(formatNumber(40.2612, 3)).toBe("40.3");
    expect(formatNumber(5.36e18, 3)).toBe("5.36 × 10¹⁸");
    expect(formatNumber(9.9999e-7, 3)).toBe("1 × 10⁻⁶");
    expect(formatNumber(Number.NaN)).toBe("—");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatWithUnit(2.27e-3, "length")).toBe("2.27 mm");
  });
});
