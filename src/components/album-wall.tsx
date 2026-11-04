"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { albums } from "@/data/albums";
import type { Album } from "@/data/albums";

const pixelsPerSecond = 88;
const curveRadius = 1_100;

export function AlbumWall() {
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loopWidthRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [motionPreferenceReady, setMotionPreferenceReady] = useState(false);
  const [loopCopies, setLoopCopies] = useState(4);
  const shouldAnimate =
    isVisible && !paused && motionPreferenceReady && !prefersReducedMotion;

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.05 },
    );

    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const motionPreference = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );
    const handleMotionPreference = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    const preferenceFrame = window.requestAnimationFrame(() => {
      setPrefersReducedMotion(motionPreference.matches);
      setMotionPreferenceReady(true);
    });
    motionPreference.addEventListener("change", handleMotionPreference);
    return () => {
      window.cancelAnimationFrame(preferenceFrame);
      motionPreference.removeEventListener("change", handleMotionPreference);
    };
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    if (!viewport || !track) return;

    const groups = Array.from(
      track.querySelectorAll<HTMLElement>(".album-carousel-group"),
    );
    const items = Array.from(
      track.querySelectorAll<HTMLElement>(".album-carousel-item"),
    );
    let frame = 0;
    let previousTime = 0;

    const updateTrack = () => {
      track.style.transform = `translate3d(-${offsetRef.current}px, 0, 0)`;

      const viewportCenter =
        viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
      const positions = items.map((item) => ({
        card: item.querySelector<HTMLElement>(".album-card"),
        distance:
          item.getBoundingClientRect().left +
          item.offsetWidth / 2 -
          viewportCenter,
      }));
      for (const { card, distance } of positions) {
        if (!card) continue;
        const angle = Math.atan(distance / curveRadius);
        const curvedX = curveRadius * Math.sin(angle);
        const curvedZ = curveRadius * (Math.cos(angle) - 1);
        const rotation = (angle * 180) / Math.PI;

        card.style.transform = `translate3d(${curvedX - distance}px, 0, ${curvedZ}px) rotateY(${rotation}deg)`;
      }
    };

    const measure = () => {
      const firstGroup = groups[0];
      if (!firstGroup) return;

      const loopWidth = firstGroup.offsetWidth;
      if (loopWidth === 0) return;

      const viewportWidth = viewport.clientWidth;
      loopWidthRef.current = loopWidth;
      offsetRef.current %= loopWidth;

      const style = window.getComputedStyle(viewport);
      const leftPadding = Number.parseFloat(style.paddingLeft) || 0;
      const rightPadding = Number.parseFloat(style.paddingRight) || 0;
      const visibleContentWidth = viewportWidth - leftPadding - rightPadding;
      const requiredCopies = Math.ceil(visibleContentWidth / loopWidth) + 1;
      setLoopCopies((current) =>
        current === requiredCopies ? current : requiredCopies,
      );

      updateTrack();
    };

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(viewport);
    resizeObserver.observe(track);
    measure();

    const animate = (time: number) => {
      if (previousTime !== 0 && loopWidthRef.current !== 0) {
        const delta = Math.min(time - previousTime, 64);
        offsetRef.current =
          (offsetRef.current + (delta / 1000) * pixelsPerSecond) %
          loopWidthRef.current;
        updateTrack();
      }

      previousTime = time;
      frame = window.requestAnimationFrame(animate);
    };

    if (shouldAnimate) {
      frame = window.requestAnimationFrame(animate);
    }

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [loopCopies, shouldAnimate]);

  return (
    <section
      id="album-wall"
      aria-label="Album cover carousel"
      className="relative"
    >
      <div
        ref={viewportRef}
        className="album-carousel-viewport"
        role="region"
        aria-label="Featured demonstration album covers"
        aria-roledescription="carousel"
        tabIndex={0}
      >
        <div ref={trackRef} className="album-carousel-track">
          {Array.from({ length: loopCopies }, (_, index) => (
            <AlbumSet key={index} isDuplicate={index > 0} />
          ))}
        </div>
      </div>

      <div className="page-shell mt-2 flex flex-wrap items-center justify-between gap-4">
        <p className="subtle text-xs sm:text-sm">
          Album artwork provided by{" "}
          <a
            href="https://open.spotify.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4"
          >
            Spotify
          </a>
          . Demo selection—not your listening history. Cards stay upright and
          the carousel continues in a smooth, continuous loop.
        </p>
        <button
          type="button"
          className="album-carousel-toggle btn btn-ghost shrink-0 text-xs sm:text-sm"
          aria-pressed={paused}
          disabled={!motionPreferenceReady || prefersReducedMotion}
          onClick={() => setPaused((current) => !current)}
        >
          {!motionPreferenceReady
            ? "Preparing carousel"
            : prefersReducedMotion
            ? "Motion reduced"
            : paused
            ? "Play carousel"
            : "Pause carousel"}
        </button>
      </div>

      <details className="page-shell album-artwork-credits mt-3">
        <summary>Featured albums on Spotify</summary>
        <ul className="mt-3 space-y-2">
          {albums.map((album) => (
            <li key={album.id}>
              <a
                href={album.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                {album.title} by {album.artist}
              </a>
            </li>
          ))}
        </ul>
      </details>
    </section>
  );
}

function AlbumSet({ isDuplicate = false }: { isDuplicate?: boolean }) {
  return (
    <ul className="album-carousel-group" aria-hidden={isDuplicate || undefined}>
      {albums.map((album, index) => (
        <li key={album.id} className="album-carousel-item">
          <AlbumTile album={album} index={index} isDuplicate={isDuplicate} />
        </li>
      ))}
    </ul>
  );
}

function AlbumTile({
  album,
  index,
  isDuplicate,
}: {
  album: Album;
  index: number;
  isDuplicate: boolean;
}) {
  return (
    <a
      href={album.spotifyUrl}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={isDuplicate ? -1 : undefined}
      aria-label={`Open ${album.title} by ${album.artist} on Spotify`}
      className="album-card"
    >
      <Image
        src={album.coverSrc}
        alt=""
        fill
        sizes="(max-width: 640px) 140px, (max-width: 1024px) 17vw, 192px"
        className="album-card-image"
        unoptimized
        loading={index < 3 && !isDuplicate ? "eager" : "lazy"}
        draggable={false}
        onError={(event) => {
          event.currentTarget.style.opacity = "0";
        }}
      />
      <span className="album-card-index" aria-hidden="true">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div className="album-card-copy" aria-hidden="true">
        <span className="album-card-title">{album.title}</span>
        <span className="album-card-artist">{album.artist}</span>
      </div>
    </a>
  );
}
