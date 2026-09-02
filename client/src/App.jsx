import { Route, Routes } from 'react-router-dom';

import Landing from './pages/Landing.jsx';
import NotFound from './pages/NotFound.jsx';

/**
 * Route table for the whole app.
 *
 * Phase 2 wraps the authenticated block in <ProtectedRoute> and adds Login and
 * Register; Phase 11 converts these to React.lazy imports so each route ships
 * as its own chunk (spec §24).
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
