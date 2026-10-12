const rawApiUrl = (import.meta.env?.VITE_API_URL || '').trim().replace(/\/+$/, '');
export const API_BASE = (() => {
  if (!rawApiUrl) return '/api';
  if (rawApiUrl.startsWith('http://') || rawApiUrl.startsWith('https://')) {
    return rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
  }
  return rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
})();
export const API_URL = API_BASE;
export default API_BASE;

// Backend base URL (without /api) for serving static uploads if separate
export const BACKEND_URL = API_BASE.startsWith('http') 
  ? API_BASE.replace(/\/api$/, '') 
  : '';

export const TOKEN_KEY = 'clixer_admin_jwt';

export const getAuthToken = () => {
  return localStorage.getItem(TOKEN_KEY);
};

export const setAuthToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const clearAuthToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

export const isAdminAuthenticated = () => {
  const token = getAuthToken();
  return Boolean(token && token.trim().length > 10);
};

export const getFullImageUrl = (img) => {
  if (!img) return '';
  if (img.startsWith('http://') || img.startsWith('https://') || img.startsWith('data:')) {
    return img;
  }
  if (img.startsWith('/uploads')) {
    return `${BACKEND_URL}${img}`;
  }
  return img;
};

/**
 * Handle API responses with standard JSON parsing and error extraction
 */
const handleResponse = async (response) => {
  let data = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = { message: await response.text() };
  }

  if (!response.ok) {
    const errorMsg = data?.message || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
};

/**
 * 1. Admin Authentication APIs
 */
export const adminLogin = async (email, password) => {
  try {
    const response = await fetch(`${API_BASE}/admin/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    const data = await handleResponse(response);
    if (data.token) {
      setAuthToken(data.token);
    }
    return data;
  } catch (error) {
    if (!error.status) {
      throw new Error('Unable to connect to the server. Please try again.');
    }
    throw error;
  }
};

export const verifyAdminToken = async () => {
  const token = getAuthToken();
  if (!token) return false;

  try {
    const response = await fetch(`${API_BASE}/admin/me`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    return response.ok;
  } catch {
    return false;
  }
};

export const getAdminProfile = async () => {
  const token = getAuthToken();
  if (!token) throw new Error('Unauthorized. No authentication token found.');

  const response = await fetch(`${API_BASE}/admin/profile`, {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await handleResponse(response);
};

export const changeAdminEmail = async ({ currentPassword, newEmail, confirmEmail }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Unauthorized. Please log in.');

  const response = await fetch(`${API_BASE}/admin/change-email`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newEmail, confirmEmail })
  });

  const data = await handleResponse(response);
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
};

export const changeAdminPassword = async ({ currentPassword, newPassword, confirmPassword }) => {
  const token = getAuthToken();
  if (!token) throw new Error('Unauthorized. Please log in.');

  const response = await fetch(`${API_BASE}/admin/change-password`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
  });

  const data = await handleResponse(response);
  if (data?.token) {
    setAuthToken(data.token);
  }
  return data;
};

export const adminLogout = () => {
  clearAuthToken();
};

/**
 * 2. Public / Catalogue Products APIs
 */
export const fetchProducts = async () => {
  const response = await fetch(`${API_BASE}/products`);
  const data = await handleResponse(response);
  return Array.isArray(data) ? data : (data?.products || []);
};

export const getProducts = fetchProducts;

export const fetchProductById = async (id) => {
  const response = await fetch(`${API_BASE}/products/${id}`);
  const data = await handleResponse(response);
  return data?.product || data;
};

/**
 * 3. Protected Admin Product Management APIs
 */
export const createProduct = async (formData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Unauthorized. Please log in.');

  const isFormData = formData instanceof FormData;
  const headers = {
    Authorization: `Bearer ${token}`
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/products`, {
    method: 'POST',
    headers,
    body: isFormData ? formData : JSON.stringify(formData)
  });

  return await handleResponse(response);
};

export const updateProduct = async (id, formData) => {
  const token = getAuthToken();
  if (!token) throw new Error('Unauthorized. Please log in.');

  const isFormData = formData instanceof FormData;
  const headers = {
    Authorization: `Bearer ${token}`
  };
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: 'PUT',
    headers,
    body: isFormData ? formData : JSON.stringify(formData)
  });

  return await handleResponse(response);
};

export const deleteProduct = async (id) => {
  const token = getAuthToken();
  if (!token) throw new Error('Unauthorized. Please log in.');

  const response = await fetch(`${API_BASE}/products/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  return await handleResponse(response);
};
