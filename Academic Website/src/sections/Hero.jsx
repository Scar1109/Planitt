import React from 'react'
import { PROJECT_INFO } from '../config'

export default function Hero() {
    return (
        <section id="hero" className="bg-light py-5 border-bottom">
            <div className="container text-center py-5">
                <span className="badge bg-secondary mb-3 fs-6 px-3 py-2 rounded-pill">SLIIT Research Project {PROJECT_INFO.academicYear}</span>
                <h1 className="display-5 fw-bold text-primary mb-4 mt-2">
                    {PROJECT_INFO.subtitle}
                </h1>
                <div className="mx-auto" style={{ maxWidth: '800px' }}>
                    <p className="lead text-muted mb-5">
                        {PROJECT_INFO.description}
                    </p>
                    <div className="d-flex justify-content-center gap-3">
                        <a href="#domain" className="btn btn-primary btn-lg px-4 shadow-sm">Explore Domain</a>
                        <a href="#documents" className="btn btn-outline-secondary btn-lg px-4 shadow-sm">View Documents</a>
                    </div>
                </div>
            </div>
        </section>
    )
}
