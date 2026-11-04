"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

const previews = [
  {
    id: "clock",
    number: "01",
    title: "Listening clock",
    detail: "The hours music finds you",
    note: "A rhythm of plays across your local day.",
  },
  {
    id: "artists",
    number: "02",
    title: "Artist universe",
    detail: "The names in your orbit",
    note: "A visual map of your most-played artists.",
  },
  {
    id: "heatmap",
    number: "03",
    title: "Listening DNA",
    detail: "The texture of your history",
    note: "A calendar view of listening intensity.",
  },
  {
    id: "evolution",
    number: "04",
    title: "Musical evolution",
    detail: "Your soundtrack, over time",
    note: "A timeline showing when your habits shift.",
  },
] as const;

type PreviewId = (typeof previews)[number]["id"];
const previewDurationMs = 3_200;

const heatLevels = [
  0, 1, 0, 2, 1, 3, 0, 2, 4, 1, 0, 2, 3, 0, 1, 4, 2, 0, 3, 1, 0, 2, 4, 1,
  2, 0, 3, 1, 4, 2, 0, 1, 3, 2, 0, 4, 1, 0, 2, 3, 1, 4, 0, 2, 3, 1, 0, 2,
  4, 1, 3, 0, 2, 4, 1, 0, 3, 2, 1, 4, 0, 2, 3, 1, 0, 4, 2, 1, 3, 0, 2, 4,
  1, 0, 3, 2, 4, 1, 0, 2, 3, 1, 4, 0, 2, 3,
];

function subscribeToMotionPreference(onChange: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", onChange);
  return () => preference.removeEventListener("change", onChange);
}

function getMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function InsightsSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState<PreviewId>("clock");
  const [isInView, setIsInView] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(true);
  const prefersReducedMotion = useSyncExternalStore(
    subscribeToMotionPreference,
    getMotionPreference,
    () => false,
  );
  const activePreview = previews.find((preview) => preview.id === selected)!;

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    if (typeof IntersectionObserver === "undefined") {
      const timeout = window.setTimeout(() => setIsInView(true), 0);
      return () => window.clearTimeout(timeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.1 },
    );
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const updateVisibility = () => {
      setIsDocumentVisible(document.visibilityState === "visible");
    };
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () => document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useEffect(() => {
    if (!isInView || !isDocumentVisible) return;

    const interval = window.setInterval(() => {
      setSelected((current) => {
        const index = previews.findIndex((preview) => preview.id === current);
        const nextIndex = (index + 1) % previews.length;
        return previews[nextIndex].id;
      });
    }, previewDurationMs);

    return () => window.clearInterval(interval);
  }, [isDocumentVisible, isInView]);

  return (
    <section
      ref={sectionRef}
      id="insights"
      aria-labelledby="insights-heading"
      className="border-t border-[var(--color-border)] py-[var(--section-y)]"
    >
      <div className="page-shell">
        <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
          <div>
            <p className="eyebrow">The shape of a soundtrack</p>
            <h2
              id="insights-heading"
              className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl"
            >
              Not just what you play.
              <span className="text-[var(--color-fg-muted)]">
                {" "}The patterns behind it.
              </span>
            </h2>
          </div>
          <p className="muted max-w-xl text-base leading-relaxed">
            Your export can reveal when music fits into your day, which artists
            stay in rotation, and how listening changes over time. Take a look
            at the kinds of views your own history can create.
          </p>
        </div>

        <div className="preview-stage mt-10 overflow-hidden border-y border-[var(--color-border)]">
          <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
            <div className="flex flex-col justify-between border-b border-[var(--color-border)] p-5 sm:p-8 lg:border-b-0 lg:border-r">
              <div>
                <p className="subtle font-mono text-xs tracking-[0.12em]">
                  FOUR WAYS IN
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                  {previews.map((preview) => (
                    <button
                      key={preview.id}
                      type="button"
                      aria-pressed={selected === preview.id}
                      onClick={() => setSelected(preview.id)}
                      className={`preview-choice text-left ${
                        selected === preview.id ? "is-selected" : ""
                      }`}
                    >
                      <span className="preview-choice-number">
                        {preview.number}
                      </span>
                      <span className="preview-choice-title">
                        {preview.title}
                      </span>
                      <span className="preview-choice-detail">
                        {preview.detail}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-[var(--color-fg-muted)]">
                  {prefersReducedMotion
                    ? "Views cycle automatically every few seconds; reduced motion is respected. Choose any view to jump to it. Every chart is illustrative; only an imported export can produce your results."
                    : "Views cycle automatically every few seconds. Choose any view to jump to it. Every chart is illustrative; only an imported export can produce your results."}
                </p>
            </div>

            <div
              className="relative flex min-h-[19rem] flex-col justify-between p-5 sm:min-h-[25rem] sm:p-8"
              aria-live="off"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="eyebrow">{activePreview.number} / 04</p>
                  <h3 className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                    {activePreview.title}
                  </h3>
                  <p className="muted mt-1 text-sm">{activePreview.note}</p>
                </div>
                <span className="illustration-stamp">
                  Illustrative
                  <span className="hidden sm:inline"> · not your data</span>
                </span>
              </div>

              <div className="preview-visual mt-6" key={selected}>
                <PreviewVisual id={selected} />
              </div>

              <p className="subtle mt-3 text-xs">
                Concept preview · no personal or sample statistics shown
              </p>
            </div>
          </div>
        </div>

        <p className="muted mt-5 max-w-3xl text-sm">
          Actual results are calculated only from the Spotify JSON history you
          choose. Genres and artist connections aren’t guessed from listening
          records.
        </p>
      </div>
    </section>
  );
}

function PreviewVisual({ id }: { id: PreviewId }) {
  if (id === "clock") {
    const activity = [
      0.18, 0.12, 0.08, 0.05, 0.08, 0.14, 0.22, 0.35, 0.48, 0.56, 0.62, 0.7,
      0.63, 0.55, 0.5, 0.58, 0.72, 0.88, 1, 0.92, 0.78, 0.66, 0.44, 0.28,
    ];
    const center = 150;
    return (
      <svg
        viewBox="0 0 300 300"
        role="img"
        aria-label="Illustrative radial listening clock, not based on visitor data"
        className="mx-auto block h-[15rem] w-full max-w-[19rem]"
      >
        {[57, 78, 99].map((radius) => (
          <circle
            key={radius}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="var(--color-border-strong)"
            strokeDasharray="2 6"
          />
        ))}
        {activity.map((level, hour) => {
          const angle = (hour / 24) * Math.PI * 2 - Math.PI / 2;
          const start = 58;
          const end = start + level * 43;
          const x1 = Math.round((center + Math.cos(angle) * start) * 1000) / 1000;
          const y1 = Math.round((center + Math.sin(angle) * start) * 1000) / 1000;
          const x2 = Math.round((center + Math.cos(angle) * end) * 1000) / 1000;
          const y2 = Math.round((center + Math.sin(angle) * end) * 1000) / 1000;
          return (
            <line
              key={hour}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={hour > 16 && hour < 22 ? "var(--color-accent)" : "var(--color-preview-purple)"}
              strokeLinecap="round"
              strokeWidth="4"
              opacity="0.88"
            />
          );
        })}
        <text
          x={center}
          y={center - 3}
          textAnchor="middle"
          fill="var(--color-fg)"
          fontSize="12"
          letterSpacing="2"
        >
          YOUR DAY
        </text>
        <text
          x={center}
          y={center + 17}
          textAnchor="middle"
          fill="var(--color-fg-subtle)"
          fontSize="9"
          letterSpacing="1.5"
        >
          24 HOURS
        </text>
      </svg>
    );
  }

  if (id === "artists") {
    const nodes = [
      [75, 95, 10],
      [145, 58, 15],
      [224, 90, 8],
      [104, 170, 7],
      [189, 154, 11],
      [253, 205, 6],
      [143, 232, 9],
      [59, 224, 5],
    ];
    const links = [
      [0, 1],
      [1, 2],
      [0, 3],
      [1, 3],
      [1, 4],
      [2, 4],
      [3, 4],
      [4, 5],
      [3, 6],
      [4, 6],
      [6, 7],
    ];
    return (
      <svg
        viewBox="0 0 310 280"
        role="img"
        aria-label="Illustrative artist-universe diagram, not based on visitor data"
        className="mx-auto block h-[15rem] w-full max-w-[25rem]"
      >
        {links.map(([from, to]) => (
          <line
            key={`${from}-${to}`}
            x1={nodes[from][0]}
            y1={nodes[from][1]}
            x2={nodes[to][0]}
            y2={nodes[to][1]}
            stroke="var(--color-border-strong)"
            strokeWidth="1.2"
          />
        ))}
        {nodes.map(([x, y, radius], index) => (
          <g key={index}>
            <circle
              cx={x}
              cy={y}
              r={radius * 1.8}
              fill={index % 2 ? "var(--color-preview-purple)" : "var(--color-accent)"}
              opacity="0.08"
            />
            <circle
              cx={x}
              cy={y}
              r={radius}
              fill={index % 2 ? "var(--color-preview-purple)" : "var(--color-accent)"}
            />
          </g>
        ))}
        <text
          x="155"
          y="270"
          textAnchor="middle"
          fill="var(--color-fg-subtle)"
          fontSize="10"
          letterSpacing="1.5"
        >
          CONCEPTUAL MAP · NO REAL CONNECTIONS
        </text>
      </svg>
    );
  }

  if (id === "heatmap") {
    return (
      <div
        role="img"
        aria-label="Illustrative calendar heatmap, not based on visitor data"
        className="mx-auto grid w-full max-w-[28rem] grid-flow-col grid-rows-7 gap-1.5 sm:gap-2"
      >
        {heatLevels.map((level, index) => (
          <span
            key={index}
            className={`preview-heat preview-heat-${level}`}
          />
        ))}
      </div>
    );
  }

  return (
    <svg
      viewBox="0 0 520 230"
      role="img"
      aria-label="Illustrative listening timeline, not based on visitor data"
      className="mx-auto block h-[15rem] w-full max-w-[34rem]"
    >
      <line
        x1="20"
        y1="190"
        x2="500"
        y2="190"
        stroke="var(--color-border-strong)"
      />
      <path
        d="M20 171 C55 168 67 138 100 149 S154 179 190 139 S240 119 270 129 S319 157 350 112 S403 120 430 84 S474 94 500 45"
        fill="none"
        stroke="var(--color-accent)"
        strokeLinecap="round"
        strokeWidth="3"
      />
      <path
        d="M20 171 C55 168 67 138 100 149 S154 179 190 139 S240 119 270 129 S319 157 350 112 S403 120 430 84 S474 94 500 45 L500 190 L20 190 Z"
        fill="url(#evolution-fill)"
        opacity="0.26"
      />
      <path
        d="M20 182 C72 175 89 167 130 173 S203 154 240 160 S305 141 344 151 S414 118 449 129 S476 113 500 104"
        fill="none"
        stroke="var(--color-preview-purple)"
        strokeLinecap="round"
        strokeWidth="2"
      />
      <defs>
        <linearGradient id="evolution-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="var(--color-accent)" />
          <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[90, 210, 330, 450].map((x, index) => (
        <circle
          key={x}
          cx={x}
          cy={[151, 139, 125, 75][index]}
          r="4"
          fill="var(--color-fg)"
          stroke="var(--color-bg)"
          strokeWidth="2"
        />
      ))}
      <text x="20" y="215" fill="var(--color-fg-subtle)" fontSize="10">
        THEN
      </text>
      <text
        x="500"
        y="215"
        textAnchor="end"
        fill="var(--color-fg-subtle)"
        fontSize="10"
      >
        LATER
      </text>
    </svg>
  );
}
