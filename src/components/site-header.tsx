import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BrandName } from "@/components/brand-name";

const navLinks = [
  { href: "#import", label: "Import" },
  { href: "#insights", label: "Insights" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-md">
      <div className="page-shell flex h-[4.25rem] items-center justify-between gap-4">
        <a
          href="#top"
          className="group inline-flex items-center gap-2.5 rounded-[var(--radius-sm)]"
          aria-label="Spotify DNA home"
        >
          <BrandMark className="h-9 w-9 transition-transform duration-[var(--duration-base)] group-hover:scale-105" />
          <BrandName className="header-brand-name" />
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="btn btn-ghost">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/privacy"
            className="btn btn-ghost hidden sm:inline-flex"
          >
            Privacy
          </Link>
          <a href="#import" className="btn btn-primary">
            Get started
          </a>
        </div>
      </div>

      {/* Compact section links for small screens — real in-page targets only */}
      <nav
        aria-label="Sections"
        className="page-shell flex gap-1 overflow-x-auto pb-3 md:hidden [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {navLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="btn btn-ghost shrink-0 text-xs"
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
