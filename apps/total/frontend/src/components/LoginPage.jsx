import React, { useState } from 'react';

const LoginPage = ({ onLogin }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        // Small delay for UX feel
        setTimeout(() => {
            const validUser = import.meta.env.VITE_APP_USER;
            const validPass = import.meta.env.VITE_APP_PASS;

            if (username === validUser && password === validPass) {
                onLogin();
            } else {
                setError('Invalid username or password. Please try again.');
                setLoading(false);
            }
        }, 500);
    };

    return (
        <div className="login-page">
            <div className="login-card glass">
                {/* Logo */}
                <div className="login-logo">
                    <div className="logo-box logo-box-lg">
                        <span className="logo-text">IC</span>
                    </div>
                    <h1 className="login-title">SharePoint Dashboard</h1>
                    <p className="login-subtitle">Sign in to access your data</p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form" noValidate>
                    <div className="form-group">
                        <label htmlFor="username" className="form-label">Username</label>
                        <input
                            id="username"
                            name="username"
                            type="text"
                            className="form-input"
                            placeholder="Enter your username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            autoFocus
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {error && (
                        <div className="login-error">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="login-footer">IC Constructora · Internal Tool</p>
            </div>
        </div>
    );
};

export default LoginPage;
