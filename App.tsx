import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import { VehicleProvider } from './utils/VehicleProvider';
import AppRoutes from './routes';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <VehicleProvider>
          <Toaster position="top-right" />
          <AppRoutes />
        </VehicleProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
