import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CALCULATORS, getCalculator } from "@/features/calculators/definitions";
import { CalculatorWorkbench } from "@/features/calculators/CalculatorWorkbench";
import { Breadcrumbs } from "@/components/shell/Chrome";

export function generateStaticParams() {
  return CALCULATORS.map((c) => ({ id: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const c = getCalculator(id);
  return { title: c ? c.title : "Calculator", description: c?.summary };
}

export default async function CalculatorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = getCalculator(id);
  if (!c) notFound();
  return (
    <div>
      <Breadcrumbs items={[{ label: "Engineering Calculators", href: "/calculators" }, { label: c.title }]} />
      <CalculatorWorkbench id={c.id} />
    </div>
  );
}
