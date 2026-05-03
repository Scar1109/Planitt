import axios from 'axios';
import { OpenAI } from 'openai';
import SavedSimulation from '../models/SavedSimulation.js';

const PYTHON_SERVICE_URL = 'http://localhost:8001/api/v1';

/* ═══════════════════════════════════════════════════════════════
   VALIDATION HELPERS
   Item 3: Unit validation — reject bad inputs before they reach
           the Python AI server and produce misleading outputs.
   ═══════════════════════════════════════════════════════════════ */

/**
 * Validates a SKU payload and returns an array of error strings.
 * All monetary values are in LKR. Discount is a decimal (0.0–1.0).
 */
const validateSKU = (sku) => {
    const errors = [];
    if (!sku) { errors.push('sku object is required'); return errors; }

    if (!sku.sku_id || typeof sku.sku_id !== 'string' || sku.sku_id.trim() === '') {
        errors.push('sku_id must be a non-empty string');
    }
    if (typeof sku.base_price !== 'number' || sku.base_price <= 0) {
        errors.push('base_price must be a positive number (LKR per unit)');
    }
    if (typeof sku.cost_price !== 'number' || sku.cost_price <= 0) {
        errors.push('cost_price must be a positive number (LKR per unit)');
    }
    if (sku.base_price > 0 && sku.cost_price > 0 && sku.cost_price >= sku.base_price) {
        errors.push('cost_price must be less than base_price (negative margin detected)');
    }
    if (typeof sku.stock_level !== 'number' || sku.stock_level < 0) {
        errors.push('stock_level must be a non-negative integer (units in stock)');
    }
    if (!sku.category || typeof sku.category !== 'string') {
        errors.push('category must be a non-empty string');
    }
    if (!sku.brand || typeof sku.brand !== 'string') {
        errors.push('brand must be a non-empty string');
    }
    return errors;
};

const validateDiscount = (discount, fieldName = 'test_discount') => {
    const errors = [];
    if (typeof discount !== 'number') {
        errors.push(`${fieldName} must be a number (decimal between 0.0 and 1.0, e.g. 0.15 = 15%)`);
    } else if (discount < 0 || discount > 1) {
        errors.push(`${fieldName} must be between 0.0 and 1.0 (received ${discount} — did you pass a percentage instead of a decimal?)`);
    }
    return errors;
};

const validateDuration = (duration_days) => {
    const errors = [];
    if (!Number.isInteger(duration_days) || duration_days < 1) {
        errors.push('duration_days must be a positive integer (number of campaign days)');
    }
    if (duration_days > 365) {
        errors.push('duration_days cannot exceed 365 (1 year maximum)');
    }
    return errors;
};

/* ═══════════════════════════════════════════════════════════════
   OUTPUT SANITY CHECKS
   Item 5: After AI returns results, flag implausible outputs
           rather than silently passing them to the frontend.
   ═══════════════════════════════════════════════════════════════ */

const sanitizeSimulationOutput = (data, sku, discount, duration_days) => {
    const warnings = [];
    const flags = [];

    const promoPrice = sku.base_price * (1 - discount);
    const margin = promoPrice - sku.cost_price;

    // Flag: uplift exceeds total stock
    if (data.uplift > sku.stock_level) {
        warnings.push(`Projected uplift (${data.uplift.toFixed(1)} units) exceeds current stock level (${sku.stock_level} units) — consider restocking before running this promotion`);
        flags.push('UPLIFT_EXCEEDS_STOCK');
    }

    // Flag: negative margin on promo price
    if (margin < 0) {
        warnings.push(`Promo price (LKR ${promoPrice.toFixed(2)}) is below cost price (LKR ${sku.cost_price.toFixed(2)}) — this promotion sells at a loss per unit`);
        flags.push('NEGATIVE_MARGIN');
    }

    // Flag: implausibly large profit lift (> total stock value)
    const maxTheoreticalProfit = sku.stock_level * (sku.base_price - sku.cost_price);
    if (Math.abs(data.profit_lift) > maxTheoreticalProfit * 2) {
        warnings.push(`Profit lift (LKR ${data.profit_lift.toFixed(2)}) appears implausibly large relative to stock value — verify input prices`);
        flags.push('IMPLAUSIBLE_PROFIT_LIFT');
    }

    // Flag: uplift is negative (model predicts promotion hurts sales)
    if (data.uplift < 0) {
        warnings.push(`Model predicts this discount will reduce sales by ${Math.abs(data.uplift).toFixed(1)} units — this may indicate the product has inelastic demand at this price point`);
        flags.push('NEGATIVE_UPLIFT');
    }

    // Flag: very high discount with low profit lift (poor value promotion)
    if (discount >= 0.5 && data.profit_lift < 0) {
        warnings.push(`A ${(discount * 100).toFixed(0)}% discount is generating negative profit lift — consider a lower discount or different product`);
        flags.push('HIGH_DISCOUNT_LOW_RETURN');
    }

    // Flag: zero baseline (model may not have data for this SKU)
    if (data.baseline === 0 || data.baseline == null) {
        warnings.push(`Baseline forecast is zero — the model may lack sufficient historical data for SKU ${sku.sku_id}`);
        flags.push('ZERO_BASELINE');
    }

    return {
        ...data,
        output_warnings: warnings,
        output_flags: flags,
        // Expose the computed values used in validation for transparency
        computation_context: {
            promo_price_lkr: parseFloat(promoPrice.toFixed(2)),
            margin_per_unit_lkr: parseFloat(margin.toFixed(2)),
            discount_pct: parseFloat((discount * 100).toFixed(1)),
            duration_days,
            stock_level: sku.stock_level,
            model: 'HybridForecaster (RF) + S-Learner (XGBoost)',
            note: 'All values are statistical estimates. Verify before applying.'
        }
    };
};

/* ═══════════════════════════════════════════════════════════════
   CONTROLLERS
   ═══════════════════════════════════════════════════════════════ */

export const checkHealth = async (req, res) => {
    try {
        const response = await axios.get(`http://localhost:8001/health`);
        res.json(response.data);
    } catch (error) {
        console.error('Error calling Python health endpoint:', error.message);
        res.status(503).json({ message: 'Python promotion forecasting service unavailable' });
    }
};

export const simulatePromotion = async (req, res) => {
    try {
        const { sku, duration_days, test_discount } = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        const errors = [
            ...validateSKU(sku),
            ...validateDiscount(test_discount),
            ...validateDuration(duration_days)
        ];
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Input validation failed',
                errors,
                unit_reference: {
                    base_price: 'LKR per unit (must be > 0)',
                    cost_price: 'LKR per unit (must be > 0 and < base_price)',
                    test_discount: 'Decimal 0.0–1.0 (e.g. 0.15 = 15% off)',
                    stock_level: 'Integer units in stock (must be >= 0)',
                    duration_days: 'Integer days (1–365)'
                }
            });
        }

        // ── Call Python AI Engine ──────────────────────────────────
        const response = await axios.post(`${PYTHON_SERVICE_URL}/simulate/sku`, req.body);

        // ── Output Sanity Check (Item 5) ───────────────────────────
        const sanitized = sanitizeSimulationOutput(response.data, sku, test_discount, duration_days);

        res.json(sanitized);
    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else if (error.request) {
            res.status(503).json({ message: 'Python service unavailable' });
        } else {
            res.status(500).json({ message: 'Error calling promotion forecasting service', error: error.message });
        }
    }
};

export const generatePlan = async (req, res) => {
    try {
        const { skus, constraints, objective } = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        if (!Array.isArray(skus) || skus.length === 0) {
            return res.status(400).json({ message: 'skus must be a non-empty array' });
        }

        const allErrors = [];
        skus.forEach((sku, i) => {
            const errs = validateSKU(sku);
            if (errs.length > 0) allErrors.push(`SKU[${i}] (${sku?.sku_id || 'unknown'}): ${errs.join(', ')}`);
        });

        if (constraints) {
            if (constraints.max_slots != null && (!Number.isInteger(constraints.max_slots) || constraints.max_slots < 1)) {
                allErrors.push('constraints.max_slots must be a positive integer');
            }
            if (constraints.min_margin_pct != null && (constraints.min_margin_pct < 0 || constraints.min_margin_pct > 1)) {
                allErrors.push('constraints.min_margin_pct must be between 0.0 and 1.0');
            }
        }

        if (allErrors.length > 0) {
            return res.status(400).json({ message: 'Input validation failed', errors: allErrors });
        }

        // ── Call Python (Deterministic Math Engine) ────────────────
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/plan/generate`, req.body);
        const deterministicPlan = pythonResponse.data;

        // ── Output Sanity Check on each recommendation (Item 5) ────
        if (Array.isArray(deterministicPlan.recommendations)) {
            deterministicPlan.recommendations = deterministicPlan.recommendations.map(rec => {
                const matchedSku = skus.find(s => s.sku_id === rec.sku_id);
                if (!matchedSku) return rec;
                const warnings = [];
                if (rec.uplift_forecast > matchedSku.stock_level) {
                    warnings.push(`Uplift (${rec.uplift_forecast.toFixed(1)} units) exceeds stock (${matchedSku.stock_level} units)`);
                }
                const promoMargin = matchedSku.base_price * (1 - rec.discount_depth) - matchedSku.cost_price;
                if (promoMargin < 0) {
                    warnings.push(`Promo price is below cost — selling at a loss`);
                }
                return { ...rec, output_warnings: warnings };
            });
        }

        // ── GPT-4o Narrative ───────────────────────────────────────
        let narrativeExplanation = '';
        try {
            const openai = new OpenAI();
            const prompt = `
                You are a Senior Retail Strategist. Briefly summarize this scientifically-formulated promotion plan.
                Do not make up any new numeric facts. Only use numbers from this JSON:
                ${JSON.stringify(deterministicPlan.summary_stats)}
                Focus on high-level impact and key recommended items. Max 3 sentences.
            `;
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are a professional retail planner. Mention no new numbers.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 300,
                temperature: 0.7
            });
            narrativeExplanation = completion.choices[0].message.content.trim();
        } catch (llmError) {
            console.error('OpenAI Narrative Generation Error:', llmError.message);
            narrativeExplanation = 'Narrative generation unavailable. Review raw figures above.';
        }

        res.json({ ...deterministicPlan, narrative_explanation: narrativeExplanation });
    } catch (error) {
        console.error('Error calling Python service:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error calling promotion planning service', error: error.message });
        }
    }
};

export const explainSimulation = async (req, res) => {
    try {
        const simData = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        const errors = [];
        if (!simData.sku_id) errors.push('sku_id is required');
        if (typeof simData.discount !== 'number' || simData.discount < 0 || simData.discount > 1) {
            errors.push('discount must be a decimal between 0.0 and 1.0');
        }
        if (typeof simData.uplift !== 'number') errors.push('uplift must be a number (units)');
        if (typeof simData.revenue_lift !== 'number') errors.push('revenue_lift must be a number (LKR)');
        if (typeof simData.profit_lift !== 'number') errors.push('profit_lift must be a number (LKR)');
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Input validation failed', errors });
        }

        const openai = new OpenAI();
        const prompt = `
            You are a Retail Strategist. Explain the financial outcome of this promotion in 2-3 sentences.
            SKU: ${simData.sku_id}
            Discount: ${(simData.discount * 100).toFixed(1)}% off base price
            Uplift: +${simData.uplift.toFixed(2)} units over ${simData.duration_days} days
            Revenue Lift vs doing nothing: LKR ${simData.revenue_lift.toFixed(2)}
            Profit Lift (accounting for margin lost on base units): LKR ${simData.profit_lift.toFixed(2)}
            Is this a good idea? Explain why concisely. Do not invent new numbers.
        `;
        const completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: 'You are a professional retail planner. Be concise and factual.' },
                { role: 'user', content: prompt }
            ],
            max_tokens: 200,
            temperature: 0.7
        });
        res.json({ explanation: completion.choices[0].message.content.trim() });
    } catch (error) {
        console.error('OpenAI Error:', error.message);
        res.status(500).json({ explanation: 'Explanation generation failed. Please check backend logs or OpenAI credits.' });
    }
};

export const findOptimalDiscount = async (req, res) => {
    try {
        const { sku, duration_days } = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        const errors = [
            ...validateSKU(sku),
            ...validateDuration(duration_days)
        ];
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Input validation failed', errors });
        }

        // ── Sweep discounts 5%–80% concurrently ───────────────────
        const requests = [];
        for (let d = 5; d <= 80; d++) {
            const discount = d / 100;
            const simPayload = { ...req.body, test_discount: discount };
            requests.push(
                axios.post(`${PYTHON_SERVICE_URL}/simulate/sku`, simPayload)
                    .then(response => ({
                        discount,
                        simulation: response.data,
                        profit_lift: response.data.profit_lift
                    }))
                    .catch(() => null) // don't let one failure kill the sweep
            );
        }

        const simulations = (await Promise.all(requests)).filter(Boolean);

        if (simulations.length === 0) {
            return res.status(503).json({ message: 'All discount simulations failed — Python service may be unavailable' });
        }

        simulations.sort((a, b) => b.profit_lift - a.profit_lift);
        const top5 = simulations.slice(0, 5);

        // ── Output Sanity Check on optimal result (Item 5) ─────────
        const sanitizedOptimal = sanitizeSimulationOutput(
            top5[0].simulation, sku, top5[0].discount, duration_days
        );

        res.json({
            optimal_discount: top5[0].discount,
            simulation: sanitizedOptimal,
            top_5: top5
        });
    } catch (error) {
        console.error('Error finding optimal discount:', error.message);
        res.status(500).json({ message: 'Error finding optimal discount', error: error.message });
    }
};

export const saveSimulation = async (req, res) => {
    try {
        // ── Input Validation (Item 3) ──────────────────────────────
        const { skuId, basePrice, costPrice, discount, durationDays } = req.body;
        const errors = [];
        if (!skuId) errors.push('skuId is required');
        if (typeof basePrice !== 'number' || basePrice <= 0) errors.push('basePrice must be a positive number (LKR)');
        if (typeof costPrice !== 'number' || costPrice <= 0) errors.push('costPrice must be a positive number (LKR)');
        if (typeof discount !== 'number' || discount < 0 || discount > 1) errors.push('discount must be decimal 0.0–1.0');
        if (!Number.isInteger(durationDays) || durationDays < 1) errors.push('durationDays must be a positive integer');
        if (errors.length > 0) {
            return res.status(400).json({ message: 'Validation failed — simulation not saved', errors });
        }

        const newSim = new SavedSimulation(req.body);
        const saved = await newSim.save();
        res.status(201).json(saved);
    } catch (error) {
        console.error('Error saving simulation:', error.message);
        res.status(500).json({ message: 'Error saving simulation', error: error.message });
    }
};

export const getSavedSimulations = async (req, res) => {
    try {
        const sims = await SavedSimulation.find().sort({ createdAt: -1 });
        res.json(sims);
    } catch (error) {
        console.error('Error fetching saved simulations:', error.message);
        res.status(500).json({ message: 'Error fetching saved simulations', error: error.message });
    }
};