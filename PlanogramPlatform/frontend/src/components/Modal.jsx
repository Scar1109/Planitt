import React, { useEffect } from 'react';
import { FaTimes } from 'react-icons/fa';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md transform transition-all scale-100">
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                     <h3 className="text-lg font-bold text-gray-800">{title}</h3>
                     <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                         <FaTimes />
                     </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
