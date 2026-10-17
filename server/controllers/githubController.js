const crypto = require('crypto');
const Project = require('../models/Project');
const User = require('../models/User');
const Message = require('../models/Message');
const githubService = require('../services/githubService');

/**
 * Helper to post automated GitHub event messages directly into the project chat
 */
const postGitSystemMessage = async (projectId, senderId, gitActivity) => {
  try {
    const msg = await Message.create({
      project: projectId,
      sender: senderId,
      content: gitActivity.title || 'GitHub Activity',
      isFile: false,
      isGitActivity: true,
      gitActivity,
    });

    await msg.populate('sender', 'name profilePicture');

    if (global.io) {
      global.io.to(projectId.toString()).emit('receive-message', msg);
    }
    return msg;
  } catch (err) {
    console.error('[GIT_CHAT_MSG] Failed to post automated git chat message:', err.message);
  }
};

/**
 * @desc    Get current user's GitHub connection status and account details
 * @route   GET /api/github/status
 */
const getMyGitHubStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isConnected = Boolean(user.githubAccessTokenEncrypted);
    let githubProfile = null;

    if (isConnected) {
      try {
        const ghUser = await githubService.getAuthenticatedUser(user.githubAccessTokenEncrypted);
        githubProfile = {
          login: ghUser.login,
          name: ghUser.name,
          avatarUrl: ghUser.avatar_url,
          htmlUrl: ghUser.html_url,
          publicRepos: ghUser.public_repos,
        };
      } catch (err) {
        // Token might have expired or been revoked
        if (err.status === 401) {
          user.githubAccessTokenEncrypted = '';
          await user.save();
          return res.json({ isConnected: false, expired: true });
        }
      }
    }

    res.json({
      isConnected: Boolean(user.githubAccessTokenEncrypted),
      githubUsername: user.githubUsername || githubProfile?.login || '',
      connectedAt: user.githubConnectedAt || null,
      profile: githubProfile,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Disconnect GitHub account
 * @route   POST /api/github/disconnect
 */
const disconnectGitHub = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.githubAccessTokenEncrypted = '';
    user.githubConnectedAt = null;
    await user.save();

    res.json({ success: true, message: 'GitHub account disconnected successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get project GitHub repository status, team collaborators, and connection details
 * @route   GET /api/github/projects/:projectId
 */
const getProjectGitHubStatus = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId)
      .populate('creator', 'name email profilePicture githubUsername githubLink')
      .populate('members', 'name email profilePicture githubUsername githubLink')
      .populate('githubCollaborators.user', 'name email profilePicture githubUsername');

    if (!project) return res.status(404).json({ message: 'Project not found' });

    const myId = req.user._id.toString();
    const isCreator = project.creator?._id?.toString() === myId;
    const isMember = isCreator || project.members.some(m => m?._id?.toString() === myId);

    if (!isMember) {
      return res.status(403).json({ message: 'You are not an authorized member of this project.' });
    }

    // Enrich team members list with their GitHub connection flags
    const teamMembersStatus = await Promise.all(
      [project.creator, ...(project.members || [])].map(async (member) => {
        if (!member) return null;
        const u = await User.findById(member._id).select('+githubAccessTokenEncrypted');
        const isConnected = Boolean(u?.githubAccessTokenEncrypted);
        const collab = (project.githubCollaborators || []).find(
          c => c.user?._id?.toString() === member._id.toString() || c.user?.toString() === member._id.toString()
        );

        return {
          userId: member._id,
          name: member.name,
          email: member.email,
          profilePicture: member.profilePicture,
          isCreator: member._id.toString() === project.creator?._id?.toString(),
          githubUsername: u?.githubUsername || member.githubUsername || '',
          hasGitHubConnected: isConnected,
          repositoryAccess: collab
            ? {
                permission: collab.permission,
                status: collab.status,
                invitedAt: collab.invitedAt,
              }
            : null,
        };
      })
    );

    res.json({
      isOwner: isCreator,
      repository: project.githubRepository || null,
      githubRepoUrl: project.githubRepo || project.githubRepository?.htmlUrl || '',
      teamMembers: teamMembersStatus.filter(Boolean),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    List authenticated creator's existing GitHub repositories to select
 * @route   GET /api/github/user-repos
 */
const listUserRepositories = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    if (!user || !user.githubAccessTokenEncrypted) {
      return res.status(400).json({
        message: 'GitHub account not connected. Please connect your GitHub account first.',
        code: 'NOT_CONNECTED',
      });
    }

    const repos = await githubService.getUserRepositories(user.githubAccessTokenEncrypted, {
      per_page: 50,
      sort: 'updated',
    });

    const sanitized = (repos || []).map(r => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      owner: r.owner?.login,
      htmlUrl: r.html_url,
      cloneUrl: r.clone_url,
      defaultBranch: r.default_branch,
      isPrivate: r.private,
      description: r.description,
      updatedAt: r.updated_at,
    }));

    res.json(sanitized);
  } catch (err) {
    if (err.status === 401) {
      return res.status(401).json({ message: 'GitHub session expired. Please reconnect.', code: 'EXPIRED' });
    }
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Create a new repository on GitHub & connect it to the project
 * @route   POST /api/github/projects/:projectId/create-repo
 */
const createAndConnectRepo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, isPrivate, autoInit } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Repository name is required.' });
    }

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can create and connect a GitHub repository.' });
    }

    const user = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    if (!user?.githubAccessTokenEncrypted) {
      return res.status(400).json({
        message: 'You must connect your GitHub account with repository permissions first.',
        code: 'NOT_CONNECTED',
      });
    }

    // 1. Create on GitHub
    const repo = await githubService.createRepository(user.githubAccessTokenEncrypted, {
      name: name.trim(),
      description: description?.trim() || project.description?.substring(0, 200) || '',
      isPrivate: Boolean(isPrivate),
      autoInit: autoInit !== undefined ? Boolean(autoInit) : true,
    });

    // 2. Setup Webhook for project chat push & PR updates
    let webhookId = null;
    const webhookSecret = crypto.randomBytes(24).toString('hex');
    const apiBase = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://hire-my-skills.onrender.com' : 'http://localhost:5000');
    const webhookUrl = `${apiBase}/api/github/webhook/${project._id}`;

    try {
      const hookRes = await githubService.createRepositoryWebhook(
        user.githubAccessTokenEncrypted,
        repo.owner.login,
        repo.name,
        webhookUrl,
        webhookSecret
      );
      webhookId = hookRes?.id || null;
    } catch (hookErr) {
      console.warn('[WEBHOOK_SETUP_WARN] Could not register automatic GitHub webhook:', hookErr.message);
    }

    // 3. Update project document
    project.githubRepo = repo.html_url;
    project.githubRepository = {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch || 'main',
      isPrivate: repo.private,
      description: repo.description || '',
      connectedAt: new Date(),
      connectedBy: req.user._id,
      webhookId,
      webhookSecret,
    };

    await project.save();

    // 4. Post automated announcement to project group chat
    await postGitSystemMessage(project._id, req.user._id, {
      type: 'repo_created',
      title: `Created and linked GitHub repository: ${repo.full_name}`,
      description: `Repository initialized with ${repo.default_branch} branch (${repo.private ? 'Private' : 'Public'}).`,
      url: repo.html_url,
      actor: {
        name: req.user.name,
        avatar: req.user.profilePicture,
        githubUsername: user.githubUsername || repo.owner.login,
      },
      action: 'created',
    });

    res.status(201).json({
      message: 'Repository created and linked successfully!',
      repository: project.githubRepository,
      githubRepo: project.githubRepo,
    });
  } catch (err) {
    if (err.status === 422) {
      return res.status(422).json({ message: 'A repository with this name already exists in your GitHub account.' });
    }
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Connect an existing GitHub repository to the project
 * @route   POST /api/github/projects/:projectId/connect-existing
 */
const connectExistingRepo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { fullName, repoUrl } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can connect a GitHub repository.' });
    }

    const user = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    if (!user?.githubAccessTokenEncrypted) {
      return res.status(400).json({
        message: 'You must connect your GitHub account with repository permissions first.',
        code: 'NOT_CONNECTED',
      });
    }

    let targetOwner = '';
    let targetRepo = '';

    if (fullName && fullName.includes('/')) {
      [targetOwner, targetRepo] = fullName.split('/');
    } else if (repoUrl && repoUrl.includes('github.com')) {
      const parts = repoUrl.replace(/\.git$/, '').replace(/\/$/, '').split('/');
      targetOwner = parts[parts.length - 2];
      targetRepo = parts[parts.length - 1];
    } else {
      return res.status(400).json({ message: 'Valid repository full name (owner/repo) or URL required.' });
    }

    // Verify access to repo
    const repo = await githubService.getRepositoryDetails(user.githubAccessTokenEncrypted, targetOwner, targetRepo);

    // Setup webhook
    let webhookId = null;
    const webhookSecret = crypto.randomBytes(24).toString('hex');
    const apiBase = process.env.BACKEND_URL || (process.env.NODE_ENV === 'production' ? 'https://hire-my-skills.onrender.com' : 'http://localhost:5000');
    const webhookUrl = `${apiBase}/api/github/webhook/${project._id}`;

    try {
      const hookRes = await githubService.createRepositoryWebhook(
        user.githubAccessTokenEncrypted,
        repo.owner.login,
        repo.name,
        webhookUrl,
        webhookSecret
      );
      webhookId = hookRes?.id || null;
    } catch (hookErr) {
      console.warn('[WEBHOOK_CONNECT_WARN] Could not register automatic GitHub webhook:', hookErr.message);
    }

    project.githubRepo = repo.html_url;
    project.githubRepository = {
      id: repo.id,
      name: repo.name,
      fullName: repo.full_name,
      owner: repo.owner.login,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      defaultBranch: repo.default_branch || 'main',
      isPrivate: repo.private,
      description: repo.description || '',
      connectedAt: new Date(),
      connectedBy: req.user._id,
      webhookId,
      webhookSecret,
    };

    await project.save();

    // Post to chat
    await postGitSystemMessage(project._id, req.user._id, {
      type: 'repo_connected',
      title: `Connected existing GitHub repository: ${repo.full_name}`,
      description: `Linked to default branch '${repo.default_branch}'.`,
      url: repo.html_url,
      actor: {
        name: req.user.name,
        avatar: req.user.profilePicture,
        githubUsername: user.githubUsername || repo.owner.login,
      },
      action: 'connected',
    });

    res.json({
      message: 'Repository connected successfully!',
      repository: project.githubRepository,
      githubRepo: project.githubRepo,
    });
  } catch (err) {
    if (err.status === 404) {
      return res.status(404).json({ message: 'Repository not found on GitHub or you do not have administrative access.' });
    }
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Disconnect repository from project
 * @route   DELETE /api/github/projects/:projectId/disconnect-repo
 */
const disconnectProjectRepo = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can disconnect the repository.' });
    }

    const previousRepoName = project.githubRepository?.fullName || project.githubRepo;

    project.githubRepo = '';
    project.githubRepository = null;
    project.githubCollaborators = [];
    await project.save();

    await postGitSystemMessage(project._id, req.user._id, {
      type: 'repo_disconnected',
      title: `Disconnected repository: ${previousRepoName}`,
      description: 'The GitHub repository was disconnected from this project chat workspace.',
      actor: {
        name: req.user.name,
        avatar: req.user.profilePicture,
      },
      action: 'disconnected',
    });

    res.json({ success: true, message: 'Repository disconnected successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Grant repository collaborator access to a project team member
 * @route   POST /api/github/projects/:projectId/collaborators
 */
const grantCollaboratorAccess = async (req, res) => {
  try {
    const { projectId } = req.params;
    const { memberId, permission = 'push' } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can grant repository access.' });
    }

    if (!project.githubRepository?.fullName) {
      return res.status(400).json({ message: 'No GitHub repository is currently linked to this project.' });
    }

    // Verify target user is an active team member of this project
    const isTeamMember = project.members.some(m => m.toString() === memberId.toString());
    if (!isTeamMember) {
      return res.status(400).json({ message: 'The user is not a member of this project team.' });
    }

    const member = await User.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Team member not found' });

    if (!member.githubUsername) {
      return res.status(400).json({
        message: `${member.name} has not linked their GitHub account yet. Ask them to click "Connect GitHub" in chat.`,
        code: 'MEMBER_GITHUB_MISSING',
      });
    }

    // Owner credentials
    const ownerUser = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    if (!ownerUser?.githubAccessTokenEncrypted) {
      return res.status(400).json({ message: 'Please reconnect your GitHub account to manage permissions.' });
    }

    const [owner, repo] = project.githubRepository.fullName.split('/');

    // Call GitHub API to invite/add collaborator
    const ghRes = await githubService.addCollaborator(
      ownerUser.githubAccessTokenEncrypted,
      owner,
      repo,
      member.githubUsername,
      permission
    );

    // Update collaborator in project schema
    const existingIndex = project.githubCollaborators.findIndex(
      c => c.user.toString() === memberId.toString()
    );

    const collabRecord = {
      user: memberId,
      githubUsername: member.githubUsername,
      permission,
      status: ghRes?.id ? 'pending' : 'active',
      invitationId: ghRes?.id || null,
      invitedAt: new Date(),
    };

    if (existingIndex >= 0) {
      project.githubCollaborators[existingIndex] = collabRecord;
    } else {
      project.githubCollaborators.push(collabRecord);
    }

    await project.save();

    // Post to chat
    await postGitSystemMessage(project._id, req.user._id, {
      type: 'collaborator',
      title: `Granted ${permission} access to @${member.githubUsername}`,
      description: `${member.name} was granted '${permission}' repository access on GitHub.`,
      url: ghRes?.html_url || project.githubRepository.htmlUrl,
      actor: {
        name: req.user.name,
        avatar: req.user.profilePicture,
      },
      action: 'invited',
    });

    res.json({
      message: `Access invitation sent to @${member.githubUsername} on GitHub.`,
      collaborator: collabRecord,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Revoke repository collaborator access for a team member
 * @route   DELETE /api/github/projects/:projectId/collaborators/:memberId
 */
const revokeCollaboratorAccess = async (req, res) => {
  try {
    const { projectId, memberId } = req.params;

    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only the project creator can revoke repository access.' });
    }

    const member = await User.findById(memberId);
    if (!member) return res.status(404).json({ message: 'Member not found' });

    const ownerUser = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    if (!ownerUser?.githubAccessTokenEncrypted) {
      return res.status(400).json({ message: 'Please reconnect your GitHub account to manage permissions.' });
    }

    const [owner, repo] = project.githubRepository.fullName.split('/');

    if (member.githubUsername) {
      try {
        await githubService.removeCollaborator(ownerUser.githubAccessTokenEncrypted, owner, repo, member.githubUsername);
      } catch (ghErr) {
        console.warn('[COLLAB_REVOKE_WARN] GitHub removal warning:', ghErr.message);
      }
    }

    project.githubCollaborators = project.githubCollaborators.filter(
      c => c.user.toString() !== memberId.toString()
    );

    await project.save();

    await postGitSystemMessage(project._id, req.user._id, {
      type: 'collaborator',
      title: `Revoked repository access for @${member.githubUsername || member.name}`,
      description: `Repository access has been removed for ${member.name}.`,
      actor: {
        name: req.user.name,
        avatar: req.user.profilePicture,
      },
      action: 'revoked',
    });

    res.json({ success: true, message: 'Collaborator access revoked successfully.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    Get live commits & recent activity for project chat
 * @route   GET /api/github/projects/:projectId/commits
 */
const getProjectCommits = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const myId = req.user._id.toString();
    const isMember = project.creator.toString() === myId ||
      project.members.some(m => m.toString() === myId);

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view repository data' });
    }

    if (!project.githubRepository?.fullName && !project.githubRepo) {
      return res.json({ commits: [] });
    }

    let owner = project.githubRepository?.owner;
    let repo = project.githubRepository?.name;

    if (!owner || !repo) {
      const parts = project.githubRepo.replace(/\/$/, '').split('/');
      owner = parts[parts.length - 2];
      repo = parts[parts.length - 1];
    }

    // Try using user token first, otherwise owner token
    let user = await User.findById(req.user._id).select('+githubAccessTokenEncrypted');
    let token = user?.githubAccessTokenEncrypted;

    if (!token && project.githubRepository?.connectedBy) {
      const ownerUser = await User.findById(project.githubRepository.connectedBy).select('+githubAccessTokenEncrypted');
      token = ownerUser?.githubAccessTokenEncrypted;
    }

    let rawCommits = [];
    if (token) {
      try {
        rawCommits = await githubService.getRepositoryCommits(token, owner, repo, 15);
      } catch (err) {
        console.warn('[COMMITS_FETCH_WARN]', err.message);
      }
    }

    // Fallback to public GitHub fetch if token isn't available and repo is public
    if ((!rawCommits || rawCommits.length === 0) && owner && repo) {
      try {
        const publicRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=15`, {
          headers: { 'User-Agent': 'HireMySkills-Platform' }
        });
        if (publicRes.ok) {
          rawCommits = await publicRes.json();
        }
      } catch (_) {}
    }

    const commits = (rawCommits || []).map(c => ({
      sha: c.sha?.substring(0, 7),
      fullSha: c.sha,
      message: c.commit?.message?.split('\n')[0] || 'Commit',
      author: c.commit?.author?.name || c.author?.login || 'Contributor',
      avatar: c.author?.avatar_url || '',
      date: c.commit?.author?.date,
      url: c.html_url,
    }));

    res.json({
      repository: project.githubRepository,
      commits,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/**
 * @desc    GitHub Webhook receiver for push, pull_request, and issue events
 * @route   POST /api/github/webhook/:projectId
 */
const handleGitHubWebhook = async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await Project.findById(projectId).select('+githubRepository.webhookSecret');
    if (!project) return res.status(404).send('Project not found');

    const signature = req.headers['x-hub-signature-256'];
    const event = req.headers['x-github-event'];
    const payload = req.body;

    // Verify HMAC signature if secret exists
    if (project.githubRepository?.webhookSecret && signature) {
      const hmac = crypto.createHmac('sha256', project.githubRepository.webhookSecret);
      const rawBody = req.rawBody || JSON.stringify(payload);
      const digest = `sha256=${hmac.update(rawBody).digest('hex')}`;

      if (signature !== digest) {
        console.warn('[WEBHOOK_INVALID_SIGNATURE] Rejecting untrusted webhook event');
        return res.status(401).send('Invalid signature');
      }
    }

    const senderId = project.creator;

    if (event === 'push') {
      const branch = payload.ref ? payload.ref.replace('refs/heads/', '') : 'main';
      const commits = (payload.commits || []).slice(0, 5).map(c => ({
        sha: c.id?.substring(0, 7),
        message: c.message?.split('\n')[0],
        url: c.url,
      }));

      await postGitSystemMessage(project._id, senderId, {
        type: 'push',
        title: `Pushed ${payload.commits?.length || 1} commit(s) to [${branch}]`,
        description: commits[0]?.message || 'New commits pushed',
        url: payload.compare || payload.head_commit?.url || project.githubRepo,
        actor: {
          name: payload.pusher?.name || payload.sender?.login || 'Contributor',
          avatar: payload.sender?.avatar_url || '',
          githubUsername: payload.sender?.login || '',
        },
        branch,
        commitCount: payload.commits?.length || 1,
        commits,
        action: 'pushed',
      });
    } else if (event === 'pull_request') {
      const pr = payload.pull_request;
      const action = payload.action; // opened, closed, merged

      await postGitSystemMessage(project._id, senderId, {
        type: 'pull_request',
        title: `Pull Request #${pr.number} ${action}: ${pr.title}`,
        description: pr.body?.substring(0, 140) || `PR ${action} by @${payload.sender?.login}`,
        url: pr.html_url,
        actor: {
          name: payload.sender?.login || 'Contributor',
          avatar: payload.sender?.avatar_url || '',
          githubUsername: payload.sender?.login || '',
        },
        branch: pr.head?.ref,
        action,
      });
    } else if (event === 'issues') {
      const issue = payload.issue;
      const action = payload.action;

      await postGitSystemMessage(project._id, senderId, {
        type: 'issues',
        title: `Issue #${issue.number} ${action}: ${issue.title}`,
        description: issue.body?.substring(0, 140) || `Issue ${action} by @${payload.sender?.login}`,
        url: issue.html_url,
        actor: {
          name: payload.sender?.login || 'Contributor',
          avatar: payload.sender?.avatar_url || '',
          githubUsername: payload.sender?.login || '',
        },
        action,
      });
    }

    res.status(200).send('OK');
  } catch (err) {
    console.error('[WEBHOOK_HANDLER_ERROR]', err.message);
    res.status(500).send('Webhook processing error');
  }
};

module.exports = {
  getMyGitHubStatus,
  disconnectGitHub,
  getProjectGitHubStatus,
  listUserRepositories,
  createAndConnectRepo,
  connectExistingRepo,
  disconnectProjectRepo,
  grantCollaboratorAccess,
  revokeCollaboratorAccess,
  getProjectCommits,
  handleGitHubWebhook,
};
