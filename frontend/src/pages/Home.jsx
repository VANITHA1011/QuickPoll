import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [pollInput, setPollInput] = useState('');
  const [error, setError] = useState('');

  const handleJoinSubmit = (e) => {
    e.preventDefault();
    if (!pollInput.trim()) {
      setError('Please enter a Poll ID or Link');
      return;
    }
    let pollId = pollInput.trim();
    if (pollId.includes('/poll/')) {
      const parts = pollId.split('/poll/');
      pollId = parts[parts.length - 1];
    }
    pollId = pollId.split('?')[0].split('#')[0];
    if (pollId) {
      navigate(`/poll/${pollId}`);
    } else {
      setError('Invalid Poll ID');
    }
  };

  return (
    <div style={{
      width: '100%',
      minHeight: 'calc(100vh - 64px)',
      position: 'relative',
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Hero background — bright and clear */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'url(/hero-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        filter: 'brightness(1.08) saturate(1.06)',
        zIndex: 0,
      }} />

      {/* CTA area — only shown after login */}
      {user && <div style={{
        position: 'relative',
        zIndex: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
      }}>
        {!showJoinForm ? (
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center',
            padding: '20px 24px',
            background: 'rgba(255,255,255,0.08)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            borderRadius: '18px',
            border: '1px solid rgba(255,255,255,0.18)',
          }}>
            <Link
              to={user ? '/create-poll' : '/login?redirect=/create-poll'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 32px',
                background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                color: 'white',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: '700',
                fontSize: '16px',
                boxShadow: '0 4px 20px rgba(108,92,231,0.55)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 28px rgba(108,92,231,0.72)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = '';
                e.currentTarget.style.boxShadow = '0 4px 20px rgba(108,92,231,0.55)';
              }}
            >
              + Create a Poll
            </Link>

            <button
              onClick={() => setShowJoinForm(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '14px 32px',
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                border: '2px solid rgba(255,255,255,0.5)',
                color: 'white',
                borderRadius: '12px',
                cursor: 'pointer',
                fontWeight: '700',
                fontSize: '16px',
                fontFamily: 'inherit',
                transition: 'background 0.15s ease, border-color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.28)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.75)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.15)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
            >
              👥 Join a Poll
            </button>
          </div>
        ) : (
          /* Join poll inline form */
          <div style={{
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: '1px solid rgba(255,255,255,0.18)',
            borderRadius: '16px',
            padding: '28px',
            width: '360px',
            maxWidth: '90vw',
            textAlign: 'left',
          }}>
            <h3 style={{ marginBottom: '16px', fontSize: '18px', textAlign: 'center', color: 'white', fontWeight: '700' }}>
              Join a Poll
            </h3>
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'rgba(225,112,85,0.18)',
                border: '1px solid var(--error)',
                color: '#ffb3a0',
                borderRadius: '8px',
                marginBottom: '14px',
                fontSize: '14px',
              }}>
                {error}
              </div>
            )}
            <form onSubmit={handleJoinSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <input
                type="text"
                placeholder="Enter Poll ID or Poll Link"
                value={pollInput}
                onChange={(e) => { setPollInput(e.target.value); setError(''); }}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.28)',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  fontSize: '15px',
                  outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => { setShowJoinForm(false); setError(''); setPollInput(''); }}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.85)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    borderRadius: '8px',
                    cursor: 'pointer', fontWeight: '600',
                    fontFamily: 'inherit', fontSize: '15px',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 1, padding: '12px',
                    background: 'linear-gradient(135deg, #6c5ce7, #a29bfe)',
                    color: 'white',
                    border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontWeight: '600',
                    fontFamily: 'inherit', fontSize: '15px',
                  }}
                >
                  Open Poll
                </button>
              </div>
            </form>
          </div>
        )}
      </div>}
    </div>
  );
}

export default Home;
