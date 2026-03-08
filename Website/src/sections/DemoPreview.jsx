import React, { useState } from 'react'

const tabs = [
    { id: 'planogram', label: '📐 Planogram Generation' },
    { id: 'forecast', label: '📈 Demand Forecasting' },
]

const sidebarItems = {
    planogram: ['Overview', 'Category View', 'Shelf Layout', 'Product Mix', 'Revenue Map'],
    forecast: ['30-Day Forecast', 'Seasonal Trends', 'Anomaly Detection', 'Reorder Queue', 'Reports'],
}

const metrics = {
    planogram: [
        { label: 'Products Optimized', value: '2,847', color: '#4f6cff' },
        { label: 'Revenue / Shelf Ft', value: '$142.30', color: '#8b5cf6' },
        { label: 'Layout Score', value: '96.4%', color: '#06b6d4' },
    ],
    forecast: [
        { label: 'Forecast Accuracy', value: '97.8%', color: '#8b5cf6' },
        { label: 'Products Tracked', value: '12,450', color: '#06b6d4' },
        { label: 'Auto Reorders', value: '856', color: '#10b981' },
    ],
}

const chartPaths = {
    planogram: 'M0,50 C40,45 80,30 120,35 C160,40 200,20 240,25 C280,30 320,15 360,10 L360,80 L0,80Z',
    forecast: 'M0,55 C40,48 80,35 120,40 C160,38 200,22 240,28 C280,18 320,12 360,8 L360,80 L0,80Z',
}

const chartLinePaths = {
    planogram: 'M0,50 C40,45 80,30 120,35 C160,40 200,20 240,25 C280,30 320,15 360,10',
    forecast: 'M0,55 C40,48 80,35 120,40 C160,38 200,22 240,28 C280,18 320,12 360,8',
}

export default function DemoPreview() {
    const [activeTab, setActiveTab] = useState('planogram')

    return (
        <section className="section demo-section" id="demo">
            <div className="bg-glow bg-glow-cyan" style={{ bottom: '-200px', left: '-200px' }} />
            <div className="container" style={{ position: 'relative', zIndex: 1 }}>
                <div className="text-center fade-in">
                    <div className="section-label">🖥️ Product Preview</div>
                    <h2 className="section-title">
                        See the Platform{' '}
                        <span className="gradient-text">in Action</span>
                    </h2>
                    <p className="section-subtitle mx-auto">
                        Explore interactive previews of our core dashboard modules and see
                        how Planitt transforms retail shelf management.
                    </p>
                </div>

                <div className="demo-tabs fade-in">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`demo-tab${activeTab === tab.id ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="demo-preview scale-in">
                    <div className="demo-window-bar">
                        <div className="dashboard-dot red" />
                        <div className="dashboard-dot yellow" />
                        <div className="dashboard-dot green" />
                        <div className="dashboard-title-bar">
                            Planitt — {tabs.find(t => t.id === activeTab)?.label}
                        </div>
                    </div>

                    <div className="demo-content">
                        <div className="demo-sidebar">
                            {sidebarItems[activeTab].map((item, i) => (
                                <div
                                    key={i}
                                    className={`demo-sidebar-item${i === 0 ? ' active' : ''}`}
                                >
                                    {item}
                                </div>
                            ))}
                        </div>

                        <div className="demo-main">
                            <div className="demo-chart-placeholder">
                                <svg viewBox="0 0 360 80" preserveAspectRatio="none" style={{ width: '100%', height: '100%', position: 'absolute', bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`demoGrad-${activeTab}`} x1="0" y1="0" x2="1" y2="0">
                                            <stop offset="0%" stopColor="#4f6cff" />
                                            <stop offset="50%" stopColor="#8b5cf6" />
                                            <stop offset="100%" stopColor="#06b6d4" />
                                        </linearGradient>
                                    </defs>
                                    <path
                                        d={chartPaths[activeTab]}
                                        fill={`url(#demoGrad-${activeTab})`}
                                        opacity="0.1"
                                    />
                                    <path
                                        d={chartLinePaths[activeTab]}
                                        fill="none"
                                        stroke={`url(#demoGrad-${activeTab})`}
                                        strokeWidth="2"
                                    />
                                </svg>
                            </div>

                            <div className="demo-metrics-row">
                                {metrics[activeTab].map((m, i) => (
                                    <div key={i} className="demo-metric">
                                        <div className="demo-metric-label">{m.label}</div>
                                        <div className="demo-metric-value" style={{ color: m.color }}>
                                            {m.value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
