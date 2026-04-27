import React from 'react'
import Hero from '../sections/Hero'
import Domain from '../sections/Domain'
import Milestones from '../sections/Milestones'
import Documents from '../sections/Documents'
import Presentations from '../sections/Presentations'
import Supervisors from '../sections/Supervisors'

export default function Home() {
    return (
        <>
            <Hero />
            <Domain />
            <Milestones />
            <Documents />
            <Presentations />
            <Supervisors />
        </>
    )
}
