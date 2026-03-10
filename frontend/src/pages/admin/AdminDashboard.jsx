import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, companiesRes] = await Promise.all([
          API.get('/admin/students'),
          API.get('/companies'),
        ]);
        setStudents(studentsRes.data);
        setCompanies(companiesRes.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(user.universityCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p className="text-muted">{user.universityName} — Placement Dashboard</p>
        </div>
        <Link to="/admin/create-company" className="btn btn-primary">+ Add Company</Link>
      </div>

      {/* University Code Card */}
      <div className="code-card">
        <div className="code-card-inner">
          <div>
            <h3>University Secret Code</h3>
            <p className="text-muted">Share this code with students to join your placement pool</p>
          </div>
          <div className="code-display">
            <span className="code-text">{user.universityCode}</span>
            <button className="btn btn-outline btn-small" onClick={copyCode}>
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{students.length}</div>
          <div className="stat-label">Registered Students</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{companies.length}</div>
          <div className="stat-label">Company Drives</div>
        </div>
      </div>

      {/* Companies */}
      <div className="section">
        <h2>Company Drives</h2>
        {companies.length === 0 ? (
          <div className="empty-state">
            <p>No companies listed yet.</p>
            <Link to="/admin/create-company" className="btn btn-primary">Create your first company drive</Link>
          </div>
        ) : (
          <div className="cards-grid">
            {companies.map((company) => (
              <div key={company._id} className="company-card">
                <h3>{company.name}</h3>
                <p className="company-role">{company.role}</p>
                <p className="company-desc">{company.description.substring(0, 100)}...</p>
                <div className="company-meta">
                  <span>{company.formQuestions?.length || 0} questions</span>
                  <span>{new Date(company.createdAt).toLocaleDateString()}</span>
                </div>
                <Link to={`/admin/applications/${company._id}`} className="btn btn-outline btn-small">
                  View Applications
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students */}
      <div className="section">
        <h2>Registered Students ({students.length})</h2>
        {students.length === 0 ? (
          <div className="empty-state">
            <p>No students registered yet. Share your university code to get started!</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Resume</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => (
                  <tr key={student._id}>
                    <td>{index + 1}</td>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      {student.resume ? (
                        <a href={`http://localhost:3000/uploads/resumes/${student.resume}`} target="_blank" rel="noreferrer" className="link">
                          View
                        </a>
                      ) : (
                        <span className="text-muted">Not uploaded</span>
                      )}
                    </td>
                    <td>{new Date(student.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
