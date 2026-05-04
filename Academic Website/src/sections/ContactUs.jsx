import React from 'react'
import { Link } from 'react-router-dom'

export default function ContactUs() {
    return (
        <div className="py-5 bg-white min-vh-100">
            <div className="container py-5 mt-4">
                <div className="mb-4">
                    <Link to="/" className="text-decoration-none">&larr; Back to Home</Link>
                </div>

                <div className="text-center mb-5">
                    <h2 className="display-4 fw-bold text-primary mb-3">Contact Planitt</h2>
                    <p className="lead text-muted mx-auto" style={{ maxWidth: '700px' }}>
                        Interested in our intelligent retail management platform? Reach out to us to learn more about how Planitt can transform your shelf space allocation.
                    </p>
                </div>

                <div className="row g-5 justify-content-center align-items-stretch">
                    <div className="col-lg-5">
                        <div className="card shadow border-0 h-100 rounded-4 overflow-hidden">
                            <div className="card-body p-5 bg-primary text-white d-flex flex-column justify-content-center position-relative">
                                {/* Decorative circle */}
                                <div className="position-absolute top-0 end-0 bg-white opacity-10 rounded-circle" style={{ width: '200px', height: '200px', transform: 'translate(30%, -30%)' }}></div>
                                
                                <h3 className="fw-bold mb-4 position-relative z-1">Get in Touch</h3>
                                <p className="mb-5 opacity-75 position-relative z-1 lead fs-6">
                                    Whether you want a product demo, have pricing inquiries, or want to discuss integration possibilities, our team is ready to help you optimize your retail space.
                                </p>
                                
                                <div className="d-flex align-items-center mb-4 position-relative z-1">
                                    <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-4 shadow-sm" style={{ width: '55px', height: '55px' }}>
                                        <span className="fs-3">🌍</span>
                                    </div>
                                    <div>
                                        <h6 className="mb-1 fw-bold text-uppercase tracking-wide" style={{ letterSpacing: '1px', fontSize: '0.8rem' }}>Official Website</h6>
                                        <a href="https://planitt.online/" target="_blank" rel="noopener noreferrer" className="text-white text-decoration-none fs-5 fw-semibold link-light">planitt.online</a>
                                    </div>
                                </div>

                                <div className="d-flex align-items-center position-relative z-1">
                                    <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-4 shadow-sm" style={{ width: '55px', height: '55px' }}>
                                        <span className="fs-3">📧</span>
                                    </div>
                                    <div>
                                        <h6 className="mb-1 fw-bold text-uppercase tracking-wide" style={{ letterSpacing: '1px', fontSize: '0.8rem' }}>Email Us</h6>
                                        <a href="mailto:hello@planitt.online" className="text-white text-decoration-none fs-5 fw-semibold link-light">hello@planitt.online</a>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="col-lg-7">
                        <div className="card shadow-sm border-0 h-100 rounded-4 bg-light">
                            <div className="card-body p-5">
                                <h4 className="fw-bold mb-4 text-dark border-bottom pb-3">Send a Message</h4>
                                <form>
                                    <div className="row g-4">
                                        <div className="col-md-6">
                                            <label className="form-label text-muted fw-semibold">Full Name</label>
                                            <input type="text" className="form-control form-control-lg bg-white border-0 shadow-sm" placeholder="John Doe" />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label text-muted fw-semibold">Company Name</label>
                                            <input type="text" className="form-control form-control-lg bg-white border-0 shadow-sm" placeholder="Supermarket Co." />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label text-muted fw-semibold">Email Address</label>
                                            <input type="email" className="form-control form-control-lg bg-white border-0 shadow-sm" placeholder="john@example.com" />
                                        </div>
                                        <div className="col-12">
                                            <label className="form-label text-muted fw-semibold">Message</label>
                                            <textarea className="form-control form-control-lg bg-white border-0 shadow-sm" rows="5" placeholder="How can we help you?"></textarea>
                                        </div>
                                        <div className="col-12 mt-4 pt-2">
                                            <a href="mailto:hello@planitt.online" className="btn btn-primary btn-lg w-100 shadow fw-bold py-3">
                                                Send Inquiry via Email
                                            </a>
                                            <p className="text-center text-muted small mt-3 mb-0">
                                                This action will open your default email client.
                                            </p>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
