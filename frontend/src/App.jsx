import { useEffect, useState } from 'react';
import './App.css';
import { FaStethoscope, FaUser, FaVenusMars, FaNotesMedical, FaSpinner, 
         FaQuestionCircle, FaSignInAlt, FaSignOutAlt, FaLock, FaUserPlus } from 'react-icons/fa';

function App() {
  // Existing state
  const [backendStatus, setBackendStatus] = useState('Checking backend...');
  const [activeTab, setActiveTab] = useState('diagnosis');
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    symptoms: '',
    medical_history: ''
  });
  const [question, setQuestion] = useState('');
  const [diagnosisResult, setDiagnosisResult] = useState(null);
  const [qaResult, setQaResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Authentication state (only used for Q&A now)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [authError, setAuthError] = useState('');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  // Check backend connection
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const response = await fetch('http://localhost:8000/');
        if (!response.ok) throw new Error('Backend not responding');
        const data = await response.json();
        setBackendStatus(`Backend: ${data.status}`);
      } catch (err) {
        setBackendStatus("Backend connection failed");
        console.error("Backend error:", err);
      }
    };
    checkBackend();
  }, []);

  // Handle diagnosis submission (no authentication required)
  const handleDiagnosisSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');
  setDiagnosisResult(null);

  try {
    // Validate inputs
    if (!formData.age || !formData.gender || !formData.symptoms) {
      throw new Error('Please fill all required fields');
    }
    if (formData.symptoms.length < 10) {
      throw new Error('Please describe symptoms in more detail (at least 10 characters)');
    }

    // Prepare form data
    const formDataToSend = new URLSearchParams();
    formDataToSend.append('age', formData.age);
    formDataToSend.append('gender', formData.gender);
    formDataToSend.append('symptoms', formData.symptoms);
    if (formData.medical_history) {
      formDataToSend.append('medical_history', formData.medical_history);
    }

    // Make request
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formDataToSend
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || `Request failed with status ${response.status}`);
    }

    const result = await response.json();
    
    // Ensure the response has the expected format
    if (!result.diagnosis || result.confidence === undefined) {
      throw new Error('Invalid response from server');
    }

    setDiagnosisResult({
      diagnosis: result.diagnosis,
      confidence: (result.confidence * 100).toFixed(1), // Convert to percentage
      recommendations: result.recommendations || [
        'Rest and hydration',
        'Consult a doctor if symptoms persist'
      ]
    });

  } catch (err) {
    console.error('Diagnosis error:', err);
    setError(err.message || 'An error occurred during diagnosis');
  } finally {
    setLoading(false);
  }
};

  // Handle question submission (still requires authentication)
  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setQaResult(null);

    try {
      if (!question.trim()) {
        throw new Error('Please enter a question');
      }

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError('Please login to ask questions');
        setShowAuthModal(true);
        return;
      }

      const response = await fetch('http://localhost:8000/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get answer');
      }

      const data = await response.json();
      setQaResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rest of the authentication functions remain the same
  const handleLogin = async (username, password) => {
    setAuthError('');
    setLoading(true);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);
      
      const response = await fetch('http://localhost:8000/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Login failed');
      }

      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      
      // Get user role
      const userResponse = await fetch('http://localhost:8000/users/me/', {
        headers: { 'Authorization': `Bearer ${data.access_token}` }
      });
      const userData = await userResponse.json();
      setUserRole(userData.role);
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    setUserRole('');
    setQaResult(null);
  };

  // Handle form changes
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="app-wrapper">
      <header className="header">
        <h1><FaStethoscope className="icon" /> HealthQAI</h1>
        <p>AI-Powered Healthcare Assistant</p>
        <p className="backend-status">{backendStatus}</p>
        
        {/* Only show auth buttons when in Q&A tab or logged in */}
        {(activeTab === 'qa' || isLoggedIn) && (
          <div className="auth-buttons">
            {isLoggedIn ? (
              <div className="user-info">
                <span className={`role-badge ${userRole}`}>{userRole}</span>
                <button 
                  onClick={handleLogout} 
                  className="logout-btn"
                  disabled={loading}
                >
                  <FaSignOutAlt /> Logout
                </button>
              </div>
            ) : (
              <button 
                className="login-btn"
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                disabled={loading}
              >
                <FaSignInAlt /> Login
              </button>
            )}
          </div>
        )}
      </header>

      <main className="container">
        <div className="tabs">
          <button 
            className={activeTab === 'diagnosis' ? 'active' : ''}
            onClick={() => setActiveTab('diagnosis')}
            disabled={loading}
          >
            <FaNotesMedical /> Symptom Checker
          </button>
          <button 
            className={activeTab === 'qa' ? 'active' : ''}
            onClick={() => setActiveTab('qa')}
            disabled={loading}
          >
            <FaQuestionCircle /> Health Questions
          </button>
        </div>

        {activeTab === 'diagnosis' ? (
          <div className="form-container">
            <form onSubmit={handleDiagnosisSubmit}>
              <div className="form-group">
                <label><FaUser className="icon" /> Age:</label>
                <input 
                  type="number" 
                  name="age" 
                  min="1" 
                  max="120"
                  value={formData.age} 
                  onChange={handleFormChange} 
                  required 
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label><FaVenusMars className="icon" /> Gender:</label>
                <select 
                  name="gender" 
                  value={formData.gender} 
                  onChange={handleFormChange} 
                  required
                  disabled={loading}
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
                  onChange={handleFormChange} 
                  placeholder="Describe your symptoms in detail (e.g., duration, severity, specific feelings)" 
                  minLength="10"
                  required 
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label><FaNotesMedical className="icon" /> Medical History (optional):</label>
                <textarea 
                  name="medical_history" 
                  value={formData.medical_history} 
                  onChange={handleFormChange} 
                  placeholder="Any relevant medical history or conditions" 
                  disabled={loading}
                />
              </div>

              <button type="submit" disabled={loading}>
                {loading ? <><FaSpinner className="spin" /> Analyzing...</> : 'Get Diagnosis'}
              </button>
            </form>

            {diagnosisResult && (
              <div className="result">
                <h3>Diagnosis Results</h3>
                <div className="result-grid">
                  <div>
                    <strong>Condition:</strong> 
                    <span className="highlight">{diagnosisResult.diagnosis}</span>
                  </div>
                  <div>
                    <strong>Confidence:</strong> 
                    <span>{diagnosisResult.confidence}%</span>
                  </div>
                </div>
                
                <div className="recommendations">
                  <h4>Recommendations:</h4>
                  <ul>
                    {(diagnosisResult.recommendations || []).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="qa-container">
            {showAuthModal && (
              <div className="auth-modal">
                <div className="auth-content">
                  <h2><FaSignInAlt /> Login to Ask Questions</h2>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    handleLogin('doctor', 'doctor123'); // Auto-login with demo for simplicity
                  }}>
                    <div className="form-group">
                      <label><FaUser /> Username:</label>
                      <input
                        type="text"
                        defaultValue="doctor"
                        disabled
                      />
                    </div>
                    
                    <div className="form-group">
                      <label><FaLock /> Password:</label>
                      <input
                        type="password"
                        defaultValue="doctor123"
                        disabled
                      />
                    </div>
                    
                    <button type="submit" disabled={loading}>
                      {loading ? <><FaSpinner className="spin" /> Logging in...</> : 'Use Demo Account'}
                    </button>
                  </form>
                  
                  <button 
                    className="close-modal"
                    onClick={() => setShowAuthModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleQuestionSubmit} className="qa-form">
              <div className="form-group">
                <label><FaQuestionCircle className="icon" /> Ask a Health Question:</label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask any health-related question..."
                  required
                  disabled={loading || !isLoggedIn}
                />
              </div>
              <button type="submit" disabled={loading || !isLoggedIn}>
                {loading ? <><FaSpinner className="spin" /> Processing...</> : 'Ask'}
              </button>
            </form>

            {qaResult && (
              <div className="qa-result">
                <div className="question">
                  <strong>Q:</strong> {qaResult.question}
                </div>
                <div className="answer">
                  <strong>A:</strong> {qaResult.answer}
                </div>
                {qaResult.sources?.length > 0 && (
                  <div className="sources">
                    <strong>Sources:</strong>
                    <ul>
                      {qaResult.sources.map((source, i) => (
                        <li key={i}>{source}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="loading-overlay">
            <FaSpinner className="spin" /> Processing your request...
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}
      </main>

      <footer className="footer">
        <p>© {new Date().getFullYear()} HealthQAI. For educational purposes only.</p>
        <p className="disclaimer">
          Note: This is not a substitute for professional medical advice. Always consult a healthcare provider.
        </p>
      </footer>
    </div>
  );
}

export default App;