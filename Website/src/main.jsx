import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

const storedTheme = window.localStorage.getItem('planitt-theme')
const initialTheme = storedTheme === 'light' || storedTheme === 'dark'
    ? storedTheme
    : 'light'

document.documentElement.dataset.theme = initialTheme

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
