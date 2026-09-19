const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const fetchApi = async (endpoint, options = {}) => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      // Handle standardized error format
      if (data && data.error && data.error.message) {
        throw new Error(data.error.message);
      }
      // Handle legacy error format
      if (data && data.message) {
        throw new Error(data.message);
      }
      throw new Error(`Request failed with status ${response.status}`);
    }

    // Handle standardized success format
    if (data && data.success !== undefined) {
      return data.data || data;
    }
    
    // Legacy format
    return data;
  } catch (error) {
    throw error;
  }
};
