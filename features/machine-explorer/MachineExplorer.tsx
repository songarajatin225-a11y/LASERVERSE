"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Box as BoxIcon, Calculator, Crosshair, Eye, Focus, Layers3, Play, RotateCcw, Square, Waypoints, X } from "lucide-react";
import { Badge, Button, Callout, ClassTag, cn } from "@/components/ui/primitives";
import { Segmented, Switch } from "@/components/ui/controls";
import { SourceRef } from "@/components/ui/SourceRef";
import { useMotionAllowed } from "@/components/shell/MotionProvider";
import { COMPONENTS, COMPONENT_INDEX, LAYERS, OPTICAL_PATH, SIGNALS, emissionPermitted, type Layer } from "./machineData";
import { LAYER_COLOUR } from "./layerColours";
import { Machine2D } from "./Machine2D";
import type { CameraPreset, SceneApi } from "./MachineScene";

const MachineScene = dynamic(() => import("./MachineScene"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 grid place-items-center text-[13px] text-fog-500">
      <span className="animate-pulse">Loading 3D model…</span>
    </div>
  ),
});

const ALL_LAYERS: Record<Layer, boolean> = { optical: true, mechanical: true, vision: true, automation: true, safety: true };
const SIGNAL_TONE = { command: "teal", data: "info", safety: "warn" } as const;

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<{ onError: (e: Error) => void; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: Error) {
    this.props.onError(error);
  }
  override render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function MachineExplorer({ calcTitles }: { calcTitles: Record<string, string> }) {
  const params = useSearchParams();
  const motion = useMotionAllowed();
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [view, setView] = useState<"3d" | "2d">("3d");
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [layers, setLayers] = useState<Record<Layer, boolean>>(ALL_LAYERS);
  const [explode, setExplode] = useState(false);
  const [focusPath, setFocusPath] = useState(false);
  const [showSignals, setShowSignals] = useState(false);
  const [running, setRunning] = useState(false);
  const [doorClosed, setDoorClosed] = useState(true);
  const [estopReleased, setEstopReleased] = useState(true);
  const [keyOn, setKeyOn] = useState(true);
  const [extractionOn, setExtractionOn] = useState(true);
  const [pointerPreview, setPointerPreview] = useState(false);
  const [jobKey, setJobKey] = useState(0);
  const [progress, setProgress] = useState(0);
  const apiRef = useRef<SceneApi | null>(null);

  useEffect(() => {
    setWebgl(hasWebGL());
  }, []);

  // deep links: ?layer=safety shows one layer, ?select=galvo opens a component
  useEffect(() => {
    const layer = params.get("layer");
    if (layer && LAYERS.some((l) => l.id === layer)) {
      setLayers({ optical: false, mechanical: false, vision: false, automation: false, safety: false, [layer]: true } as Record<Layer, boolean>);
    }
    const sel = params.get("select");
    if (sel && COMPONENT_INDEX.has(sel)) setSelected(sel);
    if (params.get("view") === "2d") setView("2d");
  }, [params]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const permit = emissionPermitted({ running, doorClosed, estopReleased, keyOn, extractionOn });
  const emitting = permit.ok;
  const use3d = view === "3d" && webgl === true && !failure;

  const onHover = useCallback((id: string, on: boolean) => setHovered((h) => (on ? id : h === id ? null : h)), []);
  const onProgress = useCallback((f: number) => setProgress(f), []);
  const onJobDone = useCallback(() => {
    setRunning(false);
    setProgress(1);
  }, []);
  const onContextLost = useCallback(() => setFailure("The WebGL context was lost (for example after a GPU reset)."), []);

  const preset = (p: CameraPreset) => apiRef.current?.preset(p);
  const toggleExplode = (v: boolean) => {
    setExplode(v);
    preset(v ? "exploded" : "overview");
  };
  const run = () => {
    if (progress >= 1 || progress === 0) setJobKey((k) => k + 1);
    setRunning(true);
  };
  const resetAll = () => {
    setSelected(null);
    setLayers(ALL_LAYERS);
    setExplode(false);
    setFocusPath(false);
    setShowSignals(false);
    setRunning(false);
    setDoorClosed(true);
    setEstopReleased(true);
    setKeyOn(true);
    setExtractionOn(true);
    setPointerPreview(false);
    setProgress(0);
    setJobKey((k) => k + 1);
    preset("overview");
  };

  const comp = selected ? COMPONENT_INDEX.get(selected) : undefined;

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* viewport */}
        <div className="flex min-w-0 flex-col gap-4">
          <div data-testid="machine-viewport" className="relative h-[clamp(440px,64vh,740px)] overflow-hidden rounded-[var(--radius-xl)] border border-[var(--line)] bg-[#0a1016]">
            {use3d ? (
              <SceneBoundary onError={(e) => setFailure(`The 3D renderer failed: ${e.message}`)}>
                <MachineScene
                  selected={selected}
                  hovered={hovered}
                  onSelect={setSelected}
                  onHover={onHover}
                  layers={layers}
                  explode={explode}
                  focusPath={focusPath}
                  showSignals={showSignals}
                  doorOpen={!doorClosed}
                  emitting={emitting}
                  pointerPreview={pointerPreview}
                  jobKey={jobKey}
                  onProgress={onProgress}
                  onJobDone={onJobDone}
                  motion={motion}
                  apiRef={apiRef}
                  onContextLost={onContextLost}
                />
              </SceneBoundary>
            ) : webgl === null && view === "3d" ? (
              <div className="absolute inset-0 grid place-items-center text-[13px] text-fog-500">Checking graphics support…</div>
            ) : (
              <div className="scrollbar-thin absolute inset-0 flex flex-col overflow-x-auto p-3 pb-24 pt-14">
                <Machine2D selected={selected} onSelect={setSelected} layers={layers} emitting={emitting} showSignals={showSignals || !use3d} />
              </div>
            )}

            {/* toolbar */}
            <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start justify-between gap-2 p-3">
              <div className="pointer-events-auto flex flex-wrap items-center gap-1.5">
                {use3d ? (
                  <>
                    <div role="group" aria-label="Camera presets" className="inline-flex gap-1 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-900/80 p-1 backdrop-blur">
                      {(
                        [
                          ["overview", "Overview"],
                          ["front", "Front"],
                          ["head", "Scan head"],
                          ["top", "Top"],
                        ] as Array<[CameraPreset, string]>
                      ).map(([p, label]) => (
                        <button key={p} type="button" onClick={() => preset(p)} className="rounded-[var(--radius-sm)] px-2.5 py-1 text-[12.5px] font-medium text-fog-300 hover:bg-white/[0.06] hover:text-fog-100">
                          {label}
                        </button>
                      ))}
                    </div>
                    <Button size="sm" variant="secondary" className="bg-ink-900/80 backdrop-blur" onClick={() => preset(explode ? "exploded" : "overview")} aria-label="Reset camera">
                      <RotateCcw aria-hidden className="size-3.5" /> Reset view
                    </Button>
                  </>
                ) : null}
              </div>
              <div className="pointer-events-auto">
                <Segmented<"3d" | "2d">
                  label="Rendering"
                  value={use3d ? "3d" : "2d"}
                  onChange={(v) => setView(v)}
                  options={[
                    { value: "3d", label: "3D" },
                    { value: "2d", label: "2D schematic" },
                  ]}
                  className="bg-ink-900/80 backdrop-blur"
                />
              </div>
            </div>

            {/* status strip */}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-end justify-between gap-2 p-3">
              <div className="flex flex-col gap-1.5">
                {use3d ? (
                  <div className="rounded-[var(--radius-sm)] bg-ink-900/80 px-2.5 py-1.5 text-[12px] text-fog-400 backdrop-blur">
                    {hovered ? <span className="text-fog-100">{COMPONENT_INDEX.get(hovered)?.name}</span> : "Drag to orbit · scroll or pinch to zoom · right-drag to pan · click a component"}
                  </div>
                ) : null}
                <div
                  className={cn(
                    "flex items-center gap-2 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[12px] backdrop-blur",
                    emitting ? "bg-[#3a1424]/85 text-[#ffc2d6]" : "bg-ink-900/80 text-fog-300",
                  )}
                  role="status"
                  aria-live="polite"
                >
                  <span aria-hidden className={cn("size-2 rounded-full", emitting ? "bg-[#ff3d7f] shadow-[0_0_10px_#ff3d7f]" : "bg-fog-600")} />
                  {emitting ? "Emission enabled — marking (1064 nm drawn in false colour; the real beam is invisible)" : running ? `Emission blocked: ${permit.reasons[0]}` : progress >= 1 ? "Job complete" : "Idle — emission not requested"}
                  {progress > 0 ? <span className="tabular font-mono text-fog-400">{Math.round(progress * 100)}%</span> : null}
                </div>
              </div>
              <div className="rounded-[var(--radius-sm)] bg-ink-900/80 px-2.5 py-1.5 text-[11px] text-fog-500 backdrop-blur">Generic, illustrative geometry — not a vendor design</div>
            </div>
          </div>

          {failure ? (
            <Callout kind="limitation" title="3D view unavailable">
              {failure} The 2D schematic shows the same components, optical path, signals and interlock logic.
            </Callout>
          ) : webgl === false ? (
            <Callout kind="limitation" title="WebGL not available">
              This browser or device does not provide WebGL, so the 3D model cannot be rendered. The 2D schematic shows the same components, optical path, signals and interlock logic.
            </Callout>
          ) : null}

          <InfoPanel calcTitles={calcTitles} comp={comp} onClose={() => setSelected(null)} onFocus={use3d && comp ? () => apiRef.current?.focus(comp.id) : undefined} onSelect={setSelected} />
        </div>

        {/* controls */}
        <aside className="flex flex-col gap-4" aria-label="Machine explorer controls">
          <ControlCard icon={<Layers3 aria-hidden className="size-4" />} title="Layers">
            <div className="flex flex-col gap-2.5">
              {LAYERS.map((l) => (
                <Switch
                  key={l.id}
                  checked={layers[l.id]}
                  onChange={(v) => setLayers((s) => ({ ...s, [l.id]: v }))}
                  label={
                    <span className="inline-flex items-center gap-2">
                      <span aria-hidden className="size-2 rounded-full" style={{ background: LAYER_COLOUR[l.id] }} />
                      {l.label}
                    </span>
                  }
                  description={l.description}
                />
              ))}
            </div>
            <p className="mt-3 text-[11.5px] leading-snug text-fog-500">
              Layer visibility is a viewing aid only: hiding the safety layer does not remove any safeguard from the machine described.
            </p>
          </ControlCard>

          <ControlCard icon={<Eye aria-hidden className="size-4" />} title="View">
            <div className="flex flex-col gap-2.5">
              <Switch checked={explode} onChange={toggleExplode} label="Exploded view" description="Separates the assemblies" />
              <Switch checked={focusPath} onChange={setFocusPath} label="Highlight optical path" description="Source → fiber → collimator → expander → scanner → lens → part (§11.1)" />
              <Switch checked={showSignals} onChange={setShowSignals} label="Control & safety signals" description="Commands (teal), data (blue), safety circuits (amber)" />
            </div>
          </ControlCard>

          <ControlCard icon={<Play aria-hidden className="size-4" />} title="Operate (conceptual)">
            <div className="mb-3 flex gap-2">
              {running ? (
                <Button variant="secondary" size="sm" onClick={() => setRunning(false)}>
                  <Square aria-hidden className="size-3.5" /> Stop job
                </Button>
              ) : (
                <Button variant="primary" size="sm" onClick={run}>
                  <Play aria-hidden className="size-3.5" /> {progress > 0 && progress < 1 ? "Resume job" : "Run marking job"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={resetAll}>
                <RotateCcw aria-hidden className="size-3.5" /> Reset all
              </Button>
            </div>
            <div className="flex flex-col gap-2.5">
              <Switch checked={doorClosed} onChange={setDoorClosed} label="Door closed" />
              <Switch checked={estopReleased} onChange={setEstopReleased} label="E-stop released" />
              <Switch checked={keyOn} onChange={setKeyOn} label="Key switch on" />
              <Switch checked={extractionOn} onChange={setExtractionOn} label="Fume extraction running" />
              <Switch checked={pointerPreview} onChange={setPointerPreview} label="Red pointer frame preview" description="Visible aiming beam traces the job outline when not emitting" />
            </div>
            <div className={cn("mt-3 rounded-[var(--radius-sm)] border px-3 py-2 text-[12.5px]", emitting ? "border-[#ff3d7f]/40 bg-[#ff3d7f]/10 text-[#ffc2d6]" : "border-[var(--line)] bg-white/[0.02] text-fog-300")}>
              <div className="font-semibold">{emitting ? "Emission enable: ON" : "Emission enable: OFF"}</div>
              {!emitting ? (
                <ul className="mt-1 list-disc pl-4 text-fog-400">
                  {permit.reasons.map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              ) : null}
            </div>
            <p className="mt-3 text-[11.5px] leading-snug text-fog-500">
              Simplified permission logic for learning, not a functional-safety design. Real interlocks are engineered and validated to the performance level set by the risk
              assessment (<SourceRef section="11.4" />, <SourceRef section="11.6" />). Never bypass a safety device.
            </p>
          </ControlCard>

          <ControlCard icon={<BoxIcon aria-hidden className="size-4" />} title={`Components (${COMPONENTS.length})`}>
            <ul className="flex flex-wrap gap-1.5">
              {[...OPTICAL_PATH, ...COMPONENTS.map((c) => c.id).filter((id) => !OPTICAL_PATH.includes(id))].map((id) => {
                const c = COMPONENT_INDEX.get(id)!;
                const on = selected === id;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => setSelected(on ? null : id)}
                      onMouseEnter={() => onHover(id, true)}
                      onMouseLeave={() => onHover(id, false)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors",
                        on ? "border-teal-400/70 bg-teal-500/15 text-teal-100" : "border-[var(--line)] text-fog-300 hover:border-white/20 hover:text-fog-100",
                      )}
                    >
                      <span aria-hidden className="size-1.5 rounded-full" style={{ background: LAYER_COLOUR[c.layers[0]!] }} />
                      {c.name.replace(/ \(.*\)$/, "")}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ControlCard>
        </aside>
      </div>
    </div>
  );
}

function ControlCard({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4">
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.12em] text-fog-300">
        <span className="text-teal-300">{icon}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoPanel({
  calcTitles,
  comp,
  onClose,
  onFocus,
  onSelect,
}: {
  calcTitles: Record<string, string>;
  comp: (typeof COMPONENTS)[number] | undefined;
  onClose: () => void;
  onFocus?: () => void;
  onSelect: (id: string) => void;
}) {
  const signals = useMemo(() => (comp ? SIGNALS.filter((s) => s.from === comp.id || s.to === comp.id) : []), [comp]);
  if (!comp) {
    return (
      <section className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Crosshair aria-hidden className="size-4 text-teal-300" />
          <h2 className="text-[15px] font-semibold text-paper">Select a component</h2>
          <ClassTag kind="handbook" short />
        </div>
        <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-fog-300">
          Click any part in the model, a block in the schematic, or a chip in the component list. Each panel shows the component&apos;s function, the typical specification and
          watch-outs from the handbook, the signals it exchanges, and links to the calculators and labs that work with it.
        </p>
      </section>
    );
  }
  const optIdx = OPTICAL_PATH.indexOf(comp.id);
  return (
    <section className="rounded-[var(--radius-lg)] border border-teal-500/30 bg-ink-800/80 p-5" aria-live="polite" aria-label={`${comp.name} details`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap gap-1.5">
            {comp.layers.map((l) => (
              <Badge key={l}>
                <span aria-hidden className="size-1.5 rounded-full" style={{ background: LAYER_COLOUR[l] }} />
                {l}
              </Badge>
            ))}
            {optIdx >= 0 ? <Badge tone="concept">Optical path step {optIdx + 1} of {OPTICAL_PATH.length}</Badge> : null}
          </div>
          <h2 className="text-[18px] font-semibold text-paper">{comp.name}</h2>
        </div>
        <div className="flex gap-1.5">
          {onFocus ? (
            <Button size="sm" variant="secondary" onClick={onFocus}>
              <Focus aria-hidden className="size-3.5" /> Focus camera
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onClose} aria-label="Close details">
            <X aria-hidden className="size-4" />
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-4 text-[13.5px] leading-relaxed text-fog-200">
          <div>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Function</h3>
            <p>{comp.fn}</p>
          </div>
          <div>
            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Typical specification (handbook)</h3>
            <p>{comp.spec}</p>
          </div>
          {comp.watch ? (
            <div>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Watch-outs</h3>
              <p>{comp.watch}</p>
            </div>
          ) : null}
        </div>
        <div className="flex flex-col gap-4">
          {signals.length ? (
            <div>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">
                <Waypoints aria-hidden className="size-3.5" /> Signals
              </h3>
              <ul className="flex flex-col gap-1.5 text-[13px]">
                {signals.map((s) => {
                  const other = s.from === comp.id ? s.to : s.from;
                  return (
                    <li key={`${s.from}-${s.to}`} className="flex flex-wrap items-baseline gap-1.5">
                      <Badge tone={SIGNAL_TONE[s.kind]}>{s.from === comp.id ? "out" : "in"}</Badge>
                      <button type="button" className="text-fog-100 underline decoration-white/20 underline-offset-2 hover:decoration-white/60" onClick={() => onSelect(other)}>
                        {COMPONENT_INDEX.get(other)?.name}
                      </button>
                      <span className="text-fog-400">— {s.label}</span>
                      <SourceRef section={s.section} />
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
          {comp.calculators?.length || comp.tool ? (
            <div>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">
                <Calculator aria-hidden className="size-3.5" /> Work with it
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {comp.calculators?.map((id) => (
                  <Link key={id} href={`/calculators/${id}`} className="rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100">
                    {calcTitles[id] ?? id}
                  </Link>
                ))}
                {comp.tool ? (
                  <Link href={comp.tool.href} className="rounded-full border border-teal-500/40 bg-teal-500/10 px-2.5 py-1 text-[12px] text-teal-100 hover:bg-teal-500/20">
                    {comp.tool.label} →
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
          <div>
            <h3 className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Handbook sources</h3>
            <ul className="flex flex-col gap-1">
              {comp.sections.map((s) => (
                <li key={s}>
                  <SourceRef section={s} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
