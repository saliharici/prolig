import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthGate } from './auth/AuthGate';
import './theme/publisher-real-ui.css';
import './ux/publisher-ux01.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate />
  </StrictMode>,
);
