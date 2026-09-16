// HomePage.jsx: Modification to add back background circles and apply animations.
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

      {/* --- ADD NEW BACKGROUND BLUR CIRCLES FOR FLOATING EFFECT --- */}
      {/* Four distinct circles with different movements */}
      <div className="bg-glow glow-1" />
      <div className="bg-glow glow-2" />
      <div className="bg-glow glow-3" />
      <div className="bg-glow glow-4" /> {/* Extra circles for better depth */}

      <main className="home-main">
        {/* Main Content (Centered) */}
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
      </main>

      {/* Colleges strip (stationaty below hero) */}
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