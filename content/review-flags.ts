/**
 * Technical-review flags raised while cross-checking the handbook's numbers against
 * its own equations (see tests/unit/physics.test.ts). The handbook text is never
 * altered; these notes are shown next to the affected content for a reviewer.
 */
export interface ReviewFlag {
  id: string;
  section: string;
  severity: "error" | "warning" | "info";
  title: string;
  detail: string;
}

export const REVIEW_FLAGS: ReviewFlag[] = [
  {
    id: "chart-9-2",
    section: "9.2",
    severity: "error",
    title: "Metal absorptance chart missing from the supplied file",
    detail:
      "The caption “Approximate literature values, polished metals at 20 °C · 6 wavelengths” links to a placeholder (http://node/…). No chart data or image is in the .docx. LASERVERSE does not reconstruct the chart; only absorptance values stated in the text (e.g. Cu ~4% at 1 µm, ~40% green; steel ~35% at 1 µm) are used, each cited.",
  },
  {
    id: "chart-9-7",
    section: "9.7",
    severity: "error",
    title: "Process regime map missing from the supplied file",
    detail:
      "The caption “Order-of-magnitude engineering map · 10 process families” links to a placeholder. The interactive regime view in LASERVERSE is a reconstruction from thresholds stated in the text (§9.4, §10.4, §27.1) and is labelled as such; it is not the handbook's chart.",
  },
  {
    id: "equations-images",
    section: "B.3",
    severity: "warning",
    title: "All 43 equations are images; LaTeX is a manual transcription",
    detail:
      "The handbook embeds equations as PNG images, so no equation could be parsed. Each was transcribed to LaTeX by reading the image and is shown with the original image for comparison. The transcriptions were checked numerically wherever the handbook gives a worked example, but they still require a reviewer's sign-off.",
  },
  {
    id: "intensity-6kw",
    section: "4.6",
    severity: "warning",
    title: "“Peak intensity” of the 6 kW cutting head uses the mean (top-hat) definition",
    detail:
      "≈ 1.9 × 10⁷ W/cm² equals P/(πw₀²) for a 200 µm spot. The Gaussian on-axis peak 2P/(πw₀²) would be ≈ 3.8 × 10⁷ W/cm². For a multimode, near top-hat fiber image the mean value is the more meaningful one, but the label “peak” is ambiguous. LASERVERSE's fiber-imaging calculator reports the mean intensity and names it as such.",
  },
  {
    id: "peak-power-shape",
    section: "2.9",
    severity: "info",
    title: "Worked-example peak powers mix shape factors",
    detail:
      "The ps and fs rows (4.7 MW, 310 MW) apply the Gaussian factor 0.94; the ns rows (2 kW, 8 kW) match E_p/τ with k = 1 (0.94 would give 1.9 kW and 7.8 kW). The differences are within the table's ≈ rounding, but the pulse-shape assumption should be stated. LASERVERSE always shows which shape factor is used.",
  },
  {
    id: "fsr-ring",
    section: "2.5",
    severity: "info",
    title: "FSR example quoted for “fiber ring or linear cavity”",
    detail:
      "c/(2nL) ≈ 10 MHz holds for a 10 m linear cavity. A 10 m ring cavity has FSR = c/(nL) ≈ 21 MHz. LASERVERSE's cavity calculator states the linear-cavity assumption.",
  },
  {
    id: "mopa-range",
    section: "10.2",
    severity: "info",
    title: "MOPA pulse-width ranges differ between tables",
    detail:
      "MOPA pulse duration is given as ~1–2000 ns (§2.8), ~2–2000 ns (§3.3, §27.1) and 2–500 ns selectable (§10.2 marking comparison). These are plausibly product-class ranges rather than a contradiction, but a reviewer should confirm the intended range for each context.",
  },
  {
    id: "band-overlap",
    section: "1.10",
    severity: "info",
    title: "EUV and VUV ranges overlap in the spectrum table",
    detail:
      "EUV is listed as 10–121 nm and VUV as 100–200 nm. The handbook notes that band boundaries differ between standards; LASERVERSE's region labels use the lower bound of each row (EUV < 100 nm).",
  },
  {
    id: "iec-edition",
    section: "24.1",
    severity: "info",
    title: "Standards editions not independently verified",
    detail:
      "The handbook cites IEC 60825-1:2014 (Edition 3) and asks readers to check for later amendments. Other standards are cited without editions. LASERVERSE reproduces the handbook's references and has not verified current editions (external sources were not reachable from the build environment).",
  },
];

export function reviewFlagsFor(sectionId: string): ReviewFlag[] {
  return REVIEW_FLAGS.filter((f) => f.section === sectionId);
}
