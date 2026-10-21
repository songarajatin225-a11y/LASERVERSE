"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpRight, Calculator, FlaskConical, Link2, Search, Wrench, X } from "lucide-react";
import Link from "next/link";
import { Badge, ClassTag, SectionTitle, cn } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { TOPIC_LABEL, TOPIC_ORDER, type RecipePractice, type TroubleCard, type TroubleTopic } from "./types";

/* ------------------------------------------------------------------ matching */
/** Light stemming so "fixturing" finds "fixture" and "contamination" finds "contaminated". */
function stem(word: string): string {
  const w = word.toLowerCase();
  for (const suf of ["ation", "ing", "ed", "es", "s"]) {
    if (w.endsWith(suf) && w.length - suf.length >= 4) return w.slice(0, -suf.length);
  }
  return w;
}

/** A fault family matches a card when any (stemmed) word of the phrase occurs in the card text. */
function matchesFault(card: TroubleCard, phrase: string): boolean {
  return phrase
    .split(/\s+/)
    .filter(Boolean)
    .some((w) => card.haystack.includes(stem(w)));
}

/** Case-, superscript- and dash-insensitive matching, so "m2" finds "M²" and "al-cu" finds "Al–Cu". */
const norm = (s: string) => s.toLowerCase().replace(/²/g, "2").replace(/₂/g, "2").replace(/[‐‑–—]/g, "-");

function matchesQuery(card: TroubleCard, tokens: string[]): boolean {
  const hay = norm(card.haystack);
  return tokens.every((t) => hay.includes(t) || hay.includes(stem(t)));
}

/* ------------------------------------------------------------------ explorer */
export function TroubleshootingExplorer({
  symptoms,
  welds,
  faults,
  recipe,
}: {
  symptoms: TroubleCard[];
  welds: TroubleCard[];
  faults: string[];
  recipe: RecipePractice;
}) {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState<TroubleTopic | null>(null);
  const [fault, setFault] = useState<string | null>(null);
  const tokens = useMemo(
    () =>
      norm(q)
        .split(/\s+/)
        .filter(Boolean),
    [q],
  );
  const all = useMemo(() => [...symptoms, ...welds], [symptoms, welds]);
  const visible = (c: TroubleCard) => (!topic || c.topic === topic) && (!fault || matchesFault(c, fault)) && matchesQuery(c, tokens);
  const shownSymptoms = symptoms.filter(visible);
  const shownWelds = welds.filter(visible);
  const topics = TOPIC_ORDER.filter((t) => all.some((c) => c.topic === t));
  const filtered = Boolean(q || topic || fault);

  const chip = (on: boolean) =>
    cn("rounded-full border px-3 py-1 text-[12.5px] transition-colors", on ? "border-teal-400/60 bg-teal-500/15 text-teal-100" : "border-[var(--line-strong)] text-fog-300 hover:text-fog-100");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 p-4">
        {/* a div, not a label: a label may not contain a second labelable element (the clear button) */}
        <div className="flex h-10 min-w-0 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--line-strong)] bg-ink-850 px-3 focus-within:border-teal-400">
          <Search aria-hidden className="size-4 shrink-0 text-fog-500" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filter, e.g. focus, porosity, scanner"
            className="w-full min-w-0 bg-transparent text-[13.5px] text-fog-100 outline-none placeholder:text-fog-500 [&::-webkit-search-cancel-button]:hidden"
            aria-label="Filter troubleshooting cards by symptom, cause, check or action"
          />
          {q ? (
            <button type="button" onClick={() => setQ("")} aria-label="Clear filter" className="shrink-0 text-fog-500 hover:text-fog-200">
              <X aria-hidden className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">
            Topic <ClassTag kind="derived" short />
          </div>
          <div role="group" aria-label="Topic (derived from the symptom text)" className="flex flex-wrap gap-1.5">
            <button type="button" aria-pressed={topic === null} onClick={() => setTopic(null)} className={chip(topic === null)}>
              All <span className="text-fog-500">{all.length}</span>
            </button>
            {topics.map((t) => (
              <button key={t} type="button" aria-pressed={topic === t} onClick={() => setTopic(topic === t ? null : t)} className={chip(topic === t)}>
                {TOPIC_LABEL[t]} <span className="text-fog-500">{all.filter((c) => c.topic === t).length}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">
            Most common faults named in §27.2 <ClassTag kind="derived" short />
          </div>
          <div role="group" aria-label="Common fault families (keyword filter)" className="flex flex-wrap gap-1.5">
            {faults.map((f) => (
              <button key={f} type="button" aria-pressed={fault === f} onClick={() => setFault(fault === f ? null : f)} className={chip(fault === f)}>
                {f} <span className="text-fog-500">{all.filter((c) => matchesFault(c, f)).length}</span>
              </button>
            ))}
          </div>
          <p className="text-[11.5px] leading-snug text-fog-500">
            Topics come from keywords in the symptom or defect name (every §10.4 defect is filed under welding); fault families match their words anywhere in
            the row’s handbook text. Both are a LASERVERSE navigation aid, not a handbook classification.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--line)] pt-3">
          <p className="text-[12.5px] text-fog-400" aria-live="polite">
            Showing {shownSymptoms.length + shownWelds.length} of {all.length} cards
          </p>
          {filtered ? (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setTopic(null);
                setFault(null);
              }}
              className="text-[12.5px] text-fog-400 underline decoration-fog-500/40 underline-offset-[3px] hover:text-fog-100"
            >
              Clear all filters
            </button>
          ) : null}
        </div>
        {shownSymptoms.length + shownWelds.length ? (
          <nav aria-label="Jump to a card">
            <ul className="flex flex-wrap gap-1">
              {[...shownSymptoms, ...shownWelds].map((c) => (
                <li key={c.id}>
                  <a href={`#${c.id}`} className="inline-flex rounded-[var(--radius-sm)] px-2 py-0.5 text-[12px] text-fog-400 hover:bg-white/[0.05] hover:text-teal-100">
                    {c.kind === "weld-defect" ? <span className="mr-1 text-fog-500">Weld ·</span> : null}
                    {c.problem}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>

      <section aria-labelledby="symptoms" className="mt-8">
        <SectionTitle id="symptoms" sub={<>One card per symptom in the handbook’s troubleshooting table. <SourceRef section="27.2" /></>}>
          Symptoms
        </SectionTitle>
        <CardList cards={shownSymptoms} recipe={recipe} empty="No symptom in §27.2 matches these filters." />
      </section>

      <section aria-labelledby="weld-defects" className="mt-8">
        <SectionTitle
          id="weld-defects"
          sub={
            <>
              Weld defects with their main causes and countermeasures. The handbook gives no diagnostic column for these, so the checks step is omitted rather than
              invented. <SourceRef section="10.4" />
            </>
          }
        >
          Weld defects
        </SectionTitle>
        <CardList cards={shownWelds} recipe={recipe} empty="No weld defect in §10.4 matches these filters." />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ cards */
function CardList({ cards, recipe, empty }: { cards: TroubleCard[]; recipe: RecipePractice; empty: string }) {
  if (!cards.length) return <p className="rounded-[var(--radius-lg)] border border-dashed border-[var(--line-strong)] px-4 py-6 text-[13px] text-fog-400">{empty}</p>;
  return (
    <ul className="flex flex-col gap-4">
      {cards.map((c) => (
        <li key={c.id}>
          <TroubleCardView card={c} recipe={recipe} />
        </li>
      ))}
    </ul>
  );
}

interface Step {
  label: string;
  items: string[] | null;
  handbook: boolean;
  body?: ReactNode;
}

function TroubleCardView({ card, recipe }: { card: TroubleCard; recipe: RecipePractice }) {
  const steps: Step[] = [
    { label: "Causes", items: card.causes, handbook: true },
    ...(card.checks ? [{ label: "Checks", items: card.checks, handbook: true }] : []),
    { label: "Actions", items: card.actions, handbook: true },
    {
      label: "Verification",
      items: null,
      handbook: false,
      body: <Verification kind={card.kind} recipe={recipe} />,
    },
  ];
  return (
    <article
      id={card.id}
      aria-labelledby={`${card.id}-title`}
      className="scroll-mt-24 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/70 transition-colors target:border-teal-400/70 target:shadow-[0_0_0_1px_rgb(25_178_171/0.35)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)] px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-danger/90">{card.kind === "weld-defect" ? "Problem · weld defect" : "Problem"}</div>
          <h3 id={`${card.id}-title`} className="mt-0.5 text-[16.5px] font-semibold leading-snug text-paper">
            {card.problem}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="fog" title="Topic derived from keywords in the symptom text">
            {TOPIC_LABEL[card.topic]}
          </Badge>
          <SourceRef section={card.section} />
          <a href={`#${card.id}`} aria-label={`Link to ${card.problem}`} className="inline-flex size-7 items-center justify-center rounded-[var(--radius-sm)] text-fog-500 hover:bg-white/[0.05] hover:text-fog-100">
            <Link2 aria-hidden className="size-3.5" />
          </a>
        </div>
      </header>
      <ol className={cn("grid gap-px bg-[var(--line)] md:grid-cols-2", steps.length === 4 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        {steps.map((s, i) => (
          <li
            key={s.label}
            className={cn(
              "flex min-w-0 flex-col gap-2 px-4 py-3.5 sm:px-5",
              i === steps.length - 1 ? "bg-ink-850" : "bg-ink-800",
              // three steps (no checks column) in a two-column grid: let the last one span so no empty cell shows the grid background
              steps.length % 2 === 1 && i === steps.length - 1 ? "md:col-span-2 xl:col-span-1" : "",
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <span aria-hidden className={cn("grid size-6 place-items-center rounded-full border font-mono text-[10.5px]", s.handbook ? "border-teal-500/40 text-teal-200" : "border-white/20 text-fog-300")}>
                  {i + 1}
                </span>
                <span className="text-[11.5px] font-semibold uppercase tracking-[0.14em] text-fog-300">{s.label}</span>
              </span>
              {s.handbook ? <ClassTag kind="handbook" short /> : <ClassTag kind="additional" short />}
            </div>
            {s.items ? (
              <ul className="flex flex-col gap-1.5 pl-4 text-[13.5px] leading-snug text-fog-200 list-disc marker:text-fog-500">
                {s.items.map((it, k) => (
                  <li key={k}>{it}</li>
                ))}
              </ul>
            ) : (
              s.body
            )}
          </li>
        ))}
      </ol>
      {card.links.length ? (
        <footer className="flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] px-4 py-2.5 sm:px-5">
          <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-fog-500">Related</span>
          {card.links.map((l) => {
            const Icon = l.kind === "calculator" ? Calculator : l.kind === "process" ? FlaskConical : Wrench;
            return (
              <Link
                key={l.href}
                href={l.href}
                className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-2.5 py-0.5 text-[12px] text-fog-200 hover:border-teal-400/60 hover:text-teal-100"
              >
                <Icon aria-hidden className="size-3 opacity-70" />
                {l.label}
                <ArrowUpRight aria-hidden className="size-3 opacity-60" />
              </Link>
            );
          })}
        </footer>
      ) : null}
    </article>
  );
}

/** Platform guidance: generic and non-numeric. The handbook table has no verification column. */
function Verification({ kind, recipe }: { kind: TroubleCard["kind"]; recipe: RecipePractice }) {
  return (
    <div className="flex flex-col gap-2 text-[13px] leading-snug text-fog-300">
      <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-fog-500">Platform guidance (not from the handbook)</p>
      {kind === "symptom" ? (
        <p>Repeat this card’s checks after the change, under the same conditions, and confirm the symptom is gone. Then confirm on representative parts against the acceptance criteria before the recipe is released.</p>
      ) : (
        <p>Inspect welds made after the change with the method your quality plan specifies and confirm the defect is gone on representative parts before the recipe is released.</p>
      )}
      <p className="text-[12px] text-fog-400">
        Release changes as a new recipe version. Handbook good practice for {recipe.topic.toLowerCase()}: “{recipe.practice}” <SourceRef section="12.5" />
      </p>
    </div>
  );
}
