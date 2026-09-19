import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { installSafeJsonStringify } from './utils/safeJson';

// Defend against uncaught circular structure serialization errors from Firestore WebChannel / DOM
installSafeJsonStringify();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
