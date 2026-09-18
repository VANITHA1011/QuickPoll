import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.trim().toLowerCase(),
          password: formData.password
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        login(data.user, data.token);
        const params = new URLSearchParams(window.location.search);
        const redirectUrl = params.get('redirect') || '/dashboard';
        navigate(redirectUrl);
      } else {
        setError(data?.message || 'Login failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Unable to connect to server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="status-section">
      <div className="status-card" style={{ maxWidth: '420px', margin: '0 auto', textAlign: 'left' }}>
        <h2 className="status-title" style={{ textAlign: 'center', marginBottom: '8px' }}>Login</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '24px' }}>
          Welcome back to QuickPoll
        </p>
        
        {error && (
          <div style={{ padding: '12px 16px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '14px', fontWeight: '500' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Email</label>
            <input 
              name="email"
              type="email" 
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}>Password</label>
            <input 
              name="password"
              type="password" 
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>
          <button 
            type="submit" 
            className="btn-primary"
            disabled={isLoading}
            style={{ marginTop: '8px' }}
          >
            {isLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ fontWeight: '500' }}>Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
