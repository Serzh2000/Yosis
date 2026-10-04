import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { canonicalLocalUrl } from './lib/canonical-origin';
import './styles.css';

// Один локальный адрес: иначе у localhost и 127.0.0.1 будут разные библиотеки проектов.
const canonical = canonicalLocalUrl(window.location);
if (canonical) {
  window.location.replace(canonical);
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
