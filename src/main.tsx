import React from 'react';
import ReactDOM from 'react-dom/client';
import './lib/i18n';
import App from './App';
import { isLearnPath } from './learn/routes';
import { canonicalLocalUrl } from './lib/canonical-origin';
import '@fontsource-variable/golos-text/index.css';
import '@fontsource-variable/jetbrains-mono/index.css';
import './styles.css';
import './design.css';
import './mobile.css';

const LearnApp = React.lazy(() => import('./learn/LearnApp'));

// Один локальный адрес: иначе у localhost и 127.0.0.1 будут разные библиотеки проектов.
const canonical = canonicalLocalUrl(window.location);
if (canonical) {
  window.location.replace(canonical);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      {isLearnPath(window.location.pathname) ? (
        <React.Suspense fallback={null}>
          <LearnApp />
        </React.Suspense>
      ) : (
        <App />
      )}
    </React.StrictMode>,
  );
}
