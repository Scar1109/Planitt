import React from 'react'
import { PROJECT_INFO } from '../config'

export default function Footer() {
    return (
        <footer className="bg-dark text-white pt-4 pb-3 mt-auto">
            <div className="container">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-center">
                    <div className="mb-3 mb-md-0 d-flex align-items-center">
                        <img src="/logo.png" alt="Logo" height="40" width="auto" className="rounded bg-white p-1" />
                    </div>
                    <div className="text-center text-md-end text-white-50 small">
                        <p className="mb-1">&copy; {new Date().getFullYear()} SLIIT Research Project</p>
                        <p className="mb-0">{PROJECT_INFO.department} <br className="d-md-none"/> <span className="d-none d-md-inline">&bull;</span> {PROJECT_INFO.university}</p>
                    </div>
                </div>
            </div>
        </footer>
    )
}
