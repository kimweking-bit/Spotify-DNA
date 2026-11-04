<div align="center">

# Spotify DNA

### Your listening history, seen from a new angle.

Turn your Spotify data export into a private, interactive portrait of the music you play.

**No Spotify login. No upload. Your listening history stays on your device.**

[Get started](#get-started) · [Privacy](#privacy-first-by-design) · [How it works](#how-it-works)

</div>

---

## A listening story, built from your data

Spotify DNA reads your downloaded Spotify streaming-history JSON and turns it into a clear, explorable report. Follow your listening over time, see which artists and tracks lead, and explore when your music happens.

### Explore your listening

- **Musical evolution** — explore daily, weekly, or monthly play counts; zoom into a range, inspect periods, and see the peak and average.
- **Artist landscape** — compare the leading artists by plays or listening time, then search and sort the available artist list.
- **Listening rhythm** — inspect hourly and weekday patterns in your local time zone.
- **Track explorer** — search and sort tracks, compare recorded plays and listening time, and select tracks to inspect.
- **Connected exploration** — selecting an artist filters relevant tracks; time and hour selections update only the insights the imported data can support.
- **A little atmosphere** — the homepage features a moving album-art carousel. Its featured covers are demonstration content, not part of your analysis.

> Spotify DNA reports the records in the export you provide. It does not claim to represent your complete lifetime listening.

## Get started

### What you need

- Node.js compatible with the installed Next.js version
- A Spotify extended streaming-history export

### Run the app

```bash
git clone <your-repository-url>
cd spotify-dna
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

### Analyze your export

1. Request and download your Spotify extended streaming history.
2. Unzip the download.
3. On the homepage, select JSON files from the `StreamingHistory` or `endsong` export.
4. Open your report and explore your listening identity.

The importer accepts up to **20 JSON files**, **50 MB per file**, and **100 MB total** per analysis. ZIP files are not supported. Each file must contain a top-level JSON array. Malformed files fail the import; invalid individual rows are skipped and counted.

## Privacy first by design

- Analysis runs in your browser; selected file contents are not uploaded.
- Raw files are not persisted by Spotify DNA.
- A compact derived summary is kept in the current tab's `sessionStorage` so the report can be viewed. Clear it from the report or close the tab to remove it.
- The project does not require a Spotify login or connect to a Spotify account.
- The report does not infer genres, moods, or relationships the export cannot establish.

See the [Privacy page](./src/app/privacy/page.tsx) for more detail.

## How it works

One valid imported row counts as **one recorded play entry**—not an inferred listening session. Listening time is the sum of the duration values in the export. Track identities are grouped case-insensitively by title, artist, and album because the export does not provide a stable track ID.

Calendar summaries use the browser's local time zone captured during import. Daily averages include every calendar date between the first and last valid records, including dates with zero plays. The report keeps cross-filtering honest: it does not invent track-by-period or artist-by-hour connections when those records are not retained.

## Development

```bash
npm run lint
npm run build
```

### Built with

- [Next.js](https://nextjs.org/) and [React](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)

The visualizations use the existing app code and browser APIs; no charting service or analysis backend is required.

## Contributing

Issues and improvements are welcome. Please do not include real Spotify exports, personal listening data, credentials, or other private information in issues or pull requests. Use synthetic data for examples and tests.

## Credits

Created with care by **[Ken Kimwe](https://github.com/kimweking-bit)**.

Spotify DNA is an independent project and is not affiliated with, endorsed by, or sponsored by Spotify AB. Spotify is a trademark of Spotify AB.
