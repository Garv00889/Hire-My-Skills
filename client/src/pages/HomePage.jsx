import { useNavigate } from 'react-router-dom';
import { Sparkles, Search, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import './HomePage.css';

const HomePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="home-page page-enter">
      <Navbar />

      <main className="home-main">
        {/* Left Content */}
        <div className="home-content">
          <div className="tagline-badge">
            <Sparkles size={13} color="var(--gold-dark)" /> Where Skills Connect, Ideas Grow
          </div>

          <h1 className="home-headline">
            Build together.<br />
            <span className="text-gold">Achieve more.</span>
          </h1>

          <p className="home-subtext">
            HireMySkill is the platform for students to hire, collaborate
            and contribute in real-world projects. Learn, build and grow
            together with trusted peers.
          </p>

          <div className="home-cta">
            <button
              id="btn-create-project"
              className="cta-primary"
              onClick={() => navigate('/create-project')}
            >
              <Sparkles size={18} />
              Create Project
              <ArrowRight size={16} />
            </button>

            <button
              id="btn-explore-projects"
              className="cta-secondary"
              onClick={() => navigate('/explore')}
            >
              <Search size={18} />
              Explore Projects
              <ArrowRight size={16} />
            </button>
          </div>
        </div>

        {/* Right — Hero Visual */}
        <div className="home-visual">
          <div className="visual-circle" />

          {/* Project Card Floating */}
          <div className="floating-card project-card-preview">
            <div className="project-card-header">
              <span className="badge badge-blue">AI Study Assistant</span>
              <span className="badge badge-gold">In Progress</span>
            </div>
            <div className="member-avatars">
              {['A', 'B', 'C', 'D'].map((l, i) => (
                <div key={i} className="mini-avatar" style={{ marginLeft: i > 0 ? -8 : 0 }}>{l}</div>
              ))}
              <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 6 }}>+3</span>
            </div>
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-secondary)' }}>Collaborating as a team</span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>70%</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: '70%' }} />
              </div>
            </div>
          </div>

          {/* Chat Notification Floating */}
          <div className="floating-card chat-notif-preview">
            <div className="mini-avatar">J</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600 }}>New message</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)' }}>Project Team</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                Let's finalize the UI/UX flow today.
              </p>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>2m ago</span>
          </div>

          {/* Stats badge */}
          <div className="floating-card stats-badge">
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)' }}>25K+</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Students<br />Trust Us</div>
          </div>
        </div>
      </main>

      {/* College Logos strip */}
      <div className="colleges-strip">
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 20 }}>Trusted by students from</p>
        <div className="college-logos">
          {['IIT BOMBAY', 'NIT TRICHY', 'IIIT BANGALORE', 'BITS PILANI', 'DTU DELHI'].map(c => (
            <div key={c} className="college-item">
              <div className="college-logo-placeholder" />
              <span>{c}</span>
            </div>
          ))}
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>and many more</span>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
