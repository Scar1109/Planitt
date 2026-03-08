import React, { useState, useEffect } from 'react'

export default function Navbar() {
    const [scrolled, setScrolled] = useState(false)

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 40)
        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    return (
        <nav className={`navbar${scrolled ? ' scrolled' : ''}`}>
            <div className="container">
                <a href="#hero" className="navbar-logo">
                    <img src="/logo.png" alt="Planitt" />
                </a>

                <ul className="navbar-links">
                    <li><a href="#solution">Solution</a></li>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#how-it-works">How It Works</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><a href="#demo">Demo</a></li>
                </ul>

                <a href="#cta" className="btn btn-primary navbar-cta">
                    Request Demo
                </a>

                <button className="mobile-menu-btn" aria-label="Menu">
                    <span></span>
                    <span></span>
                    <span></span>
                </button>
            </div>
        </nav>
    )
}
