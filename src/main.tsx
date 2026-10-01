import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

const savedTheme = localStorage.getItem('sanad_theme');
document.documentElement.classList.toggle('dark', savedTheme !== 'light');

createRoot(document.getElementById('root')!).render(<App />);
