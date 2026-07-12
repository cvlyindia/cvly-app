'use client';

import { createContext, useContext } from 'react';

export const ScannerContext = createContext<{ openScanner: () => void }>({
  openScanner: () => {},
});

export function useScanner() {
  return useContext(ScannerContext);
}
