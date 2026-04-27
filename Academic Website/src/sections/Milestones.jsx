import React from 'react'
import { MILESTONES } from '../config'

export default function Milestones() {
    return (
        <section id="milestones" className="py-5 bg-light border-bottom">
            <div className="container">
                <div className="text-center mb-5">
                    <h2 className="fw-bold">Project Milestones</h2>
                    <p className="text-muted">Key deliverables and assessments throughout the research project lifecycle. Click on any milestone to view details.</p>
                </div>

                <div className="row justify-content-center">
                    <div className="col-lg-8">
                        <div className="accordion shadow-sm rounded-3 overflow-hidden" id="milestonesAccordion">
                            {MILESTONES.map((m, i) => {
                                const collapseId = `collapse-${m.key}`
                                const headingId = `heading-${m.key}`
                                const isCompleted = m.status === 'completed'
                                
                                return (
                                    <div className="accordion-item border-0 border-bottom" key={m.key}>
                                        <h2 className="accordion-header" id={headingId}>
                                            <button 
                                                className="accordion-button collapsed py-3" 
                                                type="button" 
                                                data-bs-toggle="collapse" 
                                                data-bs-target={`#${collapseId}`} 
                                                aria-expanded="false" 
                                                aria-controls={collapseId}
                                            >
                                                <div className="d-flex w-100 justify-content-between align-items-center me-3">
                                                    <div className="fw-bold fs-5 text-dark">
                                                        {m.title}
                                                    </div>
                                                    <div className="d-flex align-items-center gap-3">
                                                        <span className="text-muted small d-none d-md-inline">
                                                            📅 {m.date}
                                                        </span>
                                                        <span className={`badge ${isCompleted ? 'bg-success' : 'bg-warning text-dark'} rounded-pill`}>
                                                            {isCompleted ? 'Completed' : 'In Progress'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </button>
                                        </h2>
                                        <div 
                                            id={collapseId} 
                                            className="accordion-collapse collapse" 
                                            aria-labelledby={headingId} 
                                            data-bs-parent="#milestonesAccordion"
                                        >
                                            <div className="accordion-body bg-white border-top p-4">
                                                <p className="lead fs-6 text-secondary mb-3">{m.description}</p>
                                                
                                                <div className="d-flex gap-4">
                                                    <div className="bg-light p-3 rounded flex-grow-1 border">
                                                        <h6 className="text-muted mb-1 text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '1px'}}>Marks Allocated</h6>
                                                        <span className="fs-5 fw-bold text-primary">{m.marks}</span>
                                                    </div>
                                                    <div className="bg-light p-3 rounded flex-grow-1 border">
                                                        <h6 className="text-muted mb-1 text-uppercase fw-bold" style={{fontSize: '0.75rem', letterSpacing: '1px'}}>Assessment Date</h6>
                                                        <span className="fs-5 fw-bold text-dark">{m.date}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}
