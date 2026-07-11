export default function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 26 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="25" height="25" rx="6" fill="var(--ink)" />
      <path
        d="M13 4.5L20 7V12.1C20 16.55 17.18 20.05 13 21.75C8.82 20.05 6 16.55 6 12.1V7L13 4.5Z"
        fill="var(--paper)"
        stroke="var(--paper)"
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.5 12.85C9.55 10.8 11.17 9.7 13 9.7C14.83 9.7 16.45 10.8 17.5 12.85C16.45 14.9 14.83 16 13 16C11.17 16 9.55 14.9 8.5 12.85Z"
        fill="var(--ink)"
      />
      <circle cx="13" cy="12.85" r="1.65" fill="var(--red)" />
      <circle cx="13.55" cy="12.3" r="0.45" fill="var(--paper)" />
    </svg>
  );
}
