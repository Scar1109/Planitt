import React from 'react'
import { Link } from 'react-router-dom'
import { RESEARCH_MODULES } from '../config'

export default function Domain() {
    return (
        <section id="domain" className="py-5 bg-white border-bottom">
            <div className="container">
                <div className="text-center mb-5">
                    <h2 className="fw-bold">Project Domain & Scope</h2>
                    <p className="text-muted">An overview of our research scope and specific modules.</p>
                </div>

                <div className="row mb-5">
                    <div className="col-lg-6 mb-4">
                        <div className="card h-100 shadow-sm border-0 bg-light">
                            <div className="card-body">
                                <h4 className="card-title text-primary">Literature Survey</h4>
                                <p className="card-text text-muted">
                                    Current shelf space management relies heavily on static, manual planograms that fail to account for dynamic inventory changes or real-time sales velocity. Traditional heuristic approaches are often rigid, while pure machine learning models lack operational constraint satisfaction. Our survey identified a critical gap: the need for an integrated platform that connects predictive demand forecasting with metaheuristic optimization to produce actionable, compliance-verified planograms.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-6 mb-4">
                        <div className="card h-100 shadow-sm border-0 bg-light">
                            <div className="card-body">
                                <h4 className="card-title text-primary">Research Gap</h4>
                                <p className="card-text text-muted">
                                    While existing literature explores generic shelf allocation problems, very few solutions offer a cohesive ecosystem bridging predictive (forecasting) and prescriptive (optimization) analytics tailored for local retail nuances. Planitt bridges this gap by offering a hybrid Simulated Annealing & Tabu Search optimization pipeline, directly fueled by XGBoost-based inventory and promotional forecasting, and validated through mobile AR compliance checking.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-center mb-5">
                    <Link to="/domain" className="btn btn-outline-primary btn-lg shadow-sm px-5">
                        Read Full Domain Details &rarr;
                    </Link>
                </div>

                <h3 className="text-center mb-4">Research Modules</h3>
                <div className="row g-4">
                    {RESEARCH_MODULES.map((mod, i) => (
                        <div className="col-md-6 col-lg-3" key={i}>
                            <div className="card h-100 shadow-sm text-center">
                                <div className="card-body">
                                    <div className="display-4 mb-3">{mod.icon}</div>
                                    <h5 className="card-title fw-bold">{mod.title}</h5>
                                    <h6 className="card-subtitle mb-2 text-muted">{mod.subtitle}</h6>
                                    <hr />
                                    <p className="card-text small text-muted text-start">{mod.description}</p>
                                </div>
                                <div className="card-footer bg-white border-top-0">
                                    <small className="text-primary fw-bold">By: {mod.member}</small>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
