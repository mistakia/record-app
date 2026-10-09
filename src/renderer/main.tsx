// The global layer first, so every component's module comes after it.
import './global.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import { App } from './app.tsx'
import { store } from '#renderer/store/index.ts'

// macOS draws the traffic lights over the sidebar, so the sidebar and the
// page head become drag regions there; elsewhere the native frame stays.
document.documentElement.dataset.platform = navigator.userAgent.includes('Macintosh') ? 'mac' : 'other'

const root_element = document.getElementById('root')
if (root_element === null) throw new Error('no #root element')

createRoot(root_element).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
)
