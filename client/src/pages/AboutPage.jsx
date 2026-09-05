import { useNavigate } from 'react-router-dom';
import {
  Sparkles, Users, Search, CheckCircle2, MessageSquare,
  ShieldCheck, Rocket, Heart, Award, ArrowRight, Layers,
  Code, Zap, Compass, Target, Eye, UserCheck
} from 'lucide-react';
import Navbar from '../components/Navbar';
import './AboutPage.css';

// Inline brand icon
const GithubIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
  </svg>
);

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="about-page-wrapper">
      <Navbar />

      <main className="about-container page-enter">
        {/* Hero Section */}
        <section className="about-hero-card">
          <div className="hero-glow-accent" />
          <div className="about-badge-pill">
            <Sparkles size={14} color="var(--gold-dark)" /> About HireMySkills Platform
          </div>
          <h1 className="about-hero-title">
            Connecting Talent.<br />
            <span className="text-gold">Building Real-World Projects.</span>
          </h1>
          <p className="about-hero-subtext">
            HireMySkills is an all-in-one collaborative platform designed for students, developers, designers, and creators to discover teammates, showcase portfolios, review candidate applications, and build impactful projects together.
          </p>

          <div className="about-hero-actions">
            <button className="btn-primary hero-btn" onClick={() => navigate('/explore')}>
              Explore Projects <ArrowRight size={16} />
            </button>
            <button className="btn-secondary hero-btn" onClick={() => navigate('/create-project')}>
              Post a Project
            </button>
          </div>
        </section>

        {/* What the Platform Is */}
        <section className="about-section-grid-2">
          <div className="glass-card-about">
            <div className="about-icon-box gold">
              <Compass size={22} />
            </div>
            <h2>What is HireMySkills?</h2>
            <p>
              Many talented individuals struggle to find reliable collaborators for hackathons, college projects, or open-source software. At the same time, project creators find it difficult to evaluate candidates based on real skills.
            </p>
            <p>
              HireMySkills solves this by creating a <strong>unified collaboration ecosystem</strong>. Creators post projects, candidates apply with interactive portfolios, and creators shortlist top talent—leading straight into real-time team chat and shared Git development.
            </p>
          </div>

          <div className="glass-card-about">
            <div className="about-icon-box blue">
              <ShieldCheck size={22} />
            </div>
            <h2>Privacy & Candidate Evaluation</h2>
            <p>
              We enforce strict <strong>minimum-necessary information privacy</strong>. Project creators evaluate candidates through verified technical skills, past work, and GitHub projects—without exposing unnecessary personal data.
            </p>
            <p>
              Once a candidate is shortlisted and selected, they automatically unlock dedicated project team access, real-time group chat, and shared Git repository collaboration.
            </p>
          </div>
        </section>

        {/* How It Works Workflow */}
        <section className="workflow-section">
          <div className="section-header-center">
            <span className="section-chip">Seamless 6-Step Journey</span>
            <h2>How HireMySkills Works</h2>
            <p>From idea to team formation and Git commit code execution.</p>
          </div>

          <div className="workflow-steps-grid">
            {[
              { step: '01', title: 'Build Profile', desc: 'Create your portfolio showcasing skills, GitHub projects, and past experience.', icon: Code },
              { step: '02', title: 'Post / Discover', desc: 'Explore active student projects or post your own project with required skills.', icon: Search },
              { step: '03', title: 'Apply & Pitch', desc: 'Apply to projects with a custom pitch note linking your profile data.', icon: Zap },
              { step: '04', title: 'Review & Shortlist', desc: 'Creators evaluate candidates in Application Review and shortlist top matches.', icon: UserCheck },
              { step: '05', title: 'Team Group Chat', desc: 'Selected candidates join project team chat for instant collaboration.', icon: MessageSquare },
              { step: '06', title: 'Git Collaboration', desc: 'Connect GitHub repos, track commit progress, and ship real applications.', icon: GithubIcon },
            ].map((s, idx) => {
              const IconComp = s.icon;
              return (
                <div key={idx} className="workflow-card">
                  <span className="workflow-step-num">{s.step}</span>
                  <div className="workflow-card-icon">
                    <IconComp size={20} />
                  </div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Key Features Grid */}
        <section className="features-section">
          <div className="section-header-center">
            <span className="section-chip">Platform Capabilities</span>
            <h2>Key Platform Features</h2>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="f-icon"><Layers size={20} /></div>
              <h3>Project Discovery</h3>
              <p>Filter projects by skills, category, experience level, budget, and deadline.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon"><Code size={20} /></div>
              <h3>Interactive Portfolios</h3>
              <p>Showcase past projects, live demos, skills badges, and work timeline easily.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon"><CheckCircle2 size={20} /></div>
              <h3>Application Review</h3>
              <p>Shortlist or decline applicants with clean candidate profiles and privacy safeguards.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon"><MessageSquare size={20} /></div>
              <h3>Real-Time Group Chat</h3>
              <p>Instant socket-driven project workspace chat with file attachment support.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon"><GithubIcon size={20} /></div>
              <h3>Git Repository Integration</h3>
              <p>Connect GitHub repos, monitor team commit updates, and manage codebase history.</p>
            </div>
            <div className="feature-card">
              <div className="f-icon"><ShieldCheck size={20} /></div>
              <h3>Secure Access Control</h3>
              <p>Strict authorization ensures only shortlisted team members access project groups.</p>
            </div>
          </div>
        </section>

        {/* Mission & Vision Section */}
        <section className="mission-vision-grid">
          <div className="mission-card">
            <div className="mv-header">
              <Target size={24} color="var(--gold-dark)" />
              <h2>Our Mission</h2>
            </div>
            <p>
              To empower every student and skilled individual to find the right teammates, build proof-of-work portfolios, and turn innovative ideas into real-world software products.
            </p>
          </div>

          <div className="vision-card">
            <div className="mv-header">
              <Eye size={24} color="var(--gold-dark)" />
              <h2>Our Vision</h2>
            </div>
            <p>
              To build the ultimate global collaborative ecosystem where talent is recognized by real output, teams form frictionlessly, and project building is accessible to all creators.
            </p>
          </div>
        </section>

        {/* Footer CTA */}
        <section className="about-footer-cta">
          <h2>Ready to Build Something Amazing?</h2>
          <p>Join thousands of students and creators building the future together.</p>
          <div className="flex-center gap-12" style={{ marginTop: 20 }}>
            <button className="btn-primary" onClick={() => navigate('/explore')}>
              Explore Open Projects <ArrowRight size={16} />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default AboutPage;
