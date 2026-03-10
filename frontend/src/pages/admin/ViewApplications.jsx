import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import API from '../../services/api';

const ViewApplications = () => {
  const { companyId } = useParams();
  const [applications, setApplications] = useState([]);
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [appsRes, companyRes] = await Promise.all([
          API.get(`/applications/company/${companyId}`),
          API.get(`/companies/${companyId}`),
        ]);
        setApplications(appsRes.data);
        setCompany(companyRes.data);
      } catch (error) {
        console.error('Failed to fetch applications:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  const handleDownloadAll = async () => {
    try {
      const response = await API.get(`/applications/company/${companyId}/download`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${company?.name || 'company'}_resumes.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download resumes');
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h1>{company?.name}</h1>
          <p className="text-muted">{company?.role} — {applications.length} application(s)</p>
        </div>
        {applications.length > 0 && (
          <button className="btn btn-primary" onClick={handleDownloadAll}>
            📥 Download All Resumes (ZIP)
          </button>
        )}
      </div>

      {applications.length === 0 ? (
        <div className="empty-state">
          <p>No applications received yet.</p>
        </div>
      ) : (
        <div className="applications-list">
          {applications.map((app, index) => (
            <div key={app._id} className="application-card">
              <div className="application-header">
                <h3>#{index + 1} — {app.studentId?.name || 'Unknown'}</h3>
                <span className="text-muted">{app.studentId?.email}</span>
              </div>

              {app.answers && app.answers.length > 0 && (
                <div className="application-answers">
                  <h4>Form Responses</h4>
                  {app.answers.map((ans, i) => (
                    <div key={i} className="answer-item">
                      <p className="answer-question"><strong>Q:</strong> {ans.question}</p>
                      <p className="answer-text"><strong>A:</strong> {ans.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="application-footer">
                <a
                  href={`http://localhost:3000/uploads/resumes/${app.resume}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-outline btn-small"
                >
                  📄 View Resume
                </a>
                <span className="text-muted">
                  Applied: {new Date(app.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewApplications;
