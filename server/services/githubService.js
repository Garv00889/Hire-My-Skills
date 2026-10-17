const { decryptToken } = require('../utils/tokenEncryption');

const GITHUB_API_BASE = 'https://api.github.com';

/**
 * Make an authenticated GitHub API request
 */
const githubRequest = async (path, options = {}) => {
  const { token, method = 'GET', body = null, headers = {} } = options;
  if (!token) {
    throw new Error('NO_GITHUB_TOKEN: GitHub access token required.');
  }

  const decrypted = token.includes(':') ? decryptToken(token) : token;
  if (!decrypted) {
    throw new Error('INVALID_GITHUB_TOKEN: Could not decrypt GitHub token.');
  }

  const url = path.startsWith('http') ? path : `${GITHUB_API_BASE}${path}`;
  const reqHeaders = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'HireMySkills-Platform',
    'Authorization': `Bearer ${decrypted}`,
    ...headers,
  };

  if (body && typeof body === 'object') {
    reqHeaders['Content-Type'] = 'application/json';
  }

  const fetchOptions = {
    method,
    headers: reqHeaders,
  };

  if (body) {
    fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const response = await fetch(url, fetchOptions);

  if (response.status === 204) {
    return { ok: true, status: 204, data: null };
  }

  const contentType = response.headers.get('content-type') || '';
  const data = contentType.includes('application/json')
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const errorMsg = data?.message || `GitHub API error: ${response.statusText}`;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return { ok: true, status: response.status, data };
};

/**
 * Get authenticated GitHub user profile
 */
const getAuthenticatedUser = async (token) => {
  const res = await githubRequest('/user', { token });
  return res.data;
};

/**
 * List repositories accessible to the user
 */
const getUserRepositories = async (token, params = {}) => {
  const page = params.page || 1;
  const per_page = params.per_page || 30;
  const sort = params.sort || 'updated';
  const res = await githubRequest(`/user/repos?sort=${sort}&per_page=${per_page}&page=${page}`, { token });
  return res.data;
};

/**
 * Create a new repository for the authenticated user
 */
const createRepository = async (token, { name, description = '', isPrivate = false, autoInit = true }) => {
  const payload = {
    name,
    description,
    private: Boolean(isPrivate),
    auto_init: Boolean(autoInit),
  };
  const res = await githubRequest('/user/repos', {
    token,
    method: 'POST',
    body: payload,
  });
  return res.data;
};

/**
 * Get repository details
 */
const getRepositoryDetails = async (token, owner, repo) => {
  const res = await githubRequest(`/repos/${owner}/${repo}`, { token });
  return res.data;
};

/**
 * Get recent commits for a repository
 */
const getRepositoryCommits = async (token, owner, repo, limit = 10) => {
  const res = await githubRequest(`/repos/${owner}/${repo}/commits?per_page=${limit}`, { token });
  return res.data;
};

/**
 * Add or invite a collaborator to repository
 * permission: 'pull', 'push', 'admin', 'triage', 'maintain'
 */
const addCollaborator = async (token, owner, repo, username, permission = 'push') => {
  const res = await githubRequest(`/repos/${owner}/${repo}/collaborators/${username}`, {
    token,
    method: 'PUT',
    body: { permission },
  });
  return res.data;
};

/**
 * Remove collaborator from repository
 */
const removeCollaborator = async (token, owner, repo, username) => {
  const res = await githubRequest(`/repos/${owner}/${repo}/collaborators/${username}`, {
    token,
    method: 'DELETE',
  });
  return res.data;
};

/**
 * List collaborators for a repository
 */
const listCollaborators = async (token, owner, repo) => {
  const res = await githubRequest(`/repos/${owner}/${repo}/collaborators`, { token });
  return res.data;
};

/**
 * Create a webhook on repository for real-time chat push/PR events
 */
const createRepositoryWebhook = async (token, owner, repo, webhookUrl, secret) => {
  const payload = {
    name: 'web',
    active: true,
    events: ['push', 'pull_request', 'issues'],
    config: {
      url: webhookUrl,
      content_type: 'json',
      secret: secret,
      insecure_ssl: '0',
    },
  };
  const res = await githubRequest(`/repos/${owner}/${repo}/hooks`, {
    token,
    method: 'POST',
    body: payload,
  });
  return res.data;
};

module.exports = {
  githubRequest,
  getAuthenticatedUser,
  getUserRepositories,
  createRepository,
  getRepositoryDetails,
  getRepositoryCommits,
  addCollaborator,
  removeCollaborator,
  listCollaborators,
  createRepositoryWebhook,
};
