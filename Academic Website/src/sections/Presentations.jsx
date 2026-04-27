import React from 'react'
import { PRESENTATIONS } from '../config'

export default function Presentations() {
    return (
        <section id="presentations" className="py-5 bg-light border-bottom">
            <div className="container">
                <div className="text-center mb-5">
                    <h2 className="fw-bold">Project Presentations</h2>
                    <p className="text-muted">Slide decks from all major project presentations and reviews.</p>
                </div>

                <div className="row g-4">
                    {PRESENTATIONS.map((p, i) => (
                        <div className="col-md-6 col-lg-3" key={i}>
                            <div className="card h-100 shadow-sm text-center">
                                <div className="card-body">
                                    <div className="display-4 mb-3">{p.icon}</div>
                                    <h5 className="card-title fw-bold">{p.title}</h5>
                                    <h6 className="card-subtitle mb-3 text-primary">{p.date}</h6>
                                    <p className="card-text small text-muted mb-4">{p.description}</p>
                                    <a href={p.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary w-100 mt-auto">
                                        View Slides
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
