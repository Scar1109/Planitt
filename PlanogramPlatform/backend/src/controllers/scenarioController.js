import axios from 'axios';
import { OpenAI } from 'openai';
import mongoose from 'mongoose';

const PYTHON_SERVICE_URL = 'http://localhost:8001/api/v1';

export const simulateQuickWhatIf = async (req, res) => {
    try {
        const payload = req.body; // { sku, duration_days, test_discount, facings_change, location }

        // 1. Call Python deterministic engine
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/scenario/quick`, payload);
        const data = pythonResponse.data;

        // 2. Synthesize Risk & Recommendation via OpenAI
        const openai = new OpenAI();
        const prompt = `
            You are an expert Retail Planner analyzing a scenario.
            Location: ${data.location_context}
            Facings Change: ${data.facings_applied}
            Expected Revenue Lift: LKR ${data.revenue_lift.toFixed(2)}
            Expected Profit Lift: LKR ${data.profit_lift.toFixed(2)}
            
            Based strictly on the profit lift, if profit lift > 0, recommend proceeding. If profit lift < 0, warn against it.
            Assess a risk level (Low, Medium, High). Provide exactly one short sentence for Risk Level, and one sentence for Recommendation.
            Format Response:
            Risk: [Level] - [Reason]
            Recommendation: [Text]
        `;

        let sentimentStr = "Risk: Unknown\\nRecommendation: Run analysis again.";
        try {
            const completion = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [{ role: "system", content: "You are a pragmatic retail AI." }, { role: "user", content: prompt }],
                max_tokens: 150,
                temperature: 0.5
            });
            sentimentStr = completion.choices[0].message.content.trim();
        } catch (llmError) {
            console.error("OpenAI error in Quick What If:", llmError.message);
        }

        let riskMatch = "Medium Risk";
        let recMatch = "Analysis inconclusive. Please try again.";

        const cleanStr = sentimentStr.replace(/\n+/g, ' ');
        const recSplit = cleanStr.split(/Recommendation:/i);

        if (recSplit.length > 1) {
            riskMatch = recSplit[0].replace(/Risk:/i, '').trim();
            recMatch = recSplit[1].trim();
        } else {
            riskMatch = cleanStr.replace(/Risk:/i, '').trim();
            recMatch = "";
        }

        res.json({
            ...data,
            risk_assessment: riskMatch,
            recommendation: recMatch
        });

    } catch (error) {
        console.error('Error in simulateQuickWhatIf:', error.message);
        res.status(500).json({ message: 'Error running Quick What-If simulation', error: error.message });
    }
};

export const comparePlanograms = async (req, res) => {
    try {
        const payload = req.body;

        // 1. Call Python compare endpoint
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/scenario/compare`, payload);
        const data = pythonResponse.data;

        // 2. Identify Better Option purely mathematically
        let betterOption = "Current Setup";
        let reason = "It yields higher overall profit.";
        if (data.delta.profit > 0) {
            betterOption = "Proposed Setup";
            reason = `It generates LKR ${data.delta.profit.toFixed(2)} more profit.`;
        } else if (data.delta.profit === 0) {
            betterOption = "Neutral";
            reason = "Both setups yield the same profit.";
        }

        res.json({
            ...data,
            verdict: {
                recommended_setup: betterOption,
                justification: reason
            }
        });

    } catch (error) {
        console.error('Error in comparePlanograms:', error.message);
        res.status(500).json({ message: 'Error comparing planograms', error: error.message });
    }
};

export const getFutureTrend = async (req, res) => {
    try {
        const payload = req.body;
        const year = new Date().getFullYear();
        const location = payload.location || 'Colombo';

        // 1. Python Base Trend
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/scenario/trend`, payload);
        const trendData = pythonResponse.data;

        // 2. Fetch National Holidays (Nager.Date API)
        let holidays = [];
        try {
            const hRes = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/LK`);
            // Filter to upcoming only for realism, but for demo we take all
            holidays = hRes.data.map(h => ({
                date: h.date,
                name: h.name,
                type: 'Holiday'
            }));
        } catch (e) {
            console.error("Failed to fetch Nager API", e.message);
        }

        // 3. Fake Local DB festival query (Simulated for this implementation)
        const localFestivals = [
            { date: `${year}-01-01`, name: "New Year's Day", type: "Event" },
            { date: `${year}-02-14`, name: "Valentine's Day Gifts & Promos", type: "Event" },
            { date: `${year}-04-14`, name: "Sinhala & Tamil New Year Festival", type: "Festival" },
            { date: `${year}-05-12`, name: "Mother's Day Shopping", type: "Event" },
            { date: `${year}-05-23`, name: "Vesak Full Moon Poya", type: "Festival" },
            { date: `${year}-06-16`, name: "Father's Day", type: "Event" },
            { date: `${year}-06-21`, name: "Poson Full Moon Poya", type: "Festival" },
            { date: `${year}-08-19`, name: "Nikini Full Moon Poya", type: "Festival" },
            { date: `${year}-11-29`, name: "Black Friday Sales", type: "Promotion" },
            { date: `${year}-12-20`, name: "Colombo Christmas Street & Holidays", type: "Local Event" }
        ];

        // Combine them
        let allEvents = [...holidays, ...localFestivals];

        // Filter events out that don't overlap with the requested trend dates
        const trendDates = trendData.trend.map(t => t.date);
        const minDate = trendDates[0];
        const maxDate = trendDates[trendDates.length - 1];

        allEvents = allEvents.filter(e => e.date >= minDate && e.date <= maxDate);

        // 4. OpenAI Synthesis
        let synthesis = "No major events detected in this window.";
        if (allEvents.length > 0) {
            const openai = new OpenAI();
            const prompt = `
                 You are a Retail Analyst. I have identified the following local events and holidays in ${location} between ${minDate} and ${maxDate}:
                 ${JSON.stringify(allEvents.map(e => e.name + " on " + e.date))}
                 
                 Write one short paragraph explaining how these events might impact retail sales momentum specifically in ${location}. 
                 Keep it strictly under 3 sentences.
             `;
            try {
                const completion = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [{ role: "system", content: "You are a concise retail analyst." }, { role: "user", content: prompt }],
                    max_tokens: 150,
                    temperature: 0.6
                });
                synthesis = completion.choices[0].message.content.trim();
            } catch (e) {
                synthesis = "Events found, but couldn't generate narrative summary.";
            }
        }

        res.json({
            ...trendData,
            events: allEvents,
            event_narrative: synthesis,
            readiness_status: allEvents.length > 0 ? "Requires Promotional Planning" : "Standard Trend"
        });

    } catch (error) {
        console.error('Error in getFutureTrend:', error.message);
        res.status(500).json({ message: 'Error generating future trend', error: error.message });
    }
};
