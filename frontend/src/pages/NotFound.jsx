import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="status-section" style={{ textAlign: 'center', padding: '80px 0' }}>
      <h1 style={{ fontSize: '72px', color: 'var(--primary)', marginBottom: '10px' }}>404</h1>
      <h2 style={{ fontSize: '24px', marginBottom: '30px' }}>Page Not Found</h2>
      <Link to="/" style={{ padding: '10px 20px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: '500' }}>
        Back to Home
      </Link>
    </div>
  );
}

export default NotFound;
