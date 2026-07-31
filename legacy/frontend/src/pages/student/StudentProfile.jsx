import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const StudentProfile = () => {
  const { user, login } = useAuth();
  const [formData, setFormData] = useState({ name: user.name || '' });
  const [resume, setResume] = useState(null);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const currentResume = user.resume;

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setSuccess('');
    try {
      const fd = new FormData();
      fd.append('name', formData.name);
      if (resume) fd.append('resume', resume);
      const { data } = await API.put('/student/profile', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
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

        {success && <div className="alert alert-success" style={{ marginTop: '1rem' }}>{success}</div>}

        <form onSubmit={handleSubmit} style={{ marginTop: '1.5rem' }}>
          <div className="form-group">
            <label>Full Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled />
          </div>

          {currentResume && (
            <div className="current-resume">
              <p className="text-muted" style={{ fontSize: '0.85rem' }}>
                Current Resume: <a href={`http://localhost:3000/uploads/resumes/${currentResume}`} target="_blank" rel="noreferrer" className="link">View ↗</a>
              </p>
            </div>
          )}

          <div className="form-group">
            <label>{currentResume ? 'Update Resume' : 'Upload Resume'}</label>
            <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files[0])} className="file-input" />
          </div>

          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : '💾 Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentProfile;
