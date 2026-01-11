import { Link, useLocation } from 'react-router-dom';
import './Navigation.css';

function Navigation({ isAuthenticated, onLogout }) {
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';

    if (isDashboard) return null; // Don't show nav on dashboard

    return (
        <nav className="nav">
            <div className="container">
                <div className="nav-content">
                    <Link to="/" className="nav-logo">
                        <span className="text-gradient">Portfolio</span>
                    </Link>

                    <ul className="nav-links">
                        {!isAuthenticated && (
                            <>
                                <li><a href="#home">Home</a></li>
                                <li><a href="#about">About</a></li>
                                <li><a href="#projects">Projects</a></li>
                                <li><a href="#contact">Contact</a></li>
                                <li><Link to="/login" className="btn btn-primary btn-sm">Banking Dashboard</Link></li>
                            </>
                        )}
                        {isAuthenticated && (
                            <>
                                <li><Link to="/dashboard">Dashboard</Link></li>
                                <li><button onClick={onLogout} className="btn btn-secondary btn-sm">Logout</button></li>
                            </>
                        )}
                    </ul>
                </div>
            </div>
        </nav>
    );
}

export default Navigation;
