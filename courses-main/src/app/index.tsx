import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Providers } from './providers/Providers'
import { Router } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Providers>
      <Router />
    </Providers>
  </StrictMode>,
)