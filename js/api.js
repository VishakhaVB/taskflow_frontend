const API_URL = 'https://taskflow-backend-xoq1.onrender.com/api';

/**
 * Generic Fetch Wrapper
 */
async function apiRequest(endpoint, method = 'GET', body = null, token = null) {
    const headers = {
        'Content-Type': 'application/json'
    };

  // Attach JWT token if available
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = {
        method,
        headers
    };

  // Attach body if present
    if (body) {
        config.body = JSON.stringify(body);
    }

  try {
        const response = await fetch(`${API_URL}${endpoint}`, config);

        // Handle non-JSON responses (e.g. 404 HTML pages)
        const contentType = response.headers.get('content-type');
        let data;

        if (contentType && contentType.includes('application/json')) {
            data = await response.json();
        } else {
            const text = await response.text();
            throw new Error(`Server Error (${response.status}): ${text.substring(0, 80)}...`);
        }

        // Handle API errors
        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;

    } catch (error) {
        console.error('API Request Failed:', error);
        throw error;
    }
}

// Make it available globally for non-module usage
window.apiRequest = apiRequest;
