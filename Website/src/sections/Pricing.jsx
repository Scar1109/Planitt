import React from 'react'

const plans = [
    {
        tier: 'Starter',
        name: 'Per Store',
        desc: 'Perfect for single-location retailers looking to optimize shelf performance.',
        amount: '$49',
        period: '/store/month',
        features: [
            'Planogram Optimization',
            'Basic Demand Forecasting',
            'Shelf Compliance Scoring',
            'Email Support',
            'Monthly Reports',
        ],
        featured: false,
        btnClass: 'btn-secondary',
        btnText: 'Get Started',
    },
    {
        tier: 'Enterprise',
        name: 'Retail Solutions',
        desc: 'Full-featured AI platform for multi-store retail chains with advanced analytics.',
        amount: '$99',
        period: '/store/month (min 10)',
        features: [
            'All Starter Features',
            'AR Compliance Monitoring',
            'AI Promotion Forecasting',
            'Real-time Dashboard',
            'Multi-store Management',
            'Priority Support',
            'Custom Integrations',
        ],
        featured: true,
        btnClass: 'btn-primary',
        btnText: 'Contact Sales',
    },
    {
        tier: 'Custom',
        name: 'Analytics Packages',
        desc: 'Tailored analytics and AI solutions built for your specific retail operations.',
        amount: 'Custom',
        period: 'pricing',
        features: [
            'All Enterprise Features',
            'Custom ML Models',
            'Dedicated AI Engineer',
            'On-premise Deployment',
            'White-label Options',
            'SLA Guarantee',
        ],
        featured: false,
        btnClass: 'btn-secondary',
        btnText: 'Request Quote',
    },
]

export default function Pricing() {
    return (
        <section className="section pricing-section" id="pricing">
            <div className="bg-glow bg-glow-blue" style={{ top: '-100px', right: '-300px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">💰 Pricing</div>
                    <h2 className="section-title">
                        Scalable Plans for{' '}
                        <span className="gradient-text">Every Retailer</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        From single-store pilots to enterprise-wide deployments — choose the plan
                        that fits your retail operation.
                    </p>
                </div>

                <div className="pricing-grid">
                    {plans.map((plan, i) => (
                        <div
                            key={i}
                            className={`glass-card pricing-card${plan.featured ? ' featured' : ''} fade-in`}
                            style={{ transitionDelay: `${i * 0.1}s` }}
                        >
                            <div className="pricing-tier">{plan.tier}</div>
                            <div className="pricing-name">{plan.name}</div>
                            <div className="pricing-desc">{plan.desc}</div>

                            <div className="pricing-price">
                                <span className="pricing-amount">{plan.amount}</span>
                                <span className="pricing-period"> {plan.period}</span>
                            </div>

                            <ul className="pricing-features">
                                {plan.features.map((f, j) => (
                                    <li key={j}>
                                        <span className="check-icon">✓</span>
                                        {f}
                                    </li>
                                ))}
                            </ul>

                            <a href="#cta" className={`btn ${plan.btnClass}`}>
                                {plan.btnText}
                            </a>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
