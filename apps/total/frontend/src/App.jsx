import React, { useState } from 'react'
import Dashboard from './components/Dashboard'
import LoginPage from './components/LoginPage'
import BlueprintAnalysis from './components/BlueprintAnalysis'
import { LayoutDashboard, FileSearch } from 'lucide-react'

const NAV_ITEMS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'blueprints', label: 'Planos', icon: FileSearch },
];

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [activePage, setActivePage] = useState('dashboard');

    if (!isAuthenticated) {
        return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
    }

    return (
        <div className="app-layout">
            <header className="app-header">
                <div className="header-content">
                    <div className="logo-section">
                        <div className="logo-box">
                            <span className="logo-text">IC</span>
                        </div>
                        <h1 className="app-title">SharePoint Dashboard</h1>
                    </div>

                    {/* Navigation tabs */}
                    <nav className="app-nav">
                        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                className={`nav-tab ${activePage === id ? 'nav-tab--active' : ''}`}
                                onClick={() => setActivePage(id)}
                            >
                                <Icon size={15} />
                                {label}
                            </button>
                        ))}
                    </nav>

                    <div className="header-meta">
                        <span>Sites: GeneralIC • GND</span>
                        <button
                            className="logout-btn"
                            onClick={() => setIsAuthenticated(false)}
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </header>

            <main className="main-content">
                {activePage === 'dashboard' && <Dashboard />}
                {activePage === 'blueprints' && <BlueprintAnalysis />}
            </main>
        </div>
    );
}

export default App
