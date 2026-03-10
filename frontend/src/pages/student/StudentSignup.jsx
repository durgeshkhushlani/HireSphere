import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const StudentSignup = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    universityCode: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await API.post('/auth/student/signup', formData);
      login(data.user, data.token);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2><span className="brand-icon">◆</span> Student Signup</h2>
        <p className="auth-subtitle">Join your university's placement pool</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter your name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="student@email.com" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="Min 6 characters" />
          </div>
          <div className="form-group">
            <label>University Secret Code</label>
            <input type="text" name="universityCode" value={formData.universityCode} onChange={handleChange} required placeholder="Enter code from your placement cell" className="code-input" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Join Placement Pool'}
          </button>
        </form>
        <p className="auth-footer">
          Already registered? <Link to="/student/login">Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default StudentSignup;
