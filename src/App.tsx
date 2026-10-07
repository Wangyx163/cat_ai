import { useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { QuickSheet } from './components/QuickSheet';
import { TabBar } from './components/TabBar';
import { Toast } from './components/ui';
import CarePage from './pages/CarePage';
import CheckFlow from './pages/CheckFlow';
import CirclePage from './pages/CirclePage';
import FosterPage from './pages/FosterPage';
import HomePage from './pages/HomePage';
import LostPage from './pages/LostPage';
import MePage from './pages/MePage';
import Onboarding from './pages/Onboarding';
import PetDetail from './pages/PetDetail';
import PlanWizard from './pages/PlanWizard';
import SharedSummary from './pages/SharedSummary';
import VisitPage from './pages/VisitPage';
import WalkPage from './pages/WalkPage';

const MAIN = ['/', '/care', '/circle', '/me'];

export default function App() {
  const loc = useLocation();
  const [plus, setPlus] = useState(false);
  const main = MAIN.includes(loc.pathname);
  const cool = /^\/(check|plan|share)/.test(loc.pathname);
  return (
    <div className={`app${main ? '' : ' app--notab'}${cool ? ' app--cool' : ''}`}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/care" element={<CarePage />} />
        <Route path="/plan" element={<PlanWizard />} />
        <Route path="/plan/:petId" element={<PlanWizard />} />
        <Route path="/check/:petId" element={<CheckFlow />} />
        <Route path="/share/summary/:id" element={<SharedSummary />} />
        <Route path="/pet/:petId" element={<PetDetail />} />
        <Route path="/circle" element={<CirclePage />} />
        <Route path="/circle/walk" element={<WalkPage />} />
        <Route path="/circle/visit" element={<VisitPage />} />
        <Route path="/circle/visit/:homeId" element={<VisitPage />} />
        <Route path="/circle/lost" element={<LostPage />} />
        <Route path="/circle/foster" element={<FosterPage />} />
        <Route path="/me" element={<MePage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {main && <TabBar onPlus={() => setPlus(true)} />}
      <QuickSheet open={plus} onClose={() => setPlus(false)} />
      <Toast />
    </div>
  );
}
