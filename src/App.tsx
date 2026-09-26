import React from 'react';
import { AppProvider } from './context/AppContext';
import { MainLayout } from './components/layout/MainLayout';

export const App: React.FC = () => {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
};

export default App;
