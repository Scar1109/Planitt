import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../context/AuthContext';
import { FaUserCircle, FaSignOutAlt, FaBell } from 'react-icons/fa';

const LandingPage = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();

    const handleGetStarted = () => {
        if (user) {
            navigate('/dashboard');
        } else {
            navigate('/signup');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 overflow-hidden relative selection:bg-indigo-500 selection:text-white flex flex-col">
            {/* Background Gradients */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-indigo-100 rounded-full blur-3xl opacity-50 -z-10 animate-pulse"></div>
            <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-purple-100 rounded-full blur-3xl opacity-40 -z-10"></div>

            {/* Navbar */}
            <nav className="relative z-10 flex justify-between items-center px-8 py-6 max-w-7xl w-full mx-auto">
                <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
                    <img src="/logo.png" alt="Planitt Logo" className="h-20 w-auto" />
                </div>
                <div className="space-x-4 flex items-center">
                    {user ? (
                        <div className="flex items-center space-x-6">
                            <button className="text-slate-400 hover:text-slate-600 relative transition-colors">
                                <FaBell className="h-5 w-5" />
                                <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>

                            <div className="flex items-center space-x-4 bg-white/90 backdrop-blur-xl border border-slate-300 rounded-2xl px-5 py-2 ml-4 transition-transform hover:scale-[1.02]">
                                <div className="text-right hidden sm:block">
                                    <p className="text-sm font-bold text-slate-800 leading-tight">{user.fullName}</p>
                                    <p className="text-xs text-slate-500 capitalize font-medium">{user.role} • {user.storeName}</p>
                                </div>
                                <div className="h-10 w-10 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-full flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-50">
                                    <FaUserCircle className="h-6 w-6" />
                                </div>

                                <div className="h-6 w-px bg-slate-200 mx-1"></div>

                                <button
                                    onClick={logout}
                                    className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-xl hover:bg-red-50"
                                    title="Logout"
                                >
                                    <FaSignOutAlt className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <Button variant="outline" onClick={() => navigate('/login')} className="!text-slate-700 !border-slate-300 hover:!bg-slate-100">
                                Log In
                            </Button>
                            <Button variant="primary" onClick={() => navigate('/signup')}>
                                Sign Up
                            </Button>
                        </>
                    )}
                </div>
            </nav>

            {/* Hero Section */}
            <main className="relative z-10 flex flex-grow flex-col items-center justify-center text-center px-4 max-w-4xl mx-auto w-full">
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 text-slate-900">
                    Smart Planograms for <br />
                    <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                        Modern Retail
                    </span>
                </h1>

                <p className="text-xl text-slate-600 mb-12 max-w-3xl leading-relaxed font-medium">
                    Your Entire Retail Universe, Powered by AI. One platform. Limitless possibilities.
                </p>

                <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="primary" onClick={handleGetStarted} className="text-lg px-8 py-4 shadow-lg shadow-indigo-200">
                        {user ? "Go to Dashboard" : "Get Started Free"}
                    </Button>
                </div>
            </main>
        </div>
    );
};

export default LandingPage;
