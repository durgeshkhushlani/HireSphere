import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import API from '../../services/api';

const AdminCompanyDetails = () => {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [formData, setFormData] = useState({
    name: '', role: '', description: '', lastDate: '', formQuestions: [''],
  });

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const { data } = await API.get(`/companies/${companyId}`);
        setCompany(data);
        setFormData({
          name: data.name, role: data.role, description: data.description,
          lastDate: data.lastDate ? data.lastDate.split('T')[0] : '',
          formQuestions: data.formQuestions?.length ? data.formQuestions : [''],
        });
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchCompany();
  }, [companyId]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleQuestionChange = (i, v) => { const u = [...formData.formQuestions]; u[i] = v; setFormData({ ...formData, formQuestions: u }); };
  const addQuestion = () => setFormData({ ...formData, formQuestions: [...formData.formQuestions, ''] });
  const removeQuestion = (i) => setFormData({ ...formData, formQuestions: formData.formQuestions.filter((_, idx) => idx !== i) });

  const handleSave = async () => {
    setSaving(true); setSuccess('');
    try {
      const { data } = await API.put(`/companies/${companyId}`, { ...formData, formQuestions: formData.formQuestions.filter(q => q.trim()) });
      setCompany(data); setEditing(false); setSuccess('✓ Company updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"></div></div>;
  if (!company) return <div className="dashboard-page"><p className="text-muted">Company not found.</p></div>;

  const formattedDate = company.lastDate
    ? new Date(company.lastDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'N/A';

  return (
    <div className="dashboard-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.8rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate('/admin/dashboard')}>← Back</button>
        <div className="btn-group" style={{ margin: 0 }}>
          {!editing && <button className="btn btn-outline" onClick={() => setEditing(true)}>✏️ Edit</button>}
          <Link to={`/admin/applications/${companyId}`} className="btn btn-primary">View Applications</Link>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}

      {editing ? (
        <div className="form-card large-card" style={{ maxWidth: '100%' }}>
          <h2>Edit Company</h2>
          <div style={{ marginTop: '1.5rem' }}>
            <div className="form-group">
              <label>Company Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Role</label>
              <input type="text" name="role" value={formData.role} onChange={handleChange} />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea name="description" value={formData.description} onChange={handleChange} rows={5} />
            </div>
            <div className="form-group">
              <label>Last Date to Apply</label>
              <input type="date" name="lastDate" value={formData.lastDate} onChange={handleChange} />
            </div>

            <div className="form-section">
              <div className="form-section-header">
                <h3>Form Questions</h3>
                <button type="button" className="btn btn-outline btn-small" onClick={addQuestion}>+ Add</button>
              </div>
              {formData.formQuestions.map((q, i) => (
                <div key={i} className="question-row">
                  <input value={q} onChange={(e) => handleQuestionChange(i, e.target.value)} placeholder={`Question ${i + 1}`} />
                  {formData.formQuestions.length > 1 && (
                    <button type="button" className="btn-remove" onClick={() => removeQuestion(i)}>✕</button>
                  )}
                </div>
              ))}
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
              <button className="btn btn-outline" onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="company-detail-view">
          <div className="detail-hero">
            <h1>{company.name}</h1>
            <span className="detail-role">{company.role}</span>
          </div>

          <div className="detail-grid">
            <div className="detail-card">
              <h3>Deadline</h3>
              <div className="detail-value deadline">{formattedDate}</div>
            </div>
            <div className="detail-card">
              <h3>Questions</h3>
              <div className="detail-value">{company.formQuestions?.length || 0}</div>
            </div>
            <div className="detail-card">
              <h3>Listed On</h3>
              <div className="detail-value">{new Date(company.createdAt).toLocaleDateString()}</div>
            </div>
          </div>

          <div className="detail-section">
            <h2>Description</h2>
            <p className="detail-description">{company.description}</p>
          </div>

          {company.formQuestions?.length > 0 && (
            <div className="detail-section">
              <h2>Application Questions</h2>
              <ul className="questions-list">
                {company.formQuestions.map((q, i) => <li key={i}>{q}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminCompanyDetails;
