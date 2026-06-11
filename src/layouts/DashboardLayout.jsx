import { NavLink, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, FolderOpen, Database, FlaskConical,
  BarChart2, CheckSquare, Search, FileText, User, Trophy,
  LogOut, Microscope, Bell, Sparkles, ChevronRight, Menu, X, ClipboardCheck, PenLine, PackageCheck, Brain, IdCard
} from 'lucide-react';
import { useState } from 'react';

const navGroups = [
  {
    label: 'Research',
    items: [
      { to: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
      { to: '/projects',      label: 'Projects',        icon: FolderOpen },
      { to: '/published-research', label: 'Published Research', icon: Search },
      { to: '/datasets',      label: 'Datasets',        icon: Database },
      { to: '/experiments',   label: 'Experiments',     icon: FlaskConical },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/compare',       label: 'Compare',         icon: BarChart2 },
      { to: '/leaderboard',    label: 'Leaderboard',     icon: Trophy },
      { to: '/reproducibility',label: 'Reproducibility',icon: CheckSquare },
      { to: '/xai-evidence',  label: 'XAI Evidence',   icon: Sparkles },
      { to: '/quality-review', label: 'Quality Review', icon: Brain },
      { to: '/reports',       label: 'Reports',         icon: FileText },
      { to: '/repro-package',  label: 'Repro Package',   icon: PackageCheck },
      { to: '/model-cards',    label: 'Model Cards',     icon: IdCard },
      { to: '/manuscript',    label: 'Manuscript AI',   icon: PenLine },
      { to: '/review-requests', label: 'Review Queue',  icon: ClipboardCheck },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/profile', label: 'Profile', icon: User },
    ],
  },
];

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); };
  const closeSidebar = () => setSidebarOpen(false);

  const allItems = navGroups.flatMap(g => g.items);
  const currentLabel = allItems.find(item => location.pathname.startsWith(item.to))?.label || 'Dashboard';

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <button
        type="button"
        className="mobile-menu-button"
        onClick={() => setSidebarOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <div className="sidebar-backdrop" onClick={closeSidebar} />

      {/* ── Sidebar ──────────────────────────────── */}
      <aside className="sidebar">

        {/* Logo */}
        <div style={{ padding: '20px 16px 18px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(99,102,241,0.4)',
              flexShrink: 0,
            }}>
              <Microscope size={18} color="white" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.4px', color: 'var(--text-primary)' }}>
                MedReproLab
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500, letterSpacing: '0.5px' }}>
                AI RESEARCH PLATFORM
              </div>
            </div>
            </div>
            <button type="button" className="sidebar-close-button" onClick={closeSidebar} aria-label="Close navigation">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Nav Groups */}
        <nav style={{ flex: 1, paddingTop: 12, overflowY: 'auto', paddingBottom: 8 }}>
          {navGroups.map(group => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <div style={{
                padding: '8px 20px 4px',
                fontSize: 10, fontWeight: 700,
                color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '1.2px',
              }}>
                {group.label}
              </div>
              {group.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) => `sidebar-nav-item${isActive ? ' active' : ''}`}
                  onClick={closeSidebar}
                >
                  <Icon size={16} strokeWidth={2} />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User Card */}
        <div style={{ padding: '14px 12px', borderTop: '1px solid var(--border)' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            marginBottom: 8,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              fontSize: 13, fontWeight: 700, color: 'white',
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'R'}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name}
              </div>
              <div style={{ fontSize: 11, color: 'var(--accent-indigo)', fontWeight: 500, marginTop: 1 }}>
                {user?.role === 'admin' ? 'Admin' : 'Researcher'}
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: 'rgba(248,113,113,0.08)', color: 'var(--accent-red)',
              border: '1px solid rgba(248,113,113,0.2)',
              padding: '9px 14px', borderRadius: 10, cursor: 'pointer',
              fontSize: 13, fontWeight: 500, transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(248,113,113,0.08)'; }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ─────────────────────────────────── */}
      <main className="main-content">

        {/* Topbar */}
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>MedReproLab</span>
            <ChevronRight size={14} color="var(--text-muted)" />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{currentLabel}</span>
          </div>

          <div className="topbar-actions">

            {/* Search button */}
            <button aria-label="Search" style={{
              background: 'var(--bg-glass)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 14px',
              display: 'flex', alignItems: 'center', gap: 8,
              cursor: 'pointer', color: 'var(--text-muted)',
              fontSize: 13, transition: 'all 0.2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Search size={14} />
              <span style={{ display: 'none' }}>Search</span>
            </button>

            {/* Bell */}
            <button aria-label="Notifications" style={{
              background: 'var(--bg-glass)', border: '1px solid var(--border)',
              borderRadius: 10, padding: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--text-muted)', transition: 'all 0.2s', position: 'relative',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <Bell size={16} />
              <span style={{
                position: 'absolute', top: 6, right: 6,
                width: 6, height: 6, background: 'var(--accent-blue)',
                borderRadius: '50%', border: '1px solid var(--bg-secondary)',
              }} />
            </button>

            {/* User avatar */}
            <div className="topbar-profile" style={{
              display: 'flex', alignItems: 'center', gap: 10,
              paddingLeft: 12, marginLeft: 4,
              borderLeft: '1px solid var(--border)',
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 700, color: 'white',
                boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
              }}>
                {user?.name?.charAt(0).toUpperCase() || 'R'}
              </div>
              <div style={{ lineHeight: 1.2 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{user?.institution || 'Researcher'}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
