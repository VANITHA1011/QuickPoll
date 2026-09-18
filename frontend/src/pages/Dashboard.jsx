import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPollUrl } from '../utils/url';

function Dashboard() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null); // poll ID currently being deleted
  const { token, user } = useAuth();

  useEffect(() => {
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const fetchPolls = async () => {
      try {
        const response = await fetch(`${API_URL}/api/user/polls`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        
        if (response.ok) {
          setPolls(data || []);
        } else {
          setError(data.message || 'Failed to fetch polls');
        }
      } catch (err) {
        setError('Unable to connect to server');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchPolls();
    }
  }, [token]);

  const handleDelete = async (pollId) => {
    const confirmed = window.confirm('Are you sure you want to delete this poll? This cannot be undone.');
    if (!confirmed) return;

    setDeletingId(pollId);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      const response = await fetch(`${API_URL}/api/polls/${pollId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Remove from local state immediately — no refresh needed
        setPolls(prev => prev.filter(p => p.id !== pollId));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to delete poll');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!user) {
    return (
      <div className="status-section" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div className="status-card" style={{ padding: '40px', marginTop: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Please login to view your dashboard.</p>
          <Link to="/login" style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: '500' }}>
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="status-section" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
      <h1 className="hero-title" style={{ fontSize: '32px' }}>Welcome, {user.username}!</h1>
      
      {error && (
        <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '5px', marginTop: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      <div className="status-card" style={{ padding: '40px', marginTop: '20px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '20px', textAlign: 'left' }}>Your Polls</h2>
        
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Loading polls...</p>
        ) : polls.length === 0 ? (
          <>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>You haven't created any polls yet.</p>
            <Link to="/create-poll" style={{ padding: '12px 24px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: '500' }}>
              Create Your First Poll
            </Link>
          </>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {polls.map((poll) => {
              const totalVotes = poll.options ? poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0;
              const isDeleting = deletingId === poll.id;
              return (
                <div key={poll.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', opacity: isDeleting ? 0.5 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{ textAlign: 'left' }}>
                    <h3 style={{ fontSize: '16px', margin: '0 0 5px 0' }}>{poll.question}</h3>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      Created: {new Date(poll.created_at).toLocaleDateString()}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      By {user.username}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Link
                      to={`/poll/${poll.id}`}
                      style={{ padding: '8px 15px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '5px', textDecoration: 'none', fontSize: '14px' }}
                    >
                      View
                    </Link>
                    <Link
                      to={`/analytics/${poll.id}`}
                      style={{ padding: '8px 15px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '5px', textDecoration: 'none', fontSize: '14px' }}
                    >
                      Analytics
                    </Link>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPollUrl(poll.id));
                        alert('Link copied to clipboard!');
                      }}
                      style={{ padding: '8px 15px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleDelete(poll.id)}
                      disabled={isDeleting}
                      style={{
                        padding: '8px 15px',
                        background: 'transparent',
                        color: 'var(--error, #e17055)',
                        border: '1px solid var(--error, #e17055)',
                        borderRadius: '5px',
                        cursor: isDeleting ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={e => {
                        if (!isDeleting) {
                          e.currentTarget.style.background = 'rgba(225, 112, 85, 0.12)';
                        }
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                      }}
                    >
                      {isDeleting ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
            
            <div style={{ marginTop: '20px' }}>
              <Link to="/create-poll" style={{ padding: '10px 20px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)', textDecoration: 'none', fontWeight: '500', display: 'inline-block' }}>
                + Create New Poll
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
