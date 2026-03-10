import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

const CreateCompany = () => {
  const [formData, setFormData] = useState({ name: '', role: '', description: '', lastDate: '' });
  const [questions, setQuestions] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleQuestionChange = (i, v) => { const u = [...questions]; u[i] = v; setQuestions(u); };
  const addQuestion = () => setQuestions([...questions, '']);
  const removeQuestion = (i) => setQuestions(questions.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await API.post('/companies', { ...formData, formQuestions: questions.filter(q => q.trim()) });
      navigate('/admin/dashboard');
    } catch (err) { setError(err.response?.data?.message || 'Failed to create company'); }
    finally { setLoading(false); }
  };

  return (
    <div className="form-page">
      <div className="form-card large-card">
        <h2>Create Company Drive</h2>
        <p className="text-muted" style={{ marginBottom: '1.5rem', fontSize: '0.9rem' }}>Add a new company and customize the application form</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Google" />
          </div>
          <div className="form-group">
            <label>Role / Position</label>
            <input type="text" name="role" value={formData.role} onChange={handleChange} required placeholder="e.g. SDE Intern" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required rows={4} placeholder="Job description, eligibility, package..." />
          </div>
          <div className="form-group">
            <label>Last Date to Apply</label>
            <input type="date" name="lastDate" value={formData.lastDate} onChange={handleChange} required min={new Date().toISOString().split('T')[0]} />
          </div>

          {/* Questions */}
          <div className="form-section">
            <div className="form-section-header">
              <h3>Application Form Questions</h3>
              <button type="button" className="btn btn-outline btn-small" onClick={addQuestion}>+ Add</button>
            </div>
            {questions.map((q, i) => (
              <div key={i} className="question-row">
                <input value={q} onChange={(e) => handleQuestionChange(i, e.target.value)} placeholder={`Question ${i + 1}`} />
                {questions.length > 1 && (
                  <button type="button" className="btn-remove" onClick={() => removeQuestion(i)}>✕</button>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating Drive...' : 'Create Company Drive'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCompany;
