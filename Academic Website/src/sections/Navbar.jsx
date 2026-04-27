import React from 'react'
import { Link, useLocation } from 'react-router-dom'

export default function Navbar() {
    const location = useLocation()
    const isHome = location.pathname === '/'

    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top shadow-sm py-2">
            <div className="container">
                <Link className="navbar-brand d-flex align-items-center" to="/">
                    <img src="/logo.png" alt="Planitt Logo" height="50" width="auto" className="rounded" />
                </Link>
                <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className="collapse navbar-collapse" id="navbarNav">
                    <ul className="navbar-nav ms-auto fs-6 fw-semibold">
                        <li className="nav-item">
                            <Link className={`nav-link ${isHome && location.hash === '' ? 'active text-white' : ''}`} to="/">Home</Link>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/#domain">Domain</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/#milestones">Milestones</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/#documents">Documents</a>
                        </li>
                        <li className="nav-item">
                            <a className="nav-link" href="/#presentations">Presentations</a>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link ${location.pathname === '/about' ? 'active text-white' : ''}`} to="/about">About Us</Link>
                        </li>
                        <li className="nav-item">
                            <Link className={`nav-link ${location.pathname === '/contact' ? 'active text-white' : ''}`} to="/contact">Contact</Link>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    )
}
