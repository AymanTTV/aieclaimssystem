import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { VehicleProvider } from './utils/VehicleProvider';
import AppRoutes from './routes';
import { FormatProvider } from './context/FormatContext';
import { ToDoIcon } from './components/todo/ToDoIcon';
import { ToDoModal } from './components/todo/ToDoModal';


function App() {
  const [todoOpen, setTodoOpen] = useState(false);
  return (
    <FormatProvider>
    <BrowserRouter>
       
      <AuthProvider>
       <VehicleProvider>
          <Toaster 
            position="top-right" 
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#16A34A',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#DC2626',
                  secondary: '#fff',
                },
              },
            }}
          />
          <AppRoutes />
          {/* ——— To-Do List Overlay ——— */}
            <ToDoIcon onClick={() => setTodoOpen(true)} />
            <ToDoModal open={todoOpen} onClose={() => setTodoOpen(false)} />
          </VehicleProvider>
        
      </AuthProvider>
         
         
       
    </BrowserRouter>
      </FormatProvider>
     
      
  );
}

export default App;
