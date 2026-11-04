"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  AnalysisResult,
  ListeningPeriod,
  MonthlyListening,
  RankedItem,
} from "@/lib/analysis-types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_MS = 86_400_000;

type PeriodPoint = {
  period: string;
  plays: number;
  msPlayed: number;
  leadingArtist: RankedItem | null;
};

export type PeriodSelection = {
  aggregation: "day" | "week" | "month";
  period: string;
};

export type HourSelection = {
  hour: number;
  weekday: number | null;
};

type SharedFilterProps = {
  selectedArtist: string | null;
  onSelectArtist: (artist: string | null) => void;
};

function periodLabel(period: string, aggregation: "day" | "week" | "month") {
  if (aggregation === "month") return formatMonth(period);
  const date = new Date(`${period}T00:00:00Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, monthNumber - 1, 1)));
}

function localDateKey(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(timestamp);
  const part = (type: string) =>
    parts.find((value) => value.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function calendarKeys(
  result: AnalysisResult,
  aggregation: "day" | "week" | "month",
) {
  const start = localDateKey(result.stats.spanStartMs, result.timeZone);
  const end = localDateKey(result.stats.spanEndMs, result.timeZone);
  const [startYear, startMonth, startDay] = start.split("-").map(Number);
  const [endYear, endMonth, endDay] = end.split("-").map(Number);
  const cursor = Date.UTC(startYear, startMonth - 1, startDay);
  const endTimestamp = Date.UTC(endYear, endMonth - 1, endDay);
  const keys: string[] = [];

  if (aggregation === "month") {
    let year = startYear;
    let month = startMonth;
    while (year < endYear || (year === endYear && month <= endMonth)) {
      keys.push(`${year}-${String(month).padStart(2, "0")}`);
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return keys;
  }

  let timestamp = cursor;
  if (aggregation === "week") {
    const weekday = new Date(timestamp).getUTCDay();
    timestamp -= ((weekday + 6) % 7) * DAY_MS;
  }
  while (timestamp <= endTimestamp) {
    keys.push(new Date(timestamp).toISOString().slice(0, 10));
    timestamp += (aggregation === "day" ? 1 : 7) * DAY_MS;
  }
  return keys;
}

function getTimeline(
  result: AnalysisResult,
  aggregation: "day" | "week" | "month",
): PeriodPoint[] {
  const values: ListeningPeriod[] | MonthlyListening[] =
    aggregation === "day"
      ? result.dailyListening ?? []
      : aggregation === "week"
        ? result.weeklyListening ?? []
        : result.monthlyListening ?? [];
  const byPeriod = new Map(
    values.map((value) => [
      aggregation === "month"
        ? (value as MonthlyListening).month
        : (value as ListeningPeriod).period,
      value,
    ]),
  );

  return calendarKeys(result, aggregation).map((period) => {
    const value = byPeriod.get(period);
    return {
      period,
      plays: value?.plays ?? 0,
      msPlayed:
        value && Number.isFinite(value.msPlayed) ? value.msPlayed : 0,
      leadingArtist: value?.leadingArtist ?? null,
    };
  });
}

export function ListeningTimeline({
  result,
  periodSelection,
  onSelectPeriod,
  onSelectArtist,
}: {
  result: AnalysisResult;
  periodSelection: PeriodSelection | null;
  onSelectPeriod: (period: PeriodSelection | null) => void;
  onSelectArtist: (artist: string | null) => void;
}) {
  const [aggregation, setAggregation] = useState<"day" | "week" | "month">(
    "month",
  );
  const points = useMemo(
    () => getTimeline(result, aggregation),
    [result, aggregation],
  );
  const [hoveredPeriod, setHoveredPeriod] = useState("");
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(points.length - 1);
  const start = Math.min(rangeStart, Math.max(0, points.length - 1));
  const end = Math.max(start, Math.min(rangeEnd, Math.max(0, points.length - 1)));
  const visiblePoints = points.slice(start, end + 1);
  const selectedGlobalIndex = periodSelection?.aggregation === aggregation
    ? points.findIndex((point) => point.period === periodSelection.period)
    : -1;
  const selectedIndex = selectedGlobalIndex >= start && selectedGlobalIndex <= end
    ? selectedGlobalIndex - start
    : 0;
  const hoveredIndex = visiblePoints.findIndex(
    (point) => point.period === hoveredPeriod,
  );
  const detailIndex = hoveredIndex >= 0 ? hoveredIndex : selectedIndex;
  const selected = visiblePoints[detailIndex];
  const selectedLeadingArtist = selected.leadingArtist;
  const maximum = visiblePoints.reduce(
    (max, point) => Math.max(max, point.plays),
    1,
  );
  const width = 1200;
  const height = 390;
  const padding = { top: 34, right: 38, bottom: 48, left: 78 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const coordinates = visiblePoints.map((point, index) => ({
    x:
      padding.left +
      (visiblePoints.length <= 1 ? plotWidth / 2 : (index / (visiblePoints.length - 1)) * plotWidth),
    y: padding.top + plotHeight - (point.plays / maximum) * plotHeight,
  }));
  const line = coordinates.reduce((path, point, index) => {
    if (index === 0) return `M${point.x},${point.y}`;
    const previous = coordinates[index - 1];
    const midX = (previous.x + point.x) / 2;
    const midY = (previous.y + point.y) / 2;
    return index === 1
      ? `${path} Q${previous.x},${previous.y} ${midX},${midY} T${point.x},${point.y}`
      : `${path} T${midX},${midY} T${point.x},${point.y}`;
  }, "");
  const area = coordinates.length
    ? `${line} L${coordinates.at(-1)?.x},${padding.top + plotHeight} L${coordinates[0].x},${padding.top + plotHeight} Z`
    : "";
  const mean = visiblePoints.length
    ? visiblePoints.reduce((sum, point) => sum + point.plays, 0) / visiblePoints.length
    : 0;
  const dailyAvailable =
    result.version >= 3 &&
    !!result.dailyListening;
  const hasAggregation =
    aggregation === "month"
      ? !!result.monthlyListening
      : aggregation === "week"
        ? !!result.weeklyListening
        : dailyAvailable;

  if (!hasAggregation) {
    return (
      <EmptyPanel>
        {result.version < 3
          ? "This saved summary predates detailed time series. Re-import the export to explore daily and weekly trends."
          : `No ${aggregation} listening data is available.`}
      </EmptyPanel>
    );
  }

  const peakIndex = visiblePoints.reduce(
    (peak, point, index) =>
      point.plays > visiblePoints[peak].plays ? index : peak,
    0,
  );
  const peakCount = visiblePoints.reduce(
    (count, point) => count + Number(point.plays === visiblePoints[peakIndex].plays),
    0,
  );
  const peakPoint = visiblePoints[peakIndex];
  const selectedChartIndices = new Set<number>();
  const chartInterval = Math.max(1, Math.ceil(visiblePoints.length / 300));
  for (let index = 0; index < visiblePoints.length; index += chartInterval) {
    selectedChartIndices.add(index);
  }
  selectedChartIndices.add(visiblePoints.length - 1);
  selectedChartIndices.add(selectedIndex);
  selectedChartIndices.add(peakIndex);

  return (
    <Panel>
      <div className="timeline-header">
        <div>
          <p className="eyebrow">Listening over time</p>
          <h3 className="mt-1 text-2xl font-semibold">A history with its peaks and pauses</h3>
          <div className="timeline-summary">
            <span>{visiblePoints.length.toLocaleString()} of {points.length.toLocaleString()} {aggregation === "day" ? "days" : aggregation === "week" ? "weeks" : "months"}</span>
            <span className="timeline-summary-dot" aria-hidden="true" />
            <span>Average <strong>{formatCount(mean)}</strong> plays</span>
            <span className="timeline-summary-dot" aria-hidden="true" />
            <span>Peak <strong>{formatCount(peakPoint.plays)}</strong> · {periodLabel(peakPoint.period, aggregation)}</span>
          </div>
        </div>
        <div className="timeline-mode-toggle" role="group" aria-label="Timeline aggregation">
          {(["day", "week", "month"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              aria-pressed={aggregation === mode}
              disabled={
                mode === "day" ? !dailyAvailable :
                mode === "week" ? !result.weeklyListening : false
              }
              onClick={() => {
                setAggregation(mode);
                setHoveredPeriod("");
                onSelectPeriod(null);
                setRangeStart(0);
                setRangeEnd(getTimeline(result, mode).length - 1);
              }}
            >
              {mode === "day" ? "Daily" : mode === "week" ? "Weekly" : "Monthly"}
            </button>
          ))}
        </div>
      </div>
        <div className="timeline-range-controls mt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Visible range</p>
              <p className="muted mt-1 text-sm">
                {periodLabel(visiblePoints[0].period, aggregation)} —{" "}
                {periodLabel(visiblePoints.at(-1)!.period, aggregation)}
              </p>
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={start === 0 && end === points.length - 1}
              onClick={() => {
                setRangeStart(0);
                setRangeEnd(points.length - 1);
              }}
            >
              Show full history
            </button>
          </div>
          <div className="timeline-range-presets" role="group" aria-label="Quick timeline ranges">
            {[12, 36, 120].filter((periodCount) => periodCount < points.length).map((periodCount) => (
              <button
                key={periodCount}
                type="button"
                className="timeline-range-preset"
                aria-pressed={start === Math.max(0, points.length - periodCount) && end === points.length - 1}
                onClick={() => {
                  setRangeStart(Math.max(0, points.length - periodCount));
                  setRangeEnd(points.length - 1);
                }}
              >
                Last {periodCount} {aggregation === "day" ? "days" : aggregation === "week" ? "weeks" : "months"}
              </button>
            ))}
          </div>
          {points.length > 1 && (
            <div className="timeline-range-sliders">
              <label>
                <span>From {periodLabel(visiblePoints[0].period, aggregation)}</span>
                <input
                  type="range"
                  min={0}
                  max={Math.max(0, end - 1)}
                  value={start}
                  aria-label="Start of visible timeline range"
                  onChange={(event) => {
                    const nextStart = Number(event.target.value);
                    setRangeStart(nextStart);
                    if (nextStart >= end) setRangeEnd(Math.min(points.length - 1, nextStart + 1));
                  }}
                />
              </label>
              <label>
                <span>Through {periodLabel(visiblePoints.at(-1)!.period, aggregation)}</span>
                <input
                  type="range"
                  min={Math.min(points.length - 1, start + 1)}
                  max={points.length - 1}
                  value={end}
                  aria-label="End of visible timeline range"
                  onChange={(event) => {
                    const nextEnd = Number(event.target.value);
                    setRangeEnd(nextEnd);
                    if (nextEnd <= start) setRangeStart(Math.max(0, nextEnd - 1));
                  }}
                />
              </label>
            </div>
          )}
        </div>
        <div key={aggregation} className="timeline-plot mt-4">
          <svg
            key={aggregation}
            className={`timeline-chart timeline-chart-${aggregation}`}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label={`Recorded plays by ${aggregation}; ${visiblePoints.length} calendar periods in view. Move over the chart or use the range slider to inspect exact values.`}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const plotStart = padding.left / width;
            const plotEnd = (width - padding.right) / width;
            const fraction = Math.max(0, Math.min(1,
              ((event.clientX - rect.left) / rect.width - plotStart) / (plotEnd - plotStart),
            ));
            const index = Math.round(fraction * (visiblePoints.length - 1));
            setHoveredPeriod(visiblePoints[index]?.period ?? "");
          }}
          onPointerLeave={() => setHoveredPeriod("")}
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const plotStart = padding.left / width;
            const plotEnd = (width - padding.right) / width;
            const fraction = Math.max(0, Math.min(1,
              ((event.clientX - rect.left) / rect.width - plotStart) / (plotEnd - plotStart),
            ));
            const point = visiblePoints[Math.round(fraction * (visiblePoints.length - 1))];
            if (point) onSelectPeriod({ aggregation, period: point.period });
          }}
        >
          <defs>
            <linearGradient id="report-timeline-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.34" />
              <stop offset="72%" stopColor="var(--color-accent)" stopOpacity="0.08" />
              <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.01" />
            </linearGradient>
          </defs>
          {[0, 0.5, 1].map((fraction) => {
            const y = padding.top + fraction * plotHeight;
            return (
              <g key={fraction}>
                <line
                  x1={padding.left}
                  x2={width - padding.right}
                  y1={y}
                  y2={y}
                  stroke="var(--color-border)"
                  strokeDasharray="2 8"
                  strokeOpacity="0.75"
                />
                <text
                  x={padding.left - 10}
                  y={y + 4}
                  fill="var(--color-fg-muted)"
                  fontSize="12"
                  textAnchor="end"
                >
                  {formatCount(Math.round(maximum * (1 - fraction)))}
                </text>
              </g>
            );
          })}
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + plotHeight - (mean / maximum) * plotHeight}
            y2={padding.top + plotHeight - (mean / maximum) * plotHeight}
            stroke="var(--color-preview-purple)"
            strokeDasharray="5 5"
            strokeWidth="2"
          />
          {coordinates[selectedIndex] && (
            <line
              className="timeline-selection-guide"
              x1={coordinates[selectedIndex].x}
              x2={coordinates[selectedIndex].x}
              y1={padding.top}
              y2={padding.top + plotHeight}
            />
          )}
          <path d={area} fill="url(#report-timeline-fill)" />
          {coordinates.length > 1 && (
            <path
              d={line}
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {coordinates.map(({ x, y }, index) => {
            if (!selectedChartIndices.has(index)) return null;
            const point = visiblePoints[index];
            const isSelected = point.period === selected?.period;
            const isPeak = index === peakIndex && peakCount === 1 && maximum > 0;
            return (
              <g
                key={point.period}
                aria-label={`${periodLabel(point.period, aggregation)}: ${formatCount(point.plays)} recorded plays`}
                onClick={() => onSelectPeriod({ aggregation, period: point.period })}
                className="chart-point"
                role="button"
                tabIndex={0}
                aria-pressed={isSelected}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectPeriod({ aggregation, period: point.period });
                  }
                }}
              >
                {isPeak && (
                  <text
                    x={x}
                    y={Math.max(14, y - 16)}
                    textAnchor="middle"
                    fill="var(--color-accent)"
                    fontSize="11"
                  >
                    PEAK
                  </text>
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 8 : isPeak ? 6 : 4}
                  fill={isSelected ? "var(--color-fg)" : "var(--color-accent)"}
                  stroke="var(--color-bg-elevated)"
                  strokeWidth="2"
                />
                <title>
                  {periodLabel(point.period, aggregation)} · {formatCount(point.plays)} plays · {formatDuration(point.msPlayed)}
                </title>
              </g>
            );
          })}
          <text x={padding.left} y={height - 10} fill="var(--color-fg-muted)" fontSize="12">
            {periodLabel(visiblePoints[0].period, aggregation)}
          </text>
          <text
            x={width - padding.right}
            y={height - 10}
            fill="var(--color-fg-muted)"
            fontSize="12"
            textAnchor="end"
          >
            {periodLabel(visiblePoints.at(-1)!.period, aggregation)}
          </text>
          <text
            x={width - padding.right}
            y={padding.top + plotHeight - (mean / maximum) * plotHeight - 8}
            className="timeline-average-label"
            fill="var(--color-preview-purple)"
            fontSize="11"
            textAnchor="end"
          >
            PERIOD AVERAGE
          </text>
        </svg>
      </div>
      {visiblePoints.length > 1 && (
        <input
          className="timeline-inspect-slider"
          type="range"
          min={0}
          max={visiblePoints.length - 1}
          value={selectedIndex}
          aria-label={`Select a ${aggregation} period`}
          aria-valuetext={`${periodLabel(selected.period, aggregation)} · ${formatCount(selected.plays)} plays`}
          onChange={(event) => {
            const point = visiblePoints[Number(event.target.value)];
            if (point) onSelectPeriod({ aggregation, period: point.period });
          }}
        />
      )}
      <div className="timeline-detail mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end" aria-live="polite">
        <div aria-live="polite">
          <p className="subtle text-xs uppercase tracking-wide">
            {hoveredIndex >= 0 ? "Inspecting" : "Selected"} {aggregation}
          </p>
          <p className="mt-1 text-2xl font-semibold">{periodLabel(selected.period, aggregation)}</p>
          <p className="muted mt-1 text-sm">
            {formatCount(selected.plays)} recorded plays · {formatDuration(selected.msPlayed)} total recorded time
          </p>
          {selected.plays === 0 && (
            <p className="muted mt-1 text-xs">No valid entries were recorded in this calendar period.</p>
          )}
        </div>
        {selectedLeadingArtist && (
          <button
            type="button"
            className="timeline-leading-artist"
            onClick={() => onSelectArtist(selectedLeadingArtist.name)}
          >
            <span className="subtle text-xs uppercase tracking-wide">Leading artist</span>
            <strong>{selectedLeadingArtist.name}</strong>
            <span className="muted text-sm">{formatCount(selectedLeadingArtist.plays)} plays · explore artist</span>
          </button>
        )}
      </div>
      <p className="muted mt-4 text-xs">
        Every calendar period between the first and last imported entry is retained, including zero-play periods. Adjust the visible range to zoom; the dashed line is the mean ({formatCount(mean)} plays), and the peak is {periodLabel(peakPoint.period, aggregation)} ({formatCount(peakPoint.plays)} plays).
      </p>
    </Panel>
  );
}

export function ArtistLandscape({
  result,
  selectedArtist,
  onSelectArtist,
}: {
  result: AnalysisResult;
} & SharedFilterProps) {
  const artists = result.allArtists ?? result.topArtists;
  const [measure, setMeasure] = useState<"plays" | "time">("plays");
  const [sortBy, setSortBy] = useState<"plays" | "time" | "name">("plays");
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(50);
  const [directoryOpen, setDirectoryOpen] = useState(false);
  const sorted = useMemo(
    () => [...artists].sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return sortBy === "plays"
        ? b.plays - a.plays || b.msPlayed - a.msPlayed
        : b.msPlayed - a.msPlayed || b.plays - a.plays;
    }),
    [artists, sortBy],
  );
  const denominator =
    measure === "plays" ? result.stats.totalPlays : result.stats.totalMsPlayed;
  const rankedArtists = useMemo(
    () =>
      [...artists].sort((a, b) =>
        measure === "plays"
          ? b.plays - a.plays || b.msPlayed - a.msPlayed
          : b.msPlayed - a.msPlayed || b.plays - a.plays,
      ),
    [artists, measure],
  );
  const chartItems = rankedArtists.slice(0, 10);
  const chartMaximum = Math.max(
    1,
    ...chartItems.map((artist) =>
      measure === "plays" ? artist.plays : artist.msPlayed,
    ),
  );
  const topFiveValue = rankedArtists.slice(0, 5).reduce(
    (sum, artist) => sum + (measure === "plays" ? artist.plays : artist.msPlayed),
    0,
  );
  const filtered = sorted.filter((artist) =>
    artist.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );
  const selected = artists.find((artist) => artist.name === selectedArtist);
  const selectedRank = selected ? rankedArtists.indexOf(selected) + 1 : 0;
  const featuredArtist = selected ?? rankedArtists[0];
  const featuredValue = featuredArtist
    ? measure === "plays"
      ? featuredArtist.plays
      : featuredArtist.msPlayed
    : 0;
  const featuredShare = denominator
    ? (featuredValue / denominator) * 100
    : 0;
  const entriesWithArtist = artists.reduce(
    (sum, artist) => sum + artist.plays,
    0,
  );

  if (!artists.length) {
    return (
      <EmptyPanel>
        This saved summary contains no artist ranking. Re-import the history to
        build an artist landscape.
      </EmptyPanel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Artist concentration</p>
          <h3 className="mt-1 text-xl font-semibold">Artist leaderboard</h3>
          <p className="muted mt-1 text-sm">
            {artists.length.toLocaleString()} artists ranked by{" "}
            {measure === "plays" ? "recorded plays" : "listening time"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label className="muted flex items-center gap-2 text-sm">
            List sort
            <select
              className="report-select"
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
            >
              <option value="plays">Recorded plays</option>
              <option value="time">Listening time</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
          <MeasureToggle value={measure} onChange={setMeasure} />
        </div>
      </div>
      <div className="artist-landscape-grid mt-7">
        <section className="artist-leaders" aria-labelledby="artist-leaders-heading">
          <div className="artist-block-heading">
            <div>
              <p className="eyebrow">
                Ranked by {measure === "plays" ? "plays" : "listening time"}
              </p>
              <h4 id="artist-leaders-heading" className="mt-1 text-xl font-semibold">
                Your top artists
              </h4>
            </div>
            <p className="artist-concentration">
              <strong>
                {formatPercent(
                  denominator ? (topFiveValue / denominator) * 100 : 0,
                )}
              </strong>
              <span>from your top 5</span>
            </p>
          </div>
          <ol className="artist-leader-list">
            {chartItems.map((artist, index) => {
              const value = measure === "plays" ? artist.plays : artist.msPlayed;
              const share = denominator ? (value / denominator) * 100 : 0;
              const isSelected = selectedArtist === artist.name;
              return (
                <li key={artist.name}>
                  <button
                    type="button"
                    className="artist-leader-row"
                    aria-pressed={isSelected}
                    aria-label={`Select rank ${index + 1}, ${artist.name}: ${formatCount(artist.plays)} plays, ${formatDuration(artist.msPlayed)} listening time`}
                    onClick={() =>
                      onSelectArtist(isSelected ? null : artist.name)
                    }
                  >
                    <span className="artist-leader-rank">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="artist-leader-main">
                      <span className="artist-leader-name">{artist.name}</span>
                      <span className="artist-leader-bar">
                        <span
                          style={{
                            width: `${Math.max((value / chartMaximum) * 100, value > 0 ? 1 : 0)}%`,
                          }}
                        />
                      </span>
                    </span>
                    <span className="artist-leader-value">
                      <strong>{formatMeasure(value, measure)}</strong>
                      <span>{formatPercent(share)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <p className="muted mt-4 text-xs">
            Share is calculated against all recorded{" "}
            {measure === "plays" ? "plays" : "listening time"}.
            {entriesWithArtist < result.stats.totalPlays &&
              ` ${formatCount(result.stats.totalPlays - entriesWithArtist)} plays have no artist name.`}
          </p>
        </section>

        <aside className="artist-spotlight" aria-live="polite">
          {featuredArtist && (
            <>
              <div className="artist-spotlight-copy">
                <div className="artist-spotlight-topline">
                  <span>{selected ? "Selected artist" : "Leading artist"}</span>
                  {selected && (
                    <button
                      type="button"
                      className="artist-clear-button"
                      onClick={() => onSelectArtist(null)}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <p className="artist-spotlight-rank">
                  #{String(selected ? selectedRank : 1).padStart(2, "0")}
                </p>
                <h4 className="artist-spotlight-name">{featuredArtist.name}</h4>
                <p className="artist-spotlight-share">
                  {formatPercent(featuredShare)}{" "}
                  <span>of recorded {measure === "plays" ? "plays" : "listening time"}</span>
                </p>
                <div className="artist-spotlight-metrics">
                  <ArtistMetric
                    label="Recorded plays"
                    value={formatCount(featuredArtist.plays)}
                  />
                  <ArtistMetric
                    label="Listening time"
                    value={formatDuration(featuredArtist.msPlayed)}
                  />
                </div>
                <p className="artist-spotlight-note">
                  {selected
                    ? "This artist is selected in the track explorer."
                    : "Select an artist in the ranking to explore their tracks."}
                </p>
              </div>
              <div
                className="artist-share-visual"
                style={{
                  background: `conic-gradient(var(--color-accent) ${Math.min(Math.max(featuredShare, 0), 100)}%, var(--color-border-strong) 0)`,
                }}
                aria-hidden="true"
              >
                <span>
                  <strong>{formatPercent(featuredShare)}</strong>
                  <small>of total</small>
                </span>
              </div>
            </>
          )}
        </aside>
      </div>

      <details
        className="artist-directory mt-6"
        onToggle={(event) => setDirectoryOpen(event.currentTarget.open)}
      >
        <summary className="artist-directory-summary">
          <span>
            <strong>Explore every artist</strong>
            <small>
              {filtered.length.toLocaleString()} match{filtered.length === 1 ? "" : "es"} · search and select
            </small>
          </span>
          <span className="artist-directory-action">
            {directoryOpen ? "Close directory" : `Browse ${artists.length.toLocaleString()} artists`}
          </span>
        </summary>
        <div className="artist-directory-content">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <label className="sr-only" htmlFor="artist-search">Search artists</label>
            <input
              id="artist-search"
              className="report-input"
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(50);
              }}
              placeholder="Search artist names"
            />
          </div>
          <ol className="artist-explorer mt-4" aria-label="Artist ranking">
            {filtered.slice(0, visibleCount).map((artist) => {
              const rank = sorted.indexOf(artist) + 1;
              const value = measure === "plays" ? artist.plays : artist.msPlayed;
              const share = denominator ? (value / denominator) * 100 : 0;
              return (
                <li key={artist.name}>
                  <button
                    type="button"
                    className="artist-explorer-row"
                    aria-pressed={selectedArtist === artist.name}
                    onClick={() => onSelectArtist(selectedArtist === artist.name ? null : artist.name)}
                  >
                    <span className="subtle artist-rank">{String(rank).padStart(3, "0")}</span>
                    <span className="artist-name">{artist.name}</span>
                    <span className="artist-value">{formatMeasure(value, measure)}</span>
                    <span className="subtle artist-share">{formatPercent(share)}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          {filtered.length === 0 && (
            <p className="muted py-6 text-center text-sm">No artist matches that search.</p>
          )}
          {visibleCount < filtered.length && (
            <button
              type="button"
              className="btn btn-secondary mt-4 w-full"
              onClick={() => setVisibleCount((count) => count + 50)}
            >
              Show more artists ({(filtered.length - visibleCount).toLocaleString()} remaining)
            </button>
          )}
          {result.version < 3 && (
            <p className="muted mt-4 text-xs">
              This earlier saved summary contains only the original top ten. Re-import to explore the full artist list.
            </p>
          )}
        </div>
      </details>
    </Panel>
  );
}

function ArtistMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="subtle text-xs uppercase tracking-wide">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
      {detail && <p className="muted text-xs">{detail}</p>}
    </div>
  );
}

export function ListeningRhythm({
  result,
  selectedTime,
  onSelectTime,
}: {
  result: AnalysisResult;
  selectedTime: HourSelection | null;
  onSelectTime: (selection: HourSelection | null) => void;
}) {
  const selectedHour = selectedTime?.hour ?? 0;
  const selectedDay = selectedTime?.weekday ?? 0;
  const hourMaximum = Math.max(1, ...result.playsByHour);
  const peakHour = Math.max(0, result.playsByHour.indexOf(hourMaximum));
  const matrix = result.playsByWeekdayHour;
  const matrixMaximum = Math.max(0, ...(matrix?.flat() ?? [0]));
  const heatmapSum = matrix?.flat().reduce((sum, count) => sum + count, 0) ?? 0;
  const hourSum = result.playsByHour.reduce((sum, count) => sum + count, 0);
  const weekdaySum = result.playsByWeekday.reduce((sum, count) => sum + count, 0);
  const center = 210;
  const innerRadius = 88;
  const outerRadius = 158;

  return (
    <div className="rhythm-layout">
      <Panel>
        <div>
          <p className="eyebrow">24-hour listening clock</p>
          <h3 className="mt-1 text-xl font-semibold">
            {formatCount(result.playsByHour[peakHour])} plays at the peak
          </h3>
          <p className="muted mt-1 text-sm">
            Hour beginning {hourLabel(peakHour)}:00 · {result.timeZone}
          </p>
        </div>
        <svg
          className="rhythm-clock mx-auto mt-4 block h-auto w-full"
          viewBox="0 0 420 420"
          role="img"
          aria-label={`24-hour radial chart in ${result.timeZone}; ${formatCount(hourSum)} hour-assigned plays. Focus an hour segment for exact count.`}
        >
          {[innerRadius, (innerRadius + outerRadius) / 2, outerRadius].map((radius) => (
            <circle
              key={radius}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="var(--color-border)"
              strokeDasharray="2 6"
            />
          ))}
          {result.playsByHour.map((count, hour) => {
            const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
            const endRadius =
              innerRadius + (count / hourMaximum) * (outerRadius - innerRadius);
            const isSelected = selectedTime?.hour === hour;
            return (
              <g
                key={hour}
                tabIndex={0}
                role="button"
                aria-label={`${hourLabel(hour)}:00 to ${hourLabel((hour + 1) % 24)}:00: ${formatCount(count)} recorded plays`}
                onFocus={() => onSelectTime({ hour, weekday: null })}
                onClick={() => onSelectTime({ hour, weekday: null })}
                className="chart-point"
              >
                <line
                  x1={center + Math.cos(angle) * innerRadius}
                  y1={center + Math.sin(angle) * innerRadius}
                  x2={center + Math.cos(angle) * endRadius}
                  y2={center + Math.sin(angle) * endRadius}
                  stroke={hour === peakHour ? "var(--color-accent)" : "var(--color-preview-purple)"}
                  strokeWidth={isSelected ? 6 : 4}
                  strokeLinecap="round"
                  opacity={count === 0 ? 0.24 : 0.42 + (count / hourMaximum) * 0.58}
                />
                <title>{hourLabel(hour)}:00 · {formatCount(count)} plays</title>
              </g>
            );
          })}
          {[0, 6, 12, 18].map((hour) => {
            const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
            const radius = outerRadius + 24;
            return (
              <text
                key={hour}
                x={center + Math.cos(angle) * radius}
                y={center + Math.sin(angle) * radius + 5}
                textAnchor="middle"
                fill="var(--color-fg-muted)"
                fontSize="14"
              >
                {hourLabel(hour)}
              </text>
            );
          })}
          <text x={center} y={center - 4} textAnchor="middle" fill="var(--color-fg)" fontSize="32" fontWeight="600">
            {selectedTime ? hourLabel(selectedHour) : "--"}
          </text>
          <text x={center} y={center + 24} textAnchor="middle" fill="var(--color-fg-muted)" fontSize="13">
            {selectedTime ? `${formatCount(result.playsByHour[selectedHour])} PLAYS` : "SELECT HOUR"}
          </text>
        </svg>
        <p className="muted text-center text-sm">
          00:00 midnight · 06:00 · 12:00 noon · 18:00 · {result.timeZone}
        </p>
        <p className="muted mt-2 text-center text-xs">
          Select an hour to highlight the same column in the weekday map.
        </p>
        <div className="hour-bars-scroll mt-6" role="group" aria-label="Exact recorded plays by hour">
          <div className="hour-bars">
            {result.playsByHour.map((count, hour) => {
              const isSelected = selectedTime?.hour === hour;
              return (
                <button
                  key={hour}
                  type="button"
                  className={`hour-bar-item${isSelected ? " is-active" : ""}`}
                  aria-label={`${hourLabel(hour)}:00: ${formatCount(count)} recorded plays`}
                  aria-pressed={isSelected}
                  title={`${hourLabel(hour)}:00 · ${formatCount(count)} recorded plays`}
                  onFocus={() => onSelectTime({ hour, weekday: null })}
                  onClick={() => onSelectTime({ hour, weekday: null })}
                >
                  <span className="hour-bar-track">
                    <span
                      className="hour-bar-fill"
                      style={{ height: `${Math.max(count > 0 ? 4 : 0, (count / hourMaximum) * 100)}%` }}
                    />
                  </span>
                  <span className="hour-bar-value">{formatCount(count)}</span>
                  <span className="hour-bar-label">{hour % 3 === 0 ? `${hourLabel(hour)}h` : ""}</span>
                </button>
              );
            })}
          </div>
        </div>
        <p className="muted mt-2 text-center text-xs">
          Hourly bars use the same local-time counts. Focus or select a bar for its exact value.
        </p>
        {hourSum !== result.stats.totalPlays && (
          <p className="muted mt-2 text-xs">
            {formatCount(result.stats.totalPlays - hourSum)} entries could not be assigned to a local hour.
          </p>
        )}
      </Panel>

      <Panel>
        <div>
          <p className="eyebrow">Weekday × hour</p>
          <h3 className="mt-1 text-xl font-semibold">Where the week changes shape</h3>
          <p className="muted mt-1 text-sm">
            Every cell is a valid entry in that local weekday and hour.
          </p>
        </div>
        {matrix ? (
          <>
            <div className="heatmap-scroll mt-5" role="region" aria-label="Scrollable weekday by hour heatmap">
              <div className="heatmap-grid">
                <div className="heatmap-corner" />
                {Array.from({ length: 24 }, (_, hour) => (
                  <span key={hour} className="heatmap-hour">
                    {hour % 3 === 0 ? hourLabel(hour) : ""}
                  </span>
                ))}
                {WEEKDAYS.map((day, weekday) => (
                  <div className="heatmap-row" key={day}>
                    <span className="heatmap-day">{day}</span>
                    {matrix[weekday].map((count, hour) => {
                      const active =
                        selectedTime !== null &&
                        selectedHour === hour &&
                        (selectedTime.weekday === null ||
                          selectedTime.weekday === weekday);
                      return (
                        <button
                          key={`${weekday}-${hour}`}
                          type="button"
                          className={`heatmap-cell${active ? " is-active" : ""}`}
                          style={{
                            backgroundColor: heatColor(count, matrixMaximum),
                          }}
                          aria-label={`${day}, ${hourLabel(hour)}:00 to ${hourLabel((hour + 1) % 24)}:00: ${formatCount(count)} plays`}
                          aria-pressed={active}
                          title={`${day} · ${hourLabel(hour)}:00 · ${formatCount(count)} plays`}
                          onFocus={() => onSelectTime({ weekday, hour })}
                          onClick={() => onSelectTime({ weekday, hour })}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
            <div className="heatmap-legend-row muted mt-4 text-xs">
              <span className="heatmap-legend-caption">Play count per cell</span>
              <span>0</span>
              <span className="heatmap-legend" aria-label={`Heat intensity: zero, ${formatCount(matrixMaximum / 2)} midpoint, and ${formatCount(matrixMaximum)} maximum plays`}>
                {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (
                  <i key={fraction} style={{ backgroundColor: heatColor(fraction * matrixMaximum, matrixMaximum) }} />
                ))}
              </span>
              <span>{formatCount(matrixMaximum)} plays</span>
            </div>
            <p className="mt-4 border-t border-[var(--color-border)] pt-4 text-sm" aria-live="polite">
              {selectedTime ? (
                <>
                  <strong>
                    {selectedTime.weekday === null
                      ? `All weekdays at ${hourLabel(selectedHour)}:00`
                      : `${WEEKDAYS[selectedDay]} at ${hourLabel(selectedHour)}:00`}
                  </strong>
                  <span className="muted">
                    {" "}· {formatCount(selectedTime.weekday === null
                      ? matrix.reduce((sum, row) => sum + row[selectedHour], 0)
                      : matrix[selectedDay][selectedHour])} recorded plays
                  </span>
                </>
              ) : (
                <span className="muted">Select a clock hour or a heatmap cell to inspect its exact count.</span>
              )}
            </p>
            <p className="muted mt-2 text-xs">
              Heatmap total {formatCount(heatmapSum)} · weekday histogram total {formatCount(weekdaySum)}
              {heatmapSum !== weekdaySum ? " (some entries lack a weekday/hour assignment)" : ""}
            </p>
          </>
        ) : (
          <EmptyPanel>
            The saved summary doesn’t include weekday-by-hour counts yet.
            Re-import to enable this detailed heatmap.
          </EmptyPanel>
        )}
        <details className="mt-5">
          <summary className="muted w-fit cursor-pointer text-sm underline underline-offset-4">
            Inspect exact hourly counts
          </summary>
          <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {result.playsByHour.map((count, hour) => (
              <div key={hour} className="flex justify-between gap-2 rounded bg-[var(--color-bg-soft)] px-2 py-1.5 text-xs">
                <span className="muted">{hourLabel(hour)}:00</span>
                <span className="tabular-nums">{formatCount(count)}</span>
              </div>
            ))}
          </div>
        </details>
      </Panel>
    </div>
  );
}

const TRACK_CHART_WIDTH = 1200;
const TRACK_CHART_HEIGHT = 480;
const TRACK_PLOT = { left: 92, right: 1164, top: 42, bottom: 398 };

function drawTrackFocus(
  canvas: HTMLCanvasElement | null,
  track: RankedItem | null,
  point: { x: number; y: number } | null,
) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) return;
  const ratio = window.devicePixelRatio || 1;
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  context.clearRect(0, 0, TRACK_CHART_WIDTH, TRACK_CHART_HEIGHT);
  if (!track || !point) return;
  const style = getComputedStyle(document.documentElement);
  context.fillStyle = style.getPropertyValue("--color-fg").trim();
  context.beginPath();
  context.arc(point.x, point.y, 7, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = style.getPropertyValue("--color-accent").trim();
  context.lineWidth = 2;
  context.beginPath();
  context.arc(point.x, point.y, 10, 0, Math.PI * 2);
  context.stroke();
}

function TrackScatterPlot({
  tracks,
  measure,
  selectedTrack,
  onSelectTrack,
}: {
  tracks: RankedItem[];
  measure: "time" | "average";
  selectedTrack: RankedItem | null;
  onSelectTrack: (track: RankedItem) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const focusTrackRef = useRef<RankedItem | null>(null);
  const pointByTrackRef = useRef(new Map<string, { x: number; y: number; track: RankedItem }>());
  const spatialIndexRef = useRef(new Map<string, Array<{ x: number; y: number; track: RankedItem }>>());
  const [hoveredTrack, setHoveredTrack] = useState<RankedItem | null>(null);
  const maximumPlays = tracks.reduce((max, track) => Math.max(max, track.plays), 1);
  const maximumMeasure = tracks.reduce(
    (max, track) =>
      Math.max(max, measure === "time" ? track.msPlayed : track.msPlayed / track.plays),
    1,
  );
  const logarithmicX = Math.log1p(maximumPlays);
  const logarithmicY = Math.log1p(maximumMeasure);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = TRACK_CHART_WIDTH * ratio;
      canvas.height = TRACK_CHART_HEIGHT * ratio;
      if (overlayRef.current) {
        overlayRef.current.width = TRACK_CHART_WIDTH * ratio;
        overlayRef.current.height = TRACK_CHART_HEIGHT * ratio;
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, TRACK_CHART_WIDTH, TRACK_CHART_HEIGHT);

      const style = getComputedStyle(document.documentElement);
      const border = style.getPropertyValue("--color-border-strong").trim();
      const muted = style.getPropertyValue("--color-fg-muted").trim();
      const accent = style.getPropertyValue("--color-accent").trim();
      context.font = "12px ui-monospace, monospace";
      context.textBaseline = "middle";
      const plotWidth = TRACK_PLOT.right - TRACK_PLOT.left;
      const plotHeight = TRACK_PLOT.bottom - TRACK_PLOT.top;
      const pointByTrack = new Map<string, { x: number; y: number; track: RankedItem }>();
      const spatialIndex = new Map<string, Array<{ x: number; y: number; track: RankedItem }>>();
      const cellSize = 12;

      for (const fraction of [0, 0.5, 1]) {
        const x = TRACK_PLOT.left + fraction * plotWidth;
        const y = TRACK_PLOT.bottom - fraction * plotHeight;
        const playTick = Math.expm1(logarithmicX * fraction);
        const measureTick = Math.expm1(logarithmicY * fraction);
        context.strokeStyle = border;
        context.setLineDash([3, 7]);
        context.beginPath();
        context.moveTo(x, TRACK_PLOT.top);
        context.lineTo(x, TRACK_PLOT.bottom);
        context.moveTo(TRACK_PLOT.left, y);
        context.lineTo(TRACK_PLOT.right, y);
        context.stroke();
        context.setLineDash([]);
        context.fillStyle = muted;
        context.textAlign = "center";
        context.fillText(formatCount(playTick), x, TRACK_PLOT.bottom + 18);
        context.textAlign = "right";
        context.fillText(
          measure === "time"
            ? formatDuration(measureTick)
            : formatAverageDuration(measureTick),
          TRACK_PLOT.left - 10,
          y,
        );
      }

      context.fillStyle = muted;
      context.textAlign = "center";
      context.font = "13px ui-sans-serif, system-ui, sans-serif";
      context.fillText("Recorded plays · logarithmic scale", (TRACK_PLOT.left + TRACK_PLOT.right) / 2, 458);
      context.save();
      context.translate(18, (TRACK_PLOT.top + TRACK_PLOT.bottom) / 2);
      context.rotate(-Math.PI / 2);
      context.fillText(
        measure === "time" ? "Total recorded listening time" : "Average duration per entry",
        0,
        0,
      );
      context.restore();

      context.fillStyle = accent;
      context.globalAlpha = 0.58;
      context.beginPath();
      for (const track of tracks) {
        const value = measure === "time" ? track.msPlayed : track.msPlayed / track.plays;
        const x = TRACK_PLOT.left + (Math.log1p(track.plays) / logarithmicX) * plotWidth;
        const y = TRACK_PLOT.bottom - (Math.log1p(value) / logarithmicY) * plotHeight;
        const point = { x, y, track };
        pointByTrack.set(trackIdentityKey(track), point);
        const cell = `${Math.floor(x / cellSize)}:${Math.floor(y / cellSize)}`;
        const bucket = spatialIndex.get(cell);
        if (bucket) bucket.push(point);
        else spatialIndex.set(cell, [point]);
        context.moveTo(x + 3, y);
        context.arc(x, y, 3, 0, Math.PI * 2);
      }
      context.fill();
      context.globalAlpha = 1;

      pointByTrackRef.current = pointByTrack;
      spatialIndexRef.current = spatialIndex;
      drawTrackFocus(
        overlayRef.current,
        focusTrackRef.current,
        focusTrackRef.current
          ? pointByTrack.get(trackIdentityKey(focusTrackRef.current)) ?? null
          : null,
      );
    };

    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [tracks, measure, logarithmicX, logarithmicY]);

  useEffect(() => {
    const canvas = overlayRef.current;
    const focusTrack = hoveredTrack ?? selectedTrack;
    focusTrackRef.current = focusTrack;
    const point = focusTrack
      ? pointByTrackRef.current.get(trackIdentityKey(focusTrack)) ?? null
      : null;
    drawTrackFocus(canvas, focusTrack, point);
  }, [selectedTrack, hoveredTrack, tracks, measure]);
  function getPointAtEvent(event: React.PointerEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * TRACK_CHART_WIDTH;
    const y = ((event.clientY - rect.top) / rect.height) * TRACK_CHART_HEIGHT;
    let nearest: { x: number; y: number; track: RankedItem } | null = null;
    let nearestDistance = 15 ** 2;
    const cellX = Math.floor(x / 12);
    const cellY = Math.floor(y / 12);
    for (let dx = -1; dx <= 1; dx += 1) {
      for (let dy = -1; dy <= 1; dy += 1) {
        const candidates = spatialIndexRef.current.get(`${cellX + dx}:${cellY + dy}`) ?? [];
        for (const point of candidates) {
          const distance = (point.x - x) ** 2 + (point.y - y) ** 2;
          if (distance < nearestDistance) {
            nearest = point;
            nearestDistance = distance;
          }
        }
      }
    }
    return nearest?.track ?? null;
  }

  return (
    <div>
      <div className="track-scatter-wrap">
        <canvas
          ref={canvasRef}
          className="track-scatter-canvas"
          role="img"
          aria-label={`Interactive scatter plot of ${tracks.length.toLocaleString()} track identities by recorded plays and ${measure === "time" ? "total listening time" : "average duration per entry"}, logarithmic scales. Use the searchable ranking below for keyboard selection.`}
        />
        <canvas
          ref={overlayRef}
          className="track-scatter-overlay"
          aria-hidden="true"
          onPointerMove={(event) => setHoveredTrack(getPointAtEvent(event))}
          onPointerLeave={() => setHoveredTrack(null)}
          onPointerDown={(event) => {
            const track = getPointAtEvent(event);
            if (track) onSelectTrack(track);
          }}
        />
      </div>
      {hoveredTrack && (
        <div className="chart-hover-detail" role="status">
          <strong>{hoveredTrack.name}</strong>
          <span>{hoveredTrack.artistName ?? "Artist unavailable"}</span>
          <span>{formatCount(hoveredTrack.plays)} plays</span>
          <span>{formatDuration(hoveredTrack.msPlayed)} total</span>
          <span>{formatAverageDuration(hoveredTrack.msPlayed / hoveredTrack.plays)} per entry</span>
        </div>
      )}
      {!hoveredTrack && selectedTrack && (
        <div className="chart-hover-detail" role="status">
          <strong>{selectedTrack.name}</strong>
          <span>{selectedTrack.artistName ?? "Artist unavailable"}</span>
          <span>{formatCount(selectedTrack.plays)} plays</span>
          <span>{formatDuration(selectedTrack.msPlayed)} total</span>
          <span>{formatAverageDuration(selectedTrack.msPlayed / selectedTrack.plays)} per entry</span>
        </div>
      )}
    </div>
  );
}

export function TrackExplorer({
  result,
  selectedArtist,
  onSelectArtist,
}: {
  result: AnalysisResult;
} & SharedFilterProps) {
  const allTracks = result.trackIdentities ?? result.topTracks;
  const tracks = selectedArtist
    ? allTracks.filter(
        (track) => track.artistName?.toLocaleLowerCase() === selectedArtist.toLocaleLowerCase(),
      )
    : allTracks;
  const [sortBy, setSortBy] = useState<"plays" | "time" | "average">("plays");
  const [plotMeasure, setPlotMeasure] = useState<"time" | "average">("time");
  const [viewMode, setViewMode] = useState<"ranking" | "scatter">("ranking");
  const [query, setQuery] = useState("");
  const [selectedTrackKey, setSelectedTrackKey] = useState("");
  const [visibleCount, setVisibleCount] = useState(30);
  const sorted = useMemo(
    () =>
      [...tracks].sort((a, b) =>
        sortBy === "plays"
          ? b.plays - a.plays || b.msPlayed - a.msPlayed
          : sortBy === "time"
            ? b.msPlayed - a.msPlayed || b.plays - a.plays
            : b.msPlayed / b.plays - a.msPlayed / a.plays || b.plays - a.plays,
      ),
    [tracks, sortBy],
  );
  const filtered = useMemo(
    () =>
      sorted.filter((track) =>
        `${track.name} ${track.artistName ?? ""} ${track.albumName ?? ""}`
          .toLocaleLowerCase()
          .includes(query.trim().toLocaleLowerCase()),
      ),
    [sorted, query],
  );
  const selected =
    filtered.find((track) => trackIdentityKey(track) === selectedTrackKey) ??
    filtered[0] ??
    null;
  const selectedRank = selected
    ? sorted.findIndex((track) => trackIdentityKey(track) === trackIdentityKey(selected)) + 1
    : 0;

  if (!allTracks.length) {
    return (
      <EmptyPanel>
        No track ranking is available in this summary. Re-import the history to
        inspect track identities.
      </EmptyPanel>
    );
  }

  return (
    <Panel>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Track identity explorer</p>
          <h3 className="mt-1 text-2xl font-semibold">Find the tracks behind the totals</h3>
          <p className="muted mt-2 max-w-2xl text-sm">
            Each row is one title + artist + album identity. Search and sort the
            ranking, or switch to the scatter plot to compare tracks visually.
          </p>
        </div>
        <div className="track-view-controls">
          <div className="track-view-toggle" role="group" aria-label="Track visualization">
            {(["ranking", "scatter"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={viewMode === mode}
                onClick={() => setViewMode(mode)}
              >
                {mode === "ranking" ? "Ranked list" : "Scatter plot"}
              </button>
            ))}
          </div>
          {viewMode === "scatter" && (
            <label className="muted flex items-center gap-2 text-sm">
              Vertical measure
              <select
                className="report-select"
                value={plotMeasure}
                onChange={(event) =>
                  setPlotMeasure(event.target.value === "average" ? "average" : "time")
                }
              >
                <option value="time">Total listening time</option>
                <option value="average">Average per entry</option>
              </select>
            </label>
          )}
        </div>
      </div>
      <p className="subtle mt-3 text-xs">
        {filtered.length.toLocaleString()} of {allTracks.length.toLocaleString()} track identities
        {selectedArtist ? ` for ${selectedArtist}` : ""}. Album artwork is not included in the imported data.
      </p>
      {viewMode === "scatter" && filtered.length > 0 ? (
        <TrackScatterPlot
          key={`${selectedArtist ?? ""}\u0000${query}`}
          tracks={filtered}
          measure={plotMeasure}
          selectedTrack={selected}
          onSelectTrack={(track) => {
            setSelectedTrackKey(trackIdentityKey(track));
            if (track.artistName) onSelectArtist(track.artistName);
          }}
        />
      ) : viewMode === "scatter" ? (
        <EmptyPanel>
          No track identity with artist metadata matches the selected artist.
          Clear the artist filter to explore the full track list.
        </EmptyPanel>
      ) : null}
      {selected && (
        <div className="track-detail" aria-live="polite">
          <div>
            <p className="eyebrow">Track detail · rank #{selectedRank} by {sortBy === "plays" ? "plays" : sortBy === "time" ? "listening time" : "average duration"}</p>
            <h4 className="mt-1 text-xl font-semibold">{selected.name}</h4>
            <p className="muted mt-1 text-sm">
              {selected.artistName ?? "Artist unavailable"}
              {selected.albumName ? ` · ${selected.albumName}` : ""}
            </p>
          </div>
          <ArtistMetric label="Recorded plays" value={formatCount(selected.plays)} />
          <ArtistMetric label="Total listening time" value={formatDuration(selected.msPlayed)} />
          <ArtistMetric label="Average per entry" value={formatAverageDuration(selected.msPlayed / selected.plays)} />
        </div>
      )}
      {viewMode === "scatter" && (
        <p className="muted mt-3 text-xs">
          A point higher than its neighbors has more time on the selected vertical measure per play scale. No skips or completion behavior is inferred.
        </p>
      )}

      <div className="mt-8 border-t border-[var(--color-border)] pt-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h4 className="text-xl font-semibold">Explore track ranking</h4>
            <p className="muted mt-1 text-sm">
              {filtered.length.toLocaleString()} matching identities · sorted by {sortBy === "plays" ? "recorded plays" : sortBy === "time" ? "total listening time" : "average duration per entry"}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="sr-only" htmlFor="track-search">Search tracks and artists</label>
            <input
              id="track-search"
              className="report-input"
              type="search"
              value={query}
              placeholder="Search tracks, artists, albums"
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(30);
              }}
            />
            <label className="muted flex items-center gap-2 text-sm">
              Sort
              <select
                className="report-select"
                value={sortBy}
                onChange={(event) => {
                  const value = event.target.value;
                  setSortBy(value === "time" || value === "average" ? value : "plays");
                }}
              >
                <option value="plays">Recorded plays</option>
                <option value="time">Listening time</option>
                <option value="average">Average duration per entry</option>
              </select>
            </label>
          </div>
        </div>
        {selectedArtist && (
          <div className="filter-chip mt-4">
            <span>Artist filter: <strong>{selectedArtist}</strong></span>
            <button type="button" aria-label="Remove artist filter" onClick={() => onSelectArtist(null)}>×</button>
          </div>
        )}
        <ol className="track-explorer mt-4" aria-label="Track identity ranking">
          {filtered.slice(0, visibleCount).map((track) => {
            const rank = sorted.findIndex(
              (item) => trackIdentityKey(item) === trackIdentityKey(track),
            ) + 1;
            const isSelected =
              !!selected &&
              trackIdentityKey(selected) === trackIdentityKey(track);
            return (
              <li key={trackIdentityKey(track)}>
                <button
                  type="button"
                  className="track-explorer-row"
                  aria-pressed={isSelected}
                  onFocus={() => setSelectedTrackKey(trackIdentityKey(track))}
                  onClick={() => {
                    setSelectedTrackKey(trackIdentityKey(track));
                    if (track.artistName) onSelectArtist(track.artistName);
                  }}
                >
                  <span className="subtle artist-rank">{String(rank).padStart(3, "0")}</span>
                  <span className="track-name">
                    <strong>{track.name}</strong>
                    <small>{track.artistName ?? "Artist unavailable"}{track.albumName ? ` · ${track.albumName}` : ""}</small>
                  </span>
                  <span className="track-value">
                    {sortBy === "average"
                      ? formatAverageDuration(track.msPlayed / track.plays)
                      : sortBy === "time"
                        ? formatDuration(track.msPlayed)
                        : `${formatCount(track.plays)} plays`}
                    <small>{formatCount(track.plays)} plays · {formatDuration(track.msPlayed)} total</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        {filtered.length === 0 && (
          <p className="muted py-6 text-center text-sm">No tracks match that search.</p>
        )}
        {visibleCount < filtered.length && (
          <button
            type="button"
            className="btn btn-secondary mt-4 w-full"
            onClick={() => setVisibleCount((count) => count + 30)}
          >
            Show more tracks ({(filtered.length - visibleCount).toLocaleString()} remaining)
          </button>
        )}
        {result.version < 3 && (
          <p className="muted mt-4 text-xs">
            This earlier summary groups tracks by title and includes only the original top ten. Re-import to separate titles using artist and album metadata.
          </p>
        )}
      </div>
    </Panel>
  );
}

function trackIdentityKey(track: RankedItem) {
  return `${track.name.toLocaleLowerCase()}\u0000${track.artistName?.toLocaleLowerCase() ?? ""}\u0000${track.albumName?.toLocaleLowerCase() ?? ""}`;
}

function heatColor(value: number, maximum: number) {
  const strength = maximum === 0 ? 0 : value / maximum;
  if (strength === 0) return "var(--color-bg-soft)";
  const opacity = 0.15 + strength * 0.85;
  return `color-mix(in srgb, var(--color-accent) ${Math.round(opacity * 100)}%, var(--color-bg-soft))`;
}

export function MeasureToggle({
  value,
  onChange,
}: {
  value: "plays" | "time";
  onChange: (value: "plays" | "time") => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[var(--color-border-strong)] p-1" role="group" aria-label="Rank artists or tracks by">
      {(["plays", "time"] as const).map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
          className={`min-h-9 rounded-full px-3 text-xs font-medium ${
            value === option
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
              : "muted hover:text-[var(--color-fg)]"
          }`}
        >
          {option === "plays" ? "Recorded plays" : "Listening time"}
        </button>
      ))}
    </div>
  );
}

export function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="report-panel">
      {children}
    </div>
  );
}

export function EmptyPanel({ children }: { children: React.ReactNode }) {
  return (
    <div className="report-empty">
      <p className="muted text-sm">{children}</p>
    </div>
  );
}

export function formatCount(value: number) {
  return Math.round(value).toLocaleString();
}

export function formatPercent(value: number) {
  return `${value.toFixed(value < 10 ? 1 : 0)}%`;
}

export function formatDuration(ms: number) {
  const roundedMinutes = Math.round(ms / 60_000);
  if (roundedMinutes < 60) return `${roundedMinutes.toLocaleString()} min`;
  const hours = Math.floor(roundedMinutes / 60);
  const minutes = roundedMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function formatAverageDuration(ms: number) {
  const seconds = ms / 1_000;
  if (seconds < 60) {
    return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)} sec`;
  }
  return formatDuration(ms);
}

function formatMeasure(value: number, measure: "plays" | "time") {
  return measure === "plays" ? `${formatCount(value)} plays` : formatDuration(value);
}

function hourLabel(hour: number) {
  return String(hour).padStart(2, "0");
}
