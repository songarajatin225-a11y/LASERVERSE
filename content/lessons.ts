/**
 * Lesson enhancements layered on top of the ingested handbook sections.
 *
 * - `objective` is ADDITIONAL EXPLANATION written for LASERVERSE (not handbook text).
 * - `embed` places an interactive visual from the labs directly in the lesson.
 * - `calculators` / `tools` link the lesson to engineering tools.
 * Sections without an entry still render their full handbook content.
 */
export type EmbedKind = "photon" | "wave" | "levels" | "cavity" | "pulse" | "caustic" | "material" | "marking" | "welding" | "decision-tree" | "regime";

export interface LessonEnhancement {
  objective?: string;
  embed?: EmbedKind;
  calculators?: string[];
  tools?: Array<{ label: string; href: string }>;
}

export const LESSONS: Record<string, LessonEnhancement> = {
  /* Part I */
  "1.1": { objective: "Distinguish energy, power and concentration, and explain why a laser's value lies in concentrating energy in space, time and spectrum.", calculators: ["energy-units"] },
  "1.2": { objective: "Identify which atomic particles set a material's optical behaviour and why outer electrons dominate laser–matter interaction." },
  "1.3": { objective: "Relate the energy-level structure of different physical systems to the wavelengths they can absorb and emit.", embed: "levels", calculators: ["energy-units"] },
  "1.4": { objective: "Use quantisation, lifetime, Boltzmann population, cross-section and selection rules to explain why inversion must be forced.", tools: [{ label: "Energy-level explorer", href: "/physics-lab?tab=levels" }] },
  "1.5": { objective: "Explain when light behaves as a wave and when as a particle, and why laser engineering uses both views.", embed: "wave" },
  "1.6": { objective: "Compute photon energy, frequency and photon flux from wavelength and compare them with band-gap and bond energies.", embed: "photon", calculators: ["photon-energy", "energy-units", "wavelength-frequency", "photons-in-pulse"] },
  "1.7": { objective: "Define phase and connect it to coherence, interferometry, diffractive shaping and mode-locking.", embed: "wave" },
  "1.8": { objective: "Describe linear, circular and elliptical polarisation and explain why cutting heads use circular polarisation.", embed: "wave", calculators: ["fresnel"] },
  "1.9": { objective: "Quantify photon momentum and recognise that keyholes are opened by vapour recoil, not radiation pressure.", calculators: ["radiation-force"] },
  "1.10": { objective: "Place industrial laser lines on the electromagnetic spectrum and relate intensity to field strength.", embed: "wave", calculators: ["field-amplitude"] },
  "1.11": { objective: "Match absorption mechanisms (free-electron, interband, band-gap, vibrational, nonlinear) to material classes and wavelengths.", calculators: ["hagen-rubens", "fresnel"], tools: [{ label: "Material Interaction Lab", href: "/materials" }] },
  /* Part II */
  "2.1": { objective: "Contrast absorption, spontaneous emission and stimulated emission and explain why stimulated photons are clones.", embed: "levels" },
  "2.2": { objective: "Explain population inversion in three-, four- and quasi-three-level schemes and calculate the quantum defect.", embed: "levels", calculators: ["quantum-defect"] },
  "2.3": { objective: "Relate upper-state lifetime to energy storage, and describe pumping mechanisms and gain saturation.", calculators: ["qswitch-rep-rate"] },
  "2.4": { objective: "State the threshold condition of an optical cavity and explain how output-coupler reflectivity follows gain.", embed: "cavity", calculators: ["threshold-gain"] },
  "2.5": { objective: "Use longitudinal/transverse modes, coherence length and brightness to compare sources.", calculators: ["cavity-modes", "coherence-length", "brightness"] },
  "2.6": { objective: "Compare ordinary and laser light property by property and connect each to a manufacturing consequence." },
  "2.7": { objective: "Trace the generic laser architecture from power source to process and name the engineering concern at each block.", embed: "cavity", tools: [{ label: "3D Machine Explorer", href: "/machine" }] },
  "2.8": { objective: "Distinguish CW, QCW, Q-switched, gain-switched, mode-locked and MOPA operation and their pulse ranges.", embed: "pulse", calculators: ["qswitch-rep-rate", "pulse-parameters"] },
  "2.9": { objective: "Compute pulse energy, peak power, duty cycle, fluence and pulse overlap consistently from source parameters.", embed: "pulse", calculators: ["pulse-parameters", "fluence", "pulse-overlap", "average-power"] },
  /* Part III */
  "3.1": { objective: "Classify any laser source along gain medium, wavelength, operating mode, pumping, pulse duration, power and architecture.", tools: [{ label: "Laser Source Explorer", href: "/sources" }] },
  "3.2": { objective: "Compare solid-state gain media by wavelength, storage, beam quality and typical application.", tools: [{ label: "Solid-state sources", href: "/sources?family=solid-state" }] },
  "3.3": { objective: "Explain why fiber lasers dominate metal processing and differentiate CW, QCW, Q-switched, MOPA and ultrafast fiber sources.", tools: [{ label: "Fiber sources", href: "/sources?family=fiber" }] },
  "3.4": { objective: "Describe CO₂ and excimer lasers and the applications that keep gas lasers industrially relevant.", tools: [{ label: "Gas sources", href: "/sources?family=gas" }] },
  "3.5": { objective: "Explain semiconductor laser structures, their efficiency, wavelength drift and role as pumps.", tools: [{ label: "Semiconductor sources", href: "/sources?family=semiconductor" }] },
  "3.6": { objective: "Explain why sub-10 ps pulses minimise HAZ and how CPA and burst modes are used industrially.", calculators: ["time-bandwidth"], tools: [{ label: "Ultrafast sources", href: "/sources?family=ultrafast" }] },
  "3.7": { objective: "Identify the niche each specialised source (disk, slab, OPSL, OPO, FEL, supercontinuum, EUV) exists to fill.", tools: [{ label: "Specialised sources", href: "/sources?family=specialised" }] },
  "3.8": { objective: "Select candidate wavelengths for a material by reading the 24-line source–absorption–application map.", tools: [{ label: "Wavelength map", href: "/sources?view=wavelengths" }] },
  /* Part IV */
  "4.1": { objective: "Describe the Gaussian beam profile and state beam-diameter conventions unambiguously.", embed: "caustic", calculators: ["aperture-clipping", "gaussian-propagation"] },
  "4.2": { objective: "Define M² and explain why the fair comparison of beam quality is at a fixed required spot.", embed: "caustic", calculators: ["bpp-m2"] },
  "4.3": { objective: "Compute waist, Rayleigh range, divergence and a practical ±5% depth of focus.", embed: "caustic", calculators: ["gaussian-propagation", "focus-spot"] },
  "4.4": { objective: "Use NA, BPP, brightness and étendue to explain why passive optics cannot improve focusability.", calculators: ["bpp-m2", "brightness", "v-number"] },
  "4.5": { objective: "Design spot size and depth of focus for collimated and fiber-imaged beams, and size clear apertures.", embed: "caustic", calculators: ["focus-spot", "fiber-imaging", "aperture-clipping"] },
  "4.6": { objective: "Reproduce the handbook's focusing examples and explain how brightness buys working distance.", embed: "caustic", calculators: ["focus-spot", "fiber-imaging"] },
  /* Part V–VIII */
  "5.1": { objective: "Name the optical components of a beam train and the key specification of each.", tools: [{ label: "Optical component explorer", href: "/beam-optics?tab=components" }] },
  "5.2": { objective: "Explain why coatings are mandatory and compare AR, HR, metal and dichroic coatings.", calculators: ["fresnel"] },
  "5.3": { objective: "Interpret LIDT values with their test conditions and explain thermal lensing in kW optics.", tools: [{ label: "Optical materials", href: "/beam-optics?tab=materials" }] },
  "5.4": { objective: "Choose a beam-shaping technique (DOE, axicon, homogeniser, SLM) for a required intensity pattern." },
  "5.5": { objective: "Select optical materials by transmission band and power handling for a given wavelength.", tools: [{ label: "Material–wavelength compatibility", href: "/beam-optics?tab=materials" }] },
  "6.1": { objective: "Choose a beam-delivery method from wavelength, power and pulse regime." },
  "6.2": { objective: "Relate feeding and process fibers through étendue conservation.", calculators: ["fiber-imaging"] },
  "6.3": { objective: "Use core diameter, NA, V-number and BPP to specify a delivery fiber.", calculators: ["v-number", "fiber-imaging"] },
  "6.4": { objective: "Describe the four jobs of an industrial fiber connector and the QBH/QD power classes." },
  "6.5": { objective: "Apply the five delivery engineering rules to a robot-mounted fiber installation." },
  "7.1": { objective: "Compare galvo, 3D, polygon, resonant, MEMS and AOD scanners by speed, field and use." },
  "7.2": { objective: "Explain galvo architecture, field size, resolution, distortion and the effect of each scanner delay.", calculators: ["galvo-resolution", "hatch-time"], tools: [{ label: "3D Machine Explorer", href: "/machine" }] },
  "7.3": { objective: "Select scan strategies (hatch, cross-hatch, wobble, MOTF, stage–scanner sync) for a process goal.", embed: "marking", calculators: ["pulse-overlap", "hatch-time"] },
  "7.4": { objective: "Compare motion systems by accuracy and dynamics and explain PSO, coordination and error mapping." },
  "8.1": { objective: "Name the building blocks of a process head and their common failure modes." },
  "8.2": { objective: "Match process-head types to processes, gases, sensors and spot sizes." },
  "8.3": { objective: "Weigh coaxial against off-axis sensing, gas and filler arrangements." },
  "8.4": { objective: "Explain why focus errors cause most process escapes and how height sensing and autofocus control them.", calculators: ["focus-spot"] },
  /* Part IX */
  "9.1": { objective: "Apply R + A + T + S = 1 and the complex refractive index to predict reflection and penetration.", embed: "material", calculators: ["fresnel"] },
  "9.2": { objective: "Explain metal absorption versus wavelength and why keyholes and green/blue light help with copper.", embed: "material", calculators: ["hagen-rubens"] },
  "9.3": { objective: "Identify absorbing and transparent wavelengths for polymers, glass, ceramics, semiconductors and tissue.", embed: "material" },
  "9.4": { objective: "Compute thermal diffusion length and relate interaction time to the minimum HAZ.", embed: "material", calculators: ["thermal-diffusion", "diffusivity", "energy-per-length"] },
  "9.5": { objective: "Distinguish photothermal, photochemical and non-thermal ablation and find the energy-efficient fluence.", embed: "material", calculators: ["ablation-depth", "fluence"] },
  "9.6": { objective: "Explain plasma shielding and why it is stronger at long wavelengths.", calculators: ["critical-power"] },
  "9.7": { objective: "Place laser processes on an intensity–interaction-time map (the original chart is missing; see the reconstruction note).", embed: "regime" },
  /* Part X */
  "10.1": { objective: "Classify any laser process into modification, removal, separation, joining or addition.", tools: [{ label: "Process Simulator", href: "/processes" }] },
  "10.2": { objective: "Choose a marking mechanism and laser for a material, and list the eight parameters that control mark quality.", embed: "marking", calculators: ["pulse-overlap", "hatch-time", "fluence"], tools: [{ label: "Marking workspace", href: "/processes/marking" }] },
  "10.3": { objective: "Explain cutting mechanisms and the parameter effects on kerf, dross and HAZ.", tools: [{ label: "Cutting workspace", href: "/processes/cutting" }] },
  "10.4": { objective: "Distinguish conduction and keyhole welding, compute heat input per length and map defects to countermeasures.", embed: "welding", calculators: ["cw-intensity", "energy-per-length"], tools: [{ label: "Welding workspace", href: "/processes/welding" }] },
  "10.5": { objective: "Describe the laser-soldering process window and why closed-loop temperature control is essential." },
  "10.7": { objective: "Compare single-pulse, percussion, trepanning, helical and selective-etch drilling.", calculators: ["ablation-depth"], tools: [{ label: "Drilling workspace", href: "/processes/drilling" }] },
  "10.9": { objective: "Explain the self-limiting fluence window that makes laser cleaning selective.", tools: [{ label: "Cleaning workspace", href: "/processes/cleaning" }] },
  "10.13": { objective: "Explain CO₂ laser physics, gas mixture, architectures and why it remains the non-metal workhorse.", tools: [{ label: "Wavelength comparison", href: "/processes/wavelength" }] },
  "10.14": { objective: "Explain harmonic generation and state precisely what 'cold' UV processing means.", tools: [{ label: "Wavelength comparison", href: "/processes/wavelength" }] },
  "10.15": { objective: "Relate mode-locking, CPA, self-focusing and cold ablation to ultrafast processing of transparent materials.", calculators: ["time-bandwidth", "critical-power"] },
  /* Part XI–XII */
  "11.1": { objective: "Trace the optical chain of a machine and the key specification of each subsystem.", tools: [{ label: "3D Machine Explorer — optical layer", href: "/machine?layer=optical" }] },
  "11.2": { objective: "Describe the control stack from MES to laser gating with the timescale of each layer.", tools: [{ label: "Control architecture", href: "/architecture#control-stack" }] },
  "11.3": { objective: "List the mechanical subsystems of a laser machine and their design watch-outs." },
  "11.4": { objective: "Select electrical elements of a laser cell, including safety relays and hard-wired emission interlocks." },
  "11.5": { objective: "Map software modules to traceability, recipes and audit requirements." },
  "11.6": { objective: "Explain safety architecture — interlocks, shutters, Class 1 enclosure — and the standards that govern it.", tools: [{ label: "Safety & Quality", href: "/safety" }, { label: "3D Machine Explorer — safety layer", href: "/machine?layer=safety" }] },
  "12.1": { objective: "Specify a vision system (sensor, resolution, lens, lighting) and its calibration.", calculators: ["vision-resolution"] },
  "12.2": { objective: "Walk through the vision-guided processing loop and apply a position correction.", tools: [{ label: "Vision loop simulator", href: "/architecture#vision-loop" }] },
  "12.3": { objective: "Integrate a laser station with PLC, robots, conveyors, MES and SCADA." },
  "12.4": { objective: "Step through the signals of an in-line marking handshake.", tools: [{ label: "Handshake sequence", href: "/architecture#handshake" }] },
  "12.5": { objective: "Apply recipe control, interlocks, traceability and SPC to a production laser cell.", calculators: ["cycle-time"], tools: [{ label: "Interlock logic demo", href: "/architecture#interlocks" }] },
  /* Applications and business */
  "13.1": { objective: "Locate laser steps in front-end semiconductor manufacturing.", tools: [{ label: "Semiconductor applications", href: "/applications?industry=Semiconductor" }] },
  "13.2": { objective: "Locate laser steps in back-end and advanced packaging." },
  "15.3": { objective: "Map laser processes to cell, module and pack levels and their key challenges.", tools: [{ label: "Battery applications", href: "/applications?industry=Battery" }] },
  "15.4": { objective: "Compare IR, green, blue, QCW, UV and ultrafast lasers for battery manufacturing." },
  "16.0": { objective: "Map automotive systems and components to laser processes and machine types.", tools: [{ label: "Automotive applications", href: "/applications?industry=Automotive" }] },
  "20.0": { objective: "Read the industry × product × component × process × laser matrix both horizontally and vertically.", tools: [{ label: "Interactive application matrix", href: "/applications" }] },
  "23.1": { objective: "Explain how machine cost shares shift between standard and customised machines." },
  "23.2": { objective: "Compute cost per good part and identify which inputs dominate it.", calculators: ["cost-per-part", "roi-payback", "cycle-time"] },
  "23.3": { objective: "Apply the six-question process-selection framework to a new application.", embed: "decision-tree" },
  "23.4": { objective: "Walk a laser product from customer requirement to service, with the gate question at each stage." },
  "23.5": { objective: "Structure an application feasibility study with all thirteen sections.", tools: [{ label: "Guided feasibility study", href: "/safety#feasibility" }] },
  "23.6": { objective: "Plan a parameter-development DOE in derived quantities.", calculators: ["fluence", "pulse-overlap", "energy-per-length"] },
  /* Part XXIV–XXVII */
  "24.1": { objective: "Explain IEC 60825-1 laser classes and why processing machines are built as Class 1 products.", tools: [{ label: "Safety & Quality", href: "/safety" }] },
  "24.2": { objective: "Identify laser hazards and calculate eyewear OD and NOHD from MPE values.", calculators: ["optical-density", "nohd"] },
  "24.3": { objective: "Navigate the standards that apply to laser products, machines, eyewear and measurement." },
  "24.4": { objective: "Choose metrology for power, energy, profile, M², wavelength, pulse duration and process result." },
  "27.2": { objective: "Troubleshoot from the workpiece back to the source using symptom → cause → diagnostic → action.", tools: [{ label: "Interactive troubleshooting", href: "/troubleshooting" }] },
  "28.0": { objective: "Use the master technology map to walk from a product back to the physics that governs it.", tools: [{ label: "Interactive technology map", href: "/reference/map" }] },
  "B.1": { tools: [{ label: "Searchable glossary", href: "/reference/glossary" }] },
  "B.2": { tools: [{ label: "Abbreviation dictionary", href: "/reference/glossary#abbreviations" }] },
  "B.3": { tools: [{ label: "Interactive formula sheet", href: "/reference/formulas" }, { label: "All calculators", href: "/calculators" }] },
  "B.5": { embed: "decision-tree", tools: [{ label: "Interactive decision tree", href: "/reference/decision-tree" }] },
  "B.7": { tools: [{ label: "Safety & Quality", href: "/safety" }] },
  "B.8": { tools: [{ label: "Guided POC checklists", href: "/safety#feasibility" }] },
};

export function lessonEnhancement(sectionId: string): LessonEnhancement {
  return LESSONS[sectionId] ?? {};
}
