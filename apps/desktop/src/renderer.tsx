/*apps/desktop/src/renderer.tsx*/

import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// renders the app with index.css (to avoid inline css) and 3rd party utf8 symbols

const root = createRoot(document.getElementById('root')!);
root.render(<App />);