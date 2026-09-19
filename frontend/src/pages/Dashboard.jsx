import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPollUrl } from '../utils/url';
import { fetchApi } from '../utils/apiClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

function Dashboard() {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All'); // All, Live, Closed
  const [sort, setSort] = useState('Newest'); // Newest, Oldest, Most Votes

  const { token, user } = useAuth();

  useEffect(() => {
    const fetchPolls = async () => {
      try {
        const data = await fetchApi('/api/user/polls');
        setPolls(data || []);
      } catch (err) {
        setError(err.message || 'Unable to connect to server');
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
    try {
      await fetchApi(`/api/polls/${pollId}`, { method: 'DELETE' });
      setPolls(prev => prev.filter(p => p.id !== pollId));
    } catch (err) {
      alert(err.message || 'Failed to delete poll');
    } finally {
      setDeletingId(null);
    }
  };

  const isPollLive = (poll) => {
    if (poll.status === 'CLOSED') return false;
    if (poll.expires_at && new Date() > new Date(poll.expires_at)) return false;
    return true;
  };

  const processedPolls = useMemo(() => {
    let result = [...polls];
    
    // Search
    if (search) {
      result = result.filter(p => p.question.toLowerCase().includes(search.toLowerCase()));
    }

    // Filter
    if (filter === 'Live') {
      result = result.filter(isPollLive);
    } else if (filter === 'Closed') {
      result = result.filter(p => !isPollLive(p));
    }

    // Sort
    if (sort === 'Newest') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sort === 'Oldest') {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sort === 'Most Votes') {
      result.sort((a, b) => {
        const aVotes = a.options ? a.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0;
        const bVotes = b.options ? b.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0;
        return bVotes - aVotes;
      });
    }

    return result;
  }, [polls, search, filter, sort]);

  // KPIs
  const totalPolls = polls.length;
  const activePolls = polls.filter(isPollLive).length;
  const totalVotes = polls.reduce((sum, p) => sum + (p.options ? p.options.reduce((s, o) => s + (o.votes || 0), 0) : 0), 0);
  const engagementRate = totalPolls > 0 ? (totalVotes / totalPolls).toFixed(1) : 0;

  if (!user) {
    return (
      <div className="status-section" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <Card style={{ padding: '40px', marginTop: '20px' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '30px' }}>Please login to view your dashboard.</p>
          <Link to="/login" className="btn btn-primary">Go to Login</Link>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', marginBottom: '8px' }}>Good morning, {user.username} 👋</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Here's what's happening with your polls.</p>
      </div>
      
      {error && (
        <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '5px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{totalPolls}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Polls</div>
        </Card>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{activePolls}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Active Polls</div>
        </Card>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{totalVotes}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Total Votes</div>
        </Card>
        <Card style={{ padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: '32px', fontWeight: 'bold' }}>{engagementRate}</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Avg Votes / Poll</div>
        </Card>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
        <h2 style={{ fontSize: '22px', margin: 0 }}>My Polls</h2>
        <Link to="/create-poll" className="btn btn-primary">+ Create New Poll</Link>
      </div>

      <Card style={{ padding: '20px' }}>
        {/* Controls */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <input 
            type="text" 
            placeholder="Search your polls..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{ padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}>
            <option>All</option>
            <option>Live</option>
            <option>Closed</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)} style={{ padding: '10px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text)' }}>
            <option>Newest</option>
            <option>Oldest</option>
            <option>Most Votes</option>
          </select>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Loading polls...</div>
        ) : processedPolls.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
            <h3 style={{ marginBottom: '10px' }}>No polls found</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px' }}>Create your first live poll and start collecting responses in real time.</p>
            {!search && filter === 'All' && (
              <Link to="/create-poll" className="btn btn-primary">Create Your First Poll</Link>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {processedPolls.map((poll) => {
              const pVotes = poll.options ? poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0) : 0;
              const isDeleting = deletingId === poll.id;
              const isLive = isPollLive(poll);

              return (
                <div key={poll.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', opacity: isDeleting ? 0.5 : 1 }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <h3 style={{ fontSize: '18px', margin: 0 }}>{poll.question}</h3>
                      <Badge variant={isLive ? "live" : "secondary"} dot={isLive}>
                        {isLive ? 'LIVE' : 'CLOSED'}
                      </Badge>
                    </div>
                    <div style={{ display: 'flex', gap: '15px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                      <span>🗳️ {pVotes} votes</span>
                      <span>📅 {new Date(poll.created_at).toLocaleDateString()}</span>
                      {poll.expires_at && <span>⏱️ Expires {new Date(poll.expires_at).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to={`/poll/${poll.id}`} className="btn btn-secondary">View</Link>
                    <Link to={`/analytics/${poll.id}`} className="btn btn-secondary">Analytics</Link>
                    <Button variant="secondary" onClick={() => {
                      navigator.clipboard.writeText(getPollUrl(poll.id));
                      alert('Link copied to clipboard!');
                    }}>Share</Button>
                    <Button variant="secondary" style={{ color: 'var(--error)' }} onClick={() => handleDelete(poll.id)} disabled={isDeleting}>
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}

export default Dashboard;
