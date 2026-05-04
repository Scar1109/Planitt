import React from 'react'

const steps = [
    {
        num: '01',
        title: 'Collect Retail Data',
        desc: 'Ingest POS transactions, inventory levels, product metadata, and historical sales data from your existing retail systems in real-time.',
    },
    {
        num: '02',
        title: 'AI Analyzes Demand & Layout',
        desc: 'Our machine learning engine processes millions of data points to understand demand patterns, product affinities, and shelf performance metrics.',
    },
    {
        num: '03',
        title: 'Generate Optimized Planograms',
        desc: 'AI-generated shelf layouts maximize revenue per foot while considering product constraints, brand agreements, and store-specific demographics.',
    },
    {
        num: '04',
        title: 'Continuous Improvement Loop',
        desc: 'Performance data from shelf scans and sales feeds back into the AI engine, continuously improving planogram accuracy and forecasting precision.',
    },
]

export default function HowItWorks() {
    return (
        <section className="section how-section" id="how-it-works">
            <div className="bg-glow bg-glow-purple" style={{ top: '20%', right: '-300px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">⚙️ How It Works</div>
                    <h2 className="section-title">
                        From Data to{' '}
                        <span className="gradient-text">Optimized Shelves</span>{' '}
                        in 4 Steps
                    </h2>
                    <p className="section-subtitle mx-auto">
                        Our end-to-end pipeline transforms raw retail data into actionable
                        shelf optimization with continuous AI-driven improvement.
                    </p>
                </div>

                <div className="steps-container">
                    <div className="step-line" />
                    {steps.map((step, i) => (
                        <div
                            key={i}
                            className="step-item fade-in-left"
                            style={{ transitionDelay: `${i * 0.12}s` }}
                        >
                            <div className="step-number">{step.num}</div>
                            <div className="step-content">
                                <h3>{step.title}</h3>
                                <p>{step.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
