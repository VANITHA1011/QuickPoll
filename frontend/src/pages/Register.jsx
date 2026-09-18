import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const redirectUrl = searchParams.get('redirect');
  const loginLink = redirectUrl ? `/login?redirect=${redirectUrl}` : '/login';

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear errors when the user begins typing
    if (error) setError('');
  };

  const validate = () => {
    const trimmedUsername = formData.username.trim();
    const trimmedEmail = formData.email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!trimmedUsername) {
      return 'Username is required.';
    }

    if (trimmedUsername.length < 2) {
      return 'Username must be at least 2 characters.';
    }

    if (!trimmedEmail) {
      return 'Email is required.';
    }

    if (!emailRegex.test(trimmedEmail)) {
      return 'Please enter a valid email.';
    }

    if (!formData.password) {
      return 'Password is required.';
    }

    if (formData.password.length < 8) {
      return 'Password must be at least 8 characters.';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match.';
    }

    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setError('');
    setSuccess('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.status === 201) {
        setSuccess('Account created successfully!');
        setFormData({
          username: '',
          email: '',
          password: '',
          confirmPassword: '',
        });
      } else if (response.status === 409) {
        setError(data?.message || 'Email already registered.');
      } else if (response.status === 400) {
        setError(data?.message || 'Invalid registration details. Please check your inputs.');
      } else {
        setError(data?.message || 'Failed to create account. Please try again.');
      }
    } catch (err) {
      setError('Unable to connect to server. Please make sure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="status-section">
      <div className="status-card" style={{ maxWidth: '440px', margin: '0 auto', textAlign: 'left' }}>
        <h2 className="status-title" style={{ textAlign: 'center', marginBottom: '8px' }}>
          Create Account
        </h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
          Join QuickPoll to create and participate in live polls
        </p>

        {error && (
          <div
            role="alert"
            style={{
              padding: '12px 16px',
              backgroundColor: 'rgba(225, 112, 85, 0.12)',
              border: '1px solid var(--error)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--error)',
              fontSize: '14px',
              marginBottom: '20px',
              fontWeight: '500',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            style={{
              padding: '16px',
              backgroundColor: 'rgba(0, 184, 148, 0.12)',
              border: '1px solid var(--success)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--success)',
              fontSize: '14px',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            <p style={{ fontWeight: '600', marginBottom: '12px', fontSize: '15px' }}>{success}</p>
            <Link
              to={loginLink}
              style={{
                display: 'inline-block',
                padding: '8px 18px',
                backgroundColor: 'var(--success)',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                fontWeight: '600',
                textDecoration: 'none',
              }}
            >
              Continue to Login
            </Link>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label
              htmlFor="username"
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              placeholder="e.g. alex"
              value={formData.username}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="alex@example.com"
              value={formData.email}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="At least 8 characters"
              value={formData.password}
              onChange={handleChange}
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: '500' }}
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              value={formData.confirmPassword}
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
            {isLoading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to={loginLink} style={{ fontWeight: '500' }}>
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
