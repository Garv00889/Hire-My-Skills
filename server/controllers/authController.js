const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register new user
// @route   POST /api/auth/register
const register = async (req, res) => {
  try {
    const { name, email, password, contactNumber, skills, githubLink, age } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    console.log(`[AUTH] Registration attempt for: ${normalizedEmail}`);

    // Check if user already exists
    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      console.log(`[AUTH] Registration rejected: email already registered: ${normalizedEmail}`);
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Parse skills if sent as string
    const skillsArray = typeof skills === 'string'
      ? skills.split(',').map(s => s.trim())
      : skills || [];

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      contactNumber,
      skills: skillsArray,
      githubLink,
      age,
    });

    console.log(`[AUTH] User registered successfully: ${user._id} (${user.email})`);

    const token = generateToken(user._id);

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      skills: user.skills,
      profilePicture: user.profilePicture,
      token,
    });
  } catch (error) {
    console.error(`[AUTH] Registration error: ${error.message}`);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log(`[AUTH] Login attempt for: ${email}`);

    if (!email || !password) {
      console.log('[AUTH] Login rejected: missing email or password in request body');
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    console.log(`[AUTH] User found: ${!!user}`);

    if (!user || !user.password) {
      console.log('[AUTH] Login failed: user not found or has no password set');
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    console.log(`[AUTH] Password match: ${isMatch}`);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    console.log(`[AUTH] Login success for: ${email}`);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      skills: user.skills,
      profilePicture: user.profilePicture,
      token,
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error.message);
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get current logged-in user
// @route   GET /api/auth/me
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update user profile & portfolio
// @route   PUT /api/auth/profile
const updateProfile = async (req, res) => {
  try {
    const {
      name, tagline, location, bio, contactNumber,
      skills, socialLinks, portfolioProjects, experience,
      certifications, education, profilePicture
    } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // IMPORTANT: Never allow password to be updated via this route.
    // Password changes must go through a dedicated /change-password endpoint.
    // This prevents accidental double-hashing of an already-hashed password.
    if (req.body.password) {
      return res.status(400).json({ message: 'Use the change-password endpoint to update your password.' });
    }

    if (name) user.name = name;
    if (tagline !== undefined) user.tagline = tagline;
    if (location !== undefined) user.location = location;
    if (bio !== undefined) user.bio = bio;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    if (profilePicture !== undefined) user.profilePicture = profilePicture;

    if (Array.isArray(skills)) user.skills = skills;
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };
    if (Array.isArray(portfolioProjects)) user.portfolioProjects = portfolioProjects;
    if (Array.isArray(experience)) user.experience = experience;
    if (Array.isArray(certifications)) user.certifications = certifications;
    if (Array.isArray(education)) user.education = education;

    const updatedUser = await user.save();
    const userResponse = updatedUser.toObject();
    delete userResponse.password;

    res.json(userResponse);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get public user profile/portfolio by ID
// @route   GET /api/auth/users/:userId
const getUserProfileById = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User profile not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { register, login, getMe, updateProfile, getUserProfileById };
