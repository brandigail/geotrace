import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { RecorderProvider } from './providers/RecorderProvider'
import { ThemeProvider } from './providers/ThemeProvider'
import { TripDataProvider } from './providers/TripDataProvider'

const root = document.getElementById('root')
if (!root) throw new Error('Missing #root element')

createRoot(root).render(
  <StrictMode>
    <ThemeProvider>
      <RecorderProvider>
        <TripDataProvider>
          <App />
        </TripDataProvider>
      </RecorderProvider>
    </ThemeProvider>
  </StrictMode>,
)
