import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BrandName } from "@/components/brand-name";
import { CreatorCredit } from "@/components/creator-credit";

export const metadata: Metadata = {
  title: "Privacy — Spotify DNA",
  description:
    "How Spotify DNA handles your listening export: local-first, no account required for analysis.",
};

export default function PrivacyPage() {
  return (
    <main className="page-shell py-[var(--section-y)]">
      <Link href="/" className="report-brand-link">
        <BrandMark className="h-9 w-9" />
        <BrandName />
      </Link>
      <p className="eyebrow mt-10">Trust</p>
      <h1 className="section-title mt-3 max-w-2xl">Privacy</h1>
      <p className="muted mt-4 max-w-2xl text-base sm:text-lg">
        Spotify DNA analyzes selected Spotify JSON export files in a browser
        Worker. The selected file contents are not uploaded to Spotify DNA, and
        no Spotify login is required.
      </p>

      <div className="mt-12 grid gap-10 max-w-2xl">
        <section aria-labelledby="privacy-local">
          <h2 id="privacy-local" className="text-lg font-semibold tracking-tight">
            Local processing
          </h2>
          <p className="muted mt-2 text-sm sm:text-base leading-relaxed">
            The app reads your selected files in your browser and parses them
            in a Web Worker. Raw file contents remain in browser memory and are
            not uploaded or persisted.             A compact derived summary (counts, top items, monthly listening
            totals, and time-of-day histograms) is saved in this tab’s
            session storage so the results page can display it. Close the tab
            or use “Clear this tab’s summary” to remove it.
          </p>
        </section>

        <section aria-labelledby="privacy-no-account">
          <h2
            id="privacy-no-account"
            className="text-lg font-semibold tracking-tight"
          >
            No account required (MVP)
          </h2>
          <p className="muted mt-2 text-sm sm:text-base leading-relaxed">
            Analysis currently runs without creating a Spotify DNA account or
            connecting to Spotify. The app does not send your selected files
            to a server.
          </p>
        </section>

        <section aria-labelledby="privacy-data">
          <h2 id="privacy-data" className="text-lg font-semibold tracking-tight">
            What we do not do
          </h2>
          <ul className="muted mt-2 list-disc space-y-2 pl-5 text-sm sm:text-base leading-relaxed">
            <li>We do not sell listening data.</li>
            <li>We do not build public profiles from your export by default.</li>
            <li>
              We do not claim genre labels because Spotify streaming-history
              exports do not include them.
            </li>
          </ul>
        </section>

        <section aria-labelledby="privacy-limits">
          <h2 id="privacy-limits" className="text-lg font-semibold tracking-tight">
            Supported files and limits
          </h2>
          <p className="muted mt-2 text-sm sm:text-base leading-relaxed">
            Select JSON files from Spotify’s StreamingHistory or endsong export.
            Unzip Spotify’s download first. Each file may be up to 50 MB; up to
            20 files and 100 MB total can be analyzed at once. Unsupported or
            malformed files are reported without saving a partial result.
            Unusable individual rows are skipped and counted in the summary.
          </p>
        </section>

        <section aria-labelledby="privacy-spotify">
          <h2
            id="privacy-spotify"
            className="text-lg font-semibold tracking-tight"
          >
            Spotify
          </h2>
          <p className="muted mt-2 text-sm sm:text-base leading-relaxed">
            Spotify DNA is an independent project. It is not affiliated with,
            endorsed by, or sponsored by Spotify AB. “Spotify” is a trademark of
            Spotify AB. Export files come from Spotify’s own data-download flow;
            review Spotify’s privacy policy for how they handle account data.
          </p>
        </section>

        <section aria-labelledby="privacy-timezone">
          <h2
            id="privacy-timezone"
            className="text-lg font-semibold tracking-tight"
          >
            Local-time calculations
          </h2>
          <p className="muted mt-2 text-sm sm:text-base leading-relaxed">
            The analysis uses your browser’s local time zone at the time of
            import to group plays by hour and weekday. No listening history or
            analysis telemetry is sent to our servers by this feature.
          </p>
        </section>
      </div>

      <p className="mt-14">
        <Link href="/" className="btn btn-secondary">
          Back to home
        </Link>
      </p>
      <div className="mt-12 border-t border-[var(--color-border)] pt-6">
        <CreatorCredit compact />
      </div>
    </main>
  );
}
