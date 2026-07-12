const RETURN_KEY = 'cvly_return_to';

export function popReturnPath(): string | null {
  if (typeof window === 'undefined') return null;
  const path = sessionStorage.getItem(RETURN_KEY);
  if (path) sessionStorage.removeItem(RETURN_KEY);
  return path;
}
