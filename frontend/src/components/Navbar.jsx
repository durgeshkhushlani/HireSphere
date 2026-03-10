import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
          <span className="brand-icon">◆</span> HireSphere
        </Link>
      </div>
      <div className="navbar-links">
        {user.role === 'admin' && (
          <>
            <Link to="/admin/dashboard">Dashboard</Link>
            <Link to="/admin/create-company">Add Company</Link>
            <Link to="/admin/profile">Profile</Link>
          </>
        )}
        {user.role === 'student' && (
          <>
            <Link to="/student/dashboard">Companies</Link>
            <Link to="/student/profile">Profile</Link>
          </>
        )}
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
};

export default Navbar;
