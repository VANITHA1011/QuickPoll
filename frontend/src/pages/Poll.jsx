import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { getPollUrl } from '../utils/url';
import { fetchApi } from '../utils/apiClient';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
const WS_URL = API_URL.replace(/^http/, 'ws');

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

function Avatar({ name, size = 30, style = {} }) {
  const bg = avatarColor(name);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: bg,
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.42,
        fontWeight: 700,
        flexShrink: 0,
        ...style,
      }}
      title={name}
    >
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function StackedAvatars({ voters = [], max = 3, onClick }) {
  const names = voters.map(v => (typeof v === 'string' ? v : v.username));
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
            border: '2px solid var(--bg-card)',
            zIndex: max - idx,
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
        />
      ))}
      {extra > 0 && (
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '10px',
            fontWeight: 700,
            marginLeft: '-8px',
            border: '2px solid var(--bg-card)',
            zIndex: 0,
          }}
        >
          +{extra}
        </div>
      )}
    </div>
  );
}

function Poll() {
  const { id } = useParams();
  const [poll, setPoll] = useState(null);
  const [selectedOption, setSelectedOption] = useState('');
  const [loading, setLoading] = useState(true);
  const [submittingVote, setSubmittingVote] = useState(false);
  const [error, setError] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [voteMessage, setVoteMessage] = useState('');
  const [modalOption, setModalOption] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [latestActivity, setLatestActivity] = useState(null);
  const [timeLeft, setTimeLeft] = useState(null);

  const { user, token } = useAuth();
  const pollRef = useRef(null);

  // Expiration countdown
  useEffect(() => {
    if (!poll?.expires_at) return;

    const calculateRemaining = () => {
      const diff = new Date(poll.expires_at) - new Date();
      if (diff <= 0) {
        setTimeLeft('Expired');
        setPoll(prev => prev ? { ...prev, status: 'CLOSED' } : prev);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeLeft(`${days}d ${hours % 24}h remaining`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${mins}m ${secs}s remaining`);
      } else {
        setTimeLeft(`${mins}m ${secs}s remaining`);
      }
    };

    calculateRemaining();
    const interval = setInterval(calculateRemaining, 1000);
    return () => clearInterval(interval);
  }, [poll?.expires_at]);

  // Initial Fetch
  useEffect(() => {
    const fetchPollData = async () => {
      try {
        const data = await fetchApi(`/api/polls/${id}`);
        setPoll(data);
        pollRef.current = data;

        if (token) {
          try {
            const voteData = await fetchApi(`/api/polls/${id}/voted`);
            if (voteData && voteData.has_voted) {
              setHasVoted(true);
              setSelectedOption(voteData.option_id);
              setVoteMessage("You have already voted in this poll.");
            }
          } catch (e) {
            // Non-fatal if vote check fails
          }
        }
      } catch (err) {
        setError(err.message || 'Poll not found');
      } finally {
        setLoading(false);
      }
    };

    fetchPollData();
  }, [id, token]);

  // WebSocket Live Updates
  useEffect(() => {
    const socket = new WebSocket(`${WS_URL}/api/ws/polls/${id}`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.poll_id !== id) return;

        // Activity banner ticker
        const voterName = data.username || 'A voter';
        const currentPoll = pollRef.current;
        const votedOpt = currentPoll?.options?.find(o => o.id === data.option_id);
        const optText = votedOpt ? `"${votedOpt.text}"` : 'an option';

        setLatestActivity(`${voterName} just cast a vote for ${optText}`);
        setTimeout(() => setLatestActivity(null), 4500);

        setPoll(prevPoll => {
          if (!prevPoll) return prevPoll;
          const newOptions = prevPoll.options.map(opt => {
            if (opt.id === data.option_id) {
              const currentVoters = opt.voters || [];
              const alreadyIn = currentVoters.some(v =>
                (typeof v === 'string' ? v : v.username) === data.username
              );
              const updatedVoters = data.username && !alreadyIn
                ? [...currentVoters, data.username]
                : currentVoters;
              const newVoteCount = alreadyIn ? opt.votes : opt.votes + 1;
              return { ...opt, votes: newVoteCount, voters: updatedVoters };
            }
            return opt;
          });
          const updated = { ...prevPoll, options: newOptions };
          pollRef.current = updated;
          return updated;
        });
      } catch (err) {
        console.error('[WS] Failed to parse WebSocket message', err);
      }
    };

    return () => socket.close();
  }, [id]);

  const handleVote = async () => {
    if (!user) {
      setError('You must be logged in to vote');
      return;
    }
    if (!selectedOption) {
      setError('Please select an option');
      return;
    }

    setSubmittingVote(true);
    try {
      await fetchApi(`/api/polls/${id}/vote`, {
        method: 'POST',
        body: JSON.stringify({ option_id: selectedOption }),
      });

      setHasVoted(true);
      setVoteMessage('🎉 Vote recorded successfully!');

      // Fresh re-fetch to ensure voter lists and counts sync
      const freshData = await fetchApi(`/api/polls/${id}`);
      setPoll(freshData);
      pollRef.current = freshData;
    } catch (err) {
      if (err.message && err.message.toLowerCase().includes('already voted')) {
        setHasVoted(true);
        setVoteMessage('You have already voted in this poll.');
        setError('');
      } else {
        setError(err.message || 'Failed to record vote');
      }
    } finally {
      setSubmittingVote(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(getPollUrl(poll.id));
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '640px', margin: '60px auto', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <p>Loading live poll...</p>
      </div>
    );
  }

  if (error && !poll) {
    return (
      <div style={{ maxWidth: '600px', margin: '40px auto', padding: '0 20px', textAlign: 'center' }}>
        <div style={{ padding: '16px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 'var(--radius-sm)' }}>
          {error}
        </div>
        <Link to="/dashboard" style={{ display: 'inline-block', marginTop: '20px', color: 'var(--primary)' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const isClosed = poll.status === 'CLOSED' || (poll.expires_at && new Date() > new Date(poll.expires_at));
  const totalVotes = poll.options.reduce((sum, opt) => sum + (opt.votes || 0), 0);
  const showResults = hasVoted || isClosed || !user || totalVotes > 0;

  return (
    <>
      {/* Voter List Modal */}
      {modalOption && (
        <Modal
          isOpen={Boolean(modalOption)}
          onClose={() => setModalOption(null)}
          title={`Voters for "${modalOption.text}"`}
        >
          <div style={{ maxHeight: '340px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(!modalOption.voters || modalOption.voters.length === 0) ? (
              <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '20px 0' }}>No votes yet</p>
            ) : (
              modalOption.voters.map((v, idx) => {
                const name = typeof v === 'string' ? v : v.username;
                return (
                  <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px', borderRadius: '6px' }}>
                    <Avatar name={name} size={36} />
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{name}</span>
                  </div>
                );
              })
            )}
          </div>
        </Modal>
      )}

      {/* Share Modal (Copy Link + QR Code) */}
      <Modal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        title="Share Live Poll"
      >
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0 }}>
            Invite voters to cast their ballot in real time.
          </p>

          <div style={{ background: '#ffffff', padding: '16px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <QRCodeSVG value={getPollUrl(poll.id)} size={180} />
          </div>

          <div style={{ width: '100%', display: 'flex', gap: '8px' }}>
            <input
              type="text"
              readOnly
              value={getPollUrl(poll.id)}
              style={{ fontSize: '13px', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            />
            <Button variant={copiedLink ? "secondary" : "primary"} onClick={copyShareLink} style={{ flexShrink: 0, minWidth: '100px' }}>
              {copiedLink ? '✓ Copied' : 'Copy'}
            </Button>
          </div>
        </div>
      </Modal>

      <div style={{ maxWidth: '680px', width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {/* Realtime Activity Notification Banner */}
        {latestActivity && (
          <div
            className="animate-fade-in"
            style={{
              padding: '10px 16px',
              marginBottom: '16px',
              background: 'rgba(108, 92, 231, 0.12)',
              border: '1px solid var(--primary)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--primary)',
              fontSize: '14px',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span>⚡</span>
            <span>{latestActivity}</span>
          </div>
        )}

        <div className="card" style={{ padding: '32px' }}>
          {/* Top Status Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {isClosed ? (
                <Badge variant="secondary">CLOSED / EXPIRED</Badge>
              ) : (
                <Badge variant="live" dot={true}>LIVE POLL</Badge>
              )}
              {poll.expires_at && (
                <span style={{ fontSize: '13px', color: isClosed ? 'var(--error)' : 'var(--text-secondary)', fontWeight: 500 }}>
                  ⏱️ {timeLeft || (isClosed ? 'Voting Closed' : 'Expiring')}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <Button variant="secondary" onClick={() => setShowShareModal(true)} style={{ padding: '6px 14px', fontSize: '13px' }}>
                🔗 Share / QR
              </Button>
              {user && poll.creator_id === user.id && (
                <Link to={`/analytics/${id}`} className="btn btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }}>
                  📊 Analytics
                </Link>
              )}
            </div>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.35 }}>
            {poll.question}
          </h1>

          {poll.created_by_username && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '24px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <span>Created by</span>
              <Avatar name={poll.created_by_username} size={20} />
              <strong style={{ color: 'var(--text)' }}>{poll.created_by_username}</strong>
              <span>· {new Date(poll.created_at).toLocaleDateString()}</span>
            </div>
          )}

          {error && poll && (
            <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: 'var(--radius-sm)', marginBottom: '18px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {voteMessage && (
            <div style={{ padding: '12px', background: 'rgba(0, 184, 148, 0.1)', border: '1px solid var(--success)', color: 'var(--success)', borderRadius: 'var(--radius-sm)', marginBottom: '18px', fontSize: '14px' }}>
              {voteMessage}
            </div>
          )}

          {!user && !hasVoted && !isClosed && (
            <div style={{ padding: '14px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', textAlign: 'center' }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                Please sign in to submit your vote in this poll.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <Link to={`/login?redirect=/poll/${id}`} className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '14px' }}>
                  Login
                </Link>
                <Link to={`/register?redirect=/poll/${id}`} className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '14px' }}>
                  Register
                </Link>
              </div>
            </div>
          )}

          {isClosed && (
            <div style={{ padding: '12px 16px', background: 'rgba(253, 203, 110, 0.15)', border: '1px solid rgba(253, 203, 110, 0.4)', borderRadius: 'var(--radius-sm)', marginBottom: '20px', fontSize: '14px', color: 'var(--text)' }}>
              🔒 Voting on this poll is now closed. You can view the finalized results below.
            </div>
          )}

          {/* Options & Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
            {poll.options.map((option) => {
              const percentage = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;
              const voters = option.voters || [];
              const isSelected = selectedOption === option.id;

              return (
                <label
                  key={option.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '16px',
                    borderRadius: 'var(--radius)',
                    border: `1px solid ${isSelected && !hasVoted ? 'var(--primary)' : 'var(--border)'}`,
                    background: isSelected && !hasVoted ? 'rgba(108, 92, 231, 0.04)' : 'var(--bg-secondary)',
                    cursor: hasVoted || isClosed || !user ? 'default' : 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {!hasVoted && !isClosed && user && (
                        <input
                          type="radio"
                          name="poll_option"
                          value={option.id}
                          checked={isSelected}
                          onChange={() => setSelectedOption(option.id)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--primary)', margin: 0 }}
                        />
                      )}
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{option.text}</span>
                    </div>

                    {showResults && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {voters.length > 0 && (
                          <StackedAvatars voters={voters} max={3} onClick={() => setModalOption(option)} />
                        )}
                        <span style={{ fontWeight: 700, fontSize: '14px', minWidth: '40px', textAlign: 'right' }}>
                          {percentage}%
                        </span>
                      </div>
                    )}
                  </div>

                  {showResults && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ width: '100%', height: '8px', background: 'var(--border)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${percentage}%`,
                            background: isSelected ? 'var(--primary)' : 'var(--success)',
                            borderRadius: '4px',
                            transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                        <span>{option.votes} {option.votes === 1 ? 'vote' : 'votes'}</span>
                        {voters.length > 0 && (
                          <span onClick={() => setModalOption(option)} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                            View voters
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </label>
              );
            })}
          </div>

          {/* Voting Action */}
          {!hasVoted && !isClosed && user && (
            <Button
              variant="primary"
              onClick={handleVote}
              disabled={submittingVote || !selectedOption}
              style={{ width: '100%', padding: '14px', fontSize: '16px' }}
            >
              {submittingVote ? 'Submitting Vote...' : 'Submit Vote 🗳️'}
            </Button>
          )}

          {showResults && (
            <div style={{ textAlign: 'center', marginTop: '20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <span>Total responses: <strong style={{ color: 'var(--text)' }}>{totalVotes}</strong></span>
              <span style={{ margin: '0 8px' }}>·</span>
              <span>Updates in real time via WebSockets</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export default Poll;
