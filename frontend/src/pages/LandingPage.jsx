import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <div className="landing-hero">
        <div className="hero-glow"></div>
        <h1 className="landing-title">
          <span className="brand-icon">◆</span> HireSphere
        </h1>
        <p className="landing-subtitle">
          Campus Placement Management Platform
        </p>
        <p className="landing-desc">
          Streamline your university's placement process. Admins manage drives, students apply seamlessly — all in one place.
        </p>

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

          <div className="role-card admin-card">
            <div className="role-icon">🏛️</div>
            <h3>Placement Admin</h3>
            <p>Create company drives, manage student pools, and download applications.</p>
            <div className="role-actions">
              <Link to="/admin/login" className="btn btn-primary">Login</Link>
              <Link to="/admin/signup" className="btn btn-outline">Sign Up</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
