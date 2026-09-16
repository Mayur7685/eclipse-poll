import { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import WalletButton from './WalletButton';

const NAV = [
  { to: '/polls',       label: 'Polls' },
  { to: '/surveys',     label: 'Surveys' },
  { to: '/communities', label: 'Communities' },
  { to: '/activity',    label: 'Activity' },
  { to: '/my-votes',    label: 'My Votes' },
  { to: '/credentials', label: 'Credentials' },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">

      {/* Top decorative bar */}
      <div className="w-full px-8 pt-4">
        <div className="h-1 w-full bg-gray-900 rounded-sm max-w-[1400px] mx-auto" />
      </div>

      {/* Header */}
      <header className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 py-4 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link
          to="/polls"
          className="flex items-center gap-2 shrink-0"
          onClick={() => setMenuOpen(false)}
        >
          <span className="text-xl font-semibold tracking-tight text-gray-900 leading-none">Eclipse Poll</span>
        </Link>

        {/* Center nav — desktop */}
        <nav className="hidden sm:flex items-center space-x-6 sm:space-x-8">
          {NAV.map(n => {
            const active = pathname === n.to || pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`text-sm font-medium transition-colors pb-0.5 ${
                  active
                    ? 'text-gray-900 border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-3">
          {/* + New Poll */}
          <button
            onClick={() => navigate('/create-poll')}
            className="hidden sm:flex w-8 h-8 rounded-full bg-gray-900 text-white items-center justify-center hover:bg-gray-800 transition-colors shrink-0"
            title="Create Poll"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
            </svg>
          </button>

          {/* Wallet button */}
          <WalletButton />

          {/* Hamburger — mobile */}
          <button
            className="sm:hidden flex flex-col gap-1.5 p-1.5"
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
          >
            <span className={`block w-5 h-0.5 bg-gray-900 transition-all ${menuOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-5 h-0.5 bg-gray-900 transition-all ${menuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-5 h-0.5 bg-gray-900 transition-all ${menuOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {menuOpen && (
        <nav className="sm:hidden bg-white border-b border-gray-100 px-6 pb-4 flex flex-col gap-1">
          {NAV.map(n => {
            const active = pathname === n.to || pathname.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setMenuOpen(false)}
                className={`text-sm font-medium py-2.5 border-b border-gray-50 last:border-0 ${
                  active ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto px-6 sm:px-8 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="w-full max-w-[1400px] mx-auto px-6 sm:px-8 py-8 border-t border-gray-200 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500">
        <div>
          <span className="font-semibold text-gray-900">Eclipse Poll</span> · Powered by Midnight Network (Preprod ZK)
        </div>
        <div className="flex items-center gap-4">
          <Link to="/polls" className="hover:text-gray-900 transition-colors">Polls</Link>
          <Link to="/surveys" className="hover:text-gray-900 transition-colors">Surveys</Link>
          <Link to="/credentials" className="hover:text-gray-900 transition-colors">Credentials</Link>
        </div>
      </footer>

    </div>
  );
}
