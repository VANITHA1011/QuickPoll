import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function CreatePoll() {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { token, loading } = useAuth();

  useEffect(() => {
    if (!loading && !token) {
      navigate('/login?redirect=/create-poll');
    }
  }, [token, loading, navigate]);

  if (loading) return null;

  const handleOptionChange = (index, value) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addOption = () => {
    setOptions([...options, '']);
  };

  const removeOption = (index) => {
    if (options.length > 2) {
      const newOptions = options.filter((_, i) => i !== index);
      setOptions(newOptions);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) {
      setError('You must be logged in to create a poll');
      return;
    }

    const trimmedQuestion = question.trim();
    const validOptions = options.map(opt => opt.trim()).filter(opt => opt !== '');

    if (!trimmedQuestion) {
      setError('Question is required');
      return;
    }

    if (validOptions.length < 2) {
      setError('At least two valid options are required');
      return;
    }

    setIsLoading(true);
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    try {
      const response = await fetch(`${API_URL}/api/polls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: trimmedQuestion, options: validOptions }),
      });

      const data = await response.json();

      if (response.ok) {
        navigate(`/dashboard`);
      } else {
        setError(data.message || 'Failed to create poll');
      }
    } catch (err) {
      setError('Network error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="status-section" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'left' }}>
      <h2 className="status-title" style={{ textAlign: 'center', marginBottom: '20px' }}>Create Poll</h2>
      <div className="status-card">
        {error && (
          <div style={{ padding: '12px', background: 'rgba(225, 112, 85, 0.1)', border: '1px solid var(--error)', color: 'var(--error)', borderRadius: '5px', marginBottom: '15px', fontSize: '14px' }}>
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Question</label>
            <input 
              type="text" 
              placeholder="What's your question?" 
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              disabled={isLoading}
              style={{ width: '100%', padding: '12px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} 
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Options</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {options.map((option, index) => (
                <div key={index} style={{ display: 'flex', gap: '10px' }}>
                  <input 
                    type="text" 
                    placeholder={`Option ${index + 1}`} 
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    disabled={isLoading}
                    style={{ flex: 1, padding: '10px', borderRadius: '5px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }} 
                  />
                  {options.length > 2 && (
                    <button 
                      type="button" 
                      onClick={() => removeOption(index)}
                      disabled={isLoading}
                      style={{ padding: '0 15px', background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '5px', color: 'var(--text)', cursor: 'pointer' }}
                    >
                      X
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button 
              type="button" 
              onClick={addOption}
              disabled={isLoading}
              style={{ marginTop: '10px', padding: '8px 12px', background: 'var(--bg-secondary)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', fontSize: '14px' }}
            >
              + Add Option
            </button>
          </div>
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ padding: '12px', background: isLoading ? 'var(--text-muted)' : 'var(--primary)', color: 'white', border: 'none', borderRadius: '5px', cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: '600', marginTop: '10px' }}
          >
            {isLoading ? 'Creating...' : 'Create Poll'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreatePoll;
