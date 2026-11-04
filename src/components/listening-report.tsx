"use client";

import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { BrandName } from "@/components/brand-name";
import { CreatorCredit } from "@/components/creator-credit";
import { useState, useSyncExternalStore } from "react";
import {
  ANALYSIS_STORAGE_KEY,
  LEGACY_ANALYSIS_STORAGE_KEY,
  PREVIOUS_ANALYSIS_STORAGE_KEY,
  type AnalysisResult,
  type ListeningPeriod,
  type MonthlyListening,
  type RankedItem,
} from "@/lib/analysis-types";
import {
  ArtistLandscape,
  formatAverageDuration,
  formatCount,
  formatDuration,
  formatPercent,
  type HourSelection,
  type PeriodSelection,
  ListeningRhythm,
  ListeningTimeline,
  TrackExplorer,
} from "@/components/identity-visualizations";

type DashboardState =
  | { status: "loading" }
  | { status: "ready"; result: AnalysisResult }
  | { status: "missing" }
  | { status: "error"; message: string };

const STORAGE_READ_ERROR = "\u0000storage-error";
const STORAGE_LOADING = "\u0000storage-loading";
const ANALYSIS_CHANGE_EVENT = "spotify-dna:analysis-change";
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function IdentityDashboard() {
  const stored = useSyncExternalStore(
    subscribeToAnalysis,
    readStoredAnalysis,
    () => STORAGE_LOADING,
  );
  const state = getDashboardState(stored);
  const [clearError, setClearError] = useState("");
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodSelection | null>(null);
  const [selectedTime, setSelectedTime] = useState<HourSelection | null>(null);

  function clearAnalysis() {
    try {
      sessionStorage.removeItem(ANALYSIS_STORAGE_KEY);
      sessionStorage.removeItem(PREVIOUS_ANALYSIS_STORAGE_KEY);
      sessionStorage.removeItem(LEGACY_ANALYSIS_STORAGE_KEY);
      setClearError("");
      window.dispatchEvent(new Event(ANALYSIS_CHANGE_EVENT));
    } catch {
      setClearError(
        "Could not clear the saved summary from this tab. Clear this site’s session storage in your browser settings.",
      );
    }
  }

  if (state.status === "loading") {
    return (
      <main className="page-shell py-[var(--section-y)]" aria-live="polite">
        <p className="muted">Loading your private summary…</p>
      </main>
    );
  }

  if (state.status === "missing" || state.status === "error") {
    return (
      <main className="page-shell py-[var(--section-y)]">
        <p className="eyebrow">Your listening identity</p>
        <h1 className="section-title mt-3">No analysis to show</h1>
        <p
          className="muted mt-4 max-w-xl"
          role={state.status === "error" ? "alert" : undefined}
        >
          {clearError ||
            (state.status === "error"
              ? state.message
              : "This tab does not have a saved analysis. Import your Spotify history to create one.")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/#import" className="btn btn-primary">
            Import history
          </Link>
          <button type="button" className="btn btn-ghost" onClick={clearAnalysis}>
            Clear any saved summaries
          </button>
          <Link href="/privacy" className="btn btn-secondary">
            Privacy details
          </Link>
        </div>
      </main>
    );
  }

  const { result } = state;
  const { stats } = result;
  const calendarDays = calendarDaysInRange(
    stats.spanStartMs,
    stats.spanEndMs,
    result.timeZone,
  );
  const averageDailyMs = stats.totalMsPlayed / calendarDays;
  const totalRows = stats.totalRows ?? stats.totalPlays + stats.skippedRows;
  const usablePercent = totalRows ? (stats.totalPlays / totalRows) * 100 : 0;
  const artists = result.allArtists ?? result.topArtists;
  const tracks = result.trackIdentities ?? result.topTracks;
  const monthly = fillMonths(result);
  const peakMonth = monthly.reduce<MonthlyListening | null>(
    (peak, month) => (!peak || month.plays > peak.plays ? month : peak),
    null,
  );
  const averageMonthly =
    monthly.length > 0
      ? monthly.reduce((sum, month) => sum + month.plays, 0) / monthly.length
      : 0;
  const peakHour = result.playsByHour.reduce(
    (peak, count, hour) =>
      count > result.playsByHour[peak] ? hour : peak,
    0,
  );
  const peakWeekday = result.playsByWeekday.reduce(
    (peak, count, day) =>
      count > result.playsByWeekday[peak] ? day : peak,
    0,
  );
  const topFiveShare = stats.totalPlays
    ? (artists.slice(0, 5).reduce((sum, artist) => sum + artist.plays, 0) /
        stats.totalPlays) *
      100
    : 0;
  const firstArtist = artists[0];
  const secondArtist = artists[1];
  const replayLeader = [...tracks].sort(
    (a, b) => b.plays - a.plays || b.msPlayed - a.msPlayed,
  )[0];
  const timeRankedTracks = [...tracks].sort(
    (a, b) => b.msPlayed - a.msPlayed || b.plays - a.plays,
  );
  const timeLeader = timeRankedTracks[0];
  const replayLeaderTimeRank = replayLeader
    ? timeRankedTracks.findIndex(
        (track) => trackIdentity(track) === trackIdentity(replayLeader),
      ) + 1
    : 0;
  const firstArtistShare = firstArtist
    ? (firstArtist.plays / stats.totalPlays) * 100
    : 0;
  const artistLead = firstArtist && secondArtist
    ? firstArtist.plays - secondArtist.plays
    : null;
  const peakMonthDifference =
    peakMonth && averageMonthly > 0
      ? ((peakMonth.plays - averageMonthly) / averageMonthly) * 100
      : 0;
  const validityMessage =
    totalRows > 0
      ? `${formatPercent(usablePercent)} of imported rows were usable; ${formatCount(stats.skippedRows)} were skipped.`
      : "No imported row count was retained in this saved summary.";
  const selectedPeriodValues = selectedPeriod
    ? selectedPeriod.aggregation === "month"
      ? monthly.find((item) => item.month === selectedPeriod.period)
      : selectedPeriod.aggregation === "day"
        ? result.dailyListening?.find((item) => item.period === selectedPeriod.period)
        : result.weeklyListening?.find((item) => item.period === selectedPeriod.period)
    : undefined;
  const periodLeadingArtist = selectedPeriodValues?.leadingArtist;
  const activeFilters = Number(!!selectedArtist) + Number(!!selectedPeriod) + Number(!!selectedTime);
  const selectedHourPlays = selectedTime?.weekday === null || selectedTime?.weekday === undefined
    ? result.playsByHour[selectedTime?.hour ?? 0]
    : result.playsByWeekdayHour?.[selectedTime.weekday]?.[selectedTime.hour];

  return (
    <main className="page-shell report-shell py-7 sm:py-10">
      <section className="report-hero" aria-label="Listening report overview">
        <header className="report-cover">
          <div>
            <Link href="/" className="report-brand-link">
              <BrandMark className="h-9 w-9" />
              <BrandName />
            </Link>
            <p className="report-kicker mt-5">Your listening field notes</p>
            <h1 className="report-heading mt-3">
              A history of
              <br />
              <span>what moved you.</span>
            </h1>
            <p className="muted mt-4 max-w-xl">
              {formatCount(stats.totalPlays)} valid recorded play entries across{" "}
              {result.sourceFileCount} {result.sourceFileCount === 1 ? "file" : "files"}.
              This report describes the export you imported—not a complete lifetime history.
            </p>
          </div>
          <div className="report-actions">
            <Link href="/#import" className="btn btn-secondary">
              Analyze another export
            </Link>
            <button type="button" className="btn btn-ghost" onClick={clearAnalysis}>
              Clear this tab’s summary
            </button>
          </div>
        </header>
        <div className="report-hero-content">
          {clearError && (
            <p className="report-clear-error" role="alert">
              {clearError}
            </p>
          )}
          <section aria-label="Listening overview" className="report-overview">
            <div className="report-total-time">
              <p className="eyebrow">Recorded listening time</p>
              <p className="report-total-value">{formatDuration(stats.totalMsPlayed)}</p>
              <p className="muted mt-2 text-sm">
                {formatDate(stats.spanStartMs, result.timeZone)} —{" "}
                {formatDate(stats.spanEndMs, result.timeZone)}
              </p>
              <p className="subtle mt-1 text-xs">
                Across {calendarDays.toLocaleString()} calendar days in {result.timeZone}
              </p>
            </div>
            <div className="report-supporting-metrics">
              <Metric label="Valid recorded plays" value={formatCount(stats.totalPlays)} />
              <Metric label="Unique artists" value={formatCount(stats.uniqueArtists)} />
              <Metric label="Track identities" value={formatCount(stats.uniqueTracks)} />
              <Metric
                label="Average per calendar day"
                value={`${formatAverageDuration(averageDailyMs)}/day`}
                detail="Includes all dates between the first and last imported entry."
              />
              <Metric label="Imported files" value={formatCount(result.sourceFileCount)} />
              <Metric label="Usable rows" value={formatPercent(usablePercent)} detail={validityMessage} />
            </div>
          </section>
          {result.version < 3 && (
            <div className="report-notice mt-4" role="status">
              This saved summary uses an earlier format. Existing rankings and
              listening totals remain available; re-import your files to unlock
              full artist exploration, exact track identities, and the detailed
              daily/weekly/weekday-hour views.
            </div>
          )}
        </div>
        <nav className="report-nav" aria-label="Report sections">
          <a href="#evolution">Evolution</a>
          <a href="#artists">Artists</a>
          <a href="#rhythm">Listening rhythm</a>
          <a href="#tracks">Tracks</a>
          <a href="#discoveries">Discoveries</a>
          <a href="#methodology">Methodology</a>
        </nav>
      </section>
      {activeFilters > 0 && (
        <div className="report-active-filters" role="status" aria-label="Active dashboard filters">
          <p className="muted">Active selections</p>
          {selectedArtist && (
            <FilterChip label={`Artist · ${selectedArtist}`} onRemove={() => setSelectedArtist(null)} />
          )}
          {selectedPeriod && (
            <FilterChip
              label={`${selectedPeriod.aggregation} · ${formatPeriodSelection(selectedPeriod, result.timeZone)}`}
              onRemove={() => setSelectedPeriod(null)}
            />
          )}
          {selectedTime && (
            <FilterChip
              label={
                selectedTime.weekday === null
                  ? `Hour · ${hourLabel(selectedTime.hour)}:00`
                  : `${WEEKDAYS[selectedTime.weekday]} · ${hourLabel(selectedTime.hour)}:00`
              }
              onRemove={() => setSelectedTime(null)}
            />
          )}
          <button
            type="button"
            className="filter-reset"
            onClick={() => {
              setSelectedArtist(null);
              setSelectedPeriod(null);
              setSelectedTime(null);
            }}
          >
            Reset all selections
          </button>
        </div>
      )}
      {selectedPeriod && selectedPeriodValues && (
        <aside className="selection-insight" aria-live="polite">
          <div>
            <p className="eyebrow">Selected period insight</p>
            <h2 className="mt-1 text-xl font-semibold">
              {formatPeriodSelection(selectedPeriod, result.timeZone)}
            </h2>
          </div>
          <Metric label="Recorded plays" value={formatCount(selectedPeriodValues.plays)} />
          <Metric label="Listening time" value={formatDuration(selectedPeriodValues.msPlayed)} />
          {periodLeadingArtist && (
            <button
              type="button"
              className="selection-leading-artist"
              onClick={() => {
                setSelectedArtist(periodLeadingArtist.name);
                document.getElementById("artists")?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <span className="subtle text-xs uppercase tracking-wide">Leading artist in this period</span>
              <strong>{periodLeadingArtist.name}</strong>
              <span className="muted text-xs">
                {formatCount(periodLeadingArtist.plays)} recorded plays · select to explore
              </span>
            </button>
          )}
          <p className="muted selection-note">
            Track rankings remain based on the full export; the imported summary does not link individual tracks to these periods.
          </p>
        </aside>
      )}
      {selectedTime && selectedHourPlays !== undefined && (
        <aside className="selection-insight" aria-live="polite">
          <div>
            <p className="eyebrow">Selected listening time</p>
            <h2 className="mt-1 text-xl font-semibold">
              {selectedTime.weekday === null ? "Across all weekdays" : WEEKDAYS[selectedTime.weekday]}
              {" · "}{hourLabel(selectedTime.hour)}:00
            </h2>
            <p className="muted mt-1 text-sm">{result.timeZone}</p>
          </div>
          <Metric label="Recorded plays" value={formatCount(selectedHourPlays)} />
          <p className="muted selection-note">
            This summary has weekday/hour totals only; it cannot connect this time slot to artists or tracks.
          </p>
        </aside>
      )}

      <section id="evolution" className="report-section" aria-labelledby="timeline-heading">
        <SectionHeading
          number="01"
          eyebrow="Musical evolution"
          title="Listen to the history change tempo."
          description="Move between daily, weekly, and monthly views to find peaks, pauses, and the artists that led active periods."
          id="timeline-heading"
        />
        <ListeningTimeline
          result={result}
          periodSelection={selectedPeriod}
          onSelectPeriod={setSelectedPeriod}
          onSelectArtist={setSelectedArtist}
        />
      </section>

      <section id="artists" className="report-section" aria-labelledby="artists-heading">
        <SectionHeading
          number="02"
          eyebrow="Artist landscape"
          title="How much listening gathers at the top?"
          description="Readable bars surface the leading artists; search and sort the full ranking to explore the long tail."
          id="artists-heading"
        />
        <ArtistLandscape
          result={result}
          selectedArtist={selectedArtist}
          onSelectArtist={setSelectedArtist}
        />
      </section>

      <section id="rhythm" className="report-section" aria-labelledby="rhythm-heading">
        <SectionHeading
          number="03"
          eyebrow="Listening rhythm"
          title="A day has more than one listening hour."
          description={`A radial clock, exact hourly bars, and weekday-by-hour map reveal when valid records appear in the local timezone, ${result.timeZone}.`}
          id="rhythm-heading"
        />
        <ListeningRhythm
          result={result}
          selectedTime={selectedTime}
          onSelectTime={setSelectedTime}
        />
      </section>

      <section id="tracks" className="report-section" aria-labelledby="tracks-heading">
        <SectionHeading
          number="04"
          eyebrow="Track obsessions"
          title="Replays and time tell different stories."
          description="Compare the number of valid entries with their combined recorded duration. The plot uses a logarithmic scale so both common and outlying tracks remain visible."
          id="tracks-heading"
        />
        <TrackExplorer
          result={result}
          selectedArtist={selectedArtist}
          onSelectArtist={setSelectedArtist}
        />
      </section>

      <section id="discoveries" className="report-section" aria-labelledby="discovery-heading">
        <SectionHeading
          number="05"
          eyebrow="Discoveries in this export"
          title="A few patterns, grounded in your records."
          description="These observations are calculated from the imported rows and explain their comparison baseline."
          id="discovery-heading"
        />
        <div className="discovery-grid">
          {firstArtist ? (
            <Discovery
              label="Leading artist"
              value={`${firstArtistShare.toFixed(1)}% of valid plays`}
              detail={
                secondArtist && artistLead !== null
                  ? `${firstArtist.name} leads ${secondArtist.name} by ${formatCount(artistLead)} entries (${formatCount(firstArtist.plays)} vs ${formatCount(secondArtist.plays)}).`
                  : `${firstArtist.name} has ${formatCount(firstArtist.plays)} recorded plays in this summary.`
              }
            />
          ) : (
            <Discovery label="Artist names" value="Not available" detail="No artist names were included in the usable history rows." />
          )}
          {peakMonth ? (
            <Discovery
              label="Busiest calendar month"
              value={`${formatMonthLabel(peakMonth.month)} · ${formatCount(peakMonth.plays)} plays`}
              detail={
                monthly.length > 1
                  ? `${peakMonthDifference >= 0 ? "+" : ""}${peakMonthDifference.toFixed(0)}% relative to the average of ${monthly.length} calendar months, including zero-play months.`
                  : "Only one calendar month is present, so a month-to-month comparison is not available."
              }
            />
          ) : (
            <Discovery label="Monthly pattern" value="Unavailable" detail="This summary predates monthly aggregation. Re-import the export for period comparisons." />
          )}
          <Discovery
            label="Most common hour"
            value={`${hourLabel(peakHour)}:00 · ${formatCount(result.playsByHour[peakHour])} plays`}
            detail={`The highest-count local clock hour is ${hourLabel(peakHour)}:00–${hourLabel((peakHour + 1) % 24)}:00. It is an observed time pattern, not a personality label.`}
          />
          <Discovery
            label="Busiest weekday"
            value={`${WEEKDAYS[peakWeekday]} · ${formatCount(result.playsByWeekday[peakWeekday])} plays`}
            detail={`Compared across seven local weekdays; counts sum to ${formatCount(result.playsByWeekday.reduce((sum, count) => sum + count, 0))} entries.`}
          />
          <Discovery
            label="Top-five artist share"
            value={`${topFiveShare.toFixed(1)}% of all valid plays`}
            detail={`The top ${Math.min(5, artists.length)} named artists account for ${formatCount(artists.slice(0, 5).reduce((sum, artist) => sum + artist.plays, 0))} entries. Entries without an artist stay in the denominator.`}
          />
          <Discovery
            label="Rows kept"
            value={`${formatPercent(usablePercent)} usable`}
            detail={`${formatCount(stats.totalPlays)} valid entries retained from ${formatCount(totalRows)} imported rows; ${formatCount(stats.skippedRows)} were skipped.`}
          />
          {replayLeader && timeLeader && (
            <Discovery
              label="Replays vs total time"
              value={
                trackIdentity(replayLeader) === trackIdentity(timeLeader)
                  ? `${replayLeader.name} leads both measures`
                  : `${timeLeader.name} leads in total time`
              }
              detail={
                trackIdentity(replayLeader) === trackIdentity(timeLeader)
                  ? `${formatCount(replayLeader.plays)} plays and ${formatDuration(replayLeader.msPlayed)} total recorded time among ${tracks.length.toLocaleString()} available track identities.`
                  : `${replayLeader.name} leads replays (${formatCount(replayLeader.plays)}) but ranks #${replayLeaderTimeRank} by total time; ${timeLeader.name} leads duration with ${formatDuration(timeLeader.msPlayed)} among ${tracks.length.toLocaleString()} available identities.`
              }
            />
          )}
          {selectedPeriod && selectedPeriodValues && (
            <Discovery
              label={`Selected ${selectedPeriod.aggregation}`}
              value={`${formatCount(selectedPeriodValues.plays)} recorded plays`}
              detail={`${formatDuration(selectedPeriodValues.msPlayed)} total recorded time in ${formatPeriodSelection(selectedPeriod, result.timeZone)}.${selectedPeriodValues.leadingArtist ? ` Leading artist: ${selectedPeriodValues.leadingArtist.name}.` : ""}`}
            />
          )}
          {selectedTime && selectedHourPlays !== undefined && (
            <Discovery
              label="Selected local listening time"
              value={`${formatCount(selectedHourPlays)} recorded plays`}
              detail={`${selectedTime.weekday === null ? "Across all weekdays" : WEEKDAYS[selectedTime.weekday]} at ${hourLabel(selectedTime.hour)}:00 in ${result.timeZone}. No artist or track cross-tab is available for this hour.`}
            />
          )}
        </div>
      </section>

      <details id="methodology" className="report-methodology">
        <summary>Methodology, data quality & limitations</summary>
        <div className="mt-5 grid gap-6 text-sm sm:grid-cols-2">
          <div>
            <h3 className="font-semibold">What is counted</h3>
            <ul className="muted mt-2 list-disc space-y-2 pl-5">
              <li>One valid imported history row is one recorded play entry—not an inferred listening session.</li>
              <li>Recorded listening time is the sum of Spotify’s row duration field (`ms_played` or `msPlayed`).</li>
              <li>Artists group case-insensitively by artist name.</li>
              <li>Track identities in new summaries group case-insensitively by title + artist + album; no Spotify track ID is present.</li>
              <li>Average daily time divides total recorded duration by every local calendar date from the first to last valid timestamp, inclusive.</li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold">Import quality & boundaries</h3>
            <ul className="muted mt-2 list-disc space-y-2 pl-5">
              <li>{formatCount(result.sourceFileCount)} JSON files, {formatCount(totalRows)} total rows, {formatCount(stats.totalPlays)} valid and {formatCount(stats.skippedRows)} skipped.</li>
              <li>Period, hour, and weekday grouping uses the browser timezone captured at import: {result.timeZone}.</li>
              <li>Clock and weekday counts use local calendar components; records without artist names are excluded from artist ranks but remain in total-play shares.</li>
              <li>No genre, mood, artist relationships, playlist context, skip/completion behavior, or external artwork is inferred.</li>
              <li>The history covers only the files and date range you imported; it may not represent lifetime listening.</li>
            </ul>
          </div>
        </div>
      </details>

      <footer className="report-footer mt-10">
        <div className="muted text-sm">
          <p>{validityMessage} Summary stored only in this tab’s session storage.</p>
          <p className="mt-2">
            <Link href="/privacy" className="underline underline-offset-4">
              Read the privacy details
            </Link>
            .
          </p>
        </div>
        <CreatorCredit compact />
      </footer>
    </main>
  );
}

function SectionHeading({
  number,
  eyebrow,
  title,
  description,
  id,
}: {
  number: string;
  eyebrow: string;
  title: string;
  description: string;
  id: string;
}) {
  return (
    <div className="report-section-heading">
      <span className="report-section-number">{number}</span>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2 id={id} className="report-section-title">
          {title}
        </h2>
        <p className="muted mt-3 max-w-3xl text-sm sm:text-base">{description}</p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="report-metric">
      <p className="subtle text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-2 break-words text-xl font-semibold tracking-tight">{value}</p>
      {detail && <p className="muted mt-1 text-xs leading-relaxed">{detail}</p>}
    </div>
  );
}

function Discovery({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className="discovery-item">
      <p className="subtle text-xs uppercase tracking-wide">{label}</p>
      <h3 className="mt-2 text-lg font-semibold leading-snug">{value}</h3>
      <p className="muted mt-2 text-sm leading-relaxed">{detail}</p>
    </article>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="filter-chip">
      {label}
      <button type="button" aria-label={`Remove ${label} selection`} onClick={onRemove}>
        ×
      </button>
    </span>
  );
}

function readStoredAnalysis(): string | null {
  try {
    const keys = [
      ANALYSIS_STORAGE_KEY,
      PREVIOUS_ANALYSIS_STORAGE_KEY,
      LEGACY_ANALYSIS_STORAGE_KEY,
    ];
    let firstStored: string | null = null;
    for (const key of keys) {
      const stored = sessionStorage.getItem(key);
      if (stored === null) continue;
      firstStored ??= stored;
      try {
        if (isAnalysisResult(JSON.parse(stored))) return stored;
      } catch {
        continue;
      }
    }
    return firstStored;
  } catch {
    return STORAGE_READ_ERROR;
  }
}

function subscribeToAnalysis(callback: () => void): () => void {
  window.addEventListener(ANALYSIS_CHANGE_EVENT, callback);
  return () => window.removeEventListener(ANALYSIS_CHANGE_EVENT, callback);
}

function getDashboardState(stored: string | null): DashboardState {
  if (stored === STORAGE_LOADING) return { status: "loading" };
  if (stored === STORAGE_READ_ERROR) {
    return {
      status: "error",
      message: "This browser could not read the saved summary. Check site storage or import your files again.",
    };
  }
  if (!stored) return { status: "missing" };
  try {
    const parsed: unknown = JSON.parse(stored);
    return isAnalysisResult(parsed)
      ? { status: "ready", result: parsed }
      : {
          status: "error",
          message: "The saved analysis is incomplete or invalid. Import your files again.",
        };
  } catch {
    return {
      status: "error",
      message: "The saved analysis could not be read. Import your files again.",
    };
  }
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AnalysisResult>;
  if (
    ![1, 2, 3].includes(candidate.version ?? 0) ||
    !isNonNegativeNumber(candidate.generatedAtMs) ||
    !isNonNegativeNumber(candidate.sourceFileCount) ||
    !isTimeZone(candidate.timeZone) ||
    !isStats(candidate.stats) ||
    !isRankedList(candidate.topArtists) ||
    !isRankedList(candidate.topTracks) ||
    !isRankedList(candidate.topAlbums) ||
    !isNumberArray(candidate.playsByHour, 24) ||
    !isNumberArray(candidate.playsByWeekday, 7)
  ) {
    return false;
  }

  if (
    candidate.monthlyListening !== undefined &&
    !isMonthlyList(candidate.monthlyListening, candidate.version === 3)
  ) {
    return false;
  }
  if (candidate.allArtists !== undefined && !isRankedList(candidate.allArtists)) return false;
  if (candidate.trackIdentities !== undefined && !isRankedList(candidate.trackIdentities)) return false;
  if (candidate.dailyListening !== undefined && !isPeriodList(candidate.dailyListening)) return false;
  if (candidate.weeklyListening !== undefined && !isPeriodList(candidate.weeklyListening)) return false;
  if (
    candidate.playsByWeekdayHour !== undefined &&
    (!Array.isArray(candidate.playsByWeekdayHour) ||
      candidate.playsByWeekdayHour.length !== 7 ||
      candidate.playsByWeekdayHour.some((row) => !isNumberArray(row, 24)))
  ) {
    return false;
  }
  if (
    candidate.version === 3 &&
    (!candidate.monthlyListening ||
      !candidate.allArtists ||
      !candidate.trackIdentities ||
      !candidate.dailyListening ||
      !candidate.weeklyListening ||
      !candidate.playsByWeekdayHour ||
      candidate.stats.totalRows === undefined ||
      candidate.stats.totalRows !== candidate.stats.totalPlays + candidate.stats.skippedRows)
  ) {
    return false;
  }
  return true;
}

function isStats(value: unknown): value is AnalysisResult["stats"] {
  if (!value || typeof value !== "object") return false;
  const stats = value as Partial<AnalysisResult["stats"]>;
  const validNumbers = [
    stats.totalPlays,
    stats.totalMsPlayed,
    stats.uniqueTracks,
    stats.uniqueArtists,
    stats.spanStartMs,
    stats.spanEndMs,
    stats.skippedRows,
  ].every(isNonNegativeNumber) &&
    (stats.totalRows === undefined || isNonNegativeNumber(stats.totalRows));
  if (
    !validNumbers ||
    !isNonNegativeNumber(stats.spanStartMs) ||
    !isNonNegativeNumber(stats.spanEndMs) ||
    !isNonNegativeNumber(stats.totalPlays) ||
    !isNonNegativeNumber(stats.uniqueTracks) ||
    !isNonNegativeNumber(stats.uniqueArtists) ||
    !isNonNegativeNumber(stats.skippedRows)
  ) {
    return false;
  }
  return (
    stats.spanStartMs <= stats.spanEndMs &&
    stats.uniqueTracks <= stats.totalPlays &&
    stats.uniqueArtists <= stats.totalPlays &&
    (stats.totalRows === undefined ||
      stats.totalRows === stats.totalPlays + stats.skippedRows)
  );
}

function isTimeZone(value: unknown): value is string {
  if (typeof value !== "string" || !value) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function isRankedList(value: unknown): value is RankedItem[] {
  return (
    Array.isArray(value) &&
    value.length <= 1_000_000 &&
    value.every(isRankedItem)
  );
}

function isRankedItem(value: unknown): value is RankedItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RankedItem>;
  return (
    typeof item.name === "string" &&
    isNonNegativeNumber(item.plays) &&
    isNonNegativeNumber(item.msPlayed) &&
    (item.artistName === undefined || typeof item.artistName === "string") &&
    (item.albumName === undefined || typeof item.albumName === "string")
  );
}

function isMonthlyList(
  value: unknown,
  requireDetails: boolean,
): value is MonthlyListening[] {
  return (
    Array.isArray(value) &&
    value.length <= 20_000 &&
    value.every(
      (item: unknown) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as MonthlyListening).month === "string" &&
        /^\d{4}-(0[1-9]|1[0-2])$/.test((item as MonthlyListening).month) &&
        isNonNegativeNumber((item as MonthlyListening).plays) &&
        (requireDetails
          ? isNonNegativeNumber((item as MonthlyListening).msPlayed) &&
            ((item as MonthlyListening).leadingArtist === null ||
              isRankedItem((item as MonthlyListening).leadingArtist))
          : ((item as Partial<MonthlyListening>).msPlayed === undefined ||
              isNonNegativeNumber((item as Partial<MonthlyListening>).msPlayed)) &&
            ((item as Partial<MonthlyListening>).leadingArtist === undefined ||
              (item as MonthlyListening).leadingArtist === null ||
              isRankedItem((item as MonthlyListening).leadingArtist))),
    )
  );
}

function isPeriodList(value: unknown): value is ListeningPeriod[] {
  return (
    Array.isArray(value) &&
    value.length <= 100_000 &&
    value.every(
      (item: unknown) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as ListeningPeriod).period === "string" &&
        /^\d{4}-\d{2}-\d{2}$/.test((item as ListeningPeriod).period) &&
        isNonNegativeNumber((item as ListeningPeriod).plays) &&
        isNonNegativeNumber((item as ListeningPeriod).msPlayed) &&
        ((item as ListeningPeriod).leadingArtist === null ||
          isRankedItem((item as ListeningPeriod).leadingArtist)),
    )
  );
}

function isNumberArray(value: unknown, length: number): value is number[] {
  return (
    Array.isArray(value) &&
    value.length === length &&
    value.every(isNonNegativeNumber)
  );
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function fillMonths(result: AnalysisResult): MonthlyListening[] {
  const months = result.monthlyListening ?? [];
  if (!months.length) return [];
  const byKey = new Map(months.map((month) => [month.month, month]));
  const start = localDateParts(result.stats.spanStartMs, result.timeZone);
  const end = localDateParts(result.stats.spanEndMs, result.timeZone);
  const output: MonthlyListening[] = [];
  let year = start.year;
  let month = start.month;
  while (year < end.year || (year === end.year && month <= end.month)) {
    const key = `${year}-${String(month).padStart(2, "0")}`;
    output.push(
      byKey.get(key) ?? {
        month: key,
        plays: 0,
        msPlayed: 0,
        leadingArtist: null,
      },
    );
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return output;
}

function localDateParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function calendarDaysInRange(startMs: number, endMs: number, timeZone: string) {
  const start = localDateParts(startMs, timeZone);
  const end = localDateParts(endMs, timeZone);
  return Math.max(
    1,
    Math.round(
      (Date.UTC(end.year, end.month - 1, end.day) -
        Date.UTC(start.year, start.month - 1, start.day)) /
        86_400_000,
    ) + 1,
  );
}

function formatDate(timestamp: number, timeZone: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone,
  }).format(timestamp);
}

function formatMonthLabel(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function formatPeriodSelection(
  selection: PeriodSelection,
  timeZone: string,
) {
  if (selection.aggregation === "month") {
    return formatMonthLabel(selection.period);
  }
  const date = new Date(`${selection.period}T00:00:00Z`);
  const format = (value: Date) =>
    new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(value);
  if (selection.aggregation === "day") return format(date);
  const end = new Date(date.getTime() + 6 * 86_400_000);
  return `${format(date)} – ${format(end)} (${timeZone})`;
}

function trackIdentity(track: RankedItem) {
  return `${track.name.toLocaleLowerCase()}\u0000${track.artistName?.toLocaleLowerCase() ?? ""}\u0000${track.albumName?.toLocaleLowerCase() ?? ""}`;
}

function hourLabel(hour: number) {
  return String(hour).padStart(2, "0");
}
