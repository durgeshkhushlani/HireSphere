import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../../services/api';

const CreateCompany = () => {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    description: '',
  });
  const [questions, setQuestions] = useState(['']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuestionChange = (index, value) => {
    const updated = [...questions];
    updated[index] = value;
    setQuestions(updated);
  };

  const addQuestion = () => {
    setQuestions([...questions, '']);
  };

  const removeQuestion = (index) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const filteredQuestions = questions.filter((q) => q.trim() !== '');
      await API.post('/companies', {
        ...formData,
        formQuestions: filteredQuestions,
      });
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create company');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-page">
      <div className="form-card large-card">
        <h2>Create Company Drive</h2>
        <p className="text-muted">Add a new company and customize the application form</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Company Name</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} required placeholder="e.g. Google" />
          </div>
          <div className="form-group">
            <label>Role / Position</label>
            <input type="text" name="role" value={formData.role} onChange={handleChange} required placeholder="e.g. Software Engineer Intern" />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea name="description" value={formData.description} onChange={handleChange} required placeholder="Job description, eligibility criteria, package details..." rows={5} />
          </div>

          <div className="form-section">
            <div className="form-section-header">
              <h3>Application Form Questions</h3>
              <button type="button" className="btn btn-outline btn-small" onClick={addQuestion}>
                + Add Question
              </button>
            </div>
            {questions.map((q, index) => (
              <div key={index} className="question-row">
                <input
                  type="text"
                  value={q}
                  onChange={(e) => handleQuestionChange(index, e.target.value)}
                  placeholder={`Question ${index + 1}`}
                />
                {questions.length > 1 && (
                  <button type="button" className="btn-remove" onClick={() => removeQuestion(index)}>
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating...' : 'Create Company Drive'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateCompany;
