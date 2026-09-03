import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import Logo from '../components/Logo.jsx';
import RoomSwitcher from '../components/RoomSwitcher.jsx';
import Button from '../components/ui/Button.jsx';
import useAuth from '../hooks/useAuth.js';

// Phase 8 adds Settlements, Phase 9 History.
const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/expenses', label: 'Expenses' },
  { to: '/rooms', label: 'Rooms' },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const initials = user?.name
    ?.split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  const linkClasses = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="min-h-dvh">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-3">
          <div className="flex items-center gap-5">
            <Logo size="sm" to="/dashboard" />
            {/* Hidden on the smallest screens; Phase 11 adds the bottom bar. */}
            <nav className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className={linkClasses}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <RoomSwitcher />
            <span
              className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700"
              title={user?.name}
              aria-hidden="true"
            >
              {initials}
            </span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              Log out
            </Button>
          </div>
        </div>

        {/* Small screens get the nav on its own row rather than a cramped header. */}
        <nav className="flex items-center gap-1 border-t border-slate-100 px-6 py-2 sm:hidden">
          {NAV_LINKS.map((link) => (
            <NavLink key={link.to} to={link.to} className={linkClasses}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
