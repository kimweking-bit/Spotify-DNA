import { AlbumWall } from "@/components/album-wall";

export function Hero() {
  return (
    <section
      id="top"
      aria-labelledby="hero-heading"
      className="hero-section relative isolate overflow-x-clip pt-12 pb-6 sm:pt-16 sm:pb-10 lg:pt-16"
    >
      <div className="hero-atmosphere" aria-hidden="true" />

      <div className="hero-composition page-shell relative">
        <div className="hero-copy mx-auto max-w-4xl text-center lg:mx-0 lg:max-w-none lg:text-left">
          <p className="eyebrow hero-reveal">A listening-history field guide</p>

          <h1
            id="hero-heading"
            className="hero-title mt-5 text-[length:var(--text-display)] font-semibold tracking-[-0.055em] text-[var(--color-fg)]"
            style={{ lineHeight: "var(--leading-display)" }}
          >
            Your music
            <br />tells a <span className="hero-title-accent">story.</span>
          </h1>

          <p className="muted mx-auto mt-6 max-w-2xl text-base sm:text-lg lg:mx-0">
            A private way to find the patterns in your listening history—from
            the artists you return to, to the hours music finds you.
          </p>

          <div className="hero-reveal mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
            <a href="#import" className="btn btn-primary min-w-[12.5rem]">
              Explore your listening
            </a>
            <a href="#insights" className="btn btn-secondary min-w-[12.5rem]">
              See what you can find
            </a>
          </div>

          <p className="subtle mt-4 text-sm lg:max-w-md">
            No Spotify login. No upload. Just your own export, explored locally.
          </p>
        </div>

        <div className="hero-album-stage">
          <AlbumWall />
        </div>
      </div>
    </section>
  );
}
