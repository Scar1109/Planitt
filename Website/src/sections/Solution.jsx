import React from 'react'

const nodes = [
    { icon: '🛒', label: 'POS Data', sub: 'Sales & Transactions' },
    { icon: '🧠', label: 'AI Engine', sub: 'ML Processing' },
    { icon: '📐', label: 'Planogram Optimizer', sub: 'Layout Generation' },
    { icon: '📦', label: 'Inventory Forecast', sub: 'Demand Prediction' },
    { icon: '📱', label: 'AR Compliance', sub: 'Shelf Verification' },
    { icon: '📊', label: 'Analytics Dashboard', sub: 'Insights & Reports' },
]

export default function Solution() {
    return (
        <section className="section solution-section" id="solution">
            <div className="bg-glow bg-glow-blue" style={{ bottom: '-200px', left: '-200px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">🧠 Our AI Solution</div>
                    <h2 className="section-title">
                        One Intelligent Platform for{' '}
                        <span className="gradient-text">Complete Retail Optimization</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        Planitt integrates AI-driven planogram optimization, demand forecasting,
                        AR compliance monitoring, and promotion analytics into a unified retail
                        intelligence system.
                    </p>
                </div>

                <div className="architecture-flow scale-in">
                    {nodes.map((node, i) => (
                        <React.Fragment key={i}>
                            <div className="arch-node">
                                <div className="arch-node-icon">{node.icon}</div>
                                <div className="arch-node-label">{node.label}</div>
                                <div className="arch-node-sub">{node.sub}</div>
                            </div>
                            {i < nodes.length - 1 && (
                                <div className="arch-arrow">→</div>
                            )}
                        </React.Fragment>
                    ))}
                </div>

                <div className="solution-description fade-in">
                    <p>
                        Our platform continuously ingests point-of-sale data, applies advanced machine
                        learning models for demand prediction, generates optimized shelf layouts, and
                        verifies compliance through computer vision — all connected through a real-time
                        analytics dashboard that drives continuous improvement.
                    </p>
                </div>
            </div>
        </section>
    )
}
