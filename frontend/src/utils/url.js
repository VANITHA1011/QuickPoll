export const getPollUrl = (pollId) => {
  const baseUrl = (import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '')).replace(/\/+$/, '');
  return `${baseUrl}/poll/${pollId}`;
};
