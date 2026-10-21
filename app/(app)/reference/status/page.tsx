import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CircleCheck, CircleSlash } from "lucide-react";
import { Breadcrumbs, TrackVisit, BookmarkButton } from "@/components/shell/Chrome";
import { PageHeader, ClassTag, SectionTitle, Badge, StatusPill, Callout } from "@/components/ui/primitives";
import { SourceRef } from "@/components/ui/SourceRef";
import { ReferenceNav } from "@/features/reference/ReferenceNav";
import { statusData, implementedAreas, NOT_IMPLEMENTED } from "@/lib/content/reference";
import { CLASSIFICATION, STATUS_LABEL, type Classification, type ContentStatus } from "@/lib/content/classification";
import { outlineSection } from "@/lib/content/outline";

export const metadata: Metadata = { title: "Content & Validation Status" };
const ITEM = { id: "reference:status", kind: "reference" as const, title: "Content & Validation Status", href: "/reference/status" };

const SEVERITY_TONE = { error: "danger", warning: "warn", info: "info" } as const;

/** What each content status means on this platform (platform text, not handbook content). */
const STATUS_MEANING: Record<ContentStatus, string> = {
  extracted: "Taken from the handbook by the ingestion script with its wording and structure unchanged, and checked for structure at build time.",
  "review-required": "Hand-transcribed or reconstructed content (equation LaTeX, figure descriptions) or a noted inconsistency that a technical reviewer still has to sign off.",
  validated: "Confirmed against defined experimental evidence. No content in this release carries this status.",
  "not-yet-implemented": "A capability that is planned or interface-only and is not part of this build.",
};

const METHOD_LABEL: Record<string, string> = { "manual-from-image": "Manual transcription from the image", none: "No transcription" };

function Location({ loc }: { loc: string }) {
  return outlineSection(loc) ? <SourceRef section={loc} /> : <code className="font-mono text-[12px] text-fog-400">{loc}</code>;
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="min-w-0 rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/60 px-3 py-2.5">
      <div className="text-[11.5px] leading-snug text-fog-500">{label}</div>
      <div className="tabular mt-0.5 font-mono text-[18px] text-paper">{value}</div>
    </div>
  );
}

export default function StatusPage() {
  const s = statusData();
  const byCode = new Map<string, typeof s.flags>();
  for (const f of s.flags) byCode.set(f.code, [...(byCode.get(f.code) ?? []), f]);
  return (
    <div>
      <TrackVisit item={ITEM} />
      <Breadcrumbs items={[{ label: "Reference Library", href: "/reference" }, { label: "Content & Validation Status" }]} />
      <PageHeader
        eyebrow="Reference Library"
        title="Content & Validation Status"
        description="What LASERVERSE extracted from the handbook, what is flagged for technical review, and what the platform does not implement. The counts and flags on this page are read from the ingestion report and the review-flag list; the short explanations and the platform status list are platform text."
      >
        <ClassTag kind="handbook" />
        <ClassTag kind="unverified" />
        <BookmarkButton item={ITEM} />
      </PageHeader>
      <ReferenceNav current="status" />

      <SectionTitle id="source" sub="The exact file this build was ingested from; the SHA-256 identifies it unambiguously.">
        Source document
      </SectionTitle>
      <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 sm:p-5">
        <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[13.5px] sm:grid-cols-[minmax(9rem,auto)_minmax(0,1fr)] sm:gap-y-2">
          {(
            [
              ["Title", s.meta.title ?? "—"],
              ["Subtitle", s.meta.subtitle ?? "—"],
              ["Author", s.meta.author ?? "—"],
              ["Dated", s.meta.date ?? "—"],
              ["File", <code className="font-mono text-[12.5px]">{s.source.file}</code>],
              ["Size", `${s.source.bytes.toLocaleString("en-US")} bytes`],
              ["SHA-256", <code className="break-all font-mono text-[12px] text-teal-100">{s.source.sha256}</code>],
              ["Ingested by", <code className="font-mono text-[12.5px]">{s.generator}</code>],
              ["Ingested at", <time dateTime={s.generatedAt}>{s.generatedAt}</time>],
              ["Report generated", <time dateTime={s.reportGeneratedAt}>{s.reportGeneratedAt}</time>],
            ] as Array<[string, ReactNode]>
          ).map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="pt-1 text-fog-500 sm:pt-0">{k}</dt>
              <dd className="min-w-0 break-words text-fog-200">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      <SectionTitle id="counts" sub="Counts from the extraction report.">
        What was extracted
      </SectionTitle>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
        {s.counts.map(([k, v]) => (
          <Stat key={k} label={k} value={v} />
        ))}
      </div>

      <SectionTitle id="equations" sub="Every equation in the handbook is an image; none could be extracted as text.">
        Equation transcription
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="grid grid-cols-2 gap-2.5">
          <Stat label="Equation images" value={s.equations.total} />
          <Stat label="With transcribed LaTeX" value={s.equations.withLatex} />
          {s.equations.byStatus.map(([status, n]) => (
            <div key={status} className="col-span-2 flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--line)] bg-ink-800/60 px-3 py-2.5 text-[13px]">
              <StatusPill status={status} />
              <span className="tabular font-mono text-fog-200">{n}</span>
            </div>
          ))}
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 text-[13.5px] leading-relaxed text-fog-300">
          <ul className="flex flex-col gap-1.5">
            {s.equations.byMethod.map(([m, n]) => (
              <li key={m} className="flex items-center justify-between gap-3">
                <span>{METHOD_LABEL[m] ?? m}</span>
                <span className="tabular font-mono text-fog-200">{n}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12.5px] text-fog-400">
            Each transcription is displayed with the original image for comparison and a “Transcribed equation · review” badge. Where the handbook gives a worked
            example, the formula is checked numerically by the unit tests; the transcriptions still need a reviewer&rsquo;s sign-off.{" "}
            <Link href="/reference/formulas" className="text-teal-300 underline underline-offset-2">
              Formula Library
            </Link>
          </p>
          <p className="mt-2 text-[12.5px] text-fog-400">
            Figures by status:{" "}
            {s.figuresByStatus.map(([st, n], i) => (
              <span key={st}>
                {i ? " · " : ""}
                {STATUS_LABEL[st]} {n}
              </span>
            ))}
          </p>
        </div>
      </div>

      <SectionTitle id="extraction-flags" sub="Every flag raised by the ingestion script, grouped by code.">
        Extraction flags
      </SectionTitle>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {s.flagSeverities.map(([sev, n]) => (
          <Badge key={sev} tone={SEVERITY_TONE[sev]}>
            {sev} · {n}
          </Badge>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {[...byCode.entries()].map(([code, flags]) => {
          const list = (
            <ul className="divide-y divide-[var(--line)] border-t border-[var(--line)]">
              {flags.map((f, i) => (
                <li key={`${f.location}-${i}`} className="flex flex-col gap-1 px-4 py-2.5 text-[13px] sm:flex-row sm:items-baseline sm:gap-4">
                  <span className="shrink-0 sm:w-40">
                    <Location loc={f.location} />
                  </span>
                  <span className="min-w-0 text-fog-300">{f.message}</span>
                </li>
              ))}
            </ul>
          );
          const head = (
            <span className="flex flex-wrap items-center gap-2">
              <Badge tone={SEVERITY_TONE[flags[0]!.severity]}>{flags[0]!.severity}</Badge>
              <code className="font-mono text-[12.5px] text-fog-100">{code}</code>
              <span className="text-[12px] text-fog-500">
                {flags.length} flag{flags.length === 1 ? "" : "s"}
              </span>
            </span>
          );
          return flags.length > 6 ? (
            <details key={code} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/50">
              <summary className="cursor-pointer select-none px-4 py-3">{head}</summary>
              {list}
            </details>
          ) : (
            <div key={code} className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/50">
              <div className="px-4 py-3">{head}</div>
              {list}
            </div>
          );
        })}
      </div>

      <SectionTitle
        id="review-flags"
        sub="Raised during technical review of the ingested content: charts missing from the supplied file, the equation transcriptions, cross-checks of the handbook's numbers against its own equations and tables, and standards editions not independently verified. The handbook text is never altered; these notes are shown next to the affected content."
      >
        Technical review flags
      </SectionTitle>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {s.reviewSeverities.map(([sev, n]) => (
          <Badge key={sev} tone={SEVERITY_TONE[sev]}>
            {sev} · {n}
          </Badge>
        ))}
      </div>
      <ul className="grid gap-3 lg:grid-cols-2">
        {s.reviewFlags.map((f) => (
          <li key={f.id} id={`flag-${f.id}`} className="min-w-0 scroll-mt-24 rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={SEVERITY_TONE[f.severity]}>{f.severity}</Badge>
              <Location loc={f.section} />
            </div>
            <h3 className="mt-2 text-[14.5px] font-semibold leading-snug text-fog-100">{f.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-fog-300">{f.detail}</p>
          </li>
        ))}
      </ul>

      <SectionTitle id="legend" sub="The labels used across LASERVERSE to keep handbook content, calculations, explanation and visualisation apart.">
        Status and classification legend
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-fog-500">Content status</h3>
          <dl className="flex flex-col gap-3">
            {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((k) => (
              <div key={k} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                <dt className="shrink-0 sm:w-40">
                  <StatusPill status={k} />
                </dt>
                <dd className="text-[13px] leading-snug text-fog-300">{STATUS_MEANING[k]}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
          <h3 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.14em] text-fog-500">Source classification</h3>
          <dl className="flex flex-col gap-3">
            {(Object.keys(CLASSIFICATION) as Classification[]).map((k) => (
              <div key={k} className="flex flex-col gap-1 sm:flex-row sm:items-start sm:gap-3">
                <dt className="shrink-0 sm:w-52">
                  <ClassTag kind={k} />
                </dt>
                <dd className="text-[13px] leading-snug text-fog-300">{CLASSIFICATION[k].description}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      <SectionTitle id="platform" sub="What this build contains and what it does not. No performance measurements or accessibility audit results are claimed.">
        Platform implementation status
      </SectionTitle>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-fog-100">
            <CircleCheck aria-hidden className="size-4 text-ok" /> Areas in this build
          </h3>
          <p className="mb-2 text-[12.5px] leading-snug text-fog-500">
            Each area below exists as a page in this build. Being listed here describes what is built; it is not a claim that the content has been technically
            reviewed or validated.
          </p>
          <ul className="flex flex-col divide-y divide-[var(--line)]">
            {implementedAreas().map((n) => (
              <li key={n.id} className="py-2">
                <Link href={n.href} className="group flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[13.5px] font-medium text-fog-100 group-hover:text-teal-100">{n.label}</span>
                    <span className="block text-[12px] leading-snug text-fog-500">{n.description}</span>
                  </span>
                  <ArrowUpRight aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fog-500 group-hover:text-teal-300" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-[14px] font-semibold text-fog-100">
              <CircleSlash aria-hidden className="size-4 text-fog-400" /> Not implemented
            </h3>
            <ul className="flex flex-col gap-3">
              {NOT_IMPLEMENTED.map((n) => (
                <li key={n.title} className="flex flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-fog-100">
                    {n.title} <StatusPill status="not-yet-implemented" />
                  </span>
                  <span className="text-[12.5px] leading-snug text-fog-400">{n.detail}</span>
                </li>
              ))}
            </ul>
          </div>
          <Callout kind="safety" title="Not a certification">
            LASERVERSE is a learning and engineering-reference platform. It does not certify machines, processes or people, and nothing on it demonstrates regulatory
            compliance. Checklists and assessments are practice aids.
          </Callout>
        </div>
      </div>
    </div>
  );
}
