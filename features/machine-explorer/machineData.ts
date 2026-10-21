/**
 * Structured data for the generic Class 1 fiber-laser marking workstation shown in
 * the 3D Machine Explorer. The architecture follows handbook §26.1 "Reference machine
 * architectures — 1. Fiber laser marking machine (Class 1 workstation)"; every
 * description cites the section it is taken from. Geometry is ORIGINAL, GENERIC and
 * ILLUSTRATIVE — it does not represent any vendor's design.
 */
export type Layer = "optical" | "mechanical" | "vision" | "automation" | "safety";

export const LAYERS: Array<{ id: Layer; label: string; description: string }> = [
  { id: "optical", label: "Optical", description: "Source, beam delivery, optics and scan head" },
  { id: "mechanical", label: "Mechanical", description: "Base, Z axis, fixture, enclosure structure, workpiece" },
  { id: "vision", label: "Vision", description: "Camera and illumination" },
  { id: "automation", label: "Automation", description: "IPC, scan card, HMI, safety relay and I/O" },
  { id: "safety", label: "Safety", description: "Enclosure, door, window, interlocks, E-stop, key switch, indicator" },
];

export interface MachineComponent {
  id: string;
  name: string;
  layers: Layer[];
  fn: string;
  spec: string;
  watch?: string;
  sections: string[];
  calculators?: string[];
  tool?: { label: string; href: string };
}

export const COMPONENTS: MachineComponent[] = [
  {
    id: "source",
    name: "MOPA fiber laser source",
    layers: ["optical"],
    fn: "Generates the beam with the required wavelength, power and pulse format (§11.1). A master-oscillator power amplifier lets the recipe select pulse width independently of repetition rate (§2.8).",
    spec: "20–50 W MOPA fiber source with integrated isolator/collimator (§26.1); 1064 nm; MOPA pulse width selectable over ~2–500 ns for marking (§10.2); M² ≈ 1.2–1.8 (§3.3).",
    watch: "Power stability (±1–2%) and back-reflection protection (§11.1, §6.5). Interface: DB25 parallel port with TTL gate/modulation and analogue power on marking lasers (§11.2).",
    sections: ["3.3", "2.8", "11.1", "26.1"],
    calculators: ["pulse-parameters", "fluence"],
    tool: { label: "Pulse explorer", href: "/physics-lab?tab=pulse" },
  },
  {
    id: "fiber",
    name: "Delivery fiber cable",
    layers: ["optical"],
    fn: "Carries the beam from the source to the scan head. ns MOPA pulses are delivered through the source's own fiber and isolator head (§6.5 rule 4).",
    spec: "Armoured fiber cable; silica fiber delivery covers ~0.3–2.2 µm (Part VI).",
    watch: "Respect the dynamic bend radius; open connectors only under clean conditions and inspect end-caps (§6.5).",
    sections: ["6.1", "6.3", "6.5"],
    calculators: ["v-number"],
  },
  {
    id: "collimator",
    name: "Isolator / collimator head",
    layers: ["optical"],
    fn: "Blocks back-reflection into the source and converts the fiber's divergent output into a parallel beam (§11.1, §5.1).",
    spec: "Faraday isolator (TGG at 1 µm) and collimating lens group (§6.5, §5.1).",
    watch: "Size collimators to the fiber NA with margin — clipping heats the head and degrades the spot (§6.5).",
    sections: ["5.1", "6.5", "11.1"],
  },
  {
    id: "expander",
    name: "Beam expander (optional 2–3×)",
    layers: ["optical"],
    fn: "Enlarges the beam to reduce the focused spot and divergence; it sets the beam diameter at the scanner and therefore the spot size (§5.1, §11.1).",
    spec: "Galilean or Keplerian; magnification 2–10×, fixed, zoom or motorised (§5.1). Going from a 7 mm to a 10 mm beam shrinks the spot from ~40 to ~28 µm (§4.6).",
    watch: "A larger beam halves the focus tolerance (§4.6) and needs a larger scanner aperture.",
    sections: ["4.5", "4.6", "5.1"],
    calculators: ["focus-spot", "aperture-clipping"],
    tool: { label: "Beam train explorer", href: "/beam-optics?tab=components" },
  },
  {
    id: "galvo",
    name: "2-axis galvo scanner",
    layers: ["optical", "automation"],
    fn: "Two moving-magnet galvanometer motors rotate lightweight mirrors to position the beam at metres per second; the controller streams position commands and gates the laser in step with mirror motion (§7.1, §7.2).",
    spec: "10 mm aperture (§26.1); mark speed 1–5 m/s, jump 5–20 m/s; XY2-100 is 16-bit (~1.7 µm per step on a 110 mm field), SL2-100 20-bit (§7.2).",
    watch: "Scanner delays (laser-on/off, jump, mark, polygon) are the most common cause of poor mark quality after focus errors; skywriting removes most delay tuning (§7.2).",
    sections: ["7.1", "7.2", "7.3"],
    calculators: ["galvo-resolution", "hatch-time"],
  },
  {
    id: "ftheta",
    name: "F-theta lens (f = 160 mm)",
    layers: ["optical"],
    fn: "Flat-field scan lens whose image height equals f·θ, so spot position is proportional to scan angle across a flat field (§5.1).",
    spec: "Spot ≈ 30–40 µm; field ≈ 110 × 110 mm; ±0.3 mm focus band for ±5% spot (§26.1, §4.6). Mirror rotation is half the optical scan angle.",
    watch: "Field curvature and calibration cause uneven marking across the field (§27.2).",
    sections: ["5.1", "4.6", "26.1"],
    calculators: ["focus-spot"],
    tool: { label: "Beam focusing lab", href: "/beam-optics" },
  },
  {
    id: "pointer",
    name: "Red pointer (aiming beam)",
    layers: ["optical"],
    fn: "Visible red diode used to aim the job and preview its frame before emission (§26.1 BOM). Red diodes at 635/660 nm are aiming and alignment beams, not processing wavelengths (§3.8).",
    spec: "Low-power visible diode combined into the scan path.",
    sections: ["26.1", "3.8"],
  },
  {
    id: "zaxis",
    name: "Motorised Z column",
    layers: ["mechanical", "automation"],
    fn: "Moves the scan head vertically to put the focal plane on the part surface (§26.1).",
    spec: "Motorised Z for focus; ball-screw stages give ±5–20 µm accuracy (§7.4).",
    watch: "Focus position errors cause more process escapes than any other single parameter (§8.4).",
    sections: ["8.4", "4.3", "7.4", "26.1"],
    calculators: ["gaussian-propagation"],
  },
  {
    id: "fixture",
    name: "Fixture plate / T-slot table",
    layers: ["mechanical"],
    fn: "Holds and datums the part repeatably (§11.1, §11.3).",
    spec: "T-slot table or fixture plate; optional rotary chuck (§26.1). Hardened datums, pneumatic clamps (§11.3).",
    watch: "Part variation, spatter build-up and poka-yoke (§11.3); part tilt causes uneven marking (§27.2).",
    sections: ["11.3", "26.1"],
  },
  {
    id: "workpiece",
    name: "Workpiece",
    layers: ["mechanical"],
    fn: "Typical parts: tools, nameplates, medical instruments, electronics housings, automotive parts (§26.1).",
    spec: "Example: stainless steel with a UDI DataMatrix — annealing black mark with a MOPA long pulse or ps black marking (§10.2 decision matrix).",
    watch: "Annealed marks can lose corrosion resistance if overheated or not re-passivated (§26.2 case 6).",
    sections: ["10.2", "26.1", "26.2"],
    tool: { label: "Marking workspace", href: "/processes/marking" },
  },
  {
    id: "enclosure",
    name: "Class 1 enclosure",
    layers: ["safety", "mechanical"],
    fn: "Class 1 by design: no accessible radiation above Class 1 limits during operation (§11.6), plus fume containment (§11.3).",
    spec: "Sheet steel with labyrinth seals and laser-safe viewing windows rated for wavelength and power (§11.3).",
    watch: "Any gap in the line of sight of reflected beams (§11.3). Service may expose Class 4 radiation and follows documented procedures (§24.1).",
    sections: ["11.3", "11.6", "24.1"],
    tool: { label: "Safety & Quality", href: "/safety" },
  },
  {
    id: "door",
    name: "Interlocked door",
    layers: ["safety", "mechanical"],
    fn: "Operator access with interlocks: opening it stops emission; guard locking during emission (§11.6, §11.3).",
    spec: "Interlocked sliding or lift door (§11.3).",
    watch: "Nuisance trips and defeat resistance (§11.3). Safety functions are never bypassed (§11.6).",
    sections: ["11.3", "11.6"],
  },
  {
    id: "window",
    name: "Laser-safe viewing window",
    layers: ["safety"],
    fn: "Lets the operator watch the process while blocking the process wavelength (§11.3).",
    spec: "Rated for wavelength and power — IEC 60825-4 / EN 207-type data (§11.3, §24.3). Tint shown here is illustrative.",
    sections: ["11.3", "24.3"],
  },
  {
    id: "interlock",
    name: "Door interlock switch",
    layers: ["safety", "automation"],
    fn: "Coded safety switch reporting the door state to the safety relay (§11.4).",
    spec: "Coded safety switches for doors (§11.4); interlocking devices per ISO 14119 (§24.3).",
    sections: ["11.4", "11.6", "24.3"],
  },
  {
    id: "estop",
    name: "Emergency stop",
    layers: ["safety"],
    fn: "Category 0 or 1 stop per IEC 60204-1 (§11.6).",
    spec: "Wired to the safety relay (§26.1 electrical).",
    sections: ["11.6", "26.1"],
  },
  {
    id: "key",
    name: "Key switch",
    layers: ["safety"],
    fn: "Prevents unauthorised emission — required on Class 3B/4 laser products (§11.6).",
    spec: "Wired to the safety relay (§26.1).",
    sections: ["11.6", "24.1"],
  },
  {
    id: "beacon",
    name: "Emission indicator",
    layers: ["safety"],
    fn: "Emission-on indication, stack lights and signage (§11.6).",
    spec: "Lit whenever the laser is permitted to emit in this model.",
    sections: ["11.6"],
  },
  {
    id: "safety",
    name: "Safety relay, 24 V supply and I/O",
    layers: ["safety", "automation"],
    fn: "Door interlocks, E-stop and key switch feed the safety relay; emission enable is hard-wired (§26.1 electrical). Safety functions are implemented to the required performance level (ISO 13849-1, §11.6).",
    spec: "Single-phase supply; 24 V SMPS; safety relay; source DB25 interface (§26.1, §11.4).",
    watch: "Required performance level comes from the risk assessment (§11.4). Nothing in this model is a validated safety design.",
    sections: ["11.4", "11.6", "12.4", "26.1"],
    tool: { label: "Interlock logic demo", href: "/architecture#interlocks" },
  },
  {
    id: "ipc",
    name: "Industrial PC with scan card",
    layers: ["automation"],
    fn: "Runs the marking software and the scan card: vector streaming to the galvos (~10 µs command period), laser gating and delays (§11.2).",
    spec: "Vector/raster marking, variable data (serials, dates, codes), DataMatrix/QR, job library, user levels, optional MES link (§26.1).",
    watch: "Recipes must be versioned and locked after validation (§12.5).",
    sections: ["11.2", "11.5", "12.5", "26.1"],
    calculators: ["hatch-time", "cycle-time"],
  },
  {
    id: "hmi",
    name: "HMI monitor",
    layers: ["automation"],
    fn: "Operator screens, alarms, production counters and maintenance prompts (§11.5).",
    spec: "Windows/Linux IPC or web HMI, ~100 ms cycle (§11.2).",
    sections: ["11.5", "11.2"],
  },
  {
    id: "camera",
    name: "Camera and ring light (optional)",
    layers: ["vision"],
    fn: "Optional camera for positioning and code verification (§26.1); fiducials give an X, Y, θ offset before marking and the code is graded after (§12.2).",
    spec: "e.g. 5 MP over a 20 mm field ≈ 8 µm/pixel; ring light for engraved and dot-style marks (§12.1).",
    watch: "Recalibrate camera–scanner transforms after any change of lens, scanner, camera or mounting (§12.1).",
    sections: ["12.1", "12.2"],
    calculators: ["vision-resolution"],
    tool: { label: "Vision loop simulator", href: "/architecture#vision-loop" },
  },
  {
    id: "extraction",
    name: "Fume extractor",
    layers: ["safety", "mechanical"],
    fn: "Captures fume at the source and filters it; extraction is interlocked with emission (§26.1 safety, §11.3).",
    spec: "Nozzle capture at source; spark arrestor, pre-filter, HEPA, activated carbon (§11.3).",
    watch: "Capture velocity, filter loading and combustible dust (§11.3). Approved-materials list — no PVC (§24.2).",
    sections: ["11.3", "24.2", "26.1"],
  },
  {
    id: "base",
    name: "Base cabinet and frame",
    layers: ["mechanical"],
    fn: "Welded frame carrying the source, controls and work table; provides stiffness, damping and thermal stability (§11.3).",
    spec: "Welded frame, cabinet enclosure (§26.1); stress-relieved welded steel (§11.3).",
    watch: "Resonances near scanner or servo frequencies (§11.3).",
    sections: ["11.3", "26.1"],
  },
];

export const COMPONENT_INDEX = new Map(COMPONENTS.map((c) => [c.id, c]));

export interface Signal {
  from: string;
  to: string;
  label: string;
  kind: "command" | "safety" | "data";
  section: string;
}

/** Simplified control-flow of the workstation (§11.2, §12.4, §26.1). */
export const SIGNALS: Signal[] = [
  { from: "ipc", to: "galvo", label: "Position commands (XY2-100, 16-bit), ~10 µs period", kind: "command", section: "7.2" },
  { from: "ipc", to: "source", label: "Laser gate (TTL) and power/modulation (DB25)", kind: "command", section: "11.2" },
  { from: "ipc", to: "zaxis", label: "Focus position", kind: "command", section: "26.1" },
  { from: "camera", to: "ipc", label: "Images: fiducial offset and code grade", kind: "data", section: "12.2" },
  { from: "ipc", to: "hmi", label: "Operator interface, alarms, counters", kind: "data", section: "11.5" },
  { from: "interlock", to: "safety", label: "Door state (coded safety switch)", kind: "safety", section: "11.4" },
  { from: "estop", to: "safety", label: "Emergency-stop circuit", kind: "safety", section: "11.6" },
  { from: "key", to: "safety", label: "Key switch", kind: "safety", section: "11.6" },
  { from: "extraction", to: "safety", label: "Extraction interlock", kind: "safety", section: "26.1" },
  { from: "safety", to: "source", label: "Emission enable — hard-wired", kind: "safety", section: "12.4" },
  { from: "safety", to: "beacon", label: "Emission indicator", kind: "safety", section: "11.6" },
];

/** Optical path order (§11.1). */
export const OPTICAL_PATH = ["source", "fiber", "collimator", "expander", "galvo", "ftheta", "workpiece"];

export interface InterlockState {
  running: boolean;
  doorClosed: boolean;
  estopReleased: boolean;
  keyOn: boolean;
  extractionOn: boolean;
}

/** Conceptual permission logic (not a functional-safety design). */
export function emissionPermitted(s: InterlockState): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  if (!s.keyOn) reasons.push("Key switch off");
  if (!s.estopReleased) reasons.push("Emergency stop pressed");
  if (!s.doorClosed) reasons.push("Door open — interlock drops emission enable");
  if (!s.extractionOn) reasons.push("Fume extraction off (process interlock)");
  if (!s.running) reasons.push("No job running");
  return { ok: reasons.length === 0, reasons };
}
