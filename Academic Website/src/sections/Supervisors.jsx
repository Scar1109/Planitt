import React from 'react'
import { PROJECT_INFO } from '../config'

export default function Supervisors() {
    return (
        <section className="py-5 bg-white border-bottom">
            <div className="container">
                <div className="text-center mb-5">
                    <h2 className="fw-bold">Project Supervisors</h2>
                    <p className="text-muted">Guiding the Planitt research project</p>
                </div>

                <div className="row justify-content-center g-4">
                    {PROJECT_INFO.supervisors.map((s, i) => (
                        <div className="col-md-5" key={i}>
                            <div className="card h-100 shadow-sm border-0 bg-light text-center rounded-4 overflow-hidden">
                                <div className="card-body p-4 d-flex flex-column align-items-center">
                                    <div className="mb-4">
                                        <img
                                            src={s.photo}
                                            alt={s.name}
                                            className="img-fluid rounded-circle shadow border border-3 border-white"
                                            style={{ width: '120px', height: '120px', objectFit: 'cover' }}
                                            onError={(e) => {
                                                e.target.style.display = 'none'
                                                e.target.parentElement.innerHTML = '<div class="display-1 text-primary">👨‍🏫</div>'
                                            }}
                                        />
                                    </div>
                                    <h4 className="fw-bold mb-1">{s.name}</h4>
                                    <h6 className="text-secondary fw-semibold">{s.role}</h6>
                                    <hr className="w-25 mx-auto my-3 text-muted" />
                                    <p className="small text-muted mb-0">{PROJECT_INFO.department}</p>
                                    <p className="small text-muted">{PROJECT_INFO.university}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    )
}
