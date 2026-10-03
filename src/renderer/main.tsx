import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'

import { App } from './app.tsx'
import { store } from '#renderer/store/index.ts'
import './global.css'

const root_element = document.getElementById('root')
if (root_element === null) throw new Error('no #root element')

createRoot(root_element).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>
)
