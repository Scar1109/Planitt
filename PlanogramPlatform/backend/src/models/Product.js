import mongoose from "mongoose";

const ProductSchema = new mongoose.Schema({
    sku: { type: String, unique: true, index: true },
    barcode: String,
    productName: String,
    category: String,
    brand: String,
    unitSize: String,
    baseUnitPriceLKR: Number,
    typicalShelfLifeDays: Number,
    supplier: String,
    caseSize: Number,
    maxShelfCapacityUnits: Number,
    widthCm: { type: Number, required: true },
    heightCm: { type: Number, required: true },
    depthCm: { type: Number, required: true },
    unitCostLKR: { type: Number, required: true },
    minFacings: { type: Number, default: 1 },
    maxFacings: { type: Number, default: 10 },
    allowedTags: [{ type: String }],
    isActive: { type: Boolean, default: true }
});

export default mongoose.model("Product", ProductSchema);
