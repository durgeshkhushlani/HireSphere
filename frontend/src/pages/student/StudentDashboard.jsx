import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

const StudentDashboard = () => {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, appsRes] = await Promise.all([
          API.get('/companies'),
          API.get('/applications/student'),
        ]);
        setCompanies(companiesRes.data);
        setMyApps(appsRes.data);
      } catch (error) { console.error(error); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  const appliedCompanyIds = myApps.map((a) => a.companyId?._id || a.companyId);

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Placement Opportunities</h1>
          <p className="text-muted">{companies.length} companies • {myApps.length} applied</p>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number">{companies.length}</div>
          <div className="stat-label">Total Companies</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{myApps.length}</div>
          <div className="stat-label">Applications Submitted</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{companies.filter(c => c.lastDate && new Date(c.lastDate) > new Date()).length}</div>
          <div className="stat-label">Upcoming Deadlines</div>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="empty-state"><p>No companies listed yet. Check back soon!</p></div>
      ) : (
        <div className="cards-grid">
          {companies.map((company) => {
            const hasApplied = appliedCompanyIds.includes(company._id);
            const isExpired = company.lastDate && new Date(company.lastDate) < new Date();
            return (
              <div
                key={company._id}
                className={`company-card clickable ${hasApplied ? 'applied' : ''} ${isExpired ? 'expired' : ''}`}
                onClick={() => navigate(`/student/company/${company._id}`)}
              >
                {hasApplied && <span className="badge badge-success">Applied ✓</span>}
                {isExpired && !hasApplied && <span className="badge badge-expired">Expired</span>}
                <h3>{company.name}</h3>
                <p className="company-role">{company.role}</p>
                <p className="company-desc">{company.description?.substring(0, 120)}...</p>
                <div className="company-meta">
                  {company.lastDate && (
                    <span className={`deadline-tag ${isExpired ? 'expired-text' : ''}`}>
                      📅 {new Date(company.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  )}
                  <span>{company.formQuestions?.length || 0} questions</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
