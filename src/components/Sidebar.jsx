import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ onLogout }) {
    const location = useLocation();
    const insightsEnabled = String(import.meta.env.VITE_ENABLE_HYBRID_INSIGHTS || 'false').toLowerCase() === 'true';

    const navItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/transactions', icon: '💸', label: 'Transactions' },
        { path: '/analytics', icon: '📈', label: 'Analytics' },
        ...(insightsEnabled ? [{ path: '/insights', icon: '🧠', label: 'Insights' }] : []),
        { path: '/settings', icon: '⚙️', label: 'Settings' }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <h1 className="sidebar-logo">
                    <span className="logo-icon">💰</span>
                    <span>FinTrack</span>
                </h1>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <Link
                        key={item.path}
                        to={item.path}
                        className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="sidebar-footer">
                <button onClick={onLogout} className="btn btn-ghost w-full text-danger">
                    🚪 Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
