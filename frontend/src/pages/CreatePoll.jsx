import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchApi } from '../utils/apiClient';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';

function CreatePoll() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [expiresIn, setExpiresIn] = useState(0); // 0 = no expiry, hours otherwise
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { token, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      navigate('/login?redirect=/create-poll');
    }
  }, [token, loading, navigate]);

  if (loading) return null;

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError('Please enter a poll question');
      return;
    }
    if (trimmedQuestion.length > 200) {
      setError('Question must be under 200 characters');
      return;
    }

    const trimmedOptions = options.map(o => o.trim()).filter(o => o !== '');
    if (trimmedOptions.length < 2) {
      setError('Please provide at least 2 non-empty options');
      return;
    }

    // Check for duplicate options (case insensitive)
    const lowerSet = new Set(trimmedOptions.map(o => o.toLowerCase()));
    if (lowerSet.size !== trimmedOptions.length) {
      setError('All poll options must be unique');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetchApi('/api/polls', {
        method: 'POST',
        body: JSON.stringify({
          question: trimmedQuestion,
          options: trimmedOptions,
          expires_in: parseInt(expiresIn, 10) || 0,
        }),
      });

      const newPollId = response.id || (response.data && response.data.id);
      if (newPollId) {
        navigate(`/poll/${newPollId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Failed to create poll. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '1100px', width: '100%', margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <Link to="/dashboard" style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>← Dashboard</Link>
          <span style={{ color: 'var(--border)' }}>/</span>
          <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 500 }}>Create New Poll</span>
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700 }}>Launch a Live Poll</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          Engage your audience with instantaneous real-time voting and WebSocket updates.
        </p>
      </div>

      {error && (
        <div
          style={{
            padding: '14px 18px',
            background: 'rgba(225, 112, 85, 0.1)',
            border: '1px solid var(--error)',
            color: 'var(--error)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '24px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {/* Two Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '32px',
          alignItems: 'start',
        }}
      >
        {/* Left Column: Form */}
        <Card style={{ padding: '28px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '20px', fontWeight: 600 }}>Poll Configuration</h2>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontWeight: 600, fontSize: '14px' }}>Poll Question</label>
                <span style={{ fontSize: '12px', color: question.length > 180 ? 'var(--error)' : 'var(--text-secondary)' }}>
                  {question.length}/200
                </span>
              </div>
              <input
                type="text"
                placeholder="e.g., Which backend framework should we adopt in Q3?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                maxLength={200}
                disabled={isSubmitting}
                required
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', alignItems: 'center' }}>
                <label style={{ fontWeight: 600, fontSize: '14px' }}>Voting Options ({options.length}/10)</label>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Minimum 2</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {options.map((option, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--text-secondary)',
                        flexShrink: 0,
                      }}
                    >
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <input
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={option}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      disabled={isSubmitting}
                      style={{ flex: 1 }}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        disabled={isSubmitting}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          fontSize: '18px',
                          cursor: 'pointer',
                          padding: '6px 8px',
                          borderRadius: '4px',
                          lineHeight: 1,
                        }}
                        title="Remove option"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {options.length < 10 && (
                <button
                  type="button"
                  onClick={addOption}
                  disabled={isSubmitting}
                  style={{
                    marginTop: '12px',
                    padding: '8px 14px',
                    background: 'var(--bg-secondary)',
                    border: '1px dashed var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--primary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600,
                    width: '100%',
                    textAlign: 'center',
                    transition: 'border-color 0.2s',
                  }}
                >
                  + Add Another Option
                </button>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '14px', marginBottom: '8px' }}>
                Poll Expiration Duration
              </label>
              <select
                value={expiresIn}
                onChange={(e) => setExpiresIn(Number(e.target.value))}
                disabled={isSubmitting}
              >
                <option value={0}>No Expiration (Keep Live indefinitely)</option>
                <option value={1}>1 Hour (Quick meeting poll)</option>
                <option value={24}>24 Hours (1 Day)</option>
                <option value={72}>3 Days</option>
                <option value={168}>7 Days (1 Week)</option>
              </select>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                Once expired, the poll automatically closes to new votes while preserving results.
              </p>
            </div>

            <div style={{ marginTop: '8px' }}>
              <Button
                type="submit"
                variant="primary"
                disabled={isSubmitting}
                style={{ width: '100%', padding: '14px', fontSize: '16px' }}
              >
                {isSubmitting ? 'Creating Poll...' : 'Publish Live Poll 🚀'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Right Column: Live Visual Preview */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-secondary)' }}>
              Live Audience Preview
            </span>
            <Badge variant="live" dot={true}>PREVIEW</Badge>
          </div>

          <Card style={{ padding: '28px', border: '1px dashed var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <Badge variant="live" dot={true}>LIVE</Badge>
              {expiresIn > 0 ? (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  ⏱️ Closes in {expiresIn === 1 ? '1 hour' : expiresIn < 24 ? `${expiresIn} hours` : `${expiresIn / 24} days`}
                </span>
              ) : (
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>⏱️ Unlimited duration</span>
              )}
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px', color: 'var(--text)' }}>
              {question.trim() || "Your question will appear here..."}
            </h3>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '24px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <span>Created by</span>
              <strong style={{ color: 'var(--text)' }}>{user ? user.username : 'You'}</strong>
              <span>· Just now</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {options.map((opt, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        border: '2px solid var(--border)',
                      }}
                    />
                    <span style={{ fontSize: '14px', color: opt.trim() ? 'var(--text)' : 'var(--text-muted)' }}>
                      {opt.trim() || `Option ${i + 1}`}
                    </span>
                  </div>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>0%</span>
                </div>
              ))}
            </div>

            <div
              style={{
                textAlign: 'center',
                padding: '12px',
                background: 'rgba(108, 92, 231, 0.05)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(108, 92, 231, 0.15)',
                fontSize: '13px',
                color: 'var(--text-secondary)',
              }}
            >
              ⚡ Votes cast will instantly update without reloading via WebSockets & Redis Pub/Sub.
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default CreatePoll;
