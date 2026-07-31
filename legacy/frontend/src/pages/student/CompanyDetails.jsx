import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../services/api';

const CompanyDetails = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [resume, setResume] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [alreadyApplied, setAlreadyApplied] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await API.get(`/companies/${companyId}`);
        setCompany(data);
        setAnswers((data.formQuestions || []).map(q => ({ question: q, answer: '' })));
        const { data: myApps } = await API.get('/applications/student');
        setAlreadyApplied(myApps.some(a => (a.companyId?._id || a.companyId) === companyId));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [companyId]);

  const handleAnswerChange = (i, v) => { const u = [...answers]; u[i].answer = v; setAnswers(u); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('companyId', companyId);
      fd.append('answers', JSON.stringify(answers));
      if (resume) fd.append('resume', resume);
      await API.post('/applications', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Application submitted successfully!');
      setAlreadyApplied(true);
    } catch (err) { setError(err.response?.data?.message || 'Failed to submit'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!company) return <div className="dashboard-page"><p className="text-muted">Company not found.</p></div>;

  const isExpired = company.lastDate && new Date(company.lastDate) < new Date();
  const formattedDeadline = company.lastDate
    ? new Date(company.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="form-page">
      <div className="form-card large-card">
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ marginBottom: '1rem' }}>← Back</button>

        <div className="company-detail-header">
          <h2>{company.name}</h2>
          <span className="detail-role">{company.role}</span>
          {formattedDeadline && (
            <p className={`deadline-info ${isExpired ? 'expired-text' : ''}`}>
              {isExpired ? '❌ Application period ended' : `📅 Apply by: ${formattedDeadline}`}
            </p>
          )}
        </div>

        <div className="company-description">
          <h3>About the Opportunity</h3>
          <p>{company.description}</p>
        </div>

        {alreadyApplied ? (
          <div className="alert alert-success">✅ You have already applied to this company. Good luck!</div>
        ) : isExpired ? (
          <div className="alert alert-error">❌ The application deadline for this company has passed.</div>
        ) : (
          <>
            <hr className="divider" />
            <h3 style={{ marginBottom: '1rem' }}>Apply Now</h3>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {answers.map((item, i) => (
                <div key={i} className="form-group">
                  <label>{item.question}</label>
                  <textarea value={item.answer} onChange={(e) => handleAnswerChange(i, e.target.value)} required rows={3} placeholder="Your answer..." />
                </div>
              ))}
              <div className="form-group">
                <label>Resume (PDF, DOC, DOCX — Max 5MB)</label>
                <input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setResume(e.target.files[0])} className="file-input" />
                <p className="text-muted" style={{ fontSize: '0.8rem', marginTop: '0.3rem' }}>If not uploaded, your profile resume will be used.</p>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default CompanyDetails;
