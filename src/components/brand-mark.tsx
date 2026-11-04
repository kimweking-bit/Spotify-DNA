export function BrandMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="46" height="46" rx="15" fill="#1ED760" />
      <circle cx="24" cy="24" r="17" fill="#07110B" />
      <circle cx="24" cy="24" r="13.5" stroke="#1ED760" strokeOpacity=".35" />
      <circle cx="24" cy="24" r="9.5" stroke="#1ED760" strokeOpacity=".24" />
      <path d="M17 13C34 17 14 31 31 35" stroke="#F4FFF7" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M31 13C14 17 34 31 17 35" stroke="#B6FFD0" strokeWidth="2.7" strokeLinecap="round" />
      <path d="M19.5 17.5H28.5M19.5 30.5H28.5M21 24H27" stroke="#1ED760" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="24" r="2.1" fill="#F4FFF7" />
    </svg>
  );
}
