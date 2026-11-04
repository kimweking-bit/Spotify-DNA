export function CreatorCredit({ compact = false }: { compact?: boolean }) {
  return (
    <a
      href="https://github.com/kimweking-bit"
      target="_blank"
      rel="noopener noreferrer"
      className={`creator-credit${compact ? " creator-credit-compact" : ""}`}
    >
      <span className="creator-credit-label">Created by</span>
      <span className="creator-credit-name">Ken Kimwe</span>
      <span className="creator-credit-link">
        Independent maker <span aria-hidden="true">↗</span>
      </span>
    </a>
  );
}
