export function GoogleIcon({ size = 18, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <path d="M22.5 12.23c0-.79-.07-1.54-.2-2.27H12v4.3h5.9a5.05 5.05 0 0 1-2.19 3.32v2.75h3.55c2.08-1.92 3.24-4.74 3.24-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.67l-3.55-2.75c-.99.66-2.25 1.05-3.73 1.05-2.87 0-5.3-1.94-6.17-4.53H2.16v2.84A11 11 0 0 0 12 23z" fill="#34A853" />
      <path d="M5.83 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.16a11 11 0 0 0 0 9.88l3.67-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.84 6.06l3.67 2.84C6.7 7.32 9.13 5.38 12 5.38z" fill="#EA4335" />
    </svg>
  );
}

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
