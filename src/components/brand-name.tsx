export function BrandName({ className = "" }: { className?: string }) {
  return (
    <span className={`brand-name ${className}`}>
      <span>Spotify</span>
      <em>DNA</em>
    </span>
  );
}
