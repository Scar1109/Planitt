import OpenAI from 'openai';
import dotenv from 'dotenv';
dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const generateSummary = async (data) => {
    try {
        if (!data || !data.deviations) return "No data available for analysis.";

        const score = data.score;
        const loss = data.total_revenue_opportunity;
        const deviationsCount = data.deviations.length;
        
        // Construct a concise context for the LLM
        const prompt = `
        You are a Retail Compliance Manager. Analyze the following Planogram Compliance Report:
        
        - Compliance Score: ${score}/100
        - Detected Deviations: ${deviationsCount}
        - Estimated Revenue Loss: ${loss} ${data.currency}
        
        Top 3 Deviations:
        ${data.deviations.slice(0, 3).map(d => `- [${d.type}] SKU: ${d.sku} (${d.description}) -> Loss: ${d.impact_prediction?.revenue_opportunity || 0}`).join('\n')}
        
        Task: Write a precise, actionable executive summary (max 3 sentences) focusing on the financial impact and urgent actions required. Do not use markdown headers.
        `;

        const completion = await openai.chat.completions.create({
            messages: [{ role: "system", content: "You are a helpful assistant." }, { role: "user", content: prompt }],
            model: process.env.OPENAI_MODEL || "gpt-3.5-turbo", 
        });

        return completion.choices[0].message.content;

    } catch (error) {
        console.error("OpenAI Agent Error:", error);
        return "Agent is currently offline. Please refer to the raw data detected above.";
    }
};

/**
 * analyzeShelfImage
 * Uses OpenAI Vision to detect SKUs and counts from a shelf image.
 * @param {string} imageBase64 - Base64 encoded image or path
 * @param {Array} expectedProducts - List of expected product SKUs and names for grounding
 */
const analyzeShelfImage = async (imageBase64, groundingByLevel) => {
    try {
        const prompt = `
        You are a Specialized Retail Audit Intelligence System. 
        Your task is to VERIFY product counts on a retail shelf against a specific planogram map.
        
        STRUCTURED AUDIT CHECKLIST (By Shelf Level):
        ${Object.entries(groundingByLevel).map(([level, items]) => `
        LEVEL ${level} (${level == 0 ? 'Bottom' : 'Middle/Top'}):
        ${items.map(p => `- SKU: ${p.sku}, Name: ${p.name}, Expected: ${p.expectedFacings}`).join('\n')}
        `).join('\n')}
        
        AUDITING RULES:
        1. Scan the image shelf-by-shelf (Level 0 is the bottom-most shelf).
        2. Specifically check each SKU in the checklist above. 
        3. Verify if the "Expected" number of facings exists. Report the ACTUAL number of horizontal facings you see.
        4. If a product is missing, record it as 0.
        5. Report any distinct empty shelf gaps as "oos_gaps_detected".
        
        Return ONLY a JSON object with this structure:
        {
            "detected_items": [
                { "sku": "SKU_CODE", "count": number, "confidence": 0.0-1.0 }
            ],
            "oos_gaps_detected": number,
            "unrecognized_items_count": number,
            "audit_insight": "A concise, professional summary (1-2 sentences) of the shelf adherence."
        }
        `;

        const completion = await openai.chat.completions.create({
            model: "gpt-4o", // Must use gpt-4o or gpt-4-vision-preview
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: prompt },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${imageBase64}`,
                            },
                        },
                    ],
                },
            ],
            response_format: { type: "json_object" },
            temperature: 0
        });

        return JSON.parse(completion.choices[0].message.content);

    } catch (error) {
        console.error("OpenAI Vision Error:", error);
        throw new Error("Failed to analyze shelf image via AI.");
    }
};

export default { generateSummary, analyzeShelfImage };
