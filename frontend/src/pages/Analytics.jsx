import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const CHART_COLORS = [
  '#6c5ce7', '#00b894', '#0984e3', '#fd79a8',
  '#fdcb6e', '#e17055', '#00cec9', '#a29bfe'
];

function Analytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, token, loading: authLoading } = useAuth();
  const [poll, setPoll] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      navigate('/login');
      return;
    }

    const fetchPoll = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080'}/api/polls/${id}`);
        const data = await response.json();

        if (response.ok) {
          if (user && data.creator_id !== user.id) {
            setError('You do not have permission to view analytics for this poll.');
          } else {
            setPoll(data);
          }
        } else {
          setError(data.message || 'Poll not found');
        }
      } catch (err) {
        setError('Unable to fetch analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id, token, user, authLoading, navigate]);

  // WebSocket for real-time live vote updates on analytics page
  useEffect(() => {
    if (!id) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const wsUrl = `${protocol}//${host}:8080/api/ws/polls/${id}`;

    let socket;
    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.options) {
            setPoll(prev => prev ? { ...prev, options: data.options } : prev);
          }
        } catch (e) {
          console.error("WebSocket message parse error in Analytics:", e);
        }
      };
    } catch (e) {
      console.error("WebSocket connection error in Analytics:", e);
    }

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [id]);

  if (authLoading || loading) {
    return <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>Loading analytics...</div>;
  }

  if (error || !poll) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', textAlign: 'center', padding: '0 20px' }}>
        <div style={{ padding: '20px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '8px', fontSize: '15px' }}>
          {error || 'Poll not found'}
        </div>
        <Link to={`/poll/${id}`} style={{ display: 'inline-block', marginTop: '20px', color: 'var(--primary)', textDecoration: 'none', fontWeight: '500' }}>
          ← Back to Poll
        </Link>
      </div>
    );
  }

  const options = poll.options || [];
  const totalVotes = options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  const sortedOptions = [...options].sort((a, b) => (b.votes || 0) - (a.votes || 0));
  const winner = sortedOptions[0];

  // Doughnut SVG calculations
  const cx = 100;
  const cy = 100;
  const outerR = 80;
  const innerR = 52;

  let cumulativeAngle = -Math.PI / 2;
  const slices = options.map((opt, idx) => {
    const votes = opt.votes || 0;
    const fraction = totalVotes > 0 ? votes / totalVotes : 0;
    const angle = fraction * 2 * Math.PI;

    const startAngle = cumulativeAngle;
    const endAngle = cumulativeAngle + angle;
    cumulativeAngle = endAngle;

    const x1 = cx + outerR * Math.cos(startAngle);
    const y1 = cy + outerR * Math.sin(startAngle);
    const x2 = cx + outerR * Math.cos(endAngle);
    const y2 = cy + outerR * Math.sin(endAngle);

    const x3 = cx + innerR * Math.cos(endAngle);
    const y3 = cy + innerR * Math.sin(endAngle);
    const x4 = cx + innerR * Math.cos(startAngle);
    const y4 = cy + innerR * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData = fraction === 1
      ? `M ${cx} ${cy - outerR} A ${outerR} ${outerR} 0 1 1 ${cx - 0.001} ${cy - outerR} Z M ${cx} ${cy - innerR} A ${innerR} ${innerR} 0 1 0 ${cx - 0.001} ${cy - innerR} Z`
      : `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${x4} ${y4} Z`;

    const percentage = totalVotes > 0 ? Math.round(fraction * 100) : 0;
    const color = CHART_COLORS[idx % CHART_COLORS.length];

    return { ...opt, votes, percentage, color, pathData, fraction };
  });

  return (
    <div style={{ maxWidth: '750px', margin: '40px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '24px' }}>Poll Analytics</h2>
        <Link to={`/poll/${id}`} style={{ 
          padding: '8px 16px', background: 'var(--bg-secondary)', border: '1px solid var(--border)',
          borderRadius: '8px', color: 'var(--text)', textDecoration: 'none', fontSize: '14px',
          fontWeight: '500', transition: 'background 0.2s'
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
        >
          ← Back to Poll
        </Link>
      </div>

      <div style={{ background: 'var(--bg-secondary)', borderRadius: '12px', padding: '32px', border: '1px solid var(--border)' }}>
        <h3 style={{ margin: '0 0 24px 0', fontSize: '20px', color: 'var(--primary)' }}>{poll.question}</h3>
        
        {/* KPI Cards */}
        <div style={{ display: 'flex', gap: '20px', marginBottom: '32px' }}>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Total Votes</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>{totalVotes}</div>
          </div>
          <div style={{ flex: 1, background: 'rgba(0,0,0,0.2)', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>Leading Option</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {totalVotes > 0 ? winner?.text : '-'}
            </div>
          </div>
        </div>

        {/* Vote Distribution Chart Section */}
        <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '10px', padding: '24px', marginBottom: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
          <h4 style={{ margin: '0 0 20px 0', fontSize: '16px', color: 'var(--text-secondary)', textAlign: 'left' }}>Vote Distribution</h4>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
            {/* SVG Doughnut Chart */}
            <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
              <svg width="200" height="200" viewBox="0 0 200 200">
                {totalVotes === 0 ? (
                  <circle cx="100" cy="100" r="66" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="28" />
                ) : (
                  slices.map((slice, i) => (
                    slice.fraction > 0 && (
                      <path
                        key={slice.id || i}
                        d={slice.pathData}
                        fill={slice.color}
                        style={{ transition: 'all 0.5s ease-out', cursor: 'pointer' }}
                      >
                        <title>{`${slice.text}: ${slice.votes} votes (${slice.percentage}%)`}</title>
                      </path>
                    )
                  ))
                )}
              </svg>
              <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                textAlign: 'center', pointerEvents: 'none'
              }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--text)' }}>{totalVotes}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Votes</div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {slices.map((slice, i) => (
                <div key={slice.id || i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden', marginRight: '10px' }}>
                    <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: slice.color, flexShrink: 0 }} />
                    <span style={{ color: 'var(--text)', fontWeight: '500', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {slice.text}
                    </span>
                  </div>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '13px', flexShrink: 0 }}>
                    <strong style={{ color: 'var(--text)' }}>{slice.votes}</strong> ({slice.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Breakdown with Progress Bars */}
        <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--text-secondary)' }}>Vote Breakdown</h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedOptions.map((opt, idx) => {
            const percentage = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
            const sliceColor = slices.find(s => s.id === opt.id)?.color || 'var(--primary)';
            return (
              <div key={opt.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {idx === 0 && totalVotes > 0 && <span title="Winner">🏆</span>}
                    {opt.text}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <strong style={{ color: 'var(--text)' }}>{opt.votes || 0}</strong> ({percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ 
                    height: '100%', width: `${percentage}%`, 
                    background: sliceColor, 
                    borderRadius: '4px', transition: 'width 0.8s ease-out' 
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default Analytics;
