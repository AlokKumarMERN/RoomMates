import { NavLink, Outlet, useNavigate } from 'react-router-dom';

import Logo from '../components/Logo.jsx';
import NotificationBell from '../components/NotificationBell.jsx';
import RoomSwitcher from '../components/RoomSwitcher.jsx';
import Button from '../components/ui/Button.jsx';
import {
  DashboardIcon,
  ExpensesIcon,
  LogoutIcon,
  RoomsIcon,
  SettleIcon,
} from '../components/ui/icons.jsx';
import useAuth from '../hooks/useAuth.js';

const NAV_LINKS = [
  { to: '/dashboard', label: 'Dashboard', Icon: DashboardIcon },
  { to: '/expenses', label: 'Expenses', Icon: ExpensesIcon },
  { to: '/settlements', label: 'Settle up', Icon: SettleIcon },
  { to: '/rooms', label: 'Rooms', Icon: RoomsIcon },
];

/**
 * The signed-in shell.
 *
 * TWO NAVIGATIONS, NOT ONE SHRUNK (spec §22). On a wide screen the links sit in
 * the header, where there is room and where people look for them. On a phone
 * they move to a fixed bar at the bottom — inside the thumb's reach, which the
 * top of a 6-inch screen is not. The same four links, positioned for the hand
 * holding the device rather than for the smaller version of a desktop layout.
 *
 * The bottom bar also clears the iOS home indicator via `env(safe-area-inset-bottom)`,
 * without which the last few pixels of it are unreachable on any modern iPhone.
 */
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

  const headerLink = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
      isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
    }`;

  const bottomLink = ({ isActive }) =>
    `flex flex-1 flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-medium transition-colors ${
      isActive ? 'text-brand-700' : 'text-slate-500'
    }`;

  return (
    <div className="min-h-dvh">
      {/* The first thing a keyboard lands on: a way past the navigation. */}
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-5">
            {/* shrink-0: the wordmark is the one thing in this row that must
                never be clipped — a half-rendered brand reads as a broken page. */}
            <span className="shrink-0">
              <Logo size="sm" to="/dashboard" />
            </span>
            <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
              {NAV_LINKS.map((link) => (
                <NavLink key={link.to} to={link.to} className={headerLink}>
                  {link.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
            <RoomSwitcher />
            <NotificationBell />
            <span
              className="hidden size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-xs font-semibold text-brand-700 sm:grid"
              title={user?.name}
              aria-hidden="true"
            >
              {initials}
            </span>
            {/* The word costs more than it earns beside three other controls on
                a 360px header, so the phone gets the icon and the accessible
                name — never the icon alone. */}
            <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Log out">
              <LogoutIcon className="size-4 sm:hidden" />
              <span className="hidden sm:inline">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* pb-24 on mobile keeps the last row of any page clear of the bottom bar. */}
      <main id="main" className="mx-auto max-w-5xl px-4 pt-8 pb-24 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <div className="flex items-stretch gap-1 px-2 py-1">
          {NAV_LINKS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={bottomLink}>
              {({ isActive }) => (
                <>
                  <Icon className={isActive ? 'size-5.5' : 'size-5'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
