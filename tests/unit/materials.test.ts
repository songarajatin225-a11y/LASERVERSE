import { describe, expect, it } from "vitest";
import { nonMetals, ABSORPTION_ENCODING, coldAbsorptance, diffusivity, meltBoil, materialQuotes, timeRegimes } from "@/lib/content/materials";
import { absorptionStatus } from "@/features/materials/absorption";
import { thermalDiffusionLength, specificRemovalRate, optimumFluence } from "@/lib/physics/interaction";

describe("§9.3 absorption encoding", () => {
  const rows = nonMetals();
  it("encodes every handbook row against the exact current wording", () => {
    expect(rows.length).toBe(12);
    for (const r of rows) {
      const enc = ABSORPTION_ENCODING[r.material];
      expect(enc, r.material).toBeDefined();
      expect(enc!.absorbs).toBe(r.absorbsText);
      expect(enc!.transparent).toBe(r.transparentText);
    }
  });
  const at = (name: string, nm: number) => absorptionStatus(rows.find((r) => r.material.startsWith(name))!, nm).status;
  it("classifies the handbook's own examples", () => {
    expect(at("Most polymers", 10600)).toBe("absorbs");
    expect(at("Most polymers", 1064)).toBe("transparent");
    expect(at("Most polymers", 355)).toBe("absorbs");
    expect(at("Glass", 1064)).toBe("transparent");
    expect(at("Glass", 10600)).toBe("absorbs");
    expect(at("Sapphire", 1030)).toBe("transparent");
    expect(at("Silicon", 532)).toBe("strong");
    expect(at("Silicon", 1064)).toBe("absorbs");
    expect(at("Silicon", 1550)).toBe("transparent");
    expect(at("Solder mask", 9300)).toBe("strong");
    expect(at("Ceramics", 10600)).toBe("strong");
    expect(at("Ceramics", 1064)).toBe("partial");
    expect(at("Biological tissue", 800)).toBe("mixed");
    expect(at("Biological tissue", 2940)).toBe("absorbs");
    expect(at("Battery materials", 1064)).toBe("text-only");
    expect(at("SiC, GaN", 355)).toBe("absorbs");
    expect(at("SiC, GaN", 1064)).toBe("transparent");
  });
});

describe("§9.4 / §15.4 data adapters", () => {
  it("reads the cold Cu/Al absorptance row exactly", () => {
    const c = coldAbsorptance();
    expect(c.copper.find((x) => x.nm === 1070)?.text).toBe("~4%");
    expect(c.copper.find((x) => x.nm === 523)?.text).toBe("~40%");
    expect(c.aluminium.find((x) => x.nm === 1070)?.text).toBe("~6%");
  });
  it("2√(κτ) reproduces the handbook diffusion-length table to its stated digits", () => {
    for (const d of diffusivity()) {
      for (const p of d.table) {
        const m = p.text.match(/([\d.]+)\s*(nm|µm|mm)/)!;
        const k = m[2] === "nm" ? 1e-9 : m[2] === "µm" ? 1e-6 : 1e-3;
        const digits = m[1]!.replace(".", "").replace(/^0+/, "").length;
        const v = Number(m[1]) * k;
        const halfUnit = 0.5 * 10 ** (Math.floor(Math.log10(v)) - digits + 1);
        const L = thermalDiffusionLength(d.kappaMm2s * 1e-6, p.tau);
        expect(Math.abs(L - v), `${d.material} @ ${p.tau}: ${L} vs ${p.text}`).toBeLessThanOrEqual(halfUnit * 1.05);
      }
    }
  });
  it("parses melting points as numbers", () => {
    const zinc = meltBoil().find((m) => m.material === "Zinc")!;
    expect(zinc.melt?.lo).toBe(420);
    expect(zinc.boil?.lo).toBe(907);
  });
  it("finds every quotation verbatim", () => {
    const q = materialQuotes();
    for (const v of Object.values(q)) expect(v.length).toBeGreaterThan(30);
    expect(q.regimeMap.startsWith("The map is the most compact summary")).toBe(true);
  });
  it("has the five §27.1 regimes used by pulseRegime()", () => {
    expect(timeRegimes().map((r) => r["Regime"])).toEqual(["CW / ms", "µs", "ns", "ps", "fs"]);
  });
});

describe("specific removal rate (§9.5)", () => {
  it("peaks at e²·F_th", () => {
    const Fth = 1;
    const best = optimumFluence(Fth);
    const f = (F: number) => specificRemovalRate(1e-8, F, Fth);
    expect(f(best)).toBeGreaterThan(f(best * 0.9));
    expect(f(best)).toBeGreaterThan(f(best * 1.1));
    expect(f(0.5)).toBe(0);
  });
});
