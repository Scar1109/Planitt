import React from 'react'

const problems = [
    {
        icon: '📋',
        iconClass: 'icon-red',
        title: 'Static Planograms',
        desc: 'Traditional planograms are rigid and rarely updated — ignoring real-time sales patterns, seasonal shifts, and local consumer behavior.',
        stat: '73% of planograms are outdated within 2 weeks',
        statClass: 'stat-red',
    },
    {
        icon: '👁️',
        iconClass: 'icon-orange',
        title: 'Manual Shelf Compliance',
        desc: 'Field teams manually audit shelves, a slow and error-prone process that misses up to 40% of compliance issues.',
        stat: '40% of issues go undetected',
        statClass: 'stat-orange',
    },
    {
        icon: '📉',
        iconClass: 'icon-yellow',
        title: 'Poor Demand Forecasting',
        desc: 'Legacy forecasting tools rely on historical averages, unable to factor in promotions, events, or real-time market signals.',
        stat: '$1.1T lost annually in retail due to poor forecasting',
        statClass: 'stat-yellow',
    },
    {
        icon: '🗑️',
        iconClass: 'icon-pink',
        title: 'Overstocking & Product Waste',
        desc: 'Without intelligent inventory optimization, retailers face excess stock, spoilage, and markdowns that erode margins.',
        stat: '30% of perishable goods wasted',
        statClass: 'stat-pink',
    },
]

export default function Problem() {
    return (
        <section className="section problem-section" id="problem">
            <div className="bg-glow bg-glow-purple" style={{ top: '-200px', right: '-200px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">⚠️ The Challenge</div>
                    <h2 className="section-title">
                        Retail is Running on <span className="gradient-text">Outdated Systems</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        The global retail industry loses billions annually due to inefficient shelf management,
                        poor forecasting, and manual compliance processes.
                    </p>
                </div>

                <div className="problem-grid">
                    {problems.map((p, i) => (
                        <div
                            key={i}
                            className={`glass-card problem-card fade-in`}
                            style={{ transitionDelay: `${i * 0.1}s` }}
                        >
                            <div className={`problem-icon ${p.iconClass}`}>{p.icon}</div>
                            <h3>{p.title}</h3>
                            <p>{p.desc}</p>
                            <div className={`problem-stat ${p.statClass}`}>
                                📊 {p.stat}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
