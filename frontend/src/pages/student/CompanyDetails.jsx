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
        const { data: companyData } = await API.get(`/companies/${companyId}`);
        setCompany(companyData);
        setAnswers(
          (companyData.formQuestions || []).map((q) => ({ question: q, answer: '' }))
        );

        // Check if already applied
        const { data: myApps } = await API.get('/applications/student');
        const applied = myApps.some(
          (a) => (a.companyId?._id || a.companyId) === companyId
        );
        setAlreadyApplied(applied);
      } catch (error) {
        console.error('Failed to fetch company:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  const handleAnswerChange = (index, value) => {
    const updated = [...answers];
    updated[index].answer = value;
    setAnswers(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('companyId', companyId);
      formData.append('answers', JSON.stringify(answers));
      if (resume) {
        formData.append('resume', resume);
      }

      await API.post('/applications', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccess('Application submitted successfully!');
      setAlreadyApplied(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="loading-screen"><div className="spinner"></div></div>;
  }

  if (!company) {
    return <div className="dashboard-page"><p>Company not found.</p></div>;
  }

  return (
    <div className="form-page">
      <div className="form-card large-card">
        <div className="company-detail-header">
          <h2>{company.name}</h2>
          <p className="company-role">{company.role}</p>
        </div>

        <div className="company-description">
          <h3>About the Opportunity</h3>
          <p>{company.description}</p>
        </div>

        {alreadyApplied ? (
          <div className="alert alert-success">
            ✅ You have already applied to this company. Good luck!
          </div>
        ) : (
          <>
            <hr className="divider" />
            <h3>Apply Now</h3>
            {error && <div className="alert alert-error">{error}</div>}
            {success && <div className="alert alert-success">{success}</div>}

            <form onSubmit={handleSubmit}>
              {answers.map((item, index) => (
                <div key={index} className="form-group">
                  <label>{item.question}</label>
                  <textarea
                    value={item.answer}
                    onChange={(e) => handleAnswerChange(index, e.target.value)}
                    required
                    rows={3}
                    placeholder="Your answer..."
                  />
                </div>
              ))}

              <div className="form-group">
                <label>Upload Resume (PDF, DOC, DOCX — Max 5MB)</label>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => setResume(e.target.files[0])}
                  className="file-input"
                />
                <p className="text-muted" style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                  If not uploaded here, your profile resume will be used.
                </p>
              </div>

              <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </form>
          </>
        )}

        <button className="btn btn-outline" style={{ marginTop: '1rem' }} onClick={() => navigate(-1)}>
          ← Back
        </button>
      </div>
    </div>
  );
};

export default CompanyDetails;
