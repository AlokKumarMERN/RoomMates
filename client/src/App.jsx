import { Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import AppLayout from './layouts/AppLayout.jsx';
import AddExpense from './pages/AddExpense.jsx';
import CreateRoom from './pages/CreateRoom.jsx';
import Dashboard from './pages/Dashboard.jsx';
import ExpenseDetails from './pages/ExpenseDetails.jsx';
import Expenses from './pages/Expenses.jsx';
import JoinRoom from './pages/JoinRoom.jsx';
import Landing from './pages/Landing.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Register from './pages/Register.jsx';
import RoomDetails from './pages/RoomDetails.jsx';
import Rooms from './pages/Rooms.jsx';

/**
 * Route table for the whole app.
 *
 * Public routes sit at the top level; everything that needs a session is nested
 * under <ProtectedRoute>, so adding a page to the authenticated area is a single
 * line and cannot accidentally be left unguarded.
 *
 * Phase 11 converts these to React.lazy imports so each route ships as its own
 * chunk (spec §24).
 */
export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Authenticated */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/rooms" element={<Rooms />} />
          {/* Static segments before the parameterised one, so /rooms/new is not
              read as a room whose id is "new". */}
          <Route path="/rooms/new" element={<CreateRoom />} />
          <Route path="/rooms/join" element={<JoinRoom />} />
          <Route path="/rooms/:roomId" element={<RoomDetails />} />

          <Route path="/expenses" element={<Expenses />} />
          {/* Again, the static segment first: /expenses/new is a page, not an
              expense whose id is "new". */}
          <Route path="/expenses/new" element={<AddExpense />} />
          <Route path="/expenses/:expenseId" element={<ExpenseDetails />} />
          {/* Phase 8: /settlements */}
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
