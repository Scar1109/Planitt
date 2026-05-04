import React, { useState } from 'react';
import { FaArrowLeft, FaBox, FaInfoCircle, FaSearchPlus, FaSearchMinus, FaExpand } from 'react-icons/fa';
import { ProductShape, getProductBgColor } from './ProductShapes';

const PlanogramViewer = ({ onClose, result, fixtures = [], levels = [], products = [] }) => {
    const [zoom, setZoom] = useState(0.8);
    const [selectedPlacement, setSelectedPlacement] = useState(null);

    const rawPlacements = result?.resultingPlacements || [];

    // Normalize IDs to strings for robust comparison
    const usedFixtureIds = new Set(rawPlacements.map(p => String(p.fixture_id || '')));

    // If no placements (e.g. failed/empty), show all fixtures
    // Otherwise, filter to only show fixtures that have products on them
    // If no placements match any fixtures, fallback to showing all available fixtures
    // to avoid a completely empty screen.
    let relevantFixtures = fixtures.filter(f => usedFixtureIds.has(String(f._id)));
    if (relevantFixtures.length === 0 && fixtures.length > 0) {
        relevantFixtures = fixtures;
    }

    // Group levels by fixture
    const fixturesWithLevels = relevantFixtures.map(fixture => {
        const fixtureIdStr = String(fixture._id);
        const fixtureLevels = levels
            .filter(l => String(l.fixtureId) === fixtureIdStr)
            .sort((a, b) => b.levelIndex - a.levelIndex); // Top to bottom
        return { ...fixture, levels: fixtureLevels };
    });



    // Merge Product Data
    const placements = rawPlacements.map(p => {
        // Try matching by ID first, then by normalized SKU
        const pProductIdStr = p.product_id ? String(p.product_id) : null;
        const pLevelIdStr = p.level_id ? String(p.level_id) : null;

        const product = products.find(prod =>
            (pProductIdStr && String(prod._id) === pProductIdStr) ||
            (prod.sku && p.sku && prod.sku.toLowerCase() === p.sku.toLowerCase())
        ) || {};

        const level = levels.find(l => String(l._id) === pLevelIdStr) || {};

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
            category: product.category || 'General',
            brand: product.brand || '',
            product_id: product._id,
            facings: p.facings || 1,
            shelfDepth: shelfDepth,
            unitsDeep: unitsDeep,
            unitsHigh: unitsHigh
        };
    });

    // Scale factor for rendering (cm to pixels)
    // Using 3 as a better base for typical screen resolutions
    const SCALE = 3 * zoom;

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
                            Score: {((result?.bestScore !== undefined && result?.bestScore !== null) ? result.bestScore.toFixed(1) : (result?.score !== undefined ? result.score.toFixed(1) : 'N/A'))} • Placements: {placements.length}
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
                            className="relative bg-white outline outline-4 outline-slate-300 shadow-xl"
                            style={{
                                width: fixture.totalWidthCm * SCALE,
                                height: fixture.totalHeightCm * SCALE,
                                borderRadius: '4px',
                                minWidth: fixture.totalWidthCm * SCALE
                            }}
                        >
                            {/* Fixture Label */}
                            <div className="absolute -top-12 left-0 w-full text-center z-30 pointer-events-none">
                                <span className="inline-block bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full border border-slate-200 shadow-sm font-bold text-slate-600 text-[10px] whitespace-nowrap">
                                    {fixture.aisleBaySide}
                                </span>
                            </div>

                            {/* Render Shelves */}
                            {fixture.levels.map(level => {
                                // Find products on this level - normalize IDs
                                const levelIdStr = String(level._id);
                                const itemsOnShelf = placements.filter(p => String(p.level_id) === levelIdStr);

                                return (
                                    <div
                                        key={level._id}
                                        className="absolute w-full bg-slate-300 border-b-2 border-slate-400 group overflow-hidden"
                                        style={{
                                            bottom: level.heightFromFloorCm * SCALE,
                                            height: '4px', // Visual thickness of shelf
                                            width: '100%',
                                            overflow: 'visible' // Ensure products stick out from the 4px bar
                                        }}
                                    >
                                        {/* Shelf Label (Hover) */}
                                        <div className="absolute right-0 -top-6 text-[10px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                            Lvl {level.levelIndex + 1}
                                        </div>

                                        {/* Render Products on this shelf */}
                                        {itemsOnShelf.map((item, idx) => {
                                            // Per-facing width (one square = one facing)
                                            const singleW = item.widthCm * SCALE;
                                            const h = item.heightCm * SCALE;
                                            const baseX = item.x_position * SCALE;
                                            const bgColor = getProductBgColor(item.product_name, item.sku);

                                            const isSelected = selectedPlacement && selectedPlacement._id === item._id;

                                            // Render individual squares: one per facing × stacking height
                                            const elements = [];
                                            for (let facingIdx = 0; facingIdx < (item.facings || 1); facingIdx++) {
                                                for (let stackIdx = 0; stackIdx < (item.unitsHigh || 1); stackIdx++) {
                                                    const isTopOfStack = stackIdx === (item.unitsHigh - 1) && facingIdx === 0;
                                                    elements.push(
                                                        <div
                                                            key={`${idx}-f${facingIdx}-s${stackIdx}`}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedPlacement(item);
                                                            }}
                                                            className={`absolute border border-black/10 hover:border-[#17A2B8] hover:z-[60] cursor-pointer transition-all shadow-sm group/item rounded-[2px] overflow-hidden
                                                                ${isSelected ? 'ring-2 ring-[#17A2B8] z-40' : 'z-10'}`}
                                                            style={{
                                                                left: baseX + (facingIdx * singleW),
                                                                width: singleW,
                                                                height: h,
                                                                bottom: 4 + (stackIdx * h),
                                                                backgroundColor: bgColor,
                                                            }}
                                                        >
                                                            {/* Category shape as label */}
                                                            <div className="w-full h-full flex items-center justify-center p-[1px]">
                                                                <ProductShape
                                                                    category={item.category}
                                                                    brand={item.brand}
                                                                    productName={item.product_name}
                                                                    sku={item.sku}
                                                                />
                                                            </div>

                                                            {/* Hover Tooltip - only on top-left unit */}
                                                            {isTopOfStack && (
                                                                <div className="hidden group-hover/item:block absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none shadow-lg">
                                                                    {item.product_name} ({item.facings}f × {item.unitsHigh}h × {item.unitsDeep}d)
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                }
                                            }
                                            return elements;
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
                    <div className="bg-[#17A2B8]/10 p-4 border-b border-[#17A2B8]/20 flex justify-between items-start">
                        <h3 className="font-bold text-[#1B4F72]">Product Details</h3>
                        <button onClick={() => setSelectedPlacement(null)} className="text-[#17A2B8] hover:text-[#138f9e]"><FaTimesCircle /></button>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex gap-4">
                            <div className="w-16 h-16 border border-slate-200 rounded-lg flex items-center justify-center p-2 overflow-hidden"
                                style={{ backgroundColor: getProductBgColor(selectedPlacement.product_name, selectedPlacement.sku) }}>
                                <ProductShape
                                    category={selectedPlacement.category}
                                    brand={selectedPlacement.brand}
                                    productName={selectedPlacement.product_name}
                                    sku={selectedPlacement.sku}
                                />
                            </div>
                            <div>
                                <p className="font-bold text-slate-800 leading-tight text-sm">{selectedPlacement.product_name}</p>
                                <p className="text-xs text-slate-500 mt-1">SKU: {selectedPlacement.sku}</p>
                                <div className="flex gap-1 mt-1">
                                    <span className="px-1.5 py-0.5 bg-[#17A2B8]/10 text-[#1B4F72] text-[9px] font-bold rounded">{selectedPlacement.category}</span>
                                    {selectedPlacement.brand && <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded">{selectedPlacement.brand}</span>}
                                </div>
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
                            <div className="bg-[#17A2B8]/10 p-2 rounded col-span-2">
                                <p className="text-[10px] text-[#1B4F72] uppercase font-bold">Total Stock Capacity</p>
                                <p className="font-bold text-[#1B4F72]">{selectedPlacement.facings * selectedPlacement.unitsDeep * selectedPlacement.unitsHigh} Units</p>
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
