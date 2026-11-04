import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BrandName } from "@/components/brand-name";
import { CreatorCredit } from "@/components/creator-credit";
import { CurrentYear } from "@/components/current-year";

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--color-border)] py-10 sm:py-14">
      <div className="page-shell">
        <div className="grid gap-8 border-b border-[var(--color-border)] pb-8 sm:grid-cols-[1fr_auto] sm:items-start">
          <div className="max-w-md">
            <Link href="/" className="inline-flex items-center gap-2.5">
              <BrandMark />
              <BrandName />
            </Link>
            <p className="subtle mt-3 text-sm leading-relaxed">
              A listening-history field guide, made for your data and your
              curiosity. An independent project, not affiliated with Spotify AB.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-3 text-sm">
            <a href="#import" className="muted hover:text-[var(--color-fg)]">
              Import
            </a>
            <a href="#insights" className="muted hover:text-[var(--color-fg)]">
              Insights
            </a>
            <Link href="/privacy" className="muted hover:text-[var(--color-fg)]">
              Privacy
            </Link>
          </nav>
        </div>

        <div className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <CreatorCredit />
          <div className="sm:text-right">
            <p className="subtle text-xs">
              Files are analyzed on your device and are not uploaded.
            </p>
            <p className="subtle mt-2 text-xs">
              © <CurrentYear /> Spotify DNA
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
