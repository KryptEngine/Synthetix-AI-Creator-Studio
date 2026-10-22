import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import App from '../../src/App';

/**
 * Entry point for the jsdom smoke-test harness (scripts/e2e/run.mjs).
 * Mirrors src/main.tsx without pulling in the CSS pipeline, and exposes a
 * re-mount hook so each interaction test starts from a clean component tree.
 */
const container = document.getElementById('root')!;
let root: Root | null = null;

(window as unknown as { __mount: () => void }).__mount = () => {
  if (root) root.unmount();
  container.innerHTML = '';
  root = createRoot(container);
  root.render(<App />);
};

(window as unknown as { __mount: () => void }).__mount();
