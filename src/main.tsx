import React from 'react';
import { createRoot } from 'react-dom/client';
import { prepareIsolation } from './core/isolation';
import App from './App';
import './style.css';

await prepareIsolation();
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
