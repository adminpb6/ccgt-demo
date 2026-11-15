import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { useStore } from './store/store';
import { Layout } from './ui/components/Layout';
import { Dashboard } from './ui/pages/Dashboard';
import { Delays } from './ui/pages/Delays';
import { ImportPage } from './ui/pages/Import';
import { Monits } from './ui/pages/Monits';
import { ObjectGantt } from './ui/pages/ObjectGantt';
import { Objects } from './ui/pages/Objects';
import { Purchasing } from './ui/pages/Purchasing';
import { Register } from './ui/pages/Register';
import { Team } from './ui/pages/Team';
import './index.css';

function App() {
  const init = useStore((s) => s.init);
  useEffect(() => { void init(); }, [init]);
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="objects" element={<Objects />} />
          <Route path="objects/:code" element={<ObjectGantt />} />
          <Route path="monits" element={<Monits />} />
          <Route path="register" element={<Register />} />
          <Route path="delays" element={<Delays />} />
          <Route path="purchasing" element={<Purchasing />} />
          <Route path="team" element={<Team />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="*" element={<p className="p-6">Nie znaleziono strony.</p>} />
        </Route>
      </Routes>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
