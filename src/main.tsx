import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Toaster } from './components/Toaster'
import { UpdatePrompt } from './components/UpdatePrompt'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
      <Toaster />
      <UpdatePrompt />
    </ErrorBoundary>
  </StrictMode>,
)
