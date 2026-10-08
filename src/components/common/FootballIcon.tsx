/** A football, drawn in the current text color; decorative, so the event label names it. */
export function FootballIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 7.5 16.3 10.6 14.7 15.6 9.3 15.6 7.7 10.6Z" fill="currentColor" />
      <path d="M12 7.5V2M16.3 10.6 21.5 8.9M14.7 15.6l3.2 4.5M9.3 15.6l-3.2 4.5M7.7 10.6 2.5 8.9" />
    </svg>
  )
}
