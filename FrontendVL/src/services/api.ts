import axios from 'axios';

// Your backend URL
const API_URL = 'http://127.0.0.1:8000';

const api = axios.create({
  baseURL: API_URL,
});

// This "request interceptor" adds the token to requests (you already have this)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// --- NEW CODE: Add a "response interceptor" ---
// This runs AFTER every request and checks for errors.
api.interceptors.response.use(
  (response) => {
    // If the request was successful, just return the response
    return response;
  },
  (error) => {
    // Check if the error is a 401 (Unauthorized)
    if (error.response && error.response.status === 401) {
      // This means the token is expired or invalid
      console.log("Token expired or invalid, logging out.");
      
      // 1. Remove the bad token
      localStorage.removeItem('accessToken');
      
      // 2. Force a page reload to the home page.
      // This will clear all state and put the user back on the login screen.
      // This is the simplest and most reliable way to handle this.
      window.location.href = '/'; 
    }
    
    // For all other errors, just return the error
    return Promise.reject(error);
  }
);
// --- END OF NEW CODE ---

export default api;
// --- ADD THIS NEW FUNCTION ---

// This function is built to handle streaming responses
export const streamApi = {
  // We'll give it the same base URL
  baseURL: API_URL,

  async streamPost(path: string, body: any) {
    const token = localStorage.getItem('accessToken');

    // Use the native Fetch API
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add the auth token
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Handle API errors (like 404, 500)
      const errorText = await response.text();
      throw new Error(errorText || 'An error occurred during streaming.');
    }

    if (!response.body) {
      throw new Error('Response body is missing.');
    }

    // Return the raw response so the component can read the stream
    return response;
  },
};