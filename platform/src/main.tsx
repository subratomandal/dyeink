import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SimpleErrorBoundary } from '@/components/common/feedback/SimpleErrorBoundary'
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
})

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <SimpleErrorBoundary>
            <App />
        </SimpleErrorBoundary>
    </React.StrictMode>
)
