import React from 'react'
import { DOCUMENTS } from '../config'

export default function Documents() {
    const groupDocs = DOCUMENTS.filter((d) => d.type === 'group')
    const individualProposals = DOCUMENTS.filter((d) => d.type === 'individual-proposal')
    const individualReports = DOCUMENTS.filter((d) => d.type === 'individual-report')

    return (
        <section id="documents" className="py-5 bg-white border-bottom">
            <div className="container">
                <div className="text-center mb-5">
                    <h2 className="fw-bold">Project Documents</h2>
                    <p className="text-muted">Access all project documentation including proposals, status reports, and final dissertations.</p>
                </div>

                <h4 className="mb-4 text-primary border-bottom pb-2">Group Documents</h4>
                <div className="row g-4 mb-5">
                    {groupDocs.map((doc, i) => (
                        <div className="col-md-6" key={i}>
                            <div className="card h-100 shadow-sm border-0 bg-light">
                                <div className="card-body d-flex">
                                    <div className="fs-1 me-3">{doc.icon}</div>
                                    <div>
                                        <h5 className="card-title fw-bold">{doc.title}</h5>
                                        <p className="card-text text-muted mb-3">{doc.description}</p>
                                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                            Download Document
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <h4 className="mb-4 text-primary border-bottom pb-2">Individual Proposals</h4>
                <div className="row g-4 mb-5">
                    {individualProposals.map((doc, i) => (
                        <div className="col-md-6" key={i}>
                            <div className="card h-100 shadow-sm border-0 bg-light">
                                <div className="card-body d-flex">
                                    <div className="fs-1 me-3">{doc.icon}</div>
                                    <div>
                                        <h5 className="card-title fw-bold">{doc.title}</h5>
                                        <p className="card-text text-muted mb-3">{doc.description}</p>
                                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                            Download Proposal
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <h4 className="mb-4 text-primary border-bottom pb-2">Individual Final Reports</h4>
                <div className="row g-4">
                    {individualReports.map((doc, i) => (
                        <div className="col-md-6" key={i}>
                            <div className="card h-100 shadow-sm border-0 bg-light">
                                <div className="card-body d-flex">
                                    <div className="fs-1 me-3">{doc.icon}</div>
                                    <div>
                                        <h5 className="card-title fw-bold">{doc.title}</h5>
                                        <p className="card-text text-muted mb-3">{doc.description}</p>
                                        <a href={doc.link} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm">
                                            Download Report
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
