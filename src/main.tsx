import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // ISTO É O QUE FALTA
import App from './App'
import './styles/index.css';
// Importa o teu AuthProvider (confirma se o caminho está certo no teu PC)
import { AuthProvider } from './shared/context/AuthContext' 

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)