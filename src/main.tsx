import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { isConfigured } from './config';
import { SetupNeeded } from './routes/SetupNeeded';
import './styles.css';

// Firebase throws at startup without a config, so only load the app once one exists.
const App = lazy(() => import('./App'));

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isConfigured ? (
      <Suspense fallback={null}>
        <App />
      </Suspense>
    ) : (
      <SetupNeeded />
    )}
  </StrictMode>,
);
