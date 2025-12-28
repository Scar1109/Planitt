import React, { useState, useEffect } from 'react';

const ComingSoon = () => {
  const [email, setEmail] = useState('');
  const [timeLeft, setTimeLeft] = useState({
    days: 30,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0) return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Thank you! We'll notify ${email} when we launch.`);
    setEmail('');
  };

  return (
    <div className="coming-soon-container">
      {/* Background Image with Overlay */}
      <div className="bg-image" />

      {/* Abstract Overlay Elements */}
      <div className="bg-overlay" />

      {/* Main Content */}
      <main className="main-content">

        {/* Badge */}
        <div className="glass-panel badge">
          <span className="badge-text">Retail Intelligence Redefined</span>
        </div>

        {/* Hero Logo */}
        <img src="/logo.png" alt="Planitt Logo" className="hero-logo" />

        <p className="hero-subtitle">
          Your Entire Retail Universe, Powered by AI. One platform. Limitless possibilities. The most advanced retail intelligence suite is arriving at a price that changes everything.
        </p>

        {/* Countdown Timer */}
        <div className="countdown-container">
          <div className="countdown-flex">
            {Object.entries(timeLeft).map(([key, value]) => (
              <div key={key} className="glass-panel countdown-item">
                <span className="countdown-value">
                  {String(value).padStart(2, '0')}
                </span>
                <span className="countdown-label">{key}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Newsletter Signup */}
        <form onSubmit={handleSubmit} className="signup-form">
          <input
            type="email"
            placeholder="Enter your email address"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <button type="submit" className="btn-primary primary-gradient">
            Notify Me
          </button>
        </form>

        {/* Footer */}
        <footer className="footer">
          <p>&copy; {new Date().getFullYear()} Planitt. All rights reserved.</p>
        </footer>

      </main>
    </div>
  );
};

export default ComingSoon;
