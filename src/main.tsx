import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Banner } from './ui/components/Banner';
import './index.css';

function Home() {
  return <main className="p-6"><h1 className="text-2xl font-semibold">CCGT — demo harmonogramu</h1></main>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HashRouter>
      <Banner />
      <Routes><Route path="*" element={<Home />} /></Routes>
    </HashRouter>
  </React.StrictMode>,
);
