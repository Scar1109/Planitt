import React, { useState } from 'react';
import { FaArrowLeft, FaBox, FaInfoCircle, FaSearchPlus, FaSearchMinus, FaExpand } from 'react-icons/fa';

const PlanogramViewer = ({ onClose, result, fixtures = [], levels = [], products = [] }) => {
    const [zoom, setZoom] = useState(1);
    const [selectedPlacement, setSelectedPlacement] = useState(null);

    const rawPlacements = result?.resultingPlacements || [];

    const usedFixtureIds = new Set(rawPlacements.map(p => p.fixture_id));

    // If no placements (e.g. failed/empty), show all (or maybe none?)
    // Let's filter if we have placements.
    const relevantFixtures = rawPlacements.length > 0
        ? fixtures.filter(f => usedFixtureIds.has(f._id))
        : fixtures;

    // Group levels by fixture
    const fixturesWithLevels = relevantFixtures.map(fixture => {
        const fixtureLevels = levels
            .filter(l => l.fixtureId === fixture._id)
            .sort((a, b) => b.levelIndex - a.levelIndex); // Top to bottom
        return { ...fixture, levels: fixtureLevels };
    });



    // Merge Product Data
    const placements = rawPlacements.map(p => {
        // Try matching by ID first, then by normalized SKU
        const product = products.find(prod =>
            (p.product_id && prod._id === p.product_id) ||
            (prod.sku && p.sku && prod.sku.toLowerCase() === p.sku.toLowerCase())
        ) || {};
        const level = levels.find(l => l._id === p.level_id) || {};

        const productDepth = product.depthCm || 10;
        const productHeight = product.heightCm || 10;

        const shelfDepth = level.usableDepthCm || 40;
        const shelfHeight = level.usableHeightCm || 40;

        const unitsDeep = Math.floor(shelfDepth / productDepth) || 1;
        const unitsHigh = Math.floor(shelfHeight / productHeight) || 1;



        return {
            ...p,
            product_name: product.productName || p.sku,
            widthCm: product.widthCm || 10,
            heightCm: productHeight,
            depthCm: productDepth,
            image_url: product.image_url,
            product_id: product._id,
            facings: p.facings || 1,
            shelfDepth: shelfDepth,
            unitsDeep: unitsDeep,
            unitsHigh: unitsHigh
        };
    });

    // Scale factor for rendering (cm to pixels)
    const SCALE = 4 * zoom;

    return (
        <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col animate-in fade-in duration-200">

            {/* Toolbar */}
            <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
                    >
                        <FaArrowLeft />
                    </button>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Planogram Results</h2>
                        <p className="text-xs text-slate-500">
                            Score: {result?.bestScore?.toFixed(1) || 'N/A'} • Placements: {placements.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-2 hover:bg-white rounded-md text-slate-600"><FaSearchMinus /></button>
                    <span className="text-xs font-mono w-12 text-center">{(zoom * 100).toFixed(0)}%</span>
                    <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="p-2 hover:bg-white rounded-md text-slate-600"><FaSearchPlus /></button>
                </div>
            </div>

            {/* Main Canvas Area */}
            <div className="flex-1 overflow-auto p-8 relative">
                <div className="flex gap-12 min-w-max items-end absolute bottom-8 left-8">
                    {fixturesWithLevels.map(fixture => (
                        <div
                            key={fixture._id}
                            className="relative bg-white border-4 border-slate-300 shadow-xl"
                            style={{
                                width: fixture.totalWidthCm * SCALE,
                                height: fixture.totalHeightCm * SCALE,
                                borderRadius: '4px'
                            }}
                        >
                            {/* Fixture Label */}
                            {/* Fixture Label */}
                            <div className="absolute -top-20 left-0 w-full text-center z-30 pointer-events-none">
                                <span className="inline-block bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 shadow-sm font-bold text-slate-600 text-sm whitespace-nowrap">
                                    {fixture.aisleBaySide}
                                </span>
                            </div>

                            {/* Render Shelves */}
                            {fixture.levels.map(level => {
                                // Find products on this level
                                const itemsOnShelf = placements.filter(p => p.level_id === level._id);

                                return (
                                    <div
                                        key={level._id}
                                        className="absolute w-full bg-slate-200 border-b-4 border-slate-400 group"
                                        style={{
                                            bottom: level.heightFromFloorCm * SCALE,
                                            height: '4px', // Visual thickness of shelf
                                            width: '100%'
                                        }}
                                    >
                                        {/* Shelf Label (Hover) */}
                                        <div className="absolute right-0 -top-6 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Lvl {level.levelIndex + 1}
                                        </div>

                                        {/* Render Products on this shelf */}
                                        {itemsOnShelf.map((item, idx) => {
                                            // Calculate dimensions based on enhanced data
                                            const w = (item.widthCm * item.facings) * SCALE;
                                            const h = item.heightCm * SCALE;
                                            const x = item.x_position * SCALE;

                                            const isSelected = selectedPlacement && selectedPlacement._id === item._id;

                                            // Vertical Stacking Loop
                                            return Array.from({ length: item.unitsHigh || 1 }).map((_, stackIdx) => (
                                                <div
                                                    key={`${idx}-${stackIdx}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPlacement(item);
                                                    }}
                                                    className={`absolute border border-black/10 hover:border-indigo-500 hover:z-[60] cursor-pointer transition-all shadow-sm group/item
                                                        ${isSelected ? 'ring-2 ring-indigo-500 z-40' : 'z-10'}`}
                                                    style={{
                                                        left: x,
                                                        width: w,
                                                        height: h,
                                                        bottom: 4 + (stackIdx * h), // Stack upwards. Fixed 4px offset to match shelf height.
                                                        backgroundImage: `url(${item.image_url || 'https://via.placeholder.com/50?text=' + item.product_name.substring(0, 2)})`,
                                                        backgroundSize: 'cover',
                                                        backgroundRepeat: 'no-repeat',
                                                        backgroundPosition: 'center',
                                                        backgroundColor: 'white'
                                                    }}
                                                >
                                                    {/* Hover Tooltip - Top Item Only */}
                                                    {stackIdx === (item.unitsHigh - 1) && (
                                                        <div className="hidden group-hover/item:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                            {item.product_name} ({item.facings}f x {item.unitsHigh}h)
                                                        </div>
                                                    )}
                                                </div>
                                            ));
                                        })}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>

            {/* Sidebar Details Panel */}
            {selectedPlacement && (
                <div className="absolute right-6 top-24 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in slide-in-from-right duration-200 z-50">
                    <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex justify-between items-start">
                        <h3 className="font-bold text-indigo-900">Product Details</h3>
                        <button onClick={() => setSelectedPlacement(null)} className="text-indigo-400 hover:text-indigo-700"><FaTimesCircle /></button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-white border border-slate-200 rounded-lg flex items-center justify-center p-2 overflow-hidden">
                                {selectedPlacement.image_url ?
                                    <img src={selectedPlacement.image_url} alt="" className="object-contain w-full h-full" /> :
                                    <FaBox className="text-slate-300 text-2xl" />
                                }
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 leading-tight text-sm">{selectedPlacement.product_name}</p>
                                <p className="text-xs text-slate-500 mt-1">SKU: {selectedPlacement.sku}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="bg-slate-50 p-2 rounded">
                                <p className="text-[10px] text-slate-400 uppercase">Position (X)</p>
                                <p className="font-medium">{selectedPlacement.x_position?.toFixed(1)} cm</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded">
                                <p className="text-[10px] text-slate-400 uppercase">Facings</p>
                                <p className="font-medium">{selectedPlacement.facings}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded">
                                <p className="text-[10px] text-slate-400 uppercase">Width Used</p>
                                <p className="font-medium">{(selectedPlacement.widthCm * selectedPlacement.facings).toFixed(1)} cm</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded">
                                <p className="text-[10px] text-slate-400 uppercase">Units Deep</p>
                                <p className="font-medium">{selectedPlacement.unitsDeep}</p>
                            </div>
                            <div className="bg-slate-50 p-2 rounded">
                                <p className="text-[10px] text-slate-400 uppercase">Units High</p>
                                <p className="font-medium">{selectedPlacement.unitsHigh}</p>
                            </div>
                            <div className="bg-indigo-50 p-2 rounded col-span-2">
                                <p className="text-[10px] text-indigo-400 uppercase font-bold">Total Stock Capacity</p>
                                <p className="font-bold text-indigo-700">{selectedPlacement.facings * selectedPlacement.unitsDeep * selectedPlacement.unitsHigh} Units</p>
                            </div>

                        </div>

                        <div className="text-xs text-slate-400 pt-2 border-t border-slate-100 break-all">
                            Shelf Level ID: {selectedPlacement.level_id}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Internal Import helper
import { FaTimesCircle } from 'react-icons/fa';

export default PlanogramViewer;
