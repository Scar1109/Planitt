import React from 'react'
import { Link } from 'react-router-dom'
import { TECHNOLOGIES } from '../config'

export default function DomainDetails() {
    return (
        <div className="py-5 bg-white">
            <div className="container py-5 mt-4">
                <div className="mb-4">
                    <Link to="/" className="text-decoration-none">&larr; Back to Home</Link>
                </div>
                
                <div className="text-center mb-5">
                    <h2 className="display-5 fw-bold text-primary">Project Domain & Scope</h2>
                    <p className="lead text-muted">Comprehensive details of the Planitt research project</p>
                </div>

                <div className="row g-5">
                    <div className="col-12">
                        <h3 className="fw-bold border-bottom pb-2 text-primary">Literature Survey</h3>
                        <p className="text-muted">
                            Shelf-space allocation, commonly known as planogram optimization, is a combinatorial NP-hard problem that directly impacts store revenue and operational efficiency. Previous studies have characterized it as a nonlinear integer programming challenge with space-elasticity constraints. While heuristic methods like the artificial bee colony algorithm or gradient-descent methods have been suggested, metaheuristic methods such as Simulated Annealing and Tabu Search have become very popular for navigating the NP-hard solution space.
                        </p>
                        <p className="text-muted">
                            Concurrently, the use of Machine Learning in retail demand prediction has grown, with gradient-boosted models (XGBoost and LightGBM) significantly outperforming traditional ARIMA baselines. However, automated planogram compliance verification and waste management remain largely siloed. Current commercial solutions like Blue Yonder and Relex offer fragmented workflows, separating shelf optimization, compliance audits, waste monitoring, and promotional planning into different systems.
                        </p>
                    </div>

                    <div className="col-12">
                        <h3 className="fw-bold border-bottom pb-2 text-primary">Research Gap</h3>
                        <p className="text-muted">
                            While existing literature explores generic shelf allocation problems, very few solutions offer a cohesive ecosystem bridging predictive (forecasting) and prescriptive (optimization) analytics tailored for local retail nuances. The primary challenge this work addresses is the lack of a cohesive, intelligent platform that regards planogram optimization not merely as an isolated shelf-arrangement task, but as the central coordinating layer that both informs and is informed by compliance monitoring, waste reduction, and promotional strategy.
                        </p>
                    </div>

                    <div className="col-12">
                        <h3 className="fw-bold border-bottom pb-2 text-primary">Research Problem</h3>
                        <p className="text-muted">
                            In retail settings, traditional planogram management depends heavily on store associates manually arranging items or using simple rules of thumb. This leads to less than ideal shelf utilization, often as low as 40–60%. Furthermore, because existing commercial planogram tools operate as separate modules, store managers must use completely different systems for designing planograms, doing compliance audits, tracking expiration dates, and analyzing promotions. This fragmentation leads to data silos, inconsistent strategies, and ultimately, inefficient operations.
                        </p>
                    </div>

                    <div className="col-12">
                        <h3 className="fw-bold border-bottom pb-2 text-primary">Research Objectives</h3>
                        <ul className="list-group list-group-flush text-muted">
                            <li className="list-group-item bg-transparent">
                                <strong>1. Hybrid Optimization Engine:</strong> Develop a three-phase pipeline for shelf-space allocation using ML-based demand ranking, constructive heuristic initialization, and metaheuristic refinement (Simulated Annealing and Tabu Search).
                            </li>
                            <li className="list-group-item bg-transparent">
                                <strong>2. Unified Platform Architecture:</strong> Create a system that connects planogram data to modules for checking compliance, preventing waste, and predicting sales to eliminate data silos.
                            </li>
                            <li className="list-group-item bg-transparent">
                                <strong>3. Adaptive Demand Forecasting:</strong> Implement a gradient-boosted model using Exponential Weighted Moving Average (EWMA) bias correction to continuously improve prediction accuracy over time.
                            </li>
                            <li className="list-group-item bg-transparent">
                                <strong>4. Multi-agent Promotional Forecasting:</strong> Design a multi-agent architecture with specialized workers for demand uplift, price elasticity, and risk assessment to formulate effective marketing plans.
                            </li>
                        </ul>
                    </div>

                    <div className="col-12">
                        <h3 className="fw-bold border-bottom pb-2 text-primary">Methodology</h3>
                        <p className="text-muted">
                            The core of the Planitt system is the <strong>Hybrid Planogram Optimization Engine</strong>, which operates through a three-phase pipeline:
                        </p>
                        <ol className="text-muted mb-4">
                            <li><strong>ML-Based Product Ranking:</strong> An XGBoost regressor predicts weekly product sales, which is combined with profit margins to create a composite priority score for each SKU.</li>
                            <li><strong>Constructive Heuristic:</strong> A four-step greedy construction algorithm generates a feasible initial layout while satisfying minimum/maximum facing bounds, adjacency requirements, and brand blocking rules.</li>
                            <li><strong>Metaheuristic Refinement:</strong> The initial layout is refined using Simulated Annealing with adaptive reheat or Tabu Search, employing neighborhood operators like adding/removing facings, moving levels, and swapping products to maximize the objective function.</li>
                        </ol>
                        <p className="text-muted">
                            Integrated with this core are the <strong>Compliance Checking Engine</strong> (a deterministic rule-based system that compares physical shelf states to optimized planograms), the <strong>Wastage Prevention Module</strong> (combining demand forecasting with perishable inventory risk scoring), and the <strong>Promotional Forecasting System</strong> (an agentic architecture utilizing Futurist, Marketer, and Steward agents to recommend unified promotional strategies).
                        </p>
                    </div>

                    <div className="col-12">
                        <h3 className="fw-bold border-bottom pb-2 text-primary">Technologies Used</h3>
                        <div className="d-flex flex-wrap gap-2 mt-3">
                            {TECHNOLOGIES.map((tech, i) => (
                                <span key={i} className="badge bg-secondary px-3 py-2 fs-6 shadow-sm">
                                    {tech.name} <small className="text-white-50 fw-normal ms-1">({tech.category})</small>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
