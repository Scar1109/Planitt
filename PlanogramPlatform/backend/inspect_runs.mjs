import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const OptimizationRunSchema = new mongoose.Schema({
    resultingPlacements: mongoose.Schema.Types.Mixed
});

const OptimizationRun = mongoose.model('OptimizationRun', OptimizationRunSchema);

async function inspect() {
    await mongoose.connect(process.env.MONGO_URI);
    const run = await OptimizationRun.findOne({ status: 'success' }).sort({ createdAt: -1 });
    if (!run) {
        console.log("No successful run found");
    } else {
        console.log("Run ID:", run._id);
        console.log("Sample Placement:", JSON.stringify(run.resultingPlacements[0], null, 2));
        
        // Count total placements and check if any have suspicious facing counts
        const placements = run.resultingPlacements;
        const total = placements.length;
        const highFacings = placements.filter(p => p.facings > 20);
        console.log(`Total Placements: ${total}`);
        console.log(`Placements with facings > 20: ${highFacings.length}`);
        if (highFacings.length > 0) {
            console.log("Example High Facing Placement:", JSON.stringify(highFacings[0], null, 2));
        }
    }
    await mongoose.disconnect();
}

inspect();
