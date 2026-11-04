import type {
  AnalysisResult,
  InMsg,
  OutMsg,
  RankedItem,
  StreamingHistoryRow,
  ListeningPeriod,
} from "@/lib/analysis-types";
import {
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_FILE_COUNT,
  MAX_IMPORT_TOTAL_BYTES,
} from "@/lib/import-limits";

type Aggregate = {
  name: string;
  plays: number;
  msPlayed: number;
  artistName?: string;
  albumName?: string;
};

type PeriodAggregate = {
  plays: number;
  msPlayed: number;
  artists: Map<string, Aggregate>;
};

type OutMsgPayload =
  | Omit<Extract<OutMsg, { type: "progress" }>, "requestId">
  | Omit<Extract<OutMsg, { type: "result" }>, "requestId">
  | Omit<Extract<OutMsg, { type: "error" }>, "requestId">;

const weekdayOrder = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const activeRequests = new Set<string>();

self.onmessage = (event: MessageEvent<InMsg>) => {
  if (event.data.type === "cancel") {
    activeRequests.delete(event.data.requestId);
    return;
  }

  activeRequests.add(event.data.requestId);
  void analyze(event.data);
};

async function analyze(
  message: Extract<InMsg, { type: "analyze" }>,
): Promise<void> {
  const { requestId } = message;
  const send = (payload: OutMsgPayload) => {
    switch (payload.type) {
      case "progress":
        self.postMessage({ ...payload, requestId });
        break;
      case "result":
        self.postMessage({ ...payload, requestId });
        break;
      case "error":
        self.postMessage({ ...payload, requestId });
        break;
    }
  };

  try {
    if (
      message.files.length === 0 ||
      message.files.length > MAX_IMPORT_FILE_COUNT
    ) {
      throw new AnalysisError(
        "too_large",
        `Choose between 1 and ${MAX_IMPORT_FILE_COUNT} JSON files.`,
      );
    }

    const totalBytes = message.files.reduce(
      (total, file) => total + file.buffer.byteLength,
      0,
    );
    if (
      totalBytes > MAX_IMPORT_TOTAL_BYTES ||
      message.files.some((file) => file.buffer.byteLength > MAX_IMPORT_FILE_BYTES)
    ) {
      throw new AnalysisError(
        "too_large",
        "The selected files exceed the supported size limits.",
      );
    }

    const parsedFiles: unknown[][] = [];
    for (const [index, file] of message.files.entries()) {
      if (file.buffer.byteLength === 0) {
        throw new AnalysisError("empty_file", `${file.name} is empty.`);
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(
          new TextDecoder("utf-8", { fatal: true }).decode(file.buffer),
        );
      } catch {
        throw new AnalysisError(
          "invalid_json",
          `${file.name} is not valid JSON. Check the file and try again.`,
        );
      }

      if (!Array.isArray(parsed)) {
        throw new AnalysisError(
          "unsupported_shape",
          `${file.name} must contain a JSON array of listening records.`,
        );
      }
      parsedFiles.push(parsed);
      send({
        type: "progress",
        phase: "parse",
        ratio: (index + 1) / message.files.length,
      });
    }

    const artists = new Map<string, Aggregate>();
    const tracks = new Map<string, Aggregate>();
    const albums = new Map<string, Aggregate>();
    const monthly = new Map<string, PeriodAggregate>();
    const daily = new Map<string, PeriodAggregate>();
    const weekly = new Map<string, PeriodAggregate>();
    const playsByHour = Array<number>(24).fill(0);
    const playsByWeekday = Array<number>(7).fill(0);
    const playsByWeekdayHour = Array.from(
      { length: 7 },
      () => Array<number>(24).fill(0),
    );
    const clockFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: message.timeZone,
      hour: "2-digit",
      hourCycle: "h23",
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    let totalPlays = 0;
    let totalMsPlayed = 0;
    let skippedRows = 0;
    let spanStartMs = Number.POSITIVE_INFINITY;
    let spanEndMs = Number.NEGATIVE_INFINITY;
    const rowCount = parsedFiles.reduce((sum, rows) => sum + rows.length, 0);
    let processedRows = 0;

    for (const rows of parsedFiles) {
      for (const row of rows) {
        const normalized = normalizeRow(row);
        processedRows += 1;
        if (!normalized) {
          skippedRows += 1;
          continue;
        }

        const { artist, album, track, timestamp, msPlayed } = normalized;
        totalPlays += 1;
        totalMsPlayed += msPlayed;
        spanStartMs = Math.min(spanStartMs, timestamp);
        spanEndMs = Math.max(spanEndMs, timestamp);

        const parts = clockFormatter.formatToParts(timestamp);
        const hour = Number(parts.find((part) => part.type === "hour")?.value);
        const weekday = parts.find((part) => part.type === "weekday")?.value;
        const year = parts.find((part) => part.type === "year")?.value;
        const monthNumber = parts.find((part) => part.type === "month")?.value;
        const dayNumber = parts.find((part) => part.type === "day")?.value;
        const weekdayIndex = weekdayOrder.indexOf(weekday ?? "");
        if (
          hour >= 0 &&
          hour < 24 &&
          weekdayIndex >= 0
        ) {
          playsByHour[hour] += 1;
          playsByWeekday[weekdayIndex] += 1;
          playsByWeekdayHour[weekdayIndex][hour] += 1;
        }
        addRanked(
          tracks,
          track,
          msPlayed,
          JSON.stringify([
            track.toLocaleLowerCase(),
            artist.toLocaleLowerCase(),
            album.toLocaleLowerCase(),
          ]),
          artist || undefined,
          album || undefined,
        );
        if (artist) addRanked(artists, artist, msPlayed);
        if (album) addRanked(albums, album, msPlayed);
        if (year && monthNumber && dayNumber && weekdayIndex >= 0) {
          const monthKey = `${year}-${monthNumber}`;
          const dayKey = `${year}-${monthNumber}-${dayNumber}`;
          const timestampDay = Date.UTC(
            Number(year),
            Number(monthNumber) - 1,
            Number(dayNumber),
          );
          const weekStart = new Date(
            timestampDay - ((weekdayIndex + 6) % 7) * 86_400_000,
          );
          const weekKey = [
            weekStart.getUTCFullYear(),
            String(weekStart.getUTCMonth() + 1).padStart(2, "0"),
            String(weekStart.getUTCDate()).padStart(2, "0"),
          ].join("-");
          addPeriod(monthly, monthKey, artist, msPlayed);
          addPeriod(daily, dayKey, artist, msPlayed);
          addPeriod(weekly, weekKey, artist, msPlayed);
        }

        if (processedRows % 5000 === 0) {
          send({
            type: "progress",
            phase: "aggregate",
            ratio: processedRows / Math.max(1, rowCount),
          });
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          if (!activeRequests.has(requestId)) return;
        }
      }
    }

    if (!activeRequests.has(requestId)) return;
    if (totalPlays === 0) {
      throw new AnalysisError(
        "no_valid_rows",
        "No usable music plays were found. Check that the selected files contain Spotify streaming-history records.",
      );
    }

    send({ type: "progress", phase: "rank", ratio: 1 });
    const rankedArtists = rank(artists);
    const rankedTracks = rank(tracks);
    const rankedAlbums = rank(albums);
    const result: AnalysisResult = {
      version: 3,
      generatedAtMs: Date.now(),
      sourceFileCount: message.files.length,
      timeZone: message.timeZone,
      stats: {
        totalPlays,
        totalMsPlayed,
        uniqueTracks: tracks.size,
        uniqueArtists: artists.size,
        spanStartMs,
        spanEndMs,
        skippedRows,
        totalRows: rowCount,
      },
      topArtists: rankedArtists.slice(0, 10),
      topTracks: rankedTracks.slice(0, 10),
      topAlbums: rankedAlbums.slice(0, 10),
      allArtists: rankedArtists,
      trackIdentities: rankedTracks,
      dailyListening: rankPeriods(daily),
      weeklyListening: rankPeriods(weekly),
      monthlyListening: [...monthly.entries()]
        .sort(([monthA], [monthB]) => monthA.localeCompare(monthB))
        .map(([month, aggregate]) => ({
          month,
          plays: aggregate.plays,
          msPlayed: aggregate.msPlayed,
          leadingArtist: rank(aggregate.artists)[0] ?? null,
        })),
      playsByHour,
      playsByWeekday,
      playsByWeekdayHour,
    };
    send({ type: "result", result });
  } catch (error) {
    if (!activeRequests.has(requestId)) return;
    if (error instanceof AnalysisError) {
      send({ type: "error", code: error.code, message: error.message });
    } else {
      send({
        type: "error",
        code: "unknown",
        message: "Analysis failed unexpectedly. Please try the export again.",
      });
    }
  } finally {
    activeRequests.delete(requestId);
  }
}

function normalizeRow(value: unknown): {
  artist: string;
  album: string;
  track: string;
  timestamp: number;
  msPlayed: number;
} | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as StreamingHistoryRow;
  const track = getName(
    row.master_metadata_track_name ?? row.trackName,
  );
  const artist = getName(
    row.master_metadata_album_artist_name ?? row.artistName,
  );
  const album = getName(
    row.master_metadata_album_album_name ?? row.albumName,
  );
  const timestamp = parseTimestamp(row.ts ?? row.endTime ?? "");
  const rawDuration = row.ms_played ?? row.msPlayed;
  const msPlayed = Number(rawDuration);

  if (
    !track ||
    !Number.isFinite(timestamp) ||
    rawDuration === undefined ||
    rawDuration === null ||
    !Number.isFinite(msPlayed) ||
    msPlayed <= 0
  ) {
    return null;
  }

  return { artist, album, track, timestamp, msPlayed };
}

function parseTimestamp(value: string): number {
  const legacy = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value);
  if (!legacy) return Date.parse(value);

  const [, yearText, monthText, dayText, hourText, minuteText] = legacy;
  const year = Number(yearText);
  const month = Number(monthText) - 1;
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  if (month < 0 || month > 11 || day < 1 || day > 31 || hour > 23 || minute > 59) {
    return Number.NaN;
  }

  const date = new Date(year, month, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day
  ) {
    return Number.NaN;
  }
  return date.getTime();
}

function getName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function addRanked(
  groups: Map<string, Aggregate>,
  name: string,
  msPlayed: number,
  key = name.toLocaleLowerCase(),
  artistName?: string,
  albumName?: string,
): void {
  const current = groups.get(key);
  if (current) {
    current.plays += 1;
    current.msPlayed += msPlayed;
  } else {
    groups.set(key, { name, plays: 1, msPlayed, artistName, albumName });
  }
}

function rank(groups: Map<string, Aggregate>): RankedItem[] {
  return [...groups.values()]
    .sort((a, b) => b.plays - a.plays || b.msPlayed - a.msPlayed)
    .map(({ name, plays, msPlayed, artistName, albumName }) => ({
      name,
      plays,
      msPlayed,
      ...(artistName ? { artistName } : {}),
      ...(albumName ? { albumName } : {}),
    }));
}

function addPeriod(
  periods: Map<string, PeriodAggregate>,
  period: string,
  artist: string,
  msPlayed: number,
): void {
  let aggregate = periods.get(period);
  if (!aggregate) {
    aggregate = { plays: 0, msPlayed: 0, artists: new Map() };
    periods.set(period, aggregate);
  }
  aggregate.plays += 1;
  aggregate.msPlayed += msPlayed;
  if (artist) addRanked(aggregate.artists, artist, msPlayed);
}

function rankPeriods(periods: Map<string, PeriodAggregate>): ListeningPeriod[] {
  return [...periods.entries()]
    .sort(([periodA], [periodB]) => periodA.localeCompare(periodB))
    .map(([period, aggregate]) => ({
      period,
      plays: aggregate.plays,
      msPlayed: aggregate.msPlayed,
      leadingArtist: rank(aggregate.artists)[0] ?? null,
    }));
}

class AnalysisError extends Error {
  constructor(
    readonly code:
      | "empty_file"
      | "too_large"
      | "invalid_json"
      | "unsupported_shape"
      | "no_valid_rows",
    message: string,
  ) {
    super(message);
  }
}
