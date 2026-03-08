import React from 'react'

export default function Particles() {
    const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        left: `${Math.random() * 100}%`,
        animationDuration: `${8 + Math.random() * 12}s`,
        animationDelay: `${Math.random() * 10}s`,
        size: `${1 + Math.random() * 2}px`,
        opacity: 0.2 + Math.random() * 0.4,
    }))

    return (
        <div className="particles-container">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="particle"
                    style={{
                        left: p.left,
                        width: p.size,
                        height: p.size,
                        animationDuration: p.animationDuration,
                        animationDelay: p.animationDelay,
                    }}
                />
            ))}
        </div>
    )
}
