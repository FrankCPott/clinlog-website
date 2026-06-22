/* ── Shared site logo mark — used in every page header and footer ── */

/** Boxed ECG icon (40×40 canvas, scales via className) */
export const LogoMark = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 40 40" fill="none" aria-hidden="true">
    <rect width="40" height="40" rx="8" fill="#5B9BC0" />
    <path
      d="M6 20H13L16 9L21 31L25 20H34"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
