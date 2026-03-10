import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';

const LandingPage = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="landing-page">
      <div className="landing-bg-shapes">
        <div className="shape shape-1"></div>
        <div className="shape shape-2"></div>
        <div className="shape shape-3"></div>
      </div>

      <div className="landing-nav">
        <div className="landing-logo">
          <span className="brand-icon">◆</span> HireSphere
        </div>
        <button className="btn-theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>

      <div className="landing-hero">
        <h1 className="landing-title">
          campus<br />
          placements,<br />
          <span className="gradient-text">simplified.</span>
        </h1>
        <p className="landing-desc">
          One platform for admins to manage company drives and students to discover, apply, and track — effortlessly.
        </p>
      </div>

      <div className="landing-cards">
        <div className="role-card">
          <div className="role-icon">🎓</div>
          <h3>Student</h3>
          <p>Browse companies, submit applications, and track your placement journey.</p>
          <div className="role-actions">
            <Link to="/student/login" className="btn btn-primary">Login</Link>
            <Link to="/student/signup" className="btn btn-outline">Sign Up</Link>
          </div>
        </div>

        <div className="role-card">
          <div className="role-icon">🏛️</div>
          <h3>Placement Admin</h3>
          <p>Create drives, manage student pools, and download applications.</p>
          <div className="role-actions">
            <Link to="/admin/login" className="btn btn-primary">Login</Link>
            <Link to="/admin/signup" className="btn btn-outline">Sign Up</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
