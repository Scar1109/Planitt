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

export default { generateSummary };
