import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { getPollUrl } from '../utils/url';

/* ── helper: deterministic colour from username ── */
const AVATAR_COLORS = [
  '#6c5ce7', '#00b894', '#fd79a8', '#0984e3',
  '#e17055', '#fdcb6e', '#00cec9', '#a29bfe',
  '#55efc4', '#fab1a0',
];
function avatarColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

/* ── "time ago" label ── */
function timeAgo(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const diff = (Date.now() - d.getTime()) / 1000; // seconds
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/* ── Avatar circle ── */
function Avatar({ name, size = 30, style = {} }) {
  const bg = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700,
      flexShrink: 0,
      ...style,
    }} title={name}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

/* ── Voter Modal ── */
function VoterModal({ option, onClose }) {
  const overlayRef = useRef(null);
  const voters = option?.voters || [];

  // close on backdrop click
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose();
  };

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '16px',
        width: '100%', maxWidth: '420px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 20px', borderBottom: '1px solid var(--border)',
        }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Voted for
            </p>
            <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700 }}>
              {option?.text}
            </h3>
          </div>
        </div>

        {/* Voter list */}
        <div style={{ maxHeight: '380px', overflowY: 'auto', padding: '8px 0' }}>
          {voters.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px', margin: 0 }}>
              No votes yet
            </p>
          ) : (
            voters.map((v, idx) => {
              const name = typeof v === 'string' ? v : v.username;
              return (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '14px',
                  padding: '12px 20px',
                  borderBottom: idx < voters.length - 1 ? '1px solid var(--border)' : 'none',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <Avatar name={name} size={42} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {name}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            {voters.length} {voters.length === 1 ? 'vote' : 'votes'}
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '8px 24px', borderRadius: '8px', cursor: 'pointer', fontSize: '14px',
            transition: 'background 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── QR Code Modal ── */
function QRModal({ url, onClose }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div style={{
        background: 'var(--bg-secondary)', borderRadius: '16px',
        width: '100%', maxWidth: '320px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        overflow: 'hidden',
        border: '1px solid var(--border)',
        textAlign: 'center', padding: '24px'
      }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '20px', color: 'var(--primary)', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
          ⚡ QuickPoll
        </h3>
        <p style={{ margin: '0 0 24px 0', color: 'var(--text-secondary)', fontSize: '14px' }}>Scan to vote</p>
        
        <div style={{ background: 'white', padding: '16px', borderRadius: '12px', display: 'inline-block', marginBottom: '24px' }}>
          <QRCodeSVG value={url} size={200} />
        </div>
        
        <button onClick={onClose} style={{
          width: '100%', background: 'none', border: '1px solid var(--border)', color: 'var(--text)',
          padding: '10px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px',
          transition: 'background 0.2s',
        }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          Close
        </button>
      </div>
    </div>
  );
}

/* ── Stacked avatars shown next to vote count ── */
function StackedAvatars({ voters = [], max = 3, onClick }) {
  const names = voters.map(v => typeof v === 'string' ? v : v.username);
  const visible = names.slice(0, max);
  const extra = names.length - max;
  if (names.length === 0) return null;

  return (
    <div
      onClick={onClick}
      title="View voters"
      style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
    >
      {visible.map((name, idx) => (
        <Avatar
          key={idx}
          name={name}
          size={26}
          style={{
            marginLeft: idx > 0 ? '-8px' : 0,
            border: '2px solid var(--bg-secondary)',
            zIndex: max - idx,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      ))}
      {extra > 0 && (
        <div style={{
          width: 26, height: 26, borderRadius: '50%',
          background: 'rgba(255,255,255,0.15)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '10px', fontWeight: 700,
          marginLeft: '-8px', border: '2px solid var(--bg-secondary)',
          zIndex: 0,
        }}>
          +{extra}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════
   Main Poll component
══════════════════════════════════════════════ */
function Poll() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [voteMessage, setVoteMessage] = useState('');
  const [modalOption, setModalOption] = useState(null); // option shown in modal
  const [showQRModal, setShowQRModal] = useState(false);
  const { user, token } = useAuth();

  // Keep a ref to the latest poll so the WS handler always reads current state
  // without the WS effect needing to re-run every time poll changes.
  const pollReady = useRef(false);

  /* ── initial fetch ── */
  useEffect(() => {
    const fetchPollData = async () => {
      try {
        const response = await fetch(`http://localhost:8080/api/polls/${id}`);
        const data = await response.json();

        if (response.ok) {
          setPoll(data);
          pollReady.current = true;
        } else {
          setError(data.message || 'Poll not found');
        }

        if (token) {
          const voteResponse = await fetch(`http://localhost:8080/api/polls/${id}/voted`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const voteData = await voteResponse.json();
          if (voteResponse.ok && voteData.has_voted) {
            setHasVoted(true);
            setSelectedOption(voteData.option_id);
            setVoteMessage('You have already voted in this poll.');
          }
        }
      } catch (err) {
        setError('Unable to connect to server');
      } finally {
        setLoading(false);
      }
    };

    fetchPollData();
  }, [id, token]);

  /* ── WebSocket live updates ── */
  // Depend only on [id] so the socket is created once per poll page
  // and never torn down/reopened due to poll state changes.
  useEffect(() => {
    const socket = new WebSocket(`ws://localhost:8080/api/ws/polls/${id}`);

    socket.onopen = () => {
      console.log('[WS] Connected for poll', id);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WS] Event received:', data.poll_id, data.option_id, data.username);
        if (data.poll_id !== id) return;

        setPoll(prevPoll => {
          if (!prevPoll) return prevPoll;
          const newOptions = prevPoll.options.map(opt => {
            if (opt.id === data.option_id) {
              const currentVoters = opt.voters || [];
              const alreadyIn = currentVoters.some(v =>
                (typeof v === 'string' ? v : v.username) === data.username
              );
              // Only increment votes if this is a genuinely new voter
              // (guards against double-count when voter's own re-fetch races with WS event)
              const updatedVoters = data.username && !alreadyIn
                ? [...currentVoters, data.username]
                : currentVoters;
              const newVoteCount = alreadyIn ? opt.votes : opt.votes + 1;
              return { ...opt, votes: newVoteCount, voters: updatedVoters };
            }
            return opt;
          });
          return { ...prevPoll, options: newOptions };
        });
      } catch (err) {
        console.error('[WS] Failed to parse WebSocket message', err);
      }
    };

    socket.onerror = (err) => {
      console.error('[WS] WebSocket error:', err);
    };

    socket.onclose = () => {
      console.log('[WS] Disconnected from poll', id);
    };

    return () => socket.close();
  }, [id]);

  /* ── vote submission ── */
  const handleVote = async () => {
    if (!user) { setError('You must be logged in to vote'); return; }
    if (!selectedOption) { setError('Please select an option'); return; }

    try {
      const response = await fetch(`http://localhost:8080/api/polls/${id}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ option_id: selectedOption }),
      });

      if (response.ok) {
        setHasVoted(true);
        setVoteMessage('Vote recorded successfully!');
        // Re-fetch to get fresh voter list including self
        const freshResp = await fetch(`http://localhost:8080/api/polls/${id}`);
        if (freshResp.ok) {
          const freshData = await freshResp.json();
          setPoll(freshData);
        }
      } else {
        const data = await response.json();
        if (response.status === 409 || data.message?.includes('already voted')) {
          setHasVoted(true);
          setVoteMessage('You have already voted in this poll.');
          setError('');
        } else {
          setError(data.message || 'Failed to record vote');
        }
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    }
  };

  /* ── render states ── */
  if (loading) {
    return (
      <div className="status-section" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <p>Loading poll...</p>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div className="status-section" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '5px' }}>
          {error}
        </div>
      </div>
    );
  }

  const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
  // Show results if: user has voted, user is not logged in (public view),
  // OR there are already votes (so creators/observers can watch live updates).
  const showResults = hasVoted || !user || totalVotes > 0;

  return (
    <>
      {/* Voter modal */}
      {modalOption && (
        <VoterModal option={modalOption} onClose={() => setModalOption(null)} />
      )}

      {/* QR Code modal */}
      {showQRModal && (
        <QRModal 
          url={getPollUrl(poll.id)} 
          onClose={() => setShowQRModal(false)} 
        />
      )}

      <div className="status-section" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'left' }}>
        <div className="status-card" style={{ padding: '30px' }}>
          <h2 style={{ fontSize: '24px', marginBottom: '10px' }}>{poll.question}</h2>
          
          {poll.created_by_username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px' }}>
              <span>Created by</span>
              <Avatar name={poll.created_by_username} size={20} />
              <span style={{ fontWeight: '500' }}>{poll.created_by_username}</span>
            </div>
          )}

          {error && poll && (
            <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '5px', marginBottom: '15px' }}>
              {error}
            </div>
          )}

          {voteMessage && (
            <div style={{ padding: '12px', background: 'rgba(0, 184, 148, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: '5px', marginBottom: '15px' }}>
              {voteMessage}
            </div>
          )}

          {!user && !hasVoted && (
            <div style={{ padding: '12px', background: 'rgba(108, 92, 231, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', borderRadius: '5px', marginBottom: '15px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0' }}>Please login to vote.</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Link to={`/login?redirect=/poll/${id}`} style={{ padding: '8px 16px', background: 'var(--primary)', color: 'white', borderRadius: '5px', textDecoration: 'none' }}>Login</Link>
                <Link to={`/register?redirect=/poll/${id}`} style={{ padding: '8px 16px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '5px', textDecoration: 'none' }}>Register</Link>
              </div>
            </div>
          )}

          {/* Options list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {poll.options.map(option => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const voters = option.voters || [];

              return (
                <label
                  key={option.id}
                  style={{
                    display: 'flex', flexDirection: 'column',
                    padding: '14px 16px',
                    border: `1px solid ${selectedOption === option.id && !hasVoted ? 'var(--success)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius)',
                    cursor: hasVoted || !user ? 'default' : 'pointer',
                    background: 'var(--bg-secondary)',
                    opacity: (!user && !hasVoted) ? 0.7 : 1,
                    position: 'relative',
                    transition: 'border-color 0.2s',
                  }}
                >
                  {/* Top row: radio + text | avatars + count */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <input
                        type="radio"
                        name="poll_option"
                        value={option.id}
                        checked={selectedOption === option.id}
                        onChange={(e) => !hasVoted && user && setSelectedOption(e.target.value)}
                        disabled={hasVoted || !user}
                        style={{ margin: 0, width: '18px', height: '18px', accentColor: 'var(--success)' }}
                      />
                      <span style={{ fontWeight: '500', fontSize: '15px' }}>{option.text}</span>
                    </div>

                    {/* Right side: stacked avatars + count (always show when results visible) */}
                    {showResults && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {voters.length > 0 && (
                          <StackedAvatars
                            voters={voters}
                            max={3}
                            onClick={() => setModalOption(option)}
                          />
                        )}
                        <span style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text)', minWidth: '14px', textAlign: 'right' }}>
                          {option.votes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Progress bar (always visible when results shown) */}
                  {showResults && (
                    <div style={{ marginTop: '10px', paddingLeft: '32px' }}>
                      <div style={{ width: '100%', height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${percentage}%`, background: 'var(--success)', transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          {/* Vote button */}
          {!hasVoted && user && (
            <button
              type="button"
              onClick={handleVote}
              className="btn-primary"
              style={{ padding: '14px', fontSize: '15px' }}
            >
              Vote
            </button>
          )}

          {/* Total votes + "View votes" hint */}
          {showResults && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '14px', color: 'var(--success)', fontWeight: '600' }}>
                {totalVotes} total {totalVotes === 1 ? 'vote' : 'votes'}
              </span>
              {totalVotes > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                  · tap the avatars to see who voted
                </span>
              )}
            </div>
          )}

          {/* Action Buttons: QR Code & Analytics */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => setShowQRModal(true)}
              style={{
                padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text)',
                border: '1px solid var(--border)', borderRadius: '8px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '500', transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
            >
              QR Code
            </button>
            {user && poll.creator_id === user.id && (
              <Link
                to={`/analytics/${id}`}
                style={{
                  padding: '10px 20px', background: 'var(--bg-secondary)', color: 'var(--text)',
                  border: '1px solid var(--border)', borderRadius: '8px', textDecoration: 'none',
                  fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-secondary)'}
              >
                Analytics
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Poll;
