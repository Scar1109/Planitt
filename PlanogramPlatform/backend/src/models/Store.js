import mongoose from "mongoose";

const StoreSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: { type: String, default: null },
    phone: { type: String, default: null },
    location: {
        city: { type: String, default: null },
        latitude: { type: Number, default: 0 },
        longitude: { type: Number, default: 0 }
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

export default mongoose.model("Store", StoreSchema);
