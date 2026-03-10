import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const StudentProfile = () => {
  const { user, login } = useAuth();
  const [name, setName] = useState('');
  const [resume, setResume] = useState(null);
  const [currentResume, setCurrentResume] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await API.get('/student/profile');
        setName(data.name);
        setCurrentResume(data.resume || '');
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
      const formData = new FormData();
      formData.append('name', name);
      if (resume) {
        formData.append('resume', resume);
      }

      const { data } = await API.put('/student/profile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      login(
        { ...user, name: data.name },
        JSON.parse(localStorage.getItem('hiresphere_user')).token
      );
      setCurrentResume(data.resume || '');
      setSuccess('Profile updated successfully!');
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card">
        <h2>Student Profile</h2>
        <p className="text-muted">Manage your account and resume</p>

        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={user.email} disabled className="input-disabled" />
          </div>
          <div className="form-group">
            <label>University Code</label>
            <input type="text" value={user.universityCode} disabled className="input-disabled" />
          </div>

          <div className="form-group">
            <label>Resume</label>
            {currentResume && (
              <div className="current-resume">
                <a
                  href={`http://localhost:3000/uploads/resumes/${currentResume}`}
                  target="_blank"
                  rel="noreferrer"
                  className="link"
                >
                  📄 View Current Resume
                </a>
              </div>
            )}
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setResume(e.target.files[0])}
              className="file-input"
            />
            <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
              Upload a new resume to replace the current one.
            </p>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default StudentProfile;
