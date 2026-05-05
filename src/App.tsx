import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { UpdateBanner } from './components/UpdateBanner';

function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="text-6xl">⚽</div>
      <h1 className="text-3xl font-bold text-fg-heading">Mister Footcoach</h1>
      <p className="text-fg-muted text-center max-w-sm">
        Votre application de coaching football. Gérez vos équipes, créez vos compositions et
        suivez vos statistiques.
      </p>
      <div className="flex gap-3 mt-4">
        <a
          href="#equipes"
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-fg hover:bg-primary-hover transition-colors"
        >
          Mes équipes
        </a>
        <a
          href="#match"
          className="rounded-xl border border-border-ui px-5 py-2.5 text-sm font-semibold text-fg hover:bg-surface-muted transition-colors"
        >
          Nouveau match
        </a>
      </div>
    </main>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/mister-footcoach">
      <UpdateBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
