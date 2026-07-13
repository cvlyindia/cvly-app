const PENDING_SCAN_KEY = 'cvly_pending_scan';

export interface PendingScan {
  resumeText: string;
  jobDescription: string;
  score: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  summary: string;
  improvements: string[];
}

export function stashPendingScan(scan: PendingScan) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(PENDING_SCAN_KEY, JSON.stringify(scan));
  } catch {
    // sessionStorage can throw in rare cases (private browsing, storage full) —
    // losing the save-prompt convenience isn't worth crashing the page over.
  }
}

export function popPendingScan(): PendingScan | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_SCAN_KEY);
  if (!raw) return null;
  sessionStorage.removeItem(PENDING_SCAN_KEY);
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
