import Link from "next/link";
import { TealLogo, Wordmark, TEAL_NAME } from "@/components/brand/Brand";

export function Footer({ wide = false }: { wide?: boolean }) {
  return (
    <footer className="mt-24 border-t border-[var(--line)]">
      <div className={`mx-auto flex flex-col gap-10 px-5 py-12 md:px-8 ${wide ? "max-w-7xl" : "max-w-6xl"}`}>
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="flex flex-col gap-4">
            <Wordmark />
            <p className="max-w-md text-[13px] leading-relaxed text-fog-400">
              LASERVERSE — Interactive Laser Technology &amp; Engineering. A laser knowledge platform by {TEAL_NAME}, built on{" "}
              <em>The Complete Laser Handbook</em>.
            </p>
          </div>
          <TealLogo height={30} />
        </div>
        <div className="grid gap-6 text-[12.5px] text-fog-500 md:grid-cols-3">
          <p className="leading-relaxed">
            Educational and engineering-reference content. Calculators implement documented equations with stated assumptions;
            conceptual visualizations are not predictive simulations. Supplier figures must be confirmed against current datasheets.
          </p>
          <p className="leading-relaxed">
            Nothing on this site certifies a machine or demonstrates regulatory compliance. Never bypass or defeat laser safety
            interlocks; service work on open Class 4 systems follows documented procedures under a laser safety officer.
          </p>
          <ul className="flex flex-col gap-1.5 md:items-end">
            <li>
              <Link className="hover:text-fog-200" href="/reference/status">
                Content &amp; validation status
              </Link>
            </li>
            <li>
              <Link className="hover:text-fog-200" href="/reference/sources">
                Handbook sources
              </Link>
            </li>
            <li>
              <Link className="hover:text-fog-200" href="/reference">
                Reference library
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
