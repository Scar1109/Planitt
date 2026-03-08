import React from 'react';
import classNames from 'classnames';

const Button = ({ children, onClick, type = 'button', variant = 'primary', className, disabled }) => {
    const baseClasses = 'px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
        primary: 'bg-[#1B4F72] hover:bg-[#164060] text-white shadow-lg shadow-[#1B4F72]/20 focus:ring-[#17A2B8]',
        secondary: 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 focus:ring-gray-500',
        outline: 'bg-transparent border-2 border-[#17A2B8] text-[#1B4F72] hover:bg-[#17A2B8]/10 focus:ring-[#17A2B8]'
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
