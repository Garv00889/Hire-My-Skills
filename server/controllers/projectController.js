const Project = require('../models/Project');
const Notification = require('../models/Notification');

// @desc    Create a new project
// @route   POST /api/projects
const createProject = async (req, res) => {
  try {
    const {
      title, description, skillRequirements,
      deadlineStart, deadlineEnd, membersRequired,
      level, category, budget, currency, githubRepo
    } = req.body;

    const skillsArray = typeof skillRequirements === 'string'
      ? skillRequirements.split(',').map(s => s.trim())
      : skillRequirements || [];

    const project = await Project.create({
      title,
      description,
      skillRequirements: skillsArray,
      deadline: { start: deadlineStart, end: deadlineEnd },
      designFile: req.file ? req.file.path : '',
      membersRequired: membersRequired || 3,
      level: level || 'beginner',
      category: category || 'other',
      budget: budget || 0,
      currency: currency || 'INR',
      creator: req.user._id,
      members: [req.user._id],
      githubRepo: githubRepo || '',
    });

    await project.populate('creator', 'name email profilePicture');
    res.status(201).json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all projects with optional filters
// @route   GET /api/projects
const getProjects = async (req, res) => {
  try {
    const { search, category, level, page = 1, limit = 6 } = req.query;

    const query = { status: 'open' };
    if (category) query.category = category;
    if (level) query.level = level;
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { skillRequirements: { $in: [new RegExp(search, 'i')] } },
      ];
    }

    const total = await Project.countDocuments(query);
    const projects = await Project.find(query)
      .populate('creator', 'name email profilePicture')
      .populate('members', 'name profilePicture')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ projects, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a single project
// @route   GET /api/projects/:id
const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('creator', 'name email profilePicture skills')
      .populate('members', 'name email profilePicture skills');

    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a project
// @route   PUT /api/projects/:id
const updateProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this project' });
    }

    const updated = await Project.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a project
// @route   DELETE /api/projects/:id
const deleteProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get projects user is a member of (for chat)
// @route   GET /api/projects/mine
const getMyProjects = async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [{ members: req.user._id }, { creator: req.user._id }]
    })
      .populate('creator', 'name email profilePicture')
      .populate('members', 'name email profilePicture')
      .sort({ updatedAt: -1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Connect / update GitHub repository for a project (Creator only)
// @route   PUT /api/projects/:id/git
const updateGitRepo = async (req, res) => {
  try {
    const { githubRepo, repoName, repoOwner, defaultBranch } = req.body;
    const project = await Project.findById(req.params.id);

    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Only project creator can connect Git repository' });
    }

    project.githubRepo = githubRepo || project.githubRepo;
    project.gitDetails = {
      repoName: repoName || (githubRepo ? githubRepo.split('/').pop() : ''),
      repoOwner: repoOwner || (githubRepo ? githubRepo.split('/')[3] : ''),
      repoUrl: githubRepo || project.githubRepo,
      defaultBranch: defaultBranch || 'main',
    };

    await project.save();
    res.json({ message: 'Git repository connected successfully!', project });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get Git repository commits & status for project members
// @route   GET /api/projects/:id/commits
const getGitCommits = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // Ensure user is an authorized member or creator
    const isMember = project.members.some(m => m.toString() === req.user._id.toString()) ||
                     project.creator.toString() === req.user._id.toString();

    if (!isMember) {
      return res.status(403).json({ message: 'Not authorized to view repository data' });
    }

    // Try fetching live GitHub commits if repository URL exists
    let commits = [];
    if (project.githubRepo && project.githubRepo.includes('github.com')) {
      const parts = project.githubRepo.replace(/\/$/, '').split('/');
      const owner = parts[parts.length - 2];
      const repo = parts[parts.length - 1];

      if (owner && repo) {
        try {
          const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=5`, {
            headers: { 'User-Agent': 'HireMySkills-App' }
          });
          if (response.ok) {
            const rawCommits = await response.json();
            commits = rawCommits.map(c => ({
              sha: c.sha?.substring(0, 7),
              message: c.commit?.message,
              author: c.commit?.author?.name || c.author?.login || 'Contributor',
              date: c.commit?.author?.date,
              url: c.html_url
            }));
          }
        } catch (fetchErr) {
          // GitHub API rate-limit fallback
        }
      }
    }

    res.json({
      repoUrl: project.githubRepo || '',
      gitDetails: project.gitDetails || {},
      commits,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createProject, getProjects, getProjectById, updateProject,
  deleteProject, getMyProjects, updateGitRepo, getGitCommits
};
