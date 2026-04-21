import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { FaUser, FaLock, FaSchool } from 'react-icons/fa';
import { toast } from 'react-toastify';
import './login.css'
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [studentID, setStudentID] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const success = await login(email.trim(), password, studentID.trim() || null);

      if (!success) {
        toast.error("Login Failed - Please check your credentials");
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.error || 
                          "Login Failed. Please try again.";
      toast.error(errorMessage);
      console.error("Full login error:", err.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <FaSchool className="icon" />
          <h1>School Management System</h1>
          <p>Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className='login-form'>
          <div className="form-group">
            <FaUser className="input-icon" />
            <input  className='form-input'
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <FaLock className="input-icon" />
            <input className='form-input'
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <input className='form-input'
              type="text"
              placeholder="Student ID (only for students)"
              value={studentID}
              onChange={(e) => setStudentID(e.target.value)}
            />
          </div>

          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-footer">
          Default Admin: <strong>admin@school.com</strong> / password
        </div>
      </div>
    </div>
  );
};

export default Login;