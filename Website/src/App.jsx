import React, { useEffect, useState } from 'react'
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

const THEME_STORAGE_KEY = 'planitt-theme'

function getStoredTheme() {
    if (typeof window === 'undefined') {
        return null
    }

    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null
}

function getPreferredTheme() {
    if (typeof window === 'undefined') {
        return 'light'
    }

    const storedTheme = getStoredTheme()
    if (storedTheme) {
        return storedTheme
    }

    return 'light'
}

export default function App() {
    const [theme, setTheme] = useState(() => getPreferredTheme())

    useEffect(() => {
        document.documentElement.dataset.theme = theme
    }, [theme])

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

    const handleThemeToggle = () => {
        setTheme((currentTheme) => {
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
            window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme)
            return nextTheme
        })
    }

    return (
        <>
            <Particles />
            <Navbar theme={theme} onToggleTheme={handleThemeToggle} />
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
