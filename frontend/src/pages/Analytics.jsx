import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/apiClient';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_URL = API_URL.replace(/^http/, 'ws');

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
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!token) {
      navigate('/login');
      return;
    }

    const fetchPoll = async () => {
      try {
        const data = await fetchApi(`/api/polls/${id}`);
        if (user && data.creator_id !== user.id) {
          setError('You do not have permission to view analytics for this poll.');
        } else {
          setPoll(data);
        }
      } catch (err) {
        setError(err.message || 'Unable to fetch analytics.');
      } finally {
        setLoading(false);
      }
    };

    fetchPoll();
  }, [id, token, user, authLoading, navigate]);

  // WebSocket for real-time live vote updates on analytics page
  useEffect(() => {
    if (!id) return;
    const socket = new WebSocket(`${WS_URL}/api/ws/polls/${id}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.poll_id !== id) return;

        setPoll(prev => {
          if (!prev) return prev;
          const updatedOptions = prev.options.map(opt => {
            if (opt.id === data.option_id) {
              return { ...opt, votes: (opt.votes || 0) + 1 };
            }
            return opt;
          });
          return { ...prev, options: updatedOptions };
        });
      } catch (e) {
        console.error("WebSocket message parse error in Analytics:", e);
      }
    };

    return () => socket.close();
  }, [id]);

  const copySummaryText = () => {
    if (!poll) return;
    const total = poll.options.reduce((s, o) => s + (o.votes || 0), 0);
    const lines = [
      `📊 QuickPoll Analytics: "${poll.question}"`,
      `Total Responses: ${total}`,
      ...poll.options.map(o => {
        const pct = total > 0 ? Math.round((o.votes / total) * 100) : 0;
        return `• ${o.text}: ${o.votes} votes (${pct}%)`;
      })
    ];
    navigator.clipboard.writeText(lines.join('\n'));
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  if (authLoading || loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-secondary)' }}>
        Loading poll analytics...
      </div>
    );
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
  const isClosed = poll.status === 'CLOSED' || (poll.expires_at && new Date() > new Date(poll.expires_at));

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
    <div style={{ maxWidth: '820px', margin: '30px auto', padding: '0 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Link to="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>← Dashboard</Link>
            <span style={{ color: 'var(--border)' }}>/</span>
            <span style={{ fontSize: '13px', color: 'var(--primary)' }}>Analytics</span>
          </div>
          <h1 style={{ margin: 0, fontSize: '26px', fontWeight: 700 }}>Poll Insights</h1>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="secondary" onClick={copySummaryText}>
            {copiedSummary ? '✓ Copied Summary' : '📋 Copy Summary'}
          </Button>
          <Link to={`/poll/${id}`} className="btn btn-secondary">
            View Live Poll →
          </Link>
        </div>
      </div>

      <Card style={{ padding: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>{poll.question}</h2>
          {isClosed ? (
            <Badge variant="secondary">CLOSED</Badge>
          ) : (
            <Badge variant="live" dot={true}>LIVE</Badge>
          )}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Total Responses</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success)' }}>{totalVotes}</div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Leading Choice</div>
            <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {totalVotes > 0 ? winner?.text : 'No votes yet'}
            </div>
          </div>
          <div style={{ background: 'var(--bg-secondary)', padding: '20px', borderRadius: 'var(--radius)', textAlign: 'center', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '6px' }}>Options Count</div>
            <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--text)' }}>{options.length}</div>
          </div>
        </div>

        {/* Vote Distribution Chart Section */}
        <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius)', padding: '24px', marginBottom: '32px', border: '1px solid var(--border)' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '16px', fontWeight: 600 }}>Vote Distribution</h3>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '32px' }}>
            {/* SVG Doughnut Chart */}
            <div style={{ position: 'relative', width: '200px', height: '200px', flexShrink: 0 }}>
              <svg width="200" height="200" viewBox="0 0 200 200">
                {totalVotes === 0 ? (
                  <circle cx="100" cy="100" r="66" fill="none" stroke="var(--border)" strokeWidth="28" />
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
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  textAlign: 'center',
                  pointerEvents: 'none',
                }}
              >
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--text)' }}>{totalVotes}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Votes</div>
              </div>
            </div>

            {/* Legend */}
            <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
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

        {/* Detailed Breakdown with Progress Bars */}
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: 600 }}>Detailed Breakdown</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {sortedOptions.map((opt, idx) => {
            const percentage = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
            const sliceColor = slices.find(s => s.id === opt.id)?.color || 'var(--primary)';
            return (
              <div key={opt.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {idx === 0 && totalVotes > 0 && <span>🏆</span>}
                    {opt.text}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                    <strong style={{ color: 'var(--text)' }}>{opt.votes || 0}</strong> ({percentage}%)
                  </span>
                </div>
                <div style={{ width: '100%', height: '10px', background: 'var(--bg-secondary)', borderRadius: '5px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${percentage}%`,
                      background: sliceColor,
                      borderRadius: '5px',
                      transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export default Analytics;
