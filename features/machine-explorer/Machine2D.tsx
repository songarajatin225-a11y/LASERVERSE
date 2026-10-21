"use client";

/**
 * 2D schematic of the same workstation: optical path, control signals and safety chain
 * as an accessible block diagram. Used as the WebGL fallback and as an alternative view.
 */
import { COMPONENT_INDEX, OPTICAL_PATH, SIGNALS, type Layer } from "./machineData";
import { LAYER_COLOUR } from "./layerColours";

type Rect = [x: number, y: number, w: number, h: number];
const W = 120;
const H = 48;
const POS: Record<string, Rect> = {
  source: [20, 56, W, H],
  fiber: [160, 56, W, H],
  collimator: [300, 56, W, H],
  expander: [440, 56, W, H],
  galvo: [580, 56, W, H],
  ftheta: [720, 56, W, H],
  workpiece: [860, 56, W, H],
  pointer: [580, 140, W, 40],
  hmi: [160, 246, W, H],
  ipc: [370, 246, W, H],
  zaxis: [580, 246, W, H],
  camera: [790, 246, W, H],
  key: [20, 400, W, H],
  estop: [160, 400, W, H],
  interlock: [300, 400, W, H],
  extraction: [440, 400, W, H],
  safety: [620, 400, W, H],
  beacon: [860, 400, W, H],
  enclosure: [20, 520, W, 40],
  door: [160, 520, W, 40],
  window: [300, 520, W, 40],
  fixture: [440, 520, W, 40],
  base: [580, 520, W, 40],
};

const LANES: Array<[string, number]> = [
  ["Optical path · §11.1", 40],
  ["Control & vision · §11.2, §12.2", 230],
  ["Safety chain · §11.4, §11.6, §26.1", 384],
  ["Structure & guarding · §11.3", 504],
];

const SHORT: Record<string, string> = {
  source: "MOPA fiber source",
  fiber: "Delivery fiber",
  collimator: "Collimator",
  expander: "Beam expander",
  galvo: "Galvo scanner",
  ftheta: "F-theta lens",
  workpiece: "Workpiece",
  pointer: "Red pointer",
  hmi: "HMI",
  ipc: "IPC + scan card",
  zaxis: "Z column",
  camera: "Camera + light",
  key: "Key switch",
  estop: "E-stop",
  interlock: "Door interlock",
  extraction: "Fume extractor",
  safety: "Safety relay",
  beacon: "Emission indicator",
  enclosure: "Class 1 enclosure",
  door: "Interlocked door",
  window: "Viewing window",
  fixture: "Fixture plate",
  base: "Base cabinet",
};

const SIGNAL_COLOUR = { command: "#38d6cf", data: "#7fb2ff", safety: "#ffb547" } as const;

function connector(a: Rect, b: Rect, sameLaneDepth: number): string {
  const [ax, ay, aw, ah] = a;
  const [bx, by, bw, bh] = b;
  if (Math.abs(ay - by) < 20) {
    // same lane: dip below the lane
    const x1 = ax + aw / 2;
    const x2 = bx + bw / 2;
    const y = ay + ah;
    const d = sameLaneDepth;
    return `M${x1},${y} C${x1},${y + d} ${x2},${y + d} ${x2},${by + bh}`;
  }
  const down = by > ay;
  const x1 = ax + aw / 2;
  const y1 = down ? ay + ah : ay;
  const x2 = bx + bw / 2;
  const y2 = down ? by : by + bh;
  const my = (y1 + y2) / 2;
  return `M${x1},${y1} C${x1},${my} ${x2},${my} ${x2},${y2}`;
}

export function Machine2D({
  selected,
  onSelect,
  layers,
  emitting,
  showSignals,
}: {
  selected: string | null;
  onSelect: (id: string | null) => void;
  layers: Record<Layer, boolean>;
  emitting: boolean;
  showSignals: boolean;
}) {
  const visible = (id: string) => (COMPONENT_INDEX.get(id)?.layers ?? []).some((l) => layers[l]);
  return (
    <svg viewBox="0 0 1000 580" className="h-full w-full min-w-[720px]" role="group" aria-label="2D schematic of the marking workstation: optical path, control signals and safety chain">
      <defs>
        {(["command", "data", "safety", "beam"] as const).map((k) => (
          <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={k === "beam" ? (emitting ? "#ff3d7f" : "#5d6b78") : SIGNAL_COLOUR[k]} />
          </marker>
        ))}
      </defs>
      {LANES.map(([label, y]) => (
        <text key={label} x={20} y={y - 8} className="fill-fog-500 text-[12px] font-semibold uppercase tracking-[0.12em]">
          {label}
        </text>
      ))}

      {/* optical path */}
      {OPTICAL_PATH.slice(0, -1).map((id, i) => {
        const a = POS[id]!;
        const b = POS[OPTICAL_PATH[i + 1]!]!;
        return (
          <line
            key={id}
            x1={a[0] + a[2]}
            y1={a[1] + a[3] / 2}
            x2={b[0] - 2}
            y2={b[1] + b[3] / 2}
            stroke={emitting ? "#ff3d7f" : "#5d6b78"}
            strokeWidth={emitting ? 3 : 2}
            markerEnd="url(#arrow-beam)"
          />
        );
      })}
      <line x1={640} y1={140} x2={640} y2={106} stroke="#ff2a2a" strokeWidth={1.5} strokeDasharray="4 3" markerEnd="url(#arrow-beam)" />

      {/* signals */}
      {showSignals
        ? SIGNALS.map((s, i) => {
            const a = POS[s.from]!;
            const b = POS[s.to]!;
            const on = !selected || s.from === selected || s.to === selected;
            const depth = 20 + (Math.abs(a[0] - b[0]) / 1000) * 70 + (i % 3) * 4;
            return (
              <path
                key={`${s.from}-${s.to}`}
                d={connector(a, b, depth)}
                fill="none"
                stroke={SIGNAL_COLOUR[s.kind]}
                strokeWidth={on ? 2 : 1}
                strokeOpacity={on ? 0.9 : 0.25}
                strokeDasharray={s.kind === "safety" ? "6 4" : undefined}
                markerEnd={`url(#arrow-${s.kind})`}
              >
                <title>{`${SHORT[s.from]} → ${SHORT[s.to]}: ${s.label} (§${s.section})`}</title>
              </path>
            );
          })
        : null}

      {/* blocks */}
      {Object.entries(POS).map(([id, [x, y, w, h]]) => {
        const comp = COMPONENT_INDEX.get(id);
        if (!comp) return null;
        const vis = visible(id);
        const sel = selected === id;
        return (
          <g
            key={id}
            role="button"
            tabIndex={0}
            aria-pressed={sel}
            aria-label={`${comp.name}${vis ? "" : " (layer hidden)"}`}
            onClick={() => onSelect(sel ? null : id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(sel ? null : id);
              }
            }}
            className="cursor-pointer outline-none [&:focus-visible>rect]:stroke-teal-300"
            opacity={vis ? 1 : 0.25}
          >
            <rect x={x} y={y} width={w} height={h} rx={9} fill={sel ? "rgb(0 149 144 / 0.22)" : "#111a23"} stroke={sel ? "#2fd3c9" : "rgb(255 255 255 / 0.14)"} strokeWidth={sel ? 2 : 1} />
            <g>
              {comp.layers.map((l, i) => (
                <circle key={l} cx={x + 11 + i * 9} cy={y + 9} r={3} fill={LAYER_COLOUR[l]} />
              ))}
            </g>
            <text x={x + w / 2} y={y + h - (h > 44 ? 15 : 11)} textAnchor="middle" className="fill-fog-100 text-[12.5px] font-medium">
              {SHORT[id]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
