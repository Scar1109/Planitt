import React from 'react'

const trustBadges = [
    { icon: '🔒', text: 'Enterprise-Grade Security' },
    { icon: '☁️', text: 'Scalable Cloud Platform' },
    { icon: '🏗️', text: 'Enterprise-Ready Architecture' },
    { icon: '🔄', text: '99.9% Uptime SLA' },
]

export default function CTA() {
    return (
        <section className="section cta-section" id="cta">
            <div className="bg-glow bg-glow-purple" style={{ top: '-200px', left: '30%' }} />
            <div className="bg-glow bg-glow-blue" style={{ bottom: '-200px', right: '20%' }} />
            <div className="bg-grid" />

            <div className="container">
                <div className="cta-content fade-in">
                    <div className="section-label">🚀 Get Started</div>
                    <h2 className="cta-title">
                        Bring AI Intelligence to{' '}
                        <span className="gradient-text" style={{ background: 'var(--gradient-hero)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                            Your Retail Shelves
                        </span>
                    </h2>
                    <p className="cta-subtitle">
                        Join forward-thinking retailers already using Planitt to optimize shelf
                        performance, reduce waste, and maximize revenue with AI.
                    </p>

                    <div className="cta-buttons">
                        <a href="#" className="btn btn-primary btn-glow">
                            🚀 Request Demo
                        </a>
                        <a href="#" className="btn btn-secondary">
                            📧 Contact Sales
                        </a>
                    </div>

                    <div className="trust-badges">
                        {trustBadges.map((badge, i) => (
                            <div key={i} className="trust-badge">
                                <div className="trust-badge-icon">{badge.icon}</div>
                                <span>{badge.text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    )
}
