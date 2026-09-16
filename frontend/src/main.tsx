import { Buffer } from 'buffer';

if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
  (globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { WalletProvider } from './contexts/WalletContext.tsx';
import App from './App.tsx';
import { ToastProvider } from './components/Toast.tsx';
import OnboardingTutorial from './components/OnboardingTutorial.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <WalletProvider>
        <ToastProvider>
          <App />
          <OnboardingTutorial />
        </ToastProvider>
      </WalletProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
