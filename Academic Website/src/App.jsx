import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Navbar from './sections/Navbar'
import Footer from './sections/Footer'
import Home from './pages/Home'
import AboutUs from './sections/AboutUs'
import ContactUs from './sections/ContactUs'
import DomainDetails from './pages/DomainDetails'

function App() {
    return (
        <Router>
            <div className="d-flex flex-column min-vh-100">
                <Navbar />
                <main className="flex-shrink-0 mb-5">
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/about" element={<AboutUs />} />
                        <Route path="/contact" element={<ContactUs />} />
                        <Route path="/domain" element={<DomainDetails />} />
                    </Routes>
                </main>
                <Footer />
            </div>
        </Router>
    )
}

export default App
