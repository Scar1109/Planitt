import axios from 'axios';

// Configuration
const BACKEND_URL = 'http://localhost:3000/api/compliance/check';

// Mock Data (Simulation of what Frontend sends)
const payload = {
    current_planogram: {
        placements: [
            // SCENARIO 1: MISSING ITEM
            // Optimized has SKU "LOC-COCO-500ML" but Current doesn't.
            
            // SCENARIO 2: MISPLACED ITEM
            // SKU "LOC-SOAP-BAR" is on Level 1 (Bottom), but Optimized wants Level 4 (Eye Level).
            { sku: "LK-GRA-TPSCQ", fixtureId: "G1", levelIndex: 1, facings: 2, positionXcm: 10 } 
        ]
    },
    optimized_planogram: {
        placements: [
            { sku: "LK-GRA-TPSCQ", fixtureId: "G1", levelIndex: 4, facings: 2 } 
        ]
    }
};

async function runTest() {
    console.log("🚀 Starting End-to-End Compliance Test...");
    console.log("----------------------------------------");
    console.log("Testing Payload:");
    console.log(JSON.stringify(payload, null, 2));
    console.log("----------------------------------------");

    try {
        console.log(`Sending request to ${BACKEND_URL}...`);
        const response = await axios.post(BACKEND_URL, payload);

        console.log("✅ Test Passed! Received Response:");
        console.log("----------------------------------------");
        
        const data = response.data;
        
        console.log(`📊 Compliance Score: ${data.score}`);
        console.log(`📉 Revenue Opportunity: ${data.total_revenue_opportunity} ${data.currency}`);
        console.log(`🔍 Detected Deviations: ${data.deviations.length}`);
        
        data.deviations.forEach((d, i) => {
            console.log(`   [${i+1}] Type: ${d.type} | SKU: ${d.sku}`);
            if(d.impact_prediction) {
                console.log(`       -> Prediction: Current Sales: ${d.impact_prediction.sales_units_current}, Optimized: ${d.impact_prediction.sales_units_optimized}`);
                console.log(`       -> Opportunity: ${d.impact_prediction.revenue_opportunity} ${data.currency}`);
            }
        });

        console.log("----------------------------------------");
        console.log("🤖 AI Agent Summary:");
        console.log(data.agent_summary);
        console.log("----------------------------------------");

    } catch (error) {
        console.error("❌ Test Failed!");
        if (error.response) {
            console.error(`Status: ${error.response.status}`);
            console.error("Data:", error.response.data);
        } else {
            console.error(error.message);
        }
    }
}

runTest();
