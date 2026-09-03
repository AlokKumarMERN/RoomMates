import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

import ProtectedRoute from './components/ProtectedRoute.jsx';
import RouteFallback from './components/RouteFallback.jsx';
import AppLayout from './layouts/AppLayout.jsx';

/**
 * Route table for the whole app.
 *
 * Public routes sit at the top level; everything that needs a session is nested
 * under <ProtectedRoute>, so adding a page to the authenticated area is a single
 * line and cannot accidentally be left unguarded.
 *
 * EVERY PAGE IS LAZY (spec §24). One bundle meant every visitor downloaded the
 * charting library to read a login form — Recharts and its D3 dependencies are
 * the largest thing in the app and only the dashboard uses them. Splitting on
 * the route boundary is the one place where the split matches how people
 * actually move through the app: nobody visits every page in a session.
 *
 * The cost is a fallback between routes, which `RouteFallback` keeps invisible
 * for the short loads that are the common case.
 */

// Public
const Landing = lazy(() => import('./pages/Landing.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

// Authenticated
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Rooms = lazy(() => import('./pages/Rooms.jsx'));
const CreateRoom = lazy(() => import('./pages/CreateRoom.jsx'));
const JoinRoom = lazy(() => import('./pages/JoinRoom.jsx'));
const RoomDetails = lazy(() => import('./pages/RoomDetails.jsx'));
const Expenses = lazy(() => import('./pages/Expenses.jsx'));
const AddExpense = lazy(() => import('./pages/AddExpense.jsx'));
const ExpenseDetails = lazy(() => import('./pages/ExpenseDetails.jsx'));
const EditExpense = lazy(() => import('./pages/EditExpense.jsx'));
const Settlements = lazy(() => import('./pages/Settlements.jsx'));

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
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
            <Route path="/expenses/:expenseId/edit" element={<EditExpense />} />

            <Route path="/settlements" element={<Settlements />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
