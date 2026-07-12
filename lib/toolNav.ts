const RETURN_KEY = 'cvly_return_to';

export function rememberReturnPath() {
  if (typeof window === 'undefined') return;
  const path = window.location.pathname;
  if (path !== '/') {
    sessionStorage.setItem(RETURN_KEY, path);
  }
}

export function popReturnPath(): string | null {
  if (typeof window === 'undefined') return null;
  const path = sessionStorage.getItem(RETURN_KEY);
  if (path) sessionStorage.removeItem(RETURN_KEY);
  return path;
}
