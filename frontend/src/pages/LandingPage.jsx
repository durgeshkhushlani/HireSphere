import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import Typewriter from 'typewriter-effect';

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
          <span className="typewriter-wrapper">
            <Typewriter
              onInit={(typewriter) => {
                typewriter
                  .typeString('<span style="color: var(--text-2)">chaotic...</span>')
                  .pauseFor(1200)
                  .deleteAll(30)
                  .typeString('<span style="color: var(--text-2)">spreadsheets...</span>')
                  .pauseFor(1200)
                  .deleteAll(30)
                  .typeString('<span style="color: var(--text-2)">stressful...</span>')
                  .pauseFor(1200)
                  .deleteAll(30)
                  .typeString('<span class="gradient-text">simplified.</span>')
                  .start();
              }}
              options={{
                delay: 65,
                deleteSpeed: 35,
                cursor: '|',
                wrapperClassName: 'typewriter-text',
                cursorClassName: 'typewriter-cursor',
              }}
            />
          </span>
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

      <footer className="landing-footer" style={{ textAlign: 'center', marginTop: '4rem', paddingBottom: '2rem', color: 'var(--text-3)', fontSize: '0.9rem', zIndex: 1, position: 'relative', width: '100%' }}>
        <p>made with ❤️</p>
        <p>Author: Durgesh Khushlani</p>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <a href="https://github.com/durgeshkhushlani" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>GitHub</a>
          <a href="https://www.linkedin.com/in/durgesh-khushlani-912366324/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: '500' }}>LinkedIn</a>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
