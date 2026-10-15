import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthGate } from './auth/AuthGate';
import { PublishingPresentationConcept } from './presentation/PublishingPresentationConcept';

// The presentation experience is strictly opt-in on its dedicated Preview branch.
// With no matching build flag and query parameter, the existing application is unchanged.
const isPresentationPreview =
  import.meta.env.VITE_PRESENTATION_CONCEPT === 'true' &&
  new URLSearchParams(window.location.search).get('sunum') === '1';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPresentationPreview ? <PublishingPresentationConcept /> : <AuthGate />}
  </StrictMode>,
);
