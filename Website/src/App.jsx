import React, { useEffect } from 'react'
import Navbar from './sections/Navbar'
import Hero from './sections/Hero'
import Problem from './sections/Problem'
import Solution from './sections/Solution'
import Features from './sections/Features'
import HowItWorks from './sections/HowItWorks'
import Impact from './sections/Impact'
import Customers from './sections/Customers'
import DemoPreview from './sections/DemoPreview'
import Pricing from './sections/Pricing'
import CTA from './sections/CTA'
import Footer from './sections/Footer'
import Particles from './sections/Particles'

export default function App() {
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible')
                    }
                })
            },
            { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
        )

        const elements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right, .scale-in')
        elements.forEach((el) => observer.observe(el))

        // Animate impact bars when visible
        const barObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('animated')
                    }
                })
            },
            { threshold: 0.5 }
        )

        const bars = document.querySelectorAll('.impact-bar')
        bars.forEach((bar) => barObserver.observe(bar))

        return () => {
            observer.disconnect()
            barObserver.disconnect()
        }
    }, [])

    return (
        <>
            <Particles />
            <Navbar />
            <main>
                <Hero />
                <Problem />
                <Solution />
                <Features />
                <HowItWorks />
                <Impact />
                <Customers />
                <DemoPreview />
                <Pricing />
                <CTA />
            </main>
            <Footer />
        </>
    )
}
