import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const AdminProfile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({ name: user.name || '', universityName: user.universityName || '' });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess('');
    try {
      const { data } = await API.put('/admin/profile', formData);
      login({ ...user, ...data }, localStorage.getItem('hiresphere_token'));
      setSuccess('✓ Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h2>Profile</h2>

        <div className="code-card" style={{ marginTop: '1.5rem' }}>
          <div className="code-card-inner">
            <div>
              <h4>University Secret Code</h4>
              <p className="text-muted" style={{ fontSize: '0.82rem' }}>Share with students</p>
            </div>
            <div className="code-display">
              <span className="code-text">{user.universityCode}</span>
              <button className="btn btn-outline btn-small" onClick={() => navigator.clipboard.writeText(user.universityCode)}>Copy</button>
            </div>
          </div>
        </div>

        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>University Name</label>
            <input type="text" name="universityName" value={formData.universityName} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled />
          </div>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminProfile;
