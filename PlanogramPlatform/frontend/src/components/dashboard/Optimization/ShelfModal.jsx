import React, { useState, useEffect } from 'react';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';

const ShelfModal = ({ isOpen, onClose, shelf, onSave }) => {

    // Default State for New Shelf
    const defaultShelf = {
        aisleBaySide: '',
        fixtureType: 'gondola',
        totalWidthCm: '',
        totalHeightCm: '',
        totalDepthCm: '',
        tags: [],
        levels: []
    };

    const [formData, setFormData] = useState(defaultShelf);
    const [tagInput, setTagInput] = useState('');

    useEffect(() => {
        if (shelf) {
            setFormData(shelf);
        } else {
            setFormData(defaultShelf);
        }
    }, [shelf, isOpen]);

    if (!isOpen) return null;

    // --- Handlers ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleTagKeyDown = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            if (!formData.tags.includes(tagInput.trim())) {
                setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
            }
            setTagInput('');
        }
    };

    const removeTag = (tagToRemove) => {
        setFormData(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
    };

    // Level Management
    const updateLevel = (index, field, value) => {
        const newLevels = [...formData.levels];
        newLevels[index] = { ...newLevels[index], [field]: parseFloat(value) || 0 };
        setFormData(prev => ({ ...prev, levels: newLevels }));
    };

    const addLevel = () => {
        const lastLevel = formData.levels[formData.levels.length - 1];
        const newHeight = lastLevel ? lastLevel.heightFromFloorCm + 40 : 20;
        const newLevel = {
            levelIndex: formData.levels.length,
            heightFromFloorCm: newHeight,
            usableWidthCm: formData.totalWidthCm,
            usableHeightCm: 30,
            usableDepthCm: formData.totalDepthCm
        };
        setFormData(prev => ({ ...prev, levels: [...prev.levels, newLevel] }));
    };

    const removeLevel = (index) => {
        const newLevels = formData.levels.filter((_, i) => i !== index);
        // Re-index
        const reIndexed = newLevels.map((lvl, i) => ({ ...lvl, levelIndex: i }));
        setFormData(prev => ({ ...prev, levels: reIndexed }));
    };

    const handleSubmit = () => {
        // Validation could go here
        onSave(formData);
    };

    // --- Visualization Helpers ---
    // Scale: Container Height is fixed (e.g. 500px), we map totalHeightCm to pixels.
    const VIZ_HEIGHT_PX = 400;
    const scale = (cm) => {
        const totalH = parseFloat(formData.totalHeightCm) || 220;
        return (cm / totalH) * VIZ_HEIGHT_PX;
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">

                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">
                            {shelf ? 'Edit Shelf Fixture' : 'Add New Fixture'}
                        </h2>
                        <p className="text-slate-500 text-sm">Configure dimensions, levels, and tags.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <FaTimes className="text-slate-500 text-lg" />
                    </button>
                </div>

                <div className="flex-1 flex overflow-hidden">

                    {/* Left: 2D Visualization */}
                    <div className="w-1/3 bg-slate-100 p-8 flex flex-col items-center justify-center border-r border-slate-200 relative">
                        {/* Title Removed */}

                        {/* Fixture Container */}
                        <div
                            style={{ height: `${VIZ_HEIGHT_PX}px`, width: '200px' }}
                            className="border-2 border-slate-300 bg-white relative shadow-lg"
                        >
                            {/* Render Levels */}
                            {formData.levels.map((level, idx) => {
                                const bottomPx = scale(level.heightFromFloorCm);
                                const heightPx = scale(5); // Thickness of shelf itself (mocked) or use usableHeight?
                                // Actually, standard visual is just a line or a thin block at that height.
                                // Let's draw the "Usable Area" box starting from heightFromFloor up?
                                // Usually heightFromFloor is the SHELF SURFACE.
                                // So the shelf is at bottomPx.

                                // Let's highlight Eye Level (Approx 120-160cm)
                                const isEyeLevel = level.heightFromFloorCm >= 110 && level.heightFromFloorCm <= 170;

                                return (
                                    <div
                                        key={idx}
                                        className="absolute w-full flex items-center justify-center group cursor-pointer transition-all hover:bg-indigo-50"
                                        style={{
                                            bottom: `${bottomPx}px`,
                                            height: '6px', // Thickness of the shelf material
                                            backgroundColor: isEyeLevel ? '#4f46e5' : '#cbd5e1'
                                        }}
                                        title={`Level ${idx}: ${level.heightFromFloorCm}cm`}
                                    >
                                        {/* Label Tag */}
                                        <div className="absolute -right-16 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            Lvl {idx} ({level.heightFromFloorCm}cm)
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Floor Line */}
                            <div className="absolute bottom-0 w-full border-b-2 border-slate-400"></div>
                        </div>
                        <div className="mt-6 text-center text-xs text-slate-400">
                            Total Height: {formData.totalHeightCm}cm | Scale: 1:{Math.round(formData.totalHeightCm / VIZ_HEIGHT_PX * 10)}
                        </div>
                    </div>

                    {/* Right: Form Editor */}
                    <div className="flex-1 overflow-y-auto p-8 bg-white">

                        {/* Section 1: Basic Info */}
                        <section className="mb-8">
                            <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">1</span>
                                General Details
                            </h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Fixture Name / ID</label>
                                    <input
                                        name="aisleBaySide"
                                        value={formData.aisleBaySide}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                        placeholder="e.g. Aisle 1 - Bay 2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
                                    <select
                                        name="fixtureType"
                                        value={formData.fixtureType}
                                        onChange={handleChange}
                                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                                    >
                                        <option value="gondola">Gondola</option>
                                        <option value="wall">Wall Rack</option>
                                        <option value="cooler">Cooler</option>
                                        <option value="endcap">End Cap</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-6 mt-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Height (cm)</label>
                                    <input type="number" name="totalHeightCm" value={formData.totalHeightCm} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Width (cm)</label>
                                    <input type="number" name="totalWidthCm" value={formData.totalWidthCm} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Total Depth (cm)</label>
                                    <input type="number" name="totalDepthCm" value={formData.totalDepthCm} onChange={handleChange} className="w-full px-3 py-2 border border-slate-200 rounded-lg" />
                                </div>
                            </div>

                            {/* Tags Chips UI */}
                            <div className="mt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-1">Tags (Select to add)</label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex flex-wrap gap-2 p-2 border border-slate-200 rounded-lg min-h-[42px]">
                                        {formData.tags.length === 0 && <span className="text-slate-400 text-sm">No tags selected</span>}
                                        {formData.tags.map(tag => (
                                            <span key={tag} className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-md text-sm flex items-center gap-1">
                                                {tag}
                                                <button onClick={() => removeTag(tag)} className="hover:text-indigo-900"><FaTimes size={10} /></button>
                                            </span>
                                        ))}
                                    </div>
                                    <select
                                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none text-sm"
                                        onChange={(e) => {
                                            if (e.target.value && !formData.tags.includes(e.target.value)) {
                                                setFormData(prev => ({ ...prev, tags: [...prev.tags, e.target.value] }));
                                            }
                                            e.target.value = ""; // Reset
                                        }}
                                    >
                                        <option value="">+ Add Tag...</option>
                                        {["Beverages", "Snacks", "Dairy", "Bakery", "Personal Care", "Household", "Promo", "Gondola End"].map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </section>

                        {/* Section 2: Level Configuration */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs">2</span>
                                    Levels Setup
                                </h3>
                                <button onClick={addLevel} className="text-sm text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                                    <FaPlus size={12} /> Add Level
                                </button>
                            </div>

                            <div className="overflow-hidden border border-slate-200 rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 text-left">Level</th>
                                            <th className="p-3 text-left">Height From Floor</th>
                                            <th className="p-3 text-left">Usable H</th>
                                            <th className="p-3 text-left">Usable D</th>
                                            <th className="p-3 text-center">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {formData.levels.map((level, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50">
                                                <td className="p-3 font-medium text-slate-600">Lvl {idx}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={level.heightFromFloorCm}
                                                            onChange={(e) => updateLevel(idx, 'heightFromFloorCm', e.target.value)}
                                                            className="w-16 px-2 py-1 border border-slate-200 rounded text-center focus:border-indigo-500 outline-none"
                                                        />
                                                        <span className="text-slate-400 text-xs">cm</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={level.usableHeightCm}
                                                            onChange={(e) => updateLevel(idx, 'usableHeightCm', e.target.value)}
                                                            className="w-16 px-2 py-1 border border-slate-200 rounded text-center focus:border-indigo-500 outline-none"
                                                        />
                                                        <span className="text-slate-400 text-xs">cm</span>
                                                    </div>
                                                </td>
                                                <td className="p-3">
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            type="number"
                                                            value={level.usableDepthCm}
                                                            onChange={(e) => updateLevel(idx, 'usableDepthCm', e.target.value)}
                                                            className="w-16 px-2 py-1 border border-slate-200 rounded text-center focus:border-indigo-500 outline-none"
                                                        />
                                                        <span className="text-slate-400 text-xs">cm</span>
                                                    </div>
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => removeLevel(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <FaTrash size={14} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-white flex justify-end gap-3">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-medium transition-colors">
                        Cancel
                    </button>
                    <button onClick={handleSubmit} className="px-6 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 font-medium shadow-md shadow-indigo-200 transition-all">
                        Save Changes
                    </button>
                </div>

            </div>
        </div>
    );
};

export default ShelfModal;
