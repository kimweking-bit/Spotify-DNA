"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import {
  ANALYSIS_STORAGE_KEY,
  LEGACY_ANALYSIS_STORAGE_KEY,
  PREVIOUS_ANALYSIS_STORAGE_KEY,
  type AnalysisResult,
  type OutMsg,
} from "@/lib/analysis-types";
import {
  IMPORT_SIZE_WARNING_BYTES,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_FILE_COUNT,
  MAX_IMPORT_TOTAL_BYTES,
} from "@/lib/import-limits";

const steps = [
  {
    step: "01",
    title: "Request your export",
    body: "In Spotify, open Account → Privacy → Download your data. Choose extended streaming history when available.",
  },
  {
    step: "02",
    title: "Unzip the download",
    body: "Select the StreamingHistory or endsong JSON files from Spotify’s export. ZIP archives are not accepted yet.",
  },
  {
    step: "03",
    title: "Import your history",
    body: "Choose your JSON files. Analysis runs in a browser Worker; only a compact summary stays in this tab.",
  },
] as const;

export function ImportSection() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestIdRef = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");

  function stopAnalysis() {
    if (requestIdRef.current) {
      workerRef.current?.postMessage({
        type: "cancel",
        requestId: requestIdRef.current,
      });
    }
    workerRef.current?.terminate();
    workerRef.current = null;
    requestIdRef.current = null;
    setBusy(false);
  }

  async function analyzeFiles(fileList: FileList | File[]) {
    if (busy) return;
    setError("");
    setWarning("");
    setStatus("");
    const files = Array.from(fileList);

    if (!files.length) return;
    if (files.length > MAX_IMPORT_FILE_COUNT) {
      setError(`Choose no more than ${MAX_IMPORT_FILE_COUNT} JSON files at once.`);
      return;
    }
    if (files.some((file) => !file.name.toLowerCase().endsWith(".json"))) {
      setError("Select Spotify JSON history files. Unzip the Spotify download first; ZIP files are not supported.");
      return;
    }
    const oversized = files.find((file) => file.size > MAX_IMPORT_FILE_BYTES);
    if (oversized) {
      setError(`${oversized.name} exceeds the 50 MB per-file limit. Split or remove it and try again.`);
      return;
    }
    const totalBytes = files.reduce((total, file) => total + file.size, 0);
    if (totalBytes > MAX_IMPORT_TOTAL_BYTES) {
      setError("The selected files exceed the 100 MB total limit. Select fewer files and analyze the rest separately.");
      return;
    }
    if (totalBytes > IMPORT_SIZE_WARNING_BYTES) {
      setWarning("Large exports can use substantial browser memory and may take several minutes to analyze.");
    }

    setBusy(true);
    setStatus("Reading selected files…");
    let worker: Worker;
    try {
      worker = new Worker(
        new URL("../workers/analyze.worker.ts", import.meta.url),
        { type: "module" },
      );
    } catch {
      setBusy(false);
      setStatus("");
      setError("Your browser could not start the analysis Worker. Try a current browser with JavaScript and Workers enabled.");
      return;
    }
    const requestId = crypto.randomUUID();
    workerRef.current = worker;
    requestIdRef.current = requestId;

    worker.onmessage = (event: MessageEvent<OutMsg>) => {
      const message = event.data;
      if (message.requestId !== requestId) return;

      if (message.type === "progress") {
        const progress = Math.round(message.ratio * 100);
        setStatus(
          message.phase === "parse"
            ? `Reading file ${progress}%…`
            : message.phase === "aggregate"
              ? `Analyzing listening history ${progress}%…`
              : "Preparing your listening profile…",
        );
        return;
      }

      worker.terminate();
      workerRef.current = null;
      requestIdRef.current = null;
      setBusy(false);

      if (message.type === "error") {
        setError(message.message);
        setStatus("");
        return;
      }

      try {
        sessionStorage.removeItem(LEGACY_ANALYSIS_STORAGE_KEY);
        sessionStorage.removeItem(PREVIOUS_ANALYSIS_STORAGE_KEY);
        sessionStorage.setItem(
          ANALYSIS_STORAGE_KEY,
          JSON.stringify(message.result satisfies AnalysisResult),
        );
      } catch {
        setError("Your browser could not save this tab’s analysis summary. Check available site storage and try again.");
        setStatus("");
        return;
      }
      router.push("/identity");
    };

    worker.onerror = () => {
      worker.terminate();
      workerRef.current = null;
      requestIdRef.current = null;
      setBusy(false);
      setStatus("");
      setError("The analysis Worker stopped unexpectedly. Your files were not uploaded; please try again.");
    };
    worker.onmessageerror = () => {
      worker.terminate();
      workerRef.current = null;
      requestIdRef.current = null;
      setBusy(false);
      setStatus("");
      setError("The analysis result could not be read. Your files were not uploaded; please try again.");
    };

    try {
      const buffers = await Promise.all(
        files.map(async (file) => ({
          name: file.name,
          buffer: await file.arrayBuffer(),
        })),
      );
      if (requestIdRef.current !== requestId) return;
      setStatus("Analyzing in your browser…");
      worker.postMessage(
        {
          type: "analyze",
          files: buffers,
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          requestId,
        },
        buffers.map((file) => file.buffer),
      );
    } catch {
      worker.terminate();
      workerRef.current = null;
      requestIdRef.current = null;
      setBusy(false);
      setStatus("");
      setError("Could not read one or more selected files. Check that they are accessible and try again.");
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.currentTarget.files) void analyzeFiles(event.currentTarget.files);
    event.currentTarget.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files) void analyzeFiles(event.dataTransfer.files);
  }

  return (
    <section
      id="import"
      aria-labelledby="import-heading"
      className="border-t border-[var(--color-border)] py-[var(--section-y)]"
    >
      <div className="page-shell">
        <div className="max-w-2xl">
          <p className="eyebrow">Import</p>
          <h2 id="import-heading" className="mt-3 max-w-xl text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-4xl">
            Bring your own listening history
          </h2>
          <p className="muted mt-4 text-base leading-relaxed sm:text-lg">
            Choose one or more Spotify streaming-history JSON files. Analysis
            runs on your device; raw files are not uploaded or saved. See{" "}
            <Link
              href="/privacy"
              className="text-[var(--color-fg)] underline decoration-[var(--color-border-strong)] underline-offset-4 hover:decoration-[var(--color-accent)]"
            >
              Privacy
            </Link>{" "}
            for details.
          </p>
        </div>

        <ol className="import-steps mt-10 grid list-none gap-6 p-0 sm:grid-cols-3">
          {steps.map((item) => (
            <li
              key={item.step}
              className="border-t border-[var(--color-border-strong)] pt-4"
            >
              <p className="text-xs font-semibold tracking-[0.14em] text-[var(--color-accent)]">
                {item.step}
              </p>
              <h3 className="mt-3 text-base font-semibold tracking-tight">{item.title}</h3>
              <p className="muted mt-2 text-sm leading-relaxed">{item.body}</p>
            </li>
          ))}
        </ol>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
              setDragging(false);
            }
          }}
          onDrop={onDrop}
          className={`import-dropzone mt-10 border border-dashed px-5 py-8 text-center transition-colors sm:px-10 sm:py-11 ${
            dragging
              ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
              : "border-[var(--color-border-strong)] bg-[var(--color-bg-soft)]"
          }`}
        >
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            accept=".json,application/json"
            multiple
            onChange={onInputChange}
            aria-label="Choose Spotify streaming history JSON files"
          />
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[var(--color-border-strong)] bg-[var(--color-bg)] text-[var(--color-accent)]" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="1.6">
              <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5M4.5 15.5v3A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <p className="mt-4 text-base font-semibold tracking-tight text-[var(--color-fg)]">
            Drop your listening history here
          </p>
          <p className="muted mt-1 text-sm">or browse for JSON files</p>
          <p className="muted mx-auto mt-4 max-w-xl text-sm leading-relaxed">
            Supports Spotify StreamingHistory and endsong JSON arrays. Up to 20
            files, 50 MB each and 100 MB total. ZIP files are not supported yet.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Choose JSON files
            </button>
            {busy && (
              <button type="button" className="btn btn-secondary" onClick={stopAnalysis}>
                Cancel analysis
              </button>
            )}
          </div>
          <p className="subtle mx-auto mt-5 flex max-w-xl items-center justify-center gap-2 text-xs">
            <span className="text-[var(--color-accent)]" aria-hidden="true">●</span>
            Your export stays on this device. File contents are never uploaded.
          </p>
          {status && (
            <p className="muted mt-4 text-sm" role="status" aria-live="polite">
              {status}
            </p>
          )}
          {warning && <p className="muted mt-2 text-sm">{warning}</p>}
          {error && (
            <p className="mt-4 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
