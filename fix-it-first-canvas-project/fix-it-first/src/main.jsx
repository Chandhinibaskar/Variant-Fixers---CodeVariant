import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import { StoreProvider } from './store.jsx';
import { DndProvider } from '../../../fix-it-first-project/fix-it-first/src/dnd.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <DndProvider>
        <App />
      </DndProvider>
    </StoreProvider>
  </React.StrictMode>
);
