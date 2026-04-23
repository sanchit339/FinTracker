import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Sidebar.css';

function Sidebar({ onLogout }) {
    const location = useLocation();
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const insightsEnabled = String(import.meta.env.VITE_ENABLE_HYBRID_INSIGHTS || 'false').toLowerCase() === 'true';

    const navItems = [
        { path: '/', icon: '📊', label: 'Dashboard' },
        { path: '/transactions', icon: '💸', label: 'Transactions' },
        { path: '/analytics', icon: '📈', label: 'Analytics' },
        ...(insightsEnabled ? [{ path: '/insights', icon: '🧠', label: 'Insights' }] : []),
        { path: '/settings', icon: '⚙️', label: 'Settings' }
    ];

    const toggleMobileMenu = () => {
        setIsMobileOpen(!isMobileOpen);
    };

    const handleNavClick = () => {
        if (isMobileOpen) {
            setIsMobileOpen(false);
        }
    };

    return (
        <>
            {/* Mobile Header */}
            <div className="mobile-header">
                <h1 className="sidebar-logo">
                    <span className="logo-icon">💰</span>
                    <span>FinTrack</span>
                </h1>
                <button className="hamburger-btn" onClick={toggleMobileMenu}>
                    {isMobileOpen ? '✕' : '☰'}
                </button>
            </div>

            {/* Overlay for mobile */}
            {isMobileOpen && (
                <div className="sidebar-overlay" onClick={toggleMobileMenu}></div>
            )}

            <aside className={`sidebar ${isMobileOpen ? 'mobile-open' : ''}`}>
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
                            onClick={handleNavClick}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </Link>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button onClick={() => { handleNavClick(); onLogout(); }} className="btn btn-ghost w-full text-danger">
                        🚪 Logout
                    </button>
                </div>
            </aside>
        </>
    );
}

export default Sidebar;
