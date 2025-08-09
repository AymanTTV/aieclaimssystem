// src/App.tsx

import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { FormatProvider } from './context/FormatContext';
import AppRoutes from './routes';
import { ToDoIcon } from './components/todo/ToDoIcon';
import { ToDoModal } from './components/todo/ToDoModal';

function AppInner() {
  const [todoOpen, setTodoOpen] = useState(false);

  return (
    <>
      {/* Global toast notifications */}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: { background: '#363636', color: '#fff' },
          success: {
            duration: 3000,
            iconTheme: { primary: '#16A34A', secondary: '#fff' },
          },
          error: {
            duration: 4000,
            iconTheme: { primary: '#DC2626', secondary: '#fff' },
          },
        }}
      />

      {/* All your routes */}
      <AppRoutes />

      {/* Floating todo button + modal */}
      <ToDoIcon onClick={() => setTodoOpen(true)} />
      <ToDoModal open={todoOpen} onClose={() => setTodoOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <FormatProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppInner />
        </AuthProvider>
      </BrowserRouter>
    </FormatProvider>
  );
}
