// src/App.tsx
import React, { useState } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { FormatProvider } from './context/FormatContext';
import AppRoutes from './routes';
import { ToDoIcon } from './components/todo/ToDoIcon';
import { ToDoModal } from './components/todo/ToDoModal';

function AppInner() {
  const [todoOpen, setTodoOpen] = useState(false);
  const location = useLocation();
  const isMemberRoute = location.pathname.startsWith('/members');

  return (
    <>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: { duration: 3000, iconTheme: { primary: '#16A34A', secondary: '#fff' } },
          error: { duration: 4000, iconTheme: { primary: '#DC2626', secondary: '#fff' } },
        }}
      />

      {/* All your routes */}
      <AppRoutes />

      {/* Only show To-Do on non-member routes */}
      {/* {!isMemberRoute && (
        <>
          <ToDoIcon onClick={() => setTodoOpen(true)} />
          <ToDoModal open={todoOpen} onClose={() => setTodoOpen(false)} />
        </>
      )} */}
    </>
  );
}

// src/App.tsx
export default function App() {
  return (
    <FormatProvider>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </FormatProvider>
  );
}