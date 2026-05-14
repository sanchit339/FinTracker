import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Analytics from './components/Analytics';
import Insights from './components/Insights';
import Settings from './components/Settings';
import Sidebar from './components/Sidebar';

const ProtectedRoute = ({ isAuthenticated, children }) => {
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return children;
};

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const insightsEnabled = String(import.meta.env.VITE_ENABLE_HYBRID_INSIGHTS || 'false').toLowerCase() === 'true';

    useEffect(() => {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/auth/verify', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (data.valid) {
                        setIsAuthenticated(true);
                    } else {
                        localStorage.removeItem('token');
                    }
                })
                .catch(() => {
                    localStorage.removeItem('token');
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setLoading(false);
        }

        // Force light mode globally
        localStorage.removeItem('theme');
        document.documentElement.removeAttribute('data-theme');
    }, []);

    const handleLogin = (token) => {
        localStorage.setItem('token', token);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setIsAuthenticated(false);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <Router>
            <Routes>
                <Route 
                    path="/login" 
                    element={
                        isAuthenticated 
                            ? <Navigate to="/" replace /> 
                            : <Login onLogin={handleLogin} />
                    } 
                />
                
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute isAuthenticated={isAuthenticated}>
                            <div className="App app-shell flex" style={{ minHeight: '100vh' }}>
                                <Sidebar onLogout={handleLogout} />

                                <main className="app-main" style={{ flex: 1, overflow: 'auto' }}>
                                    <Routes>
                                        <Route path="/" element={<Dashboard />} />
                                        <Route path="/transactions" element={<Transactions />} />
                                        <Route path="/analytics" element={<Analytics />} />
                                        {insightsEnabled && <Route path="/insights" element={<Insights />} />}
                                        <Route path="/settings" element={<Settings />} />
                                        <Route path="*" element={<Navigate to="/" replace />} />
                                    </Routes>
                                </main>
                            </div>
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </Router>
    );
}

export default App;
