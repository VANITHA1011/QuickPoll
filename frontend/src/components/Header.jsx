import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import './Header.css';

function Header() {
  const location = useLocation();
  const path = location.pathname;
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navLinkStyle = (currentPath) => ({
    textDecoration: 'none',
    fontWeight: '500',
    color: path === currentPath ? 'var(--primary)' : 'var(--text-secondary)',
    borderBottom: path === currentPath ? '2px solid var(--primary)' : '2px solid transparent',
    padding: '4px 0',
    transition: 'color var(--transition), border-color var(--transition)'
  });

  return (
    <header className="header">
      <div className="header-inner">
        <div className="header-logo">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <span className="logo-icon">⚡</span>
            <span className="logo-text">QuickPoll</span>
          </Link>
        </div>
        <nav className="header-nav">
          <button 
            onClick={toggleTheme} 
            aria-label="Toggle Theme" 
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              fontSize: '20px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              marginRight: '8px'
            }}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          
          {user ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginRight: '8px' }}>
                <div style={{ 
                  width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' 
                }}>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span style={{ color: 'var(--text)', fontWeight: '500' }}>
                  {user.username}
                </span>
              </div>
              <Link to="/dashboard" style={navLinkStyle('/dashboard')}>Dashboard</Link>
              <Link to="/create-poll" style={navLinkStyle('/create-poll')}>Create Poll</Link>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '15px', fontWeight: '500', marginLeft: '10px', padding: '4px 0', transition: 'color var(--transition)' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/" style={navLinkStyle('/')}>Home</Link>
              <Link to="/login" style={navLinkStyle('/login')}>Login</Link>
              <Link to="/register" style={navLinkStyle('/register')}>Register</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export default Header;

