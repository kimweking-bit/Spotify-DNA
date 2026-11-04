import Link from "next/link";

const trustPoints = [
  {
    number: "01",
    title: "Your files stay here",
    description:
      "The selected JSON files are read in your browser and analyzed in a Web Worker. Raw file contents are not uploaded or persisted.",
  },
  {
    number: "02",
    title: "No Spotify connection",
    description:
      "Bring your own downloaded export. Spotify DNA does not ask you to sign in or connect a Spotify account.",
  },
  {
    number: "03",
    title: "You stay in control",
    description:
      "A compact analysis summary is kept only in this tab’s session storage. Clear it from your report or close the tab.",
  },
] as const;

export function TrustSection() {
  return (
    <section
      aria-labelledby="trust-heading"
      className="border-t border-[var(--color-border)] py-12 sm:py-16"
    >
      <div className="page-shell">
        <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="eyebrow">Privacy by design</p>
            <h2
              id="trust-heading"
              className="mt-3 max-w-sm text-2xl font-semibold leading-tight tracking-[-0.04em] sm:text-3xl"
            >
              Your listening is personal. It stays that way.
            </h2>
            <Link
              href="/privacy"
              className="mt-5 inline-flex items-center gap-2 text-sm font-medium underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-accent)] hover:decoration-[var(--color-accent)]"
            >
              Read the privacy details <span aria-hidden="true">↗</span>
            </Link>
          </div>
          <ol className="grid list-none gap-5 p-0 sm:grid-cols-3">
            {trustPoints.map((point) => (
              <li
                key={point.number}
                className="border-t border-[var(--color-border-strong)] pt-4"
              >
                <p className="font-mono text-xs text-[var(--color-accent)]">
                  {point.number}
                </p>
                <h3 className="mt-3 text-sm font-semibold">{point.title}</h3>
                <p className="muted mt-2 text-sm leading-relaxed">
                  {point.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
