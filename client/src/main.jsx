import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App.jsx';
import AuthProvider from './context/AuthProvider.jsx';
import RoomProvider from './context/RoomProvider.jsx';
import ToastProvider from './context/ToastProvider.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Opt in to the v7 behaviours now — they are the defaults we want, and it
        keeps the console clean of upgrade warnings. */}
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        {/* Inside AuthProvider: rooms are loaded per signed-in user, and cleared
            on sign-out so one account's rooms never linger for the next. */}
        <RoomProvider>
          {/* Outermost of the three so anything below can confirm an action. */}
          <ToastProvider>
            <App />
          </ToastProvider>
        </RoomProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
