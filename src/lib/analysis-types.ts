/** Supported row fields from Spotify StreamingHistory and endsong JSON files. */
export type StreamingHistoryRow = {
  ts?: string;
  endTime?: string;
  msPlayed?: number;
  ms_played?: number;
  master_metadata_track_name?: string | null;
  master_metadata_album_artist_name?: string | null;
  master_metadata_album_album_name?: string | null;
  trackName?: string;
  artistName?: string;
  albumName?: string;
};

export type AnalysisStats = {
  /** Valid imported history rows, counted as recorded plays (not sessions). */
  totalPlays: number;
  totalMsPlayed: number;
  /** In version 3, identities group case-insensitively by title + artist + album. */
  uniqueTracks: number;
  uniqueArtists: number;
  spanStartMs: number;
  spanEndMs: number;
  skippedRows: number;
  /** Total rows across all imported arrays; absent in older summaries. */
  totalRows?: number;
};

export type RankedItem = {
  name: string;
  plays: number;
  msPlayed: number;
  artistName?: string;
  albumName?: string;
};

export type MonthlyListening = {
  /** Local calendar month in YYYY-MM format, using the analysis time zone. */
  month: string;
  plays: number;
  msPlayed: number;
  leadingArtist: RankedItem | null;
};

export type ListeningPeriod = {
  /** Local calendar date or ISO-week Monday in YYYY-MM-DD format. */
  period: string;
  plays: number;
  msPlayed: number;
  leadingArtist: RankedItem | null;
};

export type AnalysisResult = {
  version: 1 | 2 | 3;
  generatedAtMs: number;
  sourceFileCount: number;
  timeZone: string;
  stats: AnalysisStats;
  topArtists: RankedItem[];
  topTracks: RankedItem[];
  topAlbums: RankedItem[];
  monthlyListening?: MonthlyListening[];
  /** Full artist ranking; version 2 summaries contain at most 10 entries. */
  allArtists?: RankedItem[];
  /** Track names grouped case-insensitively with artist and album metadata. */
  trackIdentities?: RankedItem[];
  /** Local calendar-day totals, present in version 3 summaries. */
  dailyListening?: ListeningPeriod[];
  /** Local ISO-week totals keyed by the Monday date, present in version 3. */
  weeklyListening?: ListeningPeriod[];
  /** Hour-of-day histogram length 24; values are play counts. */
  playsByHour: number[];
  /** Local weekday 0=Sun … 6=Sat play counts in timeZone. */
  playsByWeekday: number[];
  /** Seven Sunday-first weekday rows, each with 24 local-hour play counts. */
  playsByWeekdayHour?: number[][];
};

export type AnalyzeInMsg = {
  type: "analyze";
  files: { name: string; buffer: ArrayBuffer }[];
  timeZone: string;
  requestId: string;
};

export type CancelInMsg = {
  type: "cancel";
  requestId: string;
};

export type InMsg = AnalyzeInMsg | CancelInMsg;

export type ProgressOutMsg = {
  type: "progress";
  requestId: string;
  phase: "parse" | "aggregate" | "rank";
  ratio: number;
};

export type ResultOutMsg = {
  type: "result";
  requestId: string;
  result: AnalysisResult;
};

export type WorkerErrorCode =
  | "empty_file"
  | "too_large"
  | "invalid_json"
  | "unsupported_shape"
  | "no_valid_rows"
  | "unknown";

export type ErrorOutMsg = {
  type: "error";
  requestId: string;
  code: WorkerErrorCode;
  message: string;
};

export type OutMsg = ProgressOutMsg | ResultOutMsg | ErrorOutMsg;

export const ANALYSIS_STORAGE_KEY = "spotify-dna-analysis-v3";
export const LEGACY_ANALYSIS_STORAGE_KEY = "spotify-dna-analysis-v1";
export const PREVIOUS_ANALYSIS_STORAGE_KEY = "spotify-dna-analysis-v2";
