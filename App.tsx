
import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import HomePage from './pages/HomePage';
import PracticePage from './pages/PracticePage';
import ResultsPage from './pages/ResultsPage';

const App: React.FC = () => {
  return (
    <AppProvider>
      <HashRouter>
        <div className="bg-slate-50 min-h-screen text-slate-800">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/practice" element={<PracticePage />} />
            <Route path="/results" element={<ResultsPage />} />
          </Routes>
        </div>
      </HashRouter>
    </AppProvider>
  );
};

export default App;
