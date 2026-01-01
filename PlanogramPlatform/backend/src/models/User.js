import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    store: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', default: null },
    role: { type: String, enum: ["admin", "owner", "manager", "staff"], default: "staff" },
    isActive: { type: Boolean, default: false },
    emailVerified: { type: Boolean, default: false },
    lastLoginAt: { type: Date, default: null }
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
