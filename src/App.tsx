/**
 * App — root component with routing
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { GroupsPage } from './pages/GroupsPage'
import { KnockoutPage } from './pages/KnockoutPage'
import { PredictionPage } from './pages/PredictionPage'
import { SchedulePage } from './pages/SchedulePage'

// Vite's base path (for GitHub Pages: /repo-name/)
const basePath = import.meta.env.BASE_URL || '/'

function stripTrailingSlash(path: string) {
  return path.endsWith('/') ? path.slice(0, -1) : path
}

export default function App() {
  return (
    <BrowserRouter basename={stripTrailingSlash(basePath)}>
      <div className="min-h-screen bg-slate-900">
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/groups" element={<GroupsPage />} />
          <Route path="/knockout" element={<KnockoutPage />} />
          <Route path="/prediction" element={<PredictionPage />} />
          <Route path="/schedule" element={<SchedulePage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
