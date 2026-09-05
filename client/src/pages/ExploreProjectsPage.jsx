import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search, Bookmark, Users, Clock, Briefcase, IndianRupee,
  Monitor, ArrowRight, Check, X, Calendar, TrendingUp, Zap,
  Target, ChevronDown, Layers, ExternalLink, Send
} from 'lucide-react';
import Navbar from '../components/Navbar';
import ProjectDetailsModal from '../components/ProjectDetailsModal';
import { getProjects, applyToProject } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './ExploreProjectsPage.css';

const SKILLS_LIST = [
  'React.js',
  'Node.js',
  'UI/UX Design',
  'Python',
  'MongoDB',
  'TypeScript',
  'TailwindCSS',
  'Next.js',
  'AI/ML',
  'Firebase'
];

const ExploreProjectsPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedProject, setSelectedProject] = useState(null);
  const [fullDetailsProject, setFullDetailsProject] = useState(null);

  const [applyMessage, setApplyMessage] = useState('');
  const [applying, setApplying] = useState(false);
  const [activeTab, setActiveTab] = useState('all');

  const [filters, setFilters] = useState({
    skills: [],
    type: 'All',
    level: 'All',
    budgetMin: 0,
    budgetMax: 200000,
  });

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (filters.level !== 'All') params.level = filters.level.toLowerCase();
      if (filters.type !== 'All') params.category = filters.type.toLowerCase();

      const response = await getProjects(params);
      const projectData = response?.data?.projects || [];
      setProjects(projectData);

      if (projectData.length > 0) {
        setSelectedProject(projectData[0]);
      } else {
        setSelectedProject(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to fetch projects');
      setProjects([]);
      setSelectedProject(null);
    } finally {
      setLoading(false);
    }
  }, [search, filters.level, filters.type]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProjects();
  };

  const toggleSkill = (skill) => {
    setFilters((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const clearFilters = () => {
    setFilters({
      skills: [],
      type: 'All',
      level: 'All',
      budgetMin: 0,
      budgetMax: 200000,
    });
    setSearch('');
  };

  const handleApply = async () => {
    if (!selectedProject?._id) {
      toast.error('Please select a project first');
      return;
    }
    if (!user) {
      toast.error('Please login to apply');
      navigate('/login');
      return;
    }

    setApplying(true);
    try {
      await applyToProject(selectedProject._id, { message: applyMessage.trim() });
      toast.success('Application submitted successfully.');
      setApplyMessage('');
      fetchProjects();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleOpenFullDetails = (proj) => {
    const p = proj || selectedProject;
    if (!p) {
      toast.error('Project not selected');
      return;
    }
    setFullDetailsProject(p);
  };

  const getFilteredProjects = () => {
    return projects.filter((p) => {
      // Skills filter
      if (filters.skills.length > 0) {
        const pSkills = Array.isArray(p.skillRequirements)
          ? p.skillRequirements.map((s) => s.toLowerCase())
          : [];
        const matchesSkill = filters.skills.some((s) =>
          pSkills.includes(s.toLowerCase())
        );
        if (!matchesSkill) return false;
      }
      // Budget filter
      if (p.budget && p.budget > filters.budgetMax) return false;

      // Tab filter
      if (activeTab === 'ending') {
        if (!p.deadline?.end) return false;
        const daysLeft = (new Date(p.deadline.end) - new Date()) / (1000 * 60 * 60 * 24);
        return daysLeft >= 0 && daysLeft <= 14;
      }

      return true;
    });
  };

  const filteredList = getFilteredProjects();

  return (
    <div className="explore-page page-enter">
      <Navbar />

      <div className="explore-layout">
        {/* ================= LEFT FILTERS SIDEBAR ================= */}
        <aside className="explore-sidebar">
          <div className="filter-header">
            <h3>Filters</h3>
            <button className="clear-btn" onClick={clearFilters}>
              Clear all
            </button>
          </div>

          {/* Skills Filter */}
          <div className="filter-section">
            <h4>Skills</h4>
            <div className="checkbox-list">
              {SKILLS_LIST.map((skill) => (
                <label key={skill} className="checkbox-item">
                  <input
                    type="checkbox"
                    checked={filters.skills.includes(skill)}
                    onChange={() => toggleSkill(skill)}
                  />
                  <span>{skill}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Project Type */}
          <div className="filter-section">
            <h4>Category</h4>
            <div className="pill-group">
              {['All', 'Webdev', 'AI', 'UI/UX', 'Business', 'Corporate', 'Other'].map(
                (type) => (
                  <button
                    key={type}
                    className={`filter-pill ${
                      filters.type.toLowerCase() === type.toLowerCase() ? 'active' : ''
                    }`}
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        type: type === 'All' ? 'All' : type,
                      }))
                    }
                  >
                    {type}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Budget Range */}
          <div className="filter-section">
            <h4>Max Budget</h4>
            <div className="budget-slider">
              <input
                type="range"
                min="0"
                max="200000"
                step="5000"
                value={filters.budgetMax}
                onChange={(e) =>
                  setFilters((prev) => ({
                    ...prev,
                    budgetMax: Number(e.target.value),
                  }))
                }
              />
              <div className="budget-labels">
                <span>Rs. 0</span>
                <span>Rs. {filters.budgetMax.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Experience Level */}
          <div className="filter-section">
            <h4>Experience Level</h4>
            <div className="pill-group">
              {['All', 'Beginner', 'Intermediate', 'Advanced'].map((lvl) => (
                <button
                  key={lvl}
                  className={`filter-pill ${
                    filters.level.toLowerCase() === lvl.toLowerCase() ? 'active' : ''
                  }`}
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      level: lvl === 'All' ? 'All' : lvl,
                    }))
                  }
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* ================= CENTER PROJECT LIST ================= */}
        <main className="explore-center">
          {/* Search Header */}
          <form className="explore-search" onSubmit={handleSearchSubmit}>
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search projects by title, skills or keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="btn-primary" style={{ padding: '7px 16px', fontSize: 13, borderRadius: 99 }}>
              Search
            </button>
          </form>

          {/* Explore Heading */}
          <div className="explore-header">
            <h2>Explore Projects</h2>
            <p>Discover and join exciting real-world projects from creators and peers.</p>
          </div>

          {/* Filter Tabs (Zero Emojis) */}
          <div className="tab-group">
            <button
              className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All Projects
            </button>
            <button
              className={`tab-btn ${activeTab === 'trending' ? 'active' : ''}`}
              onClick={() => setActiveTab('trending')}
            >
              <TrendingUp size={14} /> Trending
            </button>
            <button
              className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
              onClick={() => setActiveTab('recent')}
            >
              <Clock size={14} /> Recently Added
            </button>
            <button
              className={`tab-btn ${activeTab === 'ending' ? 'active' : ''}`}
              onClick={() => setActiveTab('ending')}
            >
              <Zap size={14} /> Ending Soon
            </button>
          </div>

          {/* Projects Grid */}
          {loading ? (
            <div className="project-grid">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="project-card skeleton-card">
                  <div className="skeleton" style={{ height: 18, width: '40%', marginBottom: 12 }} />
                  <div className="skeleton" style={{ height: 22, width: '80%', marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 14, width: '100%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 16 }} />
                  <div className="skeleton" style={{ height: 32, width: '100%' }} />
                </div>
              ))}
            </div>
          ) : filteredList.length === 0 ? (
            <div className="no-rooms-state" style={{ padding: '60px 20px', background: '#fff', borderRadius: 20 }}>
              <Layers size={36} color="var(--gold)" />
              <p style={{ fontSize: 16, marginTop: 8 }}>No projects found</p>
              <small>Try adjusting your search criteria or clear your filters to see more projects.</small>
              <button className="btn-secondary" style={{ marginTop: 16 }} onClick={clearFilters}>
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="project-grid">
              {filteredList.map((p) => {
                const skills = Array.isArray(p.skillRequirements) ? p.skillRequirements : [];
                const members = Array.isArray(p.members) ? p.members : [];
                const isSelected = selectedProject?._id === p._id;

                return (
                  <div
                    key={p._id}
                    className={`project-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedProject(p)}
                  >
                    <div className="project-card-top">
                      <div className="project-icon">
                        {p.category === 'webdev' ? <Monitor size={16} /> : <Briefcase size={16} />}
                      </div>
                      <span className="project-category">{p.category || 'Development'}</span>
                      <span className={`proj-modal-level-badge`} style={{ marginLeft: 'auto', fontSize: 10.5 }}>
                        {p.level || 'Beginner'}
                      </span>
                    </div>

                    <h3 className="project-title">{p.title || 'Untitled Project'}</h3>

                    <p className="project-desc">
                      {p.description && p.description.length > 95
                        ? `${p.description.substring(0, 95)}...`
                        : p.description || 'No description.'}
                    </p>

                    {/* Skill Tags */}
                    <div className="skill-tags">
                      {skills.slice(0, 3).map((s, idx) => (
                        <span key={idx} className="skill-tag">
                          {s}
                        </span>
                      ))}
                      {skills.length > 3 && (
                        <span className="skill-tag">+{skills.length - 3}</span>
                      )}
                    </div>

                    {/* Card Bottom Meta */}
                    <div className="project-card-bottom">
                      <div className="member-avatars">
                        {members.slice(0, 3).map((m, idx) => {
                          const mPic = m?.profilePicture;
                          const mInitial = m?.name?.[0]?.toUpperCase() || '?';
                          return (
                            <div
                              key={idx}
                              className="mini-avatar"
                              style={{ marginLeft: idx > 0 ? -8 : 0 }}
                              title={m?.name || 'Member'}
                            >
                              {mPic ? <img src={mPic} alt="" /> : mInitial}
                            </div>
                          );
                        })}
                        <span className="card-members-count">
                          {members.length}/{p.membersRequired || 3} Members
                        </span>
                      </div>

                      <div className="project-budget">
                        <IndianRupee size={13} />
                        <span>{p.budget?.toLocaleString() || 0}</span>
                      </div>
                    </div>

                    {/* Action Button inside card */}
                    <button
                      type="button"
                      className="card-details-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenFullDetails(p);
                      }}
                    >
                      <span>View Full Details</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ================= RIGHT PREVIEW PANEL ================= */}
        {selectedProject && (
          <aside className="explore-details">
            <div className="details-header">
              <div className="project-icon lg">
                <Monitor size={22} />
              </div>
              <span className="project-category">{selectedProject.category || 'Development'}</span>
              <div className="details-actions">
                <button
                  type="button"
                  onClick={() => handleOpenFullDetails(selectedProject)}
                  title="Expand to Full Screen View"
                >
                  <ExternalLink size={16} />
                </button>
                <button type="button" onClick={() => setSelectedProject(null)} title="Close Panel">
                  <X size={16} />
                </button>
              </div>
            </div>

            <h2 className="details-title">{selectedProject.title}</h2>
            <p className="details-desc">{selectedProject.description}</p>

            {/* Creator Card */}
            <div className="creator-info">
              <div className="avatar">
                {selectedProject.creator?.profilePicture ? (
                  <img src={selectedProject.creator.profilePicture} alt="" />
                ) : (
                  selectedProject.creator?.name?.[0]?.toUpperCase() || 'C'
                )}
              </div>
              <div>
                <p className="posted-by">Project Creator</p>
                <p className="creator-name">{selectedProject.creator?.name || 'Anonymous'}</p>
              </div>
            </div>

            {/* Skills */}
            <div className="details-section">
              <h3>Required Skills</h3>
              <div className="skill-tags">
                {(selectedProject.skillRequirements || []).map((s, idx) => (
                  <span key={idx} className="skill-tag">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Project Info */}
            <div className="details-grid-3">
              <div className="info-box">
                <p className="info-label">Required Team</p>
                <p className="info-value">
                  <Users size={14} /> {selectedProject.members?.length || 0}/
                  {selectedProject.membersRequired || 3}
                </p>
              </div>
              <div className="info-box">
                <p className="info-label">Level</p>
                <p className="info-value" style={{ textTransform: 'capitalize' }}>
                  <Clock size={14} /> {selectedProject.level || 'Beginner'}
                </p>
              </div>
              <div className="info-box">
                <p className="info-label">Budget</p>
                <p className="info-value">
                  <IndianRupee size={14} /> {selectedProject.budget?.toLocaleString() || 0}
                </p>
              </div>
            </div>

            {/* Application Section */}
            <div className="apply-section">
              <input
                type="text"
                className="apply-input"
                placeholder="Why are you a good fit? (Optional pitch note)"
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
              />

              <button
                type="button"
                className="btn-primary apply-btn"
                onClick={() => handleOpenFullDetails(selectedProject)}
              >
                <span>View Full Project Details</span>
                <ArrowRight size={14} />
              </button>

              <button
                type="button"
                className="btn-secondary apply-btn"
                onClick={handleApply}
                disabled={applying}
              >
                <Send size={14} />
                <span>{applying ? 'Submitting...' : 'Apply to Join'}</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Full Project Details Modal */}
      {fullDetailsProject && (
        <ProjectDetailsModal
          project={fullDetailsProject}
          onClose={() => setFullDetailsProject(null)}
          onApplied={() => {
            fetchProjects();
          }}
        />
      )}
    </div>
  );
};

export default ExploreProjectsPage;