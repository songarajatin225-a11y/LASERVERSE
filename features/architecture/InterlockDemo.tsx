"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Switch } from "@/components/ui/controls";
import { LabFrame, ControlGroup, PresetChips } from "@/components/viz/LabFrame";
import { ClassTag, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import type { InterlockState } from "@/features/machine-explorer/machineData";
import { interlockView } from "./interlock";
import type { InterlockTexts } from "./types";

const OK = "#19b2ab";
const BAD = "#f2555a";

const IDLE: InterlockState = { keyOn: true, estopReleased: true, doorClosed: true, extractionOn: true, running: false };
const PRESETS: Record<string, InterlockState> = {
  idle: IDLE,
  run: { ...IDLE, running: true },
  door: { ...IDLE, running: true, doorClosed: false },
  estop: { ...IDLE, running: true, estopReleased: false },
  fume: { ...IDLE, running: true, extractionOn: false },
};
const PRESET_OPTIONS = [
  { value: "idle", label: "Idle, all closed" },
  { value: "run", label: "Start a job" },
  { value: "door", label: "Open the door mid-job" },
  { value: "estop", label: "Press E-stop" },
  { value: "fume", label: "Extraction fails" },
];

const same = (a: InterlockState, b: InterlockState) => (Object.keys(a) as Array<keyof InterlockState>).every((k) => a[k] === b[k]);

export function InterlockDemo({ texts }: { texts: InterlockTexts }) {
  const [s, setS] = useState<InterlockState>(IDLE);
  const set = (k: keyof InterlockState) => (v: boolean) => setS((p) => ({ ...p, [k]: v }));
  const view = interlockView(s);
  const res = view.emission;
  const preset = Object.entries(PRESETS).find(([, p]) => same(p, s))?.[0] ?? null;

  /* safety inputs → safety PLC / relay (as in the §11.6 figure) */
  const safetyInputs: Array<{ label: string; on: boolean; state: string; y: number }> = [
    { label: "Key switch", on: s.keyOn, state: s.keyOn ? "on" : "off", y: 40 },
    { label: "Emergency stop", on: s.estopReleased, state: s.estopReleased ? "released" : "pressed", y: 92 },
    { label: "Door interlock", on: s.doorClosed, state: s.doorClosed ? "closed" : "open", y: 144 },
  ];
  /* process interlock (§12.5) and job → PLC */
  const fumeY = 222;
  const jobY = 284;
  const plcY = 255;

  return (
    <LabFrame
      title="Interlock logic demo"
      eyebrow="Conceptual · teaching simplification"
      tags={["conceptual"]}
      onReset={() => setS(IDLE)}
      description={
        <>
          Toggle the inputs of a simplified Class 1 marking workstation and watch whether the laser is permitted to emit. The logic is the Machine Explorer’s conceptual model: every
          condition must hold at once. It is a teaching simplification, not a functional-safety design, and assigns no categories or performance levels.
        </>
      }
      visual={
        <div className="flex flex-col gap-3 p-3">
          <div className="scrollbar-thin overflow-x-auto">
            <svg viewBox="0 0 660 326" className="w-full min-w-[560px]" role="img" aria-label={`Interlock diagram. Safety chain ${view.safetyChainOk ? "closed" : "open"}; process interlocks ${view.processOk ? "OK" : "not OK"}; job ${s.running ? "running" : "idle"}. Emission ${res.ok ? "permitted" : "not permitted"}.`}>
              {safetyInputs.map((i) => (
                <g key={i.label}>
                  <rect x={12} y={i.y - 18} width={168} height={36} rx={8} fill="rgba(255,255,255,0.03)" stroke={i.on ? "rgba(25,178,171,0.55)" : "rgba(242,85,90,0.7)"} />
                  <circle cx={30} cy={i.y} r={5} fill={i.on ? OK : BAD} />
                  <text x={44} y={i.y - 2} className="fill-fog-100 text-[12.5px] font-medium">
                    {i.label}
                  </text>
                  <text x={44} y={i.y + 12} className={cn("font-mono text-[10.5px]", i.on ? "fill-teal-200" : "fill-[#ffb4b6]")}>
                    {i.state}
                  </text>
                  <line x1={180} x2={262} y1={i.y} y2={i.y} stroke={i.on ? OK : BAD} strokeWidth={2} strokeDasharray={i.on ? undefined : "5 4"} />
                </g>
              ))}
              {/* safety relay */}
              <rect x={262} y={18} width={150} height={148} rx={10} fill="rgba(242,85,90,0.06)" stroke="rgba(242,85,90,0.45)" />
              <text x={337} y={88} textAnchor="middle" className="fill-fog-100 text-[13px] font-semibold">
                Safety PLC / relay
              </text>
              <text x={337} y={106} textAnchor="middle" className={cn("font-mono text-[11px]", view.safetyChainOk ? "fill-teal-200" : "fill-[#ffb4b6]")}>
                {view.safetyChainOk ? "safety inputs healthy" : "safety input open"}
              </text>
              <line x1={412} x2={490} y1={92} y2={92} stroke={view.safetyChainOk ? OK : BAD} strokeWidth={2.4} strokeDasharray={view.safetyChainOk ? undefined : "5 4"} />
              <text x={451} y={83} textAnchor="middle" className="fill-fog-400 text-[10.5px]">
                emission enable
              </text>

              {/* process interlock and job → PLC */}
              <rect x={12} y={fumeY - 18} width={168} height={36} rx={8} fill="rgba(255,255,255,0.03)" stroke={s.extractionOn ? "rgba(25,178,171,0.55)" : "rgba(242,85,90,0.7)"} />
              <circle cx={30} cy={fumeY} r={5} fill={s.extractionOn ? OK : BAD} />
              <text x={44} y={fumeY - 2} className="fill-fog-100 text-[12.5px] font-medium">
                Fume extraction
              </text>
              <text x={44} y={fumeY + 12} className={cn("font-mono text-[10.5px]", s.extractionOn ? "fill-teal-200" : "fill-[#ffb4b6]")}>
                {s.extractionOn ? "running" : "off"}
              </text>
              <polyline points={`180,${fumeY} 222,${fumeY} 222,${plcY - 14} 262,${plcY - 14}`} fill="none" stroke={s.extractionOn ? OK : BAD} strokeWidth={2} strokeDasharray={s.extractionOn ? undefined : "5 4"} />

              <rect x={12} y={jobY - 18} width={168} height={36} rx={8} fill="rgba(255,255,255,0.03)" stroke={s.running ? "rgba(25,178,171,0.55)" : "rgba(255,255,255,0.16)"} />
              <circle cx={30} cy={jobY} r={5} fill={s.running ? OK : "#6f7a88"} />
              <text x={44} y={jobY - 2} className="fill-fog-100 text-[12.5px] font-medium">
                Job (PLC Start)
              </text>
              <text x={44} y={jobY + 12} className={cn("font-mono text-[10.5px]", s.running ? "fill-teal-200" : "fill-fog-500")}>
                {s.running ? "running" : "idle"}
              </text>
              <polyline points={`180,${jobY} 222,${jobY} 222,${plcY + 14} 262,${plcY + 14}`} fill="none" stroke={s.running ? OK : "#3b4a5f"} strokeWidth={2} />

              <rect x={262} y={196} width={150} height={118} rx={10} fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.22)" />
              <text x={337} y={243} textAnchor="middle" className="fill-fog-100 text-[13px] font-semibold">
                PLC
              </text>
              <text x={337} y={259} textAnchor="middle" className="fill-fog-400 text-[10.5px]">
                process interlocks + job
              </text>
              <text x={337} y={277} textAnchor="middle" className={cn("font-mono text-[11px]", view.gateOk ? "fill-teal-200" : view.processOk ? "fill-fog-500" : "fill-[#ffb4b6]")}>
                {view.gateOk ? "job started" : view.processOk ? "no job" : "process interlock open"}
              </text>
              <line x1={412} x2={490} y1={plcY} y2={plcY} stroke={view.gateOk ? OK : "#3b4a5f"} strokeWidth={2} strokeDasharray={view.gateOk ? undefined : "5 4"} />
              <text x={451} y={plcY - 9} textAnchor="middle" className="fill-fog-400 text-[10.5px]">
                start / gate
              </text>

              {/* laser */}
              <rect x={490} y={70} width={156} height={200} rx={10} fill={res.ok ? "rgba(0,149,144,0.14)" : "rgba(255,255,255,0.03)"} stroke={res.ok ? OK : "rgba(255,255,255,0.18)"} strokeWidth={res.ok ? 2 : 1} />
              <text x={568} y={120} textAnchor="middle" className="fill-fog-100 text-[13px] font-semibold">
                Laser source
              </text>
              <text x={568} y={176} textAnchor="middle" className={cn("text-[17px] font-bold tracking-wide", res.ok ? "fill-teal-200" : "fill-fog-400")}>
                {res.ok ? "EMISSION" : "NO EMISSION"}
              </text>
              <text x={568} y={198} textAnchor="middle" className="fill-fog-500 font-mono text-[10.5px]">
                {res.ok ? "permitted" : `${res.reasons.length} condition${res.reasons.length === 1 ? "" : "s"} unmet`}
              </text>
              {/* indicator */}
              <line x1={568} x2={568} y1={70} y2={48} stroke="rgba(255,255,255,0.18)" />
              <circle cx={568} cy={34} r={14} fill={res.ok ? "#e9b24c" : "rgba(255,255,255,0.05)"} stroke={res.ok ? "#e9b24c" : "rgba(255,255,255,0.2)"} />
              <text x={546} y={38} textAnchor="end" className="fill-fog-400 text-[10.5px]">
                emission indicator
              </text>
            </svg>
          </div>
          <p className="px-1 text-[11.5px] leading-snug text-fog-500">
            Grouping follows the handbook’s §11.6 figure (door interlock, emergency stop and key switch feed the safety PLC / relay) and §12.5 (fume extraction as a process
            interlock); the wiring drawn here is conceptual.
          </p>
          <div
            className={cn(
              "rounded-[var(--radius-md)] border px-4 py-3",
              res.ok ? "border-teal-500/40 bg-teal-500/10" : "border-danger/40 bg-danger/[0.07]",
            )}
            aria-live="polite"
          >
            <div className={cn("text-[15px] font-semibold", res.ok ? "text-teal-100" : "text-[#ffb4b6]")}>Emission enable: {res.ok ? "ON" : "OFF"}</div>
            {res.reasons.length ? (
              <ul className="mt-1.5 list-disc pl-5 text-[13px] text-fog-200">
                {res.reasons.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-[13px] text-fog-300">Every condition in this simplified model holds.</p>
            )}
          </div>
        </div>
      }
      controls={
        <>
          <ControlGroup title="Scenarios">
            <PresetChips label="Interlock scenarios" options={PRESET_OPTIONS} value={preset} onPick={(v) => setS(PRESETS[v] ?? IDLE)} />
          </ControlGroup>
          <ControlGroup title="Inputs">
            <Switch checked={s.keyOn} onChange={set("keyOn")} label="Key switch on" />
            <Switch checked={s.estopReleased} onChange={set("estopReleased")} label="Emergency stop released" />
            <Switch checked={s.doorClosed} onChange={set("doorClosed")} label="Door closed" />
            <Switch checked={s.extractionOn} onChange={set("extractionOn")} label="Fume extraction running" />
            <Switch checked={s.running} onChange={set("running")} label="Job running" description="PLC Start; not a safety input" />
          </ControlGroup>
          <Link href="/machine?layer=safety" className="inline-flex items-center gap-1.5 self-start rounded-full border border-teal-500/40 bg-teal-500/10 px-3 py-1.5 text-[13px] text-teal-100 hover:bg-teal-500/20">
            Safety layer in the Machine Explorer <ArrowRight aria-hidden className="size-3.5" />
          </Link>
        </>
      }
      footer={
        <div className="flex flex-col gap-2">
          <p>
            <ClassTag kind="handbook" short className="mr-1.5 align-middle" />
            Laser and chiller interfaces: “{texts.hardWired}” <SourceRef section="11.4" />
          </p>
          <p>
            <ClassTag kind="handbook" short className="mr-1.5 align-middle" />
            Emission enable: “{texts.emissionEnable}” <SourceRef section="12.4" />
          </p>
          <p>
            <ClassTag kind="handbook" short className="mr-1.5 align-middle" />
            Process interlocks: “{texts.processInterlocks}” <SourceRef section="12.5" />
          </p>
          <p>
            <ClassTag kind="additional" short className="mr-1.5 align-middle" />
            Platform guidance (not from the handbook): the demo models only five inputs and omits most of the process interlocks quoted above. Real machines add monitoring,
            redundancy and diagnostics that a single on/off rule cannot show.
          </p>
        </div>
      }
      sources={[{ section: "11.6", note: "safety architecture" }, { section: "11.4" }, { section: "12.5" }]}
    />
  );
}
