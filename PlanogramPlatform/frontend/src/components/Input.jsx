import React from 'react';

const Input = ({ label, type, name, value, onChange, placeholder, required, error }) => {
    return (
        <div className="mb-4">
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    {label}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required={required}
                className={`w-full px-4 py-3 rounded-lg border ${error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-indigo-500 focus:ring-indigo-500'
                    } focus:outline-none focus:ring-2 transition-colors duration-200 bg-gray-50`}
            />
            {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        </div>
    );
};

export default Input;
