import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { TrackVisit } from "@/components/shell/Chrome";
import { PageHeader } from "@/components/ui/primitives";
import { BookmarksList, ContinueCard, DataControls, ProgressOverview, QuizSummary, RecentList, type LevelSummary } from "@/features/home/HomeDashboard";
import { getLevels } from "@/lib/content/curriculum";
import { allSections, getPartByNumber, sectionHref } from "@/lib/content/handbook";
import { NAV } from "@/lib/nav";

export const metadata: Metadata = { title: "Home" };

const START_POINTS = [
  { title: "New to lasers", body: "Light, photons and energy levels from first principles.", href: "/learn/part-1" },
  { title: "Choosing a laser", body: "Wavelength, pulse regime and source family for a material.", href: "/reference/decision-tree" },
  { title: "Engineering a machine", body: "Open, explode and trace a Class 1 marking workstation.", href: "/machine" },
  { title: "Sizing a process", body: "Spot size, fluence, overlap, cycle time and cost per part.", href: "/calculators" },
];

export default function HomePage() {
  const levels: LevelSummary[] = getLevels().map((l) => ({
    id: l.id,
    name: l.name,
    lessons: l.parts.flatMap((n) => getPartByNumber(n)?.sections.map((s) => ({ id: s.id, href: sectionHref(s.id) })) ?? []),
  }));
  const totalLessons = allSections().filter((s) => /^\d/.test(s.id)).length;
  const tools = NAV.flatMap((g) => g.items).filter((i) => i.id !== "home");
  return (
    <div>
      <TrackVisit item={{ id: "page:home", kind: "page", title: "Home", href: "/home" }} />
      <PageHeader
        eyebrow="Your laboratory"
        title="Photon to product, at your pace"
        description="Continue a lesson, reopen a tool, or jump straight into any lab. Everything here is built from The Complete Laser Handbook and labels what is handbook content, what is calculated and what is a conceptual visualization."
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ProgressOverview levels={levels} totalLessons={totalLessons} />
        <div className="flex flex-col gap-5">
          <ContinueCard />
          <QuizSummary />
        </div>
      </div>

      <h2 className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-fog-500">Start from a question</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {START_POINTS.map((p) => (
          <li key={p.href}>
            <Link href={p.href} className="group flex h-full flex-col rounded-[var(--radius-lg)] border border-[var(--line)] bg-ink-800/60 p-4 hover:border-teal-500/40">
              <span className="flex items-center justify-between text-[14.5px] font-semibold text-fog-100">
                {p.title} <ArrowUpRight aria-hidden className="size-4 text-fog-500 group-hover:text-teal-300" />
              </span>
              <span className="mt-1 text-[13px] leading-snug text-fog-400">{p.body}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        <BookmarksList />
        <RecentList />
      </div>

      <h2 className="mb-3 mt-10 text-[11px] font-semibold uppercase tracking-[0.2em] text-fog-500">All areas</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {tools.map((t) => {
          const Icon = t.icon;
          return (
            <li key={t.id}>
              <Link href={t.href} className="flex items-center gap-2.5 rounded-[var(--radius-md)] border border-[var(--line)] px-3 py-2.5 text-[13.5px] text-fog-200 hover:border-teal-500/40 hover:text-paper">
                <Icon aria-hidden className="size-4 text-teal-300" />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-10">
        <DataControls />
      </div>
    </div>
  );
}
