export function InstagramIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" />
    </svg>
  );
}

export function FacebookIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M15 8.5h2V5.3c-.35-.05-1.5-.15-2.85-.15C11.5 5.15 10 6.7 10 9.4v2.1H7.5v3.6H10V22h3.5v-6.9h2.4l.4-3.6h-2.8V9.7c0-.9.3-1.2 1.5-1.2z"
        fill="currentColor"
      />
    </svg>
  );
}

export function LinkedinIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="2" width="20" height="20" rx="4" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="7.2" cy="8" r="1.3" fill="currentColor" />
      <path d="M7.2 11v6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M11.5 17.5V13c0-1.2.9-2.2 2.1-2.2s1.9 1 1.9 2.2v4.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M11.5 11v6.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function XIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path
        d="M4 4l7.2 9.6L4.4 20H6l6-6.5L16.5 20H20l-7.5-10L19.6 4H18l-5.6 6L7.5 4H4z"
        fill="currentColor"
      />
    </svg>
  );
}
