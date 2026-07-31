import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const AdminSignup = () => {
  const [formData, setFormData] = useState({ name: '', universityName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const { data } = await API.post('/auth/admin/signup', formData);
      login(data.user, data.token);
      navigate('/admin/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Signup failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2>Admin Signup</h2>
        <p className="auth-subtitle">Register your university placement cell</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="Enter your name" />
          </div>
          <div className="form-group">
            <label>University Name</label>
            <input type="text" name="universityName" value={formData.universityName} onChange={handleChange} required placeholder="Enter university name" />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} required placeholder="admin@university.edu" />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" name="password" value={formData.password} onChange={handleChange} required minLength={6} placeholder="Min 6 characters" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Account...' : 'Create Admin Account'}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/admin/login">Login here</Link></p>
      </div>
    </div>
  );
};

export default AdminSignup;
