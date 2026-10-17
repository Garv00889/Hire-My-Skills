import { useState, useEffect } from 'react';
import {
  GitBranch, GitCommit, GitPullRequest, AlertCircle,
  ExternalLink, Plus, Link as LinkIcon, Users, Check, X,
  Shield, RefreshCw, Unlink, CheckCircle2, Clock, Lock, Globe
} from 'lucide-react';
import GitHubIcon from './GitHubIcon';
import {
  getGitHubStatus, disconnectGitHub, getProjectGitHub, getUserRepos,
  createProjectRepo, connectExistingRepo, disconnectProjectRepo,
  grantCollaborator, revokeCollaborator, getProjectGitCommits
} from '../services/api';
import toast from 'react-hot-toast';
import './GitHubIntegrationModal.css';

const GitHubIntegrationModal = ({
  projectId,
  project,
  isOwner,
  onClose,
  onRepoUpdated,
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'create', 'connect', 'team', 'activity'
  const [loading, setLoading] = useState(true);
  const [myGitHub, setMyGitHub] = useState(null);
  const [projectGitHub, setProjectGitHub] = useState(null);
  const [userRepos, setUserRepos] = useState([]);
  const [loadingRepos, setLoadingRepos] = useState(false);
  const [commits, setCommits] = useState([]);
  const [loadingCommits, setLoadingCommits] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    name: project?.title ? project.title.toLowerCase().replace(/[^a-z0-9-_]/g, '-').slice(0, 40) : '',
    description: project?.description ? project.description.slice(0, 180) : '',
    isPrivate: true,
    autoInit: true,
  });
  const [selectedRepoUrl, setSelectedRepoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Initial load
  const loadData = async () => {
    try {
      setLoading(true);
      const [statusRes, projectRes] = await Promise.all([
        getGitHubStatus(),
        getProjectGitHub(projectId),
      ]);
      setMyGitHub(statusRes.data);
      setProjectGitHub(projectRes.data);
    } catch (err) {
      console.error('Error loading GitHub integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  // Load user repos when switching to 'connect' tab
  useEffect(() => {
    if (activeTab === 'connect' && myGitHub?.isConnected && userRepos.length === 0) {
      const fetchRepos = async () => {
        setLoadingRepos(true);
        try {
          const { data } = await getUserRepos();
          setUserRepos(data || []);
        } catch (err) {
          toast.error(err.response?.data?.message || 'Failed to fetch your GitHub repositories');
        } finally {
          setLoadingRepos(false);
        }
      };
      fetchRepos();
    }
  }, [activeTab, myGitHub]);

  // Load commits when switching to 'activity' tab
  useEffect(() => {
    if (activeTab === 'activity') {
      const fetchCommits = async () => {
        setLoadingCommits(true);
        try {
          const { data } = await getProjectGitCommits(projectId);
          setCommits(data.commits || []);
        } catch {
          setCommits([]);
        } finally {
          setLoadingCommits(false);
        }
      };
      fetchCommits();
    }
  }, [activeTab, projectId]);

  // Trigger GitHub OAuth redirect
  const handleConnectGitHub = () => {
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const safeClient = encodeURIComponent(window.location.origin);
    const safeReturn = encodeURIComponent(window.location.pathname);
    window.location.href = `${apiBase}/api/auth/github?scope=repo&returnTo=${safeReturn}&clientUrl=${safeClient}`;
  };

  // Disconnect user's GitHub
  const handleDisconnectGitHub = async () => {
    if (!window.confirm('Disconnect your GitHub account from HireMySkills?')) return;
    try {
      await disconnectGitHub();
      toast.success('GitHub account disconnected.');
      loadData();
    } catch (err) {
      toast.error('Failed to disconnect GitHub');
    }
  };

  // Create & Connect new Repo
  const handleCreateRepo = async (e) => {
    e.preventDefault();
    if (!createForm.name.trim()) return;

    setSubmitting(true);
    try {
      const { data } = await createProjectRepo(projectId, createForm);
      toast.success('GitHub repository created & connected!');
      onRepoUpdated?.(data.repository?.htmlUrl);
      setActiveTab('overview');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create repository');
    } finally {
      setSubmitting(false);
    }
  };

  // Connect existing repo
  const handleConnectExisting = async (e) => {
    e.preventDefault();
    if (!selectedRepoUrl) return;

    setSubmitting(true);
    try {
      const { data } = await connectExistingRepo(projectId, { repoUrl: selectedRepoUrl });
      toast.success('Repository connected to project!');
      onRepoUpdated?.(data.repository?.htmlUrl);
      setActiveTab('overview');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to connect repository');
    } finally {
      setSubmitting(false);
    }
  };

  // Disconnect repo from project
  const handleDisconnectRepo = async () => {
    if (!window.confirm('Are you sure you want to disconnect this repository from this project? Team access links will be unlinked.')) return;
    setSubmitting(true);
    try {
      await disconnectProjectRepo(projectId);
      toast.success('Repository disconnected from project.');
      onRepoUpdated?.('');
      setActiveTab('overview');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disconnect repository');
    } finally {
      setSubmitting(false);
    }
  };

  // Grant collaborator access
  const handleGrantAccess = async (memberId, permission = 'push') => {
    try {
      const { data } = await grantCollaborator(projectId, { memberId, permission });
      toast.success(data.message || 'Access granted!');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to grant access');
    }
  };

  // Revoke collaborator access
  const handleRevokeAccess = async (memberId) => {
    if (!window.confirm('Revoke repository access for this member?')) return;
    try {
      await revokeCollaborator(projectId, memberId);
      toast.success('Access revoked.');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to revoke access');
    }
  };

  const repository = projectGitHub?.repository;
  const isConnectedRepo = Boolean(repository?.fullName || projectGitHub?.githubRepoUrl);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="github-modal-box page-enter"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="GitHub Team Integration"
      >
        {/* Modal Header */}
        <div className="github-modal-header">
          <div className="header-title-group">
            <div className="github-header-badge">
              <GitHubIcon size={22} />
            </div>
            <div>
              <h3 className="github-modal-title">GitHub Project Workspace</h3>
              <p className="github-modal-sub">
                Connect code repositories, manage team access & review commits in chat
              </p>
            </div>
          </div>
          <button className="close-modal-btn" onClick={onClose} aria-label="Close modal">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="github-tabs-bar">
          <button
            className={`github-tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          {isOwner && (
            <>
              <button
                className={`github-tab-btn ${activeTab === 'create' ? 'active' : ''}`}
                onClick={() => setActiveTab('create')}
              >
                Create Repo
              </button>
              <button
                className={`github-tab-btn ${activeTab === 'connect' ? 'active' : ''}`}
                onClick={() => setActiveTab('connect')}
              >
                Connect Existing
              </button>
            </>
          )}
          <button
            className={`github-tab-btn ${activeTab === 'team' ? 'active' : ''}`}
            onClick={() => setActiveTab('team')}
          >
            Team Access
          </button>
          <button
            className={`github-tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
            onClick={() => setActiveTab('activity')}
          >
            Activity & Commits
          </button>
        </div>

        {/* Tab Body */}
        <div className="github-modal-body">
          {loading ? (
            <div className="github-loading-state">
              <RefreshCw className="animate-spin" size={24} color="#F5A623" />
              <span>Loading GitHub integration data...</span>
            </div>
          ) : (
            <>
              {/* ─── TAB 1: OVERVIEW ─── */}
              {activeTab === 'overview' && (
                <div className="tab-pane">
                  {/* User GitHub Account Status */}
                  <div className="account-status-card">
                    <div className="flex-between">
                      <div className="account-info-group">
                        <div className="account-avatar">
                          {myGitHub?.profile?.avatarUrl ? (
                            <img src={myGitHub.profile.avatarUrl} alt="" />
                          ) : (
                            <GitHubIcon size={20} />
                          )}
                        </div>
                        <div>
                          <div className="account-name-row">
                            <strong>
                              {myGitHub?.isConnected
                                ? `@${myGitHub.githubUsername || myGitHub.profile?.login}`
                                : 'No GitHub Account Linked'}
                            </strong>
                            {myGitHub?.isConnected ? (
                              <span className="badge-connected">
                                <CheckCircle2 size={12} /> Connected
                              </span>
                            ) : (
                              <span className="badge-disconnected">Not Connected</span>
                            )}
                          </div>
                          <span className="account-sub">
                            {myGitHub?.isConnected
                              ? 'Authorized with repository permissions.'
                              : 'Link your GitHub account to create repos or accept team invites.'}
                          </span>
                        </div>
                      </div>

                      {myGitHub?.isConnected ? (
                        <button
                          type="button"
                          className="btn-danger-outline"
                          onClick={handleDisconnectGitHub}
                        >
                          Disconnect
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-github-action"
                          onClick={handleConnectGitHub}
                        >
                          <GitHubIcon size={15} /> Connect GitHub
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Connected Repository Status */}
                  <div className="repo-status-card">
                    <h4 className="section-card-title">
                      <GitBranch size={16} /> Project Repository
                    </h4>

                    {isConnectedRepo ? (
                      <div className="repo-details-box">
                        <div className="flex-between" style={{ alignItems: 'flex-start' }}>
                          <div>
                            <div className="repo-title-row">
                              <h5 className="repo-display-name">
                                {repository?.fullName || projectGitHub?.githubRepoUrl?.replace('https://github.com/', '')}
                              </h5>
                              <span className="repo-privacy-tag">
                                {repository?.isPrivate ? <Lock size={11} /> : <Globe size={11} />}
                                {repository?.isPrivate ? 'Private' : 'Public'}
                              </span>
                            </div>
                            {repository?.description && (
                              <p className="repo-display-desc">{repository.description}</p>
                            )}
                            <div className="repo-meta-row">
                              <span>Default branch: <code>{repository?.defaultBranch || 'main'}</code></span>
                              {repository?.connectedAt && (
                                <>
                                  <span>·</span>
                                  <span>Connected {new Date(repository.connectedAt).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="repo-actions-group">
                            <a
                              href={projectGitHub?.githubRepoUrl || repository?.htmlUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-open-github"
                            >
                              <span>Open on GitHub</span>
                              <ExternalLink size={13} />
                            </a>
                            {isOwner && (
                              <button
                                type="button"
                                className="btn-unlink-repo"
                                onClick={handleDisconnectRepo}
                                disabled={submitting}
                                title="Disconnect repo"
                              >
                                <Unlink size={13} /> Unlink
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick links to commits and PRs */}
                        <div className="quick-git-links">
                          <button
                            type="button"
                            className="git-link-chip"
                            onClick={() => setActiveTab('activity')}
                          >
                            <GitCommit size={13} /> View Recent Commits
                          </button>
                          <a
                            href={`${projectGitHub?.githubRepoUrl}/pulls`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="git-link-chip"
                          >
                            <GitPullRequest size={13} /> Pull Requests <ExternalLink size={11} />
                          </a>
                          <button
                            type="button"
                            className="git-link-chip"
                            onClick={() => setActiveTab('team')}
                          >
                            <Users size={13} /> Manage Team Permissions
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="empty-repo-card">
                        <GitBranch size={32} color="#D4891A" />
                        <h5>No Repository Linked Yet</h5>
                        <p>
                          Link a GitHub repository to collaborate on code, review branches, and receive automated commit updates in chat.
                        </p>
                        {isOwner ? (
                          <div className="empty-repo-actions">
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => setActiveTab('create')}
                            >
                              <Plus size={15} /> Create New Repo
                            </button>
                            <button
                              type="button"
                              className="btn-secondary"
                              onClick={() => setActiveTab('connect')}
                            >
                              <LinkIcon size={14} /> Connect Existing
                            </button>
                          </div>
                        ) : (
                          <p className="text-muted-sm">
                            Only the project owner can link a repository.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ─── TAB 2: CREATE NEW REPOSITORY (Owner Only) ─── */}
              {activeTab === 'create' && isOwner && (
                <div className="tab-pane">
                  {!myGitHub?.isConnected ? (
                    <div className="warning-banner">
                      <AlertCircle size={18} />
                      <div>
                        <strong>GitHub Connection Required</strong>
                        <p>Please connect your GitHub account first before creating a repository.</p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleConnectGitHub}
                        style={{ marginLeft: 'auto' }}
                      >
                        Connect GitHub
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleCreateRepo} className="git-action-form">
                      <div className="form-group">
                        <label>Repository Name <span className="req">*</span></label>
                        <input
                          type="text"
                          className="input-field-custom"
                          placeholder="e.g. ecommerce-platform"
                          value={createForm.name}
                          onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                          required
                        />
                        <span className="field-hint">
                          Will be created under <strong>@{myGitHub.githubUsername}</strong> on GitHub.
                        </span>
                      </div>

                      <div className="form-group">
                        <label>Description (Optional)</label>
                        <textarea
                          className="input-field-custom"
                          rows={2}
                          placeholder="Short description of the codebase"
                          value={createForm.description}
                          onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                        />
                      </div>

                      <div className="form-row-checkboxes">
                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={createForm.isPrivate}
                            onChange={(e) => setCreateForm({ ...createForm, isPrivate: e.target.checked })}
                          />
                          <span>Make this repository Private (recommended for client projects)</span>
                        </label>

                        <label className="checkbox-label">
                          <input
                            type="checkbox"
                            checked={createForm.autoInit}
                            onChange={(e) => setCreateForm({ ...createForm, autoInit: e.target.checked })}
                          />
                          <span>Initialize with a README.md and default main branch</span>
                        </label>
                      </div>

                      <div className="modal-form-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setActiveTab('overview')}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={submitting || !createForm.name.trim()}
                        >
                          {submitting ? 'Creating on GitHub...' : 'Create & Connect Repository'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ─── TAB 3: CONNECT EXISTING REPOSITORY (Owner Only) ─── */}
              {activeTab === 'connect' && isOwner && (
                <div className="tab-pane">
                  {!myGitHub?.isConnected ? (
                    <div className="warning-banner">
                      <AlertCircle size={18} />
                      <div>
                        <strong>GitHub Connection Required</strong>
                        <p>Connect your GitHub account to choose from your existing repositories.</p>
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleConnectGitHub}
                        style={{ marginLeft: 'auto' }}
                      >
                        Connect GitHub
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleConnectExisting} className="git-action-form">
                      <div className="form-group">
                        <label>Select from your GitHub Repositories</label>
                        {loadingRepos ? (
                          <div className="loading-dropdown">
                            <RefreshCw className="animate-spin" size={16} />
                            <span>Loading repositories...</span>
                          </div>
                        ) : (
                          <select
                            className="input-field-custom"
                            value={selectedRepoUrl}
                            onChange={(e) => setSelectedRepoUrl(e.target.value)}
                          >
                            <option value="">-- Choose a repository --</option>
                            {userRepos.map((r) => (
                              <option key={r.id} value={r.htmlUrl}>
                                {r.fullName} ({r.isPrivate ? 'Private' : 'Public'})
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div className="or-divider-row">
                        <span>or enter any repository URL manually</span>
                      </div>

                      <div className="form-group">
                        <input
                          type="url"
                          className="input-field-custom"
                          placeholder="https://github.com/owner/repository"
                          value={selectedRepoUrl}
                          onChange={(e) => setSelectedRepoUrl(e.target.value)}
                        />
                      </div>

                      <div className="modal-form-actions">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={() => setActiveTab('overview')}
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn-primary"
                          disabled={submitting || !selectedRepoUrl.trim()}
                        >
                          {submitting ? 'Connecting...' : 'Connect Selected Repository'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* ─── TAB 4: TEAM MEMBER ACCESS & PERMISSIONS ─── */}
              {activeTab === 'team' && (
                <div className="tab-pane">
                  <div className="team-access-header">
                    <p className="text-muted-sm">
                      Manage collaborator access on GitHub for members of this project workspace.
                    </p>
                  </div>

                  {!isConnectedRepo ? (
                    <div className="warning-banner">
                      <AlertCircle size={16} />
                      <span>Please connect a GitHub repository first to manage collaborator permissions.</span>
                    </div>
                  ) : (
                    <div className="collaborator-rows-list">
                      {(projectGitHub?.teamMembers || []).map((m) => (
                        <div key={m.userId} className="collab-member-row">
                          <div className="collab-user-info">
                            <div className="collab-avatar">
                              {m.profilePicture ? (
                                <img src={m.profilePicture} alt="" />
                              ) : (
                                <span>{m.name?.[0] || '?'}</span>
                              )}
                            </div>
                            <div>
                              <div className="collab-user-name">
                                <strong>{m.name}</strong>
                                {m.isCreator && <span className="owner-tag">Creator</span>}
                              </div>
                              <span className="collab-gh-username">
                                {m.githubUsername ? (
                                  <>
                                    <GitHubIcon size={12} /> @{m.githubUsername}
                                  </>
                                ) : (
                                  <span className="text-danger-sm">No GitHub connected</span>
                                )}
                              </span>
                            </div>
                          </div>

                          <div className="collab-status-actions">
                            {m.isCreator ? (
                              <span className="badge-admin">
                                <Shield size={12} /> Administrator
                              </span>
                            ) : m.repositoryAccess ? (
                              <div className="access-active-group">
                                <span className={`badge-perm ${m.repositoryAccess.status}`}>
                                  {m.repositoryAccess.permission.toUpperCase()}
                                  {m.repositoryAccess.status === 'pending' ? ' (Invite Sent)' : ''}
                                </span>
                                {isOwner && (
                                  <button
                                    type="button"
                                    className="btn-revoke-perm"
                                    onClick={() => handleRevokeAccess(m.userId)}
                                    title="Revoke repository access"
                                  >
                                    Revoke
                                  </button>
                                )}
                              </div>
                            ) : (
                              <div className="access-grant-group">
                                {isOwner ? (
                                  <button
                                    type="button"
                                    className="btn-grant-perm"
                                    disabled={!m.githubUsername}
                                    onClick={() => handleGrantAccess(m.userId, 'push')}
                                    title={!m.githubUsername ? 'Member must link GitHub account first' : 'Grant Write Access'}
                                  >
                                    Grant Write Access
                                  </button>
                                ) : (
                                  <span className="text-muted-sm">No repo access</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TAB 5: RECENT COMMITS & ACTIVITY STREAM ─── */}
              {activeTab === 'activity' && (
                <div className="tab-pane">
                  {!isConnectedRepo ? (
                    <div className="empty-state-box">
                      <GitCommit size={28} color="#D4891A" />
                      <p>Connect a GitHub repository to view recent commits and code history.</p>
                    </div>
                  ) : loadingCommits ? (
                    <div className="github-loading-state">
                      <RefreshCw className="animate-spin" size={20} color="#F5A623" />
                      <span>Fetching live commits from GitHub...</span>
                    </div>
                  ) : commits.length === 0 ? (
                    <div className="empty-state-box">
                      <GitCommit size={24} color="#A09E96" />
                      <p>No commits recorded yet on default branch.</p>
                    </div>
                  ) : (
                    <div className="modal-commits-list">
                      {commits.map((c, i) => (
                        <div key={c.sha || i} className="modal-commit-item">
                          <div className="flex-between">
                            <div className="commit-header-left">
                              <span className="commit-sha-badge">
                                <GitCommit size={12} /> {c.sha}
                              </span>
                              <span className="commit-author-name">{c.author}</span>
                            </div>
                            {c.date && (
                              <span className="commit-time-stamp">
                                <Clock size={11} /> {new Date(c.date).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="commit-subject-line">{c.message}</p>
                          {c.url && (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="commit-gh-link"
                            >
                              <span>View commit on GitHub</span>
                              <ExternalLink size={11} />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GitHubIntegrationModal;
