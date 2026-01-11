import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ onLogout, theme, toggleTheme }) {
    const location = useLocation();

    const navItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/transactions', icon: '💸', label: 'Transactions' },
        { path: '/analytics', icon: '📈', label: 'Analytics' },
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
                <button onClick={toggleTheme} className="btn btn-ghost w-full">
                    {theme === 'light' ? '🌙' : '☀️'}
                    <span>{theme === 'light' ? 'Dark' : 'Light'} Mode</span>
                </button>
                <button onClick={onLogout} className="btn btn-ghost w-full text-danger">
                    🚪 Logout
                </button>
            </div>
        </aside>
    );
}

export default Sidebar;
