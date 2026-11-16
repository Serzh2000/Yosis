import React from 'react';
import ReactDOM from 'react-dom/client';
import { loadLanguage } from './lib/i18n';
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
  // Английские словари грузятся до приложения: тексты собираются при загрузке его модулей.
  void loadLanguage().then(async () => {
    const learn = isLearnPath(window.location.pathname);
    const App = learn ? null : (await import('./App')).default;
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        {App ? (
          <App />
        ) : (
          <React.Suspense fallback={null}>
            <LearnApp />
          </React.Suspense>
        )}
      </React.StrictMode>,
    );
  });
}
