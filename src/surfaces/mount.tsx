import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import type { Surface } from '@/app/surface';
import '@/styles/tokens.css';
import '@/styles/base.css';

export function mountSurface(surface: Surface): void {
  const root = document.getElementById('root');
  if (!root) throw new Error('Hourfolk: #root element missing');
  createRoot(root).render(
    <StrictMode>
      <App surface={surface} />
    </StrictMode>,
  );
}
