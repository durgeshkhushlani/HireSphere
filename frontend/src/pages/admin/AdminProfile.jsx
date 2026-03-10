import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const AdminProfile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({ name: '', universityName: '' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('/admin/profile');
        setFormData({ name: data.name, universityName: data.universityName });
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };
    fetchProfile();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess('');
    try {
      const { data } = await API.put('/admin/profile', formData);
      login({ ...user, name: data.name, universityName: data.universityName }, JSON.parse(localStorage.getItem('hiresphere_user')).token);
      setSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(user.universityCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h2>Admin Profile</h2>
        <p className="text-muted">Manage your account details</p>

        <div className="code-card" style={{ marginBottom: '1.5rem' }}>
          <div className="code-card-inner">
            <div>
              <h4>University Secret Code</h4>
            </div>
            <div className="code-display">
              <span className="code-text">{user.universityCode}</span>
              <button className="btn btn-outline btn-small" onClick={copyCode}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>
        </div>

        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>University Name</label>
            <input type="text" value={formData.universityName} onChange={(e) => setFormData({ ...formData, universityName: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled className="input-disabled" />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;
