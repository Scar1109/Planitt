import React from 'react';
import classNames from 'classnames';

const Button = ({ children, onClick, type = 'button', variant = 'primary', className, disabled }) => {
    const baseClasses = 'px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30 focus:ring-indigo-500',
        secondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 focus:ring-gray-500',
        outline: 'bg-transparent border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 focus:ring-indigo-500'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={classNames(baseClasses, variants[variant], className)}
        >
            {children}
        </button>
    );
};

export default Button;
