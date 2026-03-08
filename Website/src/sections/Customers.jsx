import React from 'react'

const customers = [
    {
        icon: '🏪',
        title: 'Supermarket Chains',
        desc: 'Enterprise-grade planogram optimization for national and regional supermarket networks with hundreds of stores.',
    },
    {
        icon: '🏬',
        title: 'Retail Franchises',
        desc: 'Standardized shelf management across franchise locations with centralized control and local customization.',
    },
    {
        icon: '🛒',
        title: 'Large Grocery Stores',
        desc: 'AI-powered demand forecasting and inventory optimization tailored for high-volume grocery operations.',
    },
    {
        icon: '🏢',
        title: 'Multi-Store Operations',
        desc: 'Cross-store analytics and coordinated planogram deployment for retailers managing multiple locations.',
    },
]

export default function Customers() {
    return (
        <section className="section customers-section" id="customers">
            <div className="bg-glow bg-glow-purple" style={{ top: '-100px', left: '-300px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">🎯 Target Customers</div>
                    <h2 className="section-title">
                        Built for{' '}
                        <span className="gradient-text">Enterprise Retail</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        Planitt is designed for retailers who manage complex product assortments
                        across multiple locations and need AI-powered decision support.
                    </p>
                </div>

                <div className="customers-grid">
                    {customers.map((c, i) => (
                        <div
                            key={i}
                            className={`glass-card customer-card fade-in`}
                            style={{ transitionDelay: `${i * 0.1}s` }}
                        >
                            <div className="customer-icon">{c.icon}</div>
                            <h3>{c.title}</h3>
                            <p>{c.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
