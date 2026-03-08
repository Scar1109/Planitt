import React from 'react'

const impacts = [
    {
        value: '+32%',
        valClass: 'val-blue',
        label: 'Shelf Efficiency',
        desc: 'Optimized product placement increases sales per shelf foot',
        barWidth: '85%',
        barClass: 'bar-blue',
    },
    {
        value: '-41%',
        valClass: 'val-purple',
        label: 'Product Waste',
        desc: 'Smart forecasting reduces overstocking and spoilage',
        barWidth: '72%',
        barClass: 'bar-purple',
    },
    {
        value: '+28%',
        valClass: 'val-green',
        label: 'Promotion ROI',
        desc: 'AI-driven promo placement maximizes campaign returns',
        barWidth: '78%',
        barClass: 'bar-green',
    },
    {
        value: '99.2%',
        valClass: 'val-cyan',
        label: 'Inventory Availability',
        desc: 'Predictive reordering keeps shelves stocked',
        barWidth: '95%',
        barClass: 'bar-cyan',
    },
]

export default function Impact() {
    return (
        <section className="section impact-section" id="impact">
            <div className="bg-glow bg-glow-blue" style={{ bottom: '-200px', right: '-200px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">📈 Business Impact</div>
                    <h2 className="section-title">
                        Measurable Results,{' '}
                        <span className="gradient-text">Proven at Scale</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        Retailers using Planitt see significant improvements across key
                        performance metrics within the first 90 days.
                    </p>
                </div>

                <div className="impact-grid">
                    {impacts.map((item, i) => (
                        <div
                            key={i}
                            className={`glass-card impact-card fade-in`}
                            style={{ transitionDelay: `${i * 0.1}s` }}
                        >
                            <div className={`impact-value ${item.valClass}`}>{item.value}</div>
                            <div className="impact-label">{item.label}</div>
                            <div className="impact-desc">{item.desc}</div>
                            <div className="impact-bar-container">
                                <div
                                    className={`impact-bar ${item.barClass}`}
                                    style={{ '--bar-width': item.barWidth }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
