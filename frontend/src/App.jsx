import { useEffect, useState } from 'react';
import './App.css';
import { FaStethoscope, FaUser, FaVenusMars, FaNotesMedical, FaSpinner } from 'react-icons/fa';

function App() {
  const [backendStatus, setBackendStatus] = useState('Checking backend...');
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    symptoms: ''
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        if (!response.ok) throw new Error('Backend not responding');
        const data = await response.json();
        setBackendStatus(data.message);
      } catch (err) {
        setBackendStatus("Backend connection failed");
        console.error("Backend error:", err);
      }
    };
    checkBackend();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Basic validation
      if (!formData.age || !formData.gender || !formData.symptoms) {
        throw new Error('Please fill all fields');
      }
      if (formData.symptoms.length < 10) {
        throw new Error('Please describe symptoms in more detail (at least 10 characters)');
      }

      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          age: formData.age,
          gender: formData.gender,
          symptoms: formData.symptoms
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-wrapper">
      <header className="header">
        <h1><FaStethoscope className="icon" /> HealthQAI</h1>
        <p>Your Smart AI-Based Medical Assistant</p>
      </header>

      <main className="container">
        <div className="form-container">
          <h2><FaNotesMedical className="icon" /> Symptom Checker</h2>
          <p className="backend-status">{backendStatus}</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label><FaUser className="icon" /> Age:</label>
              <input 
                type="number" 
                name="age" 
                min="1" 
                max="120"
                value={formData.age} 
                onChange={handleChange} 
                required 
              />
            </div>

            <div className="form-group">
              <label><FaVenusMars className="icon" /> Gender:</label>
              <select 
                name="gender" 
                value={formData.gender} 
                onChange={handleChange} 
                required
              >
                <option value="">-- Select --</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>

            <div className="form-group">
              <label><FaNotesMedical className="icon" /> Symptoms:</label>
              <textarea 
                name="symptoms" 
                value={formData.symptoms} 
                onChange={handleChange} 
                placeholder="Describe your symptoms in detail (e.g., duration, severity, specific feelings)" 
                minLength="10"
                required 
              />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <FaSpinner className="spin" /> Analyzing...
                </>
              ) : 'Get Diagnosis'}
            </button>
          </form>

          {loading && (
            <div className="loading">
              <FaSpinner className="spin" /> Processing your symptoms...
            </div>
          )}

          {error && (
            <div className="error-message">
              <p>⚠️ {error}</p>
            </div>
          )}

          {result && (
            <div className="result">
              <h3>Diagnosis Result</h3>
              <div className="result-detail">
                <strong>Condition:</strong> {result.diagnosis}
              </div>
              <div className="result-detail">
                <strong>Recommendation:</strong> {result.recommendation}
              </div>
              <div className="result-detail">
                <strong>Severity:</strong> <span className={`severity-${result.severity}`}>
                  {result.severity}
                </span>
              </div>
              {result.notes && (
                <div className="result-notes">
                  <p>{result.notes}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} HealthQAI Team. For educational purposes only.</p>
        <p className="disclaimer">
          Note: This is not a substitute for professional medical advice. Always consult a healthcare provider.
        </p>
      </footer>
    </div>
  );
}

export default App;