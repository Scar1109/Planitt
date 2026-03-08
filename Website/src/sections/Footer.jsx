import React from 'react'

export default function Footer() {
    return (
        <footer className="footer">
            <div className="container">
                <div className="footer-grid">
                    <div className="footer-brand">
                        <div className="navbar-logo">
                            <img src="/logo.png" alt="Planitt" />
                            <span>Planitt</span>
                        </div>
                        <p>
                            AI-powered retail shelf optimization platform. Transforming
                            how supermarkets and retail chains manage planograms,
                            inventory, and promotions.
                        </p>
                    </div>

                    <div className="footer-col">
                        <h4>Platform</h4>
                        <ul>
                            <li><a href="#features">Planogram Optimization</a></li>
                            <li><a href="#features">Inventory Forecasting</a></li>
                            <li><a href="#features">Promotion Analytics</a></li>
                            <li><a href="#features">AR Compliance</a></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4>Company</h4>
                        <ul>
                            <li><a href="#">About Us</a></li>
                            <li><a href="#">Careers</a></li>
                            <li><a href="#">Blog</a></li>
                            <li><a href="#">Press</a></li>
                        </ul>
                    </div>

                    <div className="footer-col">
                        <h4>Resources</h4>
                        <ul>
                            <li><a href="#">Documentation</a></li>
                            <li><a href="#">API Reference</a></li>
                            <li><a href="#">Case Studies</a></li>
                            <li><a href="#">Support</a></li>
                        </ul>
                    </div>
                </div>

                <div className="footer-bottom">
                    <p>© 2026 Planitt. All rights reserved.</p>
                    <div className="footer-socials">
                        <a href="#" aria-label="LinkedIn">in</a>
                        <a href="#" aria-label="Twitter">𝕏</a>
                        <a href="#" aria-label="GitHub">⌨</a>
                    </div>
                </div>
            </div>
        </footer>
    )
}
