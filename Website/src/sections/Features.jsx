import React from 'react'

const features = [
    {
        icon: '📐',
        iconClass: 'icon-blue',
        title: 'Adaptive Planogram Optimization',
        desc: 'AI-driven shelf layout generation using real-time sales data, inventory levels, and product affinity analysis to maximize revenue per shelf foot.',
        tags: ['Real-time AI', 'Category Analysis', 'Revenue Optimization'],
        shelfColors: ['#4f6cff', '#6366f1', '#4f6cff', '#818cf8', '#4f6cff', '#6366f1', '#4f6cff', '#a78bfa'],
    },
    {
        icon: '📦',
        iconClass: 'icon-purple',
        title: 'Smart Inventory & Waste Optimization',
        desc: 'Machine learning demand forecasting with automated reorder recommendations, expiry tracking, and dynamic safety stock calculations.',
        tags: ['Demand Forecasting', 'Auto Reorder', 'Waste Reduction'],
        shelfColors: ['#8b5cf6', '#a78bfa', '#8b5cf6', '#c084fc', '#8b5cf6', '#a78bfa', '#8b5cf6', '#c084fc'],
    },
    {
        icon: '📈',
        iconClass: 'icon-cyan',
        title: 'AI Promotion Forecasting',
        desc: 'Predict promotion performance by analyzing planogram position, historical sales, competitive pricing, and external events like weather and holidays.',
        tags: ['Promo Analysis', 'Price Optimization', 'Event Correlation'],
        shelfColors: ['#06b6d4', '#22d3ee', '#06b6d4', '#67e8f9', '#06b6d4', '#22d3ee', '#06b6d4', '#67e8f9'],
    },
    {
        icon: '📱',
        iconClass: 'icon-green',
        title: 'AR Compliance Monitoring',
        desc: 'Computer vision and augmented reality for real-time shelf verification, gap detection, and step-by-step correction guidance for store teams.',
        tags: ['Computer Vision', 'AR Scanning', 'Auto-Detection'],
        shelfColors: ['#10b981', '#34d399', '#10b981', '#6ee7b7', '#10b981', '#34d399', '#10b981', '#6ee7b7'],
    },
]

export default function Features() {
    return (
        <section className="section features-section" id="features">
            <div className="bg-glow bg-glow-cyan" style={{ top: '-100px', right: '-300px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">🔧 Core Platform Modules</div>
                    <h2 className="section-title">
                        Four Modules. One{' '}
                        <span className="gradient-text">Intelligent System</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        Each module works independently or together as part of an integrated
                        retail intelligence platform, delivering measurable results from day one.
                    </p>
                </div>

                <div className="features-grid">
                    {features.map((f, i) => (
                        <div
                            key={i}
                            className={`glass-card feature-card fade-in`}
                            style={{ transitionDelay: `${i * 0.1}s` }}
                        >
                            <div className="feature-illustration">
                                <div className="shelf-row">
                                    {f.shelfColors.map((color, j) => (
                                        <div
                                            key={j}
                                            className="shelf-item"
                                            style={{
                                                height: `${30 + Math.random() * 50}px`,
                                                background: color,
                                                animationDelay: `${j * 0.05}s`,
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className={`feature-card-icon ${f.iconClass}`}>{f.icon}</div>
                            <h3>{f.title}</h3>
                            <p>{f.desc}</p>
                            <div className="feature-tags">
                                {f.tags.map((tag, j) => (
                                    <span key={j} className="feature-tag">{tag}</span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
