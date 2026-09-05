const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String },
  contactNumber: { type: String, default: '' },
  tagline: { type: String, default: '' }, // e.g. "Full Stack Developer & AI Enthusiast"
  location: { type: String, default: '' }, // e.g. "Mumbai, India"
  bio: { type: String, default: '' },
  skills: [{ type: String }],
  githubLink: { type: String, default: '' },
  age: { type: Number },
  profilePicture: { type: String, default: '' },
  socialLinks: {
    github: { type: String, default: '' },
    linkedin: { type: String, default: '' },
    portfolio: { type: String, default: '' },
    twitter: { type: String, default: '' },
    dribbble: { type: String, default: '' },
  },
  portfolioProjects: [{
    title: { type: String, required: true },
    description: { type: String, default: '' },
    liveLink: { type: String, default: '' },
    githubLink: { type: String, default: '' },
    tags: [{ type: String }],
  }],
  experience: [{
    title: { type: String, required: true }, // e.g. "Frontend Developer Intern"
    company: { type: String, default: '' }, // e.g. "TechCorp / College Team"
    duration: { type: String, default: '' }, // e.g. "Jan 2024 - Present"
    description: { type: String, default: '' },
  }],
  certifications: [{
    name: { type: String, required: true },
    issuer: { type: String, default: '' },
    issueDate: { type: String, default: '' },
    credentialUrl: { type: String, default: '' },
  }],
  education: [{
    institution: { type: String, required: true },
    degree: { type: String, default: '' },
    fieldOfStudy: { type: String, default: '' },
    year: { type: String, default: '' },
  }],
  googleId: { type: String },
  githubId: { type: String },
}, { timestamps: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return;
  this.password = await bcrypt.hash(this.password, 12);
});

// Compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
