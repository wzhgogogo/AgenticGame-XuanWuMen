import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { DeskDemo } from './renderer/DeskDemo.tsx'

const isDemo = typeof window !== 'undefined' && window.location.hash === '#desk-demo';

createRoot(document.getElementById('root')!).render(
  isDemo ? <DeskDemo /> : (
    <StrictMode>
      <App />
    </StrictMode>
  )
)
