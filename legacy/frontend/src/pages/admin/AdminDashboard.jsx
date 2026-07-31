import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import API from '../../services/api';

const AdminDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [studentsRes, companiesRes] = await Promise.all([
          API.get('/admin/students'),
          API.get('/companies'),
        ]);
        setStudents(studentsRes.data);
        setCompanies(companiesRes.data);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Welcome, {user.name}</h1>
          <p className="text-muted">{user.universityName} — Placement Dashboard</p>
        </div>
        <div className="header-actions">
          <Link to="/admin/create-company" className="btn btn-primary">+ Add Company</Link>
        </div>
      </div>

      {/* University Code Card */}
      <div className="code-card">
        <div className="code-card-inner">
          <div>
            <h4>University Secret Code</h4>
            <p className="text-muted" style={{ fontSize: '0.82rem' }}>Share this with students to join your placement pool</p>
          </div>
          <div className="code-display">
            <span className="code-text">{user.universityCode}</span>
            <button className="btn btn-outline btn-small" onClick={() => { navigator.clipboard.writeText(user.universityCode); }}>Copy</button>
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
        <div className="stat-card">
          <div className="stat-number">{companies.filter(c => c.lastDate && new Date(c.lastDate) > new Date()).length}</div>
          <div className="stat-label">Active Deadlines</div>
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
              <div key={company._id} className="company-card clickable" onClick={() => navigate(`/admin/company/${company._id}`)}>
                <h3>{company.name}</h3>
                <p className="company-role">{company.role}</p>
                <p className="company-desc">{company.description?.substring(0, 120)}...</p>
                <div className="company-meta">
                  {company.lastDate && (
                    <span className="deadline-tag">📅 {new Date(company.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  )}
                  <span>{company.formQuestions?.length || 0} questions</span>
                </div>
                <div className="company-card-actions">
                  <Link to={`/admin/applications/${company._id}`} className="btn btn-outline btn-small" onClick={(e) => e.stopPropagation()}>View Applications</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Students Table */}
      <div className="section">
        <h2>Registered Students ({students.length})</h2>
        {students.length === 0 ? (
          <div className="empty-state"><p>No students registered yet. Share your university code!</p></div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Name</th><th>Email</th><th>Resume</th><th>Joined</th>
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
                        <a href={`http://localhost:3000/uploads/resumes/${student.resume}`} target="_blank" rel="noreferrer" className="link">View ↗</a>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="text-muted">{new Date(student.createdAt).toLocaleDateString()}</td>
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
