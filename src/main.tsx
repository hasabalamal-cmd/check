import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { getLanguage } from './utils/i18n';

const savedTheme = localStorage.getItem('sanad_theme_preference_v2');
document.documentElement.classList.toggle('dark', savedTheme === 'dark');
document.documentElement.lang = getLanguage();
document.documentElement.dir = getLanguage() === 'ar' ? 'rtl' : 'ltr';

createRoot(document.getElementById('root')!).render(<App />);
