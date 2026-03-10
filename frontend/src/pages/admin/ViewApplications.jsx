import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

const ViewApplications = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApps = async () => {
      try {
        const { data } = await API.get(`/applications/company/${companyId}`);
        setApplications(data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchApps();
  }, [companyId]);

  const downloadAll = async () => {
    try {
      const res = await API.get(`/applications/download/${companyId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url;
      a.download = `resumes-${companyId}.zip`; a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>← Back</button>
        {applications.length > 0 && (
          <button className="btn btn-primary" onClick={downloadAll}>📥 Download All Resumes</button>
        )}
      </div>

      <h1 style={{ marginBottom: '1.5rem' }}>Applications ({applications.length})</h1>

      {applications.length === 0 ? (
        <div className="empty-state"><p>No applications received yet.</p></div>
      ) : (
        <div className="applications-list">
          {applications.map((app) => (
            <div key={app._id} className="application-card">
              <div className="application-header">
                <h3>{app.studentId?.name || 'Student'}</h3>
                <span className="text-muted" style={{ fontSize: '0.82rem' }}>
                  {app.studentId?.email} • Submitted {new Date(app.createdAt).toLocaleDateString()}
                </span>
              </div>

              {app.answers?.length > 0 && (
                <div className="application-answers">
                  <h4>Responses</h4>
                  {app.answers.map((a, i) => (
                    <div key={i} className="answer-item">
                      <p className="answer-question">{a.question}</p>
                      <p className="answer-text">{a.answer}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="application-footer">
                {app.resume && (
                  <a href={`http://localhost:3000/uploads/resumes/${app.resume}`} target="_blank" rel="noreferrer" className="btn btn-outline btn-small">
                    View Resume ↗
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ViewApplications;
