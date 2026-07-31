import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="landing-page" style={{ justifyContent: 'center', minHeight: 'calc(100vh - 70px)' }}>
      <div className="landing-bg-shapes">
        <div className="shape shape-1" style={{ background: 'var(--error)' }}></div>
        <div className="shape shape-2" style={{ background: 'var(--warning)' }}></div>
      </div>
      
      <div className="landing-hero" style={{ zIndex: 1, textAlign: 'center', marginTop: '0' }}>
        <h1 className="landing-title" style={{ fontSize: 'clamp(4rem, 12vw, 8rem)', marginBottom: '1rem', color: 'var(--accent)' }}>
          404
        </h1>
        <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', fontFamily: "'Space Grotesk', sans-serif" }}>
          Lost in the Sphere?
        </h2>
        <p className="landing-desc" style={{ marginBottom: '2.5rem' }}>
          We couldn't find the page you're looking for. It might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        <Link to="/" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
          Take Me Home 🚀
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
