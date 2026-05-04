import React from 'react'
import { Link } from 'react-router-dom'
import { TEAM_MEMBERS } from '../config'

export default function AboutUs() {
    return (
        <div className="py-5 bg-light min-vh-100">
            <div className="container py-5 mt-4">
                <div className="mb-4">
                    <Link to="/" className="text-decoration-none">&larr; Back to Home</Link>
                </div>
                
                <div className="text-center mb-5">
                    <h2 className="display-4 fw-bold text-primary mb-3">The Research Team</h2>
                    <p className="lead text-muted mx-auto" style={{ maxWidth: '700px' }}>
                        Meet the dedicated undergraduate researchers from the Department of Information Technology at SLIIT who brought the Planitt project to life.
                    </p>
                </div>

                <div className="row justify-content-center g-4">
                    {TEAM_MEMBERS.map((m, i) => (
                        <div className="col-lg-6" key={m.id}>
                            <div className="card h-100 shadow-sm border-0 rounded-4 overflow-hidden bg-white">
                                <div className="card-body p-0">
                                    <div className="row g-0 h-100">
                                        <div className="col-sm-4 bg-primary bg-opacity-10 d-flex align-items-center justify-content-center p-4">
                                            <img
                                                src={m.photo}
                                                alt={m.name}
                                                className="img-fluid rounded-circle shadow border border-3 border-white"
                                                style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                                onError={(e) => {
                                                    e.target.style.display = 'none'
                                                    e.target.parentElement.innerHTML = '<div class="display-1">👤</div>'
                                                }}
                                            />
                                        </div>
                                        <div className="col-sm-8 p-4 d-flex flex-column justify-content-center">
                                            <h4 className="fw-bold mb-1 text-dark">{m.fullName}</h4>
                                            <p className="text-primary fw-semibold mb-3">{m.id}</p>
                                            <div className="mb-4">
                                                <span className="badge bg-secondary px-3 py-2 text-wrap" style={{ lineHeight: '1.5' }}>
                                                    {m.module}
                                                </span>
                                            </div>
                                            
                                            <div className="mt-auto">
                                                <div className="d-flex align-items-center mb-2">
                                                    <span className="me-3 fs-5">✉️</span>
                                                    <a href={`mailto:${m.email}`} className="text-decoration-none text-muted fw-semibold">{m.email}</a>
                                                </div>
                                                <div className="d-flex align-items-center">
                                                    <span className="me-3 fs-5">📱</span>
                                                    <span className="text-muted fw-semibold">{m.mobile}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
