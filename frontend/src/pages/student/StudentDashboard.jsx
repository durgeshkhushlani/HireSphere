import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../../services/api';

const StudentDashboard = () => {
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
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const appliedCompanyIds = myApps.map((a) => a.companyId?._id || a.companyId);

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>Placement Opportunities</h1>
          <p className="text-muted">{companies.length} companies available • {myApps.length} applied</p>
        </div>
      </div>

      {companies.length === 0 ? (
        <div className="empty-state">
          <p>No companies listed yet. Check back soon!</p>
        </div>
      ) : (
        <div className="cards-grid">
          {companies.map((company) => {
            const hasApplied = appliedCompanyIds.includes(company._id);
            return (
              <div key={company._id} className={`company-card ${hasApplied ? 'applied' : ''}`}>
                {hasApplied && <div className="badge badge-success">Applied ✓</div>}
                <h3>{company.name}</h3>
                <p className="company-role">{company.role}</p>
                <p className="company-desc">{company.description.substring(0, 120)}...</p>
                <div className="company-meta">
                  <span>{company.formQuestions?.length || 0} questions</span>
                  <span>{new Date(company.createdAt).toLocaleDateString()}</span>
                </div>
                <Link
                  to={`/student/company/${company._id}`}
                  className={`btn ${hasApplied ? 'btn-outline' : 'btn-primary'} btn-small`}
                >
                  {hasApplied ? 'View Details' : 'View & Apply'}
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StudentDashboard;
