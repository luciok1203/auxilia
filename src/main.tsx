import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@fontsource/tinos/latin-400.css';
import '@fontsource-variable/libre-baskerville/wght.css';
import '@fontsource-variable/libre-baskerville/wght-italic.css';
import '@fontsource-variable/noto-serif-kr';
import '@fontsource/arimo/latin-400.css';
import '@fontsource/arimo/latin-500.css';
import '@fontsource/arimo/latin-700.css';
import '@fontsource/arimo/latin-400-italic.css';
import '@fontsource/arimo/latin-700-italic.css';
import '@fontsource-variable/noto-sans-kr';
import './fonts.css';
import { trackViewport } from './viewport';

const stopViewportTracking = trackViewport();
if (import.meta.hot) import.meta.hot.dispose(stopViewportTracking);

const rootElement = document.getElementById('root');
if (rootElement === null) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
