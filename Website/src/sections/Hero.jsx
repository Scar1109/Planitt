import React from 'react'

export default function Hero() {
    const miniChartBars = [
        { h: 40, color: '#4f6cff' },
        { h: 65, color: '#6b5cf6' },
        { h: 50, color: '#4f6cff' },
        { h: 80, color: '#8b5cf6' },
        { h: 55, color: '#4f6cff' },
        { h: 90, color: '#06b6d4' },
        { h: 70, color: '#4f6cff' },
        { h: 95, color: '#8b5cf6' },
        { h: 60, color: '#4f6cff' },
        { h: 85, color: '#06b6d4' },
    ]

    return (
        <section className="hero" id="hero">
            <div className="hero-bg-gradient" />
            <div className="hero-bg-gradient-2" />
            <div className="bg-grid" />

            <div className="container">
                <div className="hero-content">
                    <div className="hero-badge">
                        ⚡ AI-Powered Retail Intelligence
                    </div>

                    <h1 className="hero-title">
                        Transform Retail Shelves with{' '}
                        <span className="highlight"><span style={{ whiteSpace: 'nowrap' }}>AI-Powered</span> Optimization</span>
                    </h1>

                    <p className="hero-subtitle">
                        Integrate planogram optimization, demand forecasting, AR compliance monitoring,
                        and promotion analytics into one intelligent platform — purpose-built for
                        modern retailers.
                    </p>

                    <div className="hero-buttons">
                        <a href="mailto:demo@planitt.online" className="btn btn-primary btn-glow">
                            🚀 Request Demo
                        </a>
                        <a href="#how-it-works" className="btn btn-secondary">
                            ▶ See How It Works
                        </a>
                    </div>


                </div>

                <div className="hero-visual">
                    <div className="floating-element fe-1">
                        <span className="fe-icon">📊</span> Demand Forecast Updated
                    </div>
                    <div className="floating-element fe-2">
                        <span className="fe-icon">✅</span> Planogram Optimized
                    </div>
                    <div className="floating-element fe-3">
                        <span className="fe-icon">📷</span> Shelf Scan Complete
                    </div>

                    <div className="dashboard-mockup">
                        <div className="dashboard-header">
                            <div className="dashboard-dot red" />
                            <div className="dashboard-dot yellow" />
                            <div className="dashboard-dot green" />
                            <div className="dashboard-title-bar">
                                Planitt — Dashboard
                            </div>
                        </div>

                        <div className="dashboard-grid">
                            <div className="dashboard-card">
                                <div className="dashboard-card-label">Shelf Score</div>
                                <div className="dashboard-card-value blue">94.2%</div>
                                <div className="mini-chart">
                                    {miniChartBars.map((bar, i) => (
                                        <div
                                            key={i}
                                            className="mini-bar"
                                            style={{
                                                height: `${bar.h}%`,
                                                background: bar.color,
                                                animationDelay: `${i * 0.1}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="dashboard-card">
                                <div className="dashboard-card-label">Active Stores</div>
                                <div className="dashboard-card-value purple">1,247</div>
                                <div className="mini-chart">
                                    {miniChartBars.slice().reverse().map((bar, i) => (
                                        <div
                                            key={i}
                                            className="mini-bar"
                                            style={{
                                                height: `${bar.h}%`,
                                                background: '#8b5cf6',
                                                animationDelay: `${i * 0.12}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="dashboard-card">
                                <div className="dashboard-card-label">Waste Reduction</div>
                                <div className="dashboard-card-value green">-18%</div>
                                <div className="mini-chart">
                                    {miniChartBars.map((bar, i) => (
                                        <div
                                            key={i}
                                            className="mini-bar"
                                            style={{
                                                height: `${bar.h * 0.8}%`,
                                                background: '#10b981',
                                                animationDelay: `${i * 0.08}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="dashboard-card">
                                <div className="dashboard-card-label">Forecast Accuracy</div>
                                <div className="dashboard-card-value cyan">97.8%</div>
                                <div className="mini-chart">
                                    {miniChartBars.map((bar, i) => (
                                        <div
                                            key={i}
                                            className="mini-bar"
                                            style={{
                                                height: `${bar.h * 0.9}%`,
                                                background: '#06b6d4',
                                                animationDelay: `${i * 0.11}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="dashboard-chart-area">
                                <div className="dashboard-card-label">Revenue Impact — Last 30 Days</div>
                                <div className="chart-line">
                                    <svg viewBox="0 0 400 80" preserveAspectRatio="none">
                                        <defs>
                                            <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                                                <stop offset="0%" stopColor="#4f6cff" />
                                                <stop offset="100%" stopColor="#06b6d4" />
                                            </linearGradient>
                                        </defs>
                                        <path
                                            d="M0,60 C30,55 60,40 100,45 C140,50 160,20 200,25 C240,30 260,15 300,10 C340,5 370,12 400,8"
                                            fill="none"
                                            stroke="url(#lineGrad)"
                                            strokeWidth="2.5"
                                        />
                                        <path
                                            d="M0,60 C30,55 60,40 100,45 C140,50 160,20 200,25 C240,30 260,15 300,10 C340,5 370,12 400,8 L400,80 L0,80Z"
                                            fill="url(#lineGrad)"
                                            opacity="0.08"
                                        />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
