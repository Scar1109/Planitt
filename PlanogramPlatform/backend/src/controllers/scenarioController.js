import axios from 'axios';
import { OpenAI } from 'openai';

const PYTHON_SERVICE_URL = 'http://localhost:8001/api/v1';

/* ═══════════════════════════════════════════════════════════════
   SHARED VALIDATION HELPERS
   Item 3: Validate units before sending to Python AI server.
   ═══════════════════════════════════════════════════════════════ */

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
    return errors;
};

const validateDiscount = (value, fieldName) => {
    const errors = [];
    if (typeof value !== 'number') {
        errors.push(`${fieldName} must be a number (decimal 0.0–1.0, e.g. 0.15 = 15%)`);
    } else if (value < 0 || value > 1) {
        errors.push(`${fieldName} must be between 0.0 and 1.0 (received ${value} — did you pass a percentage instead of a decimal?)`);
    }
    return errors;
};

const validateDuration = (duration_days) => {
    const errors = [];
    if (!Number.isInteger(duration_days) || duration_days < 1) {
        errors.push('duration_days must be a positive integer');
    }
    if (duration_days > 365) {
        errors.push('duration_days cannot exceed 365');
    }
    return errors;
};

/* ═══════════════════════════════════════════════════════════════
   OUTPUT SANITY CHECKS
   Item 5: Flag implausible AI outputs instead of passing them
           silently to the frontend.
   ═══════════════════════════════════════════════════════════════ */

const sanitizeScenarioOutput = (data, sku, discount, duration_days, label = '') => {
    const warnings = [];
    const flags = [];

    if (!sku || !data) return { ...data, output_warnings: [], output_flags: [] };

    const promoPrice = sku.base_price * (1 - discount);
    const marginPerUnit = promoPrice - sku.cost_price;

    // Flag: promo price below cost
    if (marginPerUnit < 0) {
        warnings.push(`${label ? label + ': ' : ''}Promo price (LKR ${promoPrice.toFixed(2)}) is below cost (LKR ${sku.cost_price.toFixed(2)}) — selling at a per-unit loss`);
        flags.push('NEGATIVE_MARGIN');
    }

    // Flag: predicted units exceed stock
    const units = data.units ?? data.predicted_units ?? null;
    if (units !== null && units > sku.stock_level) {
        warnings.push(`${label ? label + ': ' : ''}Predicted units (${units.toFixed(1)}) exceed stock level (${sku.stock_level}) — restock before running this scenario`);
        flags.push('UNITS_EXCEED_STOCK');
    }

    // Flag: profit lift implausibly large
    const maxTheoreticalProfit = sku.stock_level * (sku.base_price - sku.cost_price);
    const profitLift = data.profit ?? data.profit_lift ?? null;
    if (profitLift !== null && Math.abs(profitLift) > maxTheoreticalProfit * 2) {
        warnings.push(`${label ? label + ': ' : ''}Profit figure (LKR ${profitLift.toFixed(2)}) appears implausibly large relative to total stock value — verify input prices`);
        flags.push('IMPLAUSIBLE_PROFIT');
    }

    // Flag: zero or null revenue
    const revenue = data.revenue ?? data.revenue_lift ?? null;
    if (revenue === 0 || revenue === null) {
        warnings.push(`${label ? label + ': ' : ''}Revenue is zero — model may lack historical data for this SKU`);
        flags.push('ZERO_REVENUE');
    }

    return { ...data, output_warnings: warnings, output_flags: flags };
};

/* ═══════════════════════════════════════════════════════════════
   CONTROLLERS
   ═══════════════════════════════════════════════════════════════ */

export const simulateQuickWhatIf = async (req, res) => {
    try {
        const { sku, duration_days, test_discount, facings_change, location } = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        const errors = [
            ...validateSKU(sku),
            ...validateDiscount(test_discount, 'test_discount'),
            ...validateDuration(duration_days)
        ];
        if (facings_change != null && (!Number.isInteger(facings_change) || facings_change < -100 || facings_change > 100)) {
            errors.push('facings_change must be an integer between -100 and 100');
        }
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Input validation failed',
                errors,
                unit_reference: {
                    base_price: 'LKR per unit',
                    cost_price: 'LKR per unit',
                    test_discount: 'Decimal 0.0–1.0',
                    facings_change: 'Integer delta (e.g. +2 or -1 facings)',
                    duration_days: 'Integer days 1–365'
                }
            });
        }

        // ── Call Python AI Engine ──────────────────────────────────
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/scenario/quick`, req.body);
        const data = pythonResponse.data;

        // ── Output Sanity Check (Item 5) ───────────────────────────
        const sanitized = sanitizeScenarioOutput(data, sku, test_discount, duration_days, 'Quick What-If');

        // ── GPT-4o Risk Assessment ─────────────────────────────────
        const openai = new OpenAI();
        const prompt = `
            You are an expert Retail Planner analyzing a scenario.
            Location: ${data.location_context || location || 'Unknown'}
            Facings Change: ${facings_change ?? 0}
            Expected Revenue Lift: LKR ${(data.revenue_lift ?? 0).toFixed(2)}
            Expected Profit Lift: LKR ${(data.profit_lift ?? 0).toFixed(2)}
            Output warnings: ${sanitized.output_warnings.join('; ') || 'None'}

            Based strictly on the profit lift, if profit lift > 0, recommend proceeding. If profit lift < 0, warn against it.
            If there are output warnings, factor them into your risk assessment.
            Assess a risk level (Low, Medium, High). Provide exactly one short sentence for Risk Level, and one for Recommendation.
            Format:
            Risk: [Level] - [Reason]
            Recommendation: [Text]
        `;

        let sentimentStr = 'Risk: Unknown\nRecommendation: Run analysis again.';
        try {
            const completion = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: 'You are a pragmatic retail AI. Be concise and factual.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 150,
                temperature: 0.5
            });
            sentimentStr = completion.choices[0].message.content.trim();
        } catch (llmError) {
            console.error('OpenAI error in Quick What If:', llmError.message);
        }

        let riskMatch = 'Medium Risk';
        let recMatch = 'Analysis inconclusive. Please try again.';
        const cleanStr = sentimentStr.replace(/\n+/g, ' ');
        const recSplit = cleanStr.split(/Recommendation:/i);
        if (recSplit.length > 1) {
            riskMatch = recSplit[0].replace(/Risk:/i, '').trim();
            recMatch = recSplit[1].trim();
        } else {
            riskMatch = cleanStr.replace(/Risk:/i, '').trim();
        }

        res.json({
            ...sanitized,
            risk_assessment: riskMatch,
            recommendation: recMatch,
            // Computation context for frontend transparency
            computation_context: {
                promo_price_lkr: parseFloat((sku.base_price * (1 - test_discount)).toFixed(2)),
                margin_per_unit_lkr: parseFloat((sku.base_price * (1 - test_discount) - sku.cost_price).toFixed(2)),
                discount_pct: parseFloat((test_discount * 100).toFixed(1)),
                duration_days,
                model: 'HybridForecaster (RF) + S-Learner (XGBoost)',
                note: 'Statistical estimate — verify before implementing'
            }
        });

    } catch (error) {
        console.error('Error in simulateQuickWhatIf:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error running Quick What-If simulation', error: error.message });
        }
    }
};

export const comparePlanograms = async (req, res) => {
    try {
        const {
            sku,
            current_discount,
            current_facings,
            proposed_discount,
            proposed_facings,
            duration_days,
            location
        } = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        const errors = [
            ...validateSKU(sku),
            ...validateDiscount(current_discount, 'current_discount'),
            ...validateDiscount(proposed_discount, 'proposed_discount'),
            ...validateDuration(duration_days)
        ];
        if (!Number.isInteger(current_facings) || current_facings < 0) {
            errors.push('current_facings must be a non-negative integer (number of product facings on shelf)');
        }
        if (!Number.isInteger(proposed_facings) || proposed_facings < 0) {
            errors.push('proposed_facings must be a non-negative integer (number of product facings on shelf)');
        }
        if (current_facings === proposed_facings && current_discount === proposed_discount) {
            errors.push('current and proposed setups are identical — change at least one parameter to compare');
        }
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Input validation failed',
                errors,
                unit_reference: {
                    current_discount: 'Decimal 0.0–1.0 (e.g. 0.10 = 10% off)',
                    proposed_discount: 'Decimal 0.0–1.0',
                    current_facings: 'Integer — number of product slots on shelf',
                    proposed_facings: 'Integer — number of product slots on shelf',
                    duration_days: 'Integer days 1–365',
                    base_price: 'LKR per unit',
                    cost_price: 'LKR per unit'
                }
            });
        }

        // ── Call Python AI Engine ──────────────────────────────────
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/scenario/compare`, req.body);
        const data = pythonResponse.data;

        // ── Output Sanity Check on both setups (Item 5) ────────────
        const currentSanitized = sanitizeScenarioOutput(
            data.current ?? {}, sku, current_discount, duration_days, 'Current Setup'
        );
        const proposedSanitized = sanitizeScenarioOutput(
            data.proposed ?? {}, sku, proposed_discount, duration_days, 'Proposed Setup'
        );

        // Merge all warnings
        const allWarnings = [
            ...(currentSanitized.output_warnings || []),
            ...(proposedSanitized.output_warnings || [])
        ];
        const allFlags = [
            ...(currentSanitized.output_flags || []),
            ...(proposedSanitized.output_flags || [])
        ];

        // ── Mathematical Verdict ───────────────────────────────────
        let betterOption = 'Current Setup';
        let reason = 'It yields higher overall profit.';
        if ((data.delta?.profit ?? 0) > 0) {
            betterOption = 'Proposed Setup';
            reason = `It generates LKR ${data.delta.profit.toFixed(2)} more profit over ${duration_days} days.`;
        } else if ((data.delta?.profit ?? 0) === 0) {
            betterOption = 'Neutral';
            reason = 'Both setups yield the same profit.';
        }

        res.json({
            ...data,
            current: { ...data.current, output_warnings: currentSanitized.output_warnings },
            proposed: { ...data.proposed, output_warnings: proposedSanitized.output_warnings },
            output_warnings: allWarnings,
            output_flags: [...new Set(allFlags)],
            verdict: {
                recommended_setup: betterOption,
                justification: reason
            },
            // Computation context for frontend transparency (Item 4)
            computation_context: {
                current: {
                    promo_price_lkr: parseFloat((sku.base_price * (1 - current_discount)).toFixed(2)),
                    margin_per_unit_lkr: parseFloat((sku.base_price * (1 - current_discount) - sku.cost_price).toFixed(2)),
                    discount_pct: parseFloat((current_discount * 100).toFixed(1)),
                    facings: current_facings
                },
                proposed: {
                    promo_price_lkr: parseFloat((sku.base_price * (1 - proposed_discount)).toFixed(2)),
                    margin_per_unit_lkr: parseFloat((sku.base_price * (1 - proposed_discount) - sku.cost_price).toFixed(2)),
                    discount_pct: parseFloat((proposed_discount * 100).toFixed(1)),
                    facings: proposed_facings
                },
                duration_days,
                model: 'HybridForecaster (RF) + S-Learner (XGBoost)',
                formula: 'Profit = Units × (PromoPrice − CostPrice), Revenue = Units × PromoPrice',
                note: 'Statistical estimate — verify before implementing'
            }
        });

    } catch (error) {
        console.error('Error in comparePlanograms:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error comparing planograms', error: error.message });
        }
    }
};

export const getFutureTrend = async (req, res) => {
    try {
        const { sku, days, location } = req.body;

        // ── Input Validation (Item 3) ──────────────────────────────
        const errors = [...validateSKU(sku)];
        if (!Number.isInteger(days) || days < 1) {
            errors.push('days must be a positive integer (forecast horizon)');
        }
        if (days > 365) {
            errors.push('days cannot exceed 365');
        }
        if (errors.length > 0) {
            return res.status(400).json({
                message: 'Input validation failed',
                errors,
                unit_reference: {
                    days: 'Integer 1–365 (forecast horizon in days)',
                    base_price: 'LKR per unit',
                    cost_price: 'LKR per unit',
                    stock_level: 'Integer units currently in stock'
                }
            });
        }

        const year = new Date().getFullYear();

        // ── Python Base Trend ──────────────────────────────────────
        const pythonResponse = await axios.post(`${PYTHON_SERVICE_URL}/scenario/trend`, req.body);
        const trendData = pythonResponse.data;

        // ── Output Sanity Check on trend data (Item 5) ─────────────
        const trendWarnings = [];
        if (Array.isArray(trendData.trend)) {
            const demands = trendData.trend.map(t => t.predicted_demand).filter(d => d != null);
            const maxDemand = Math.max(...demands);
            const minDemand = Math.min(...demands);

            // Flag: any negative predicted demand (model error)
            if (minDemand < 0) {
                trendWarnings.push('Model predicted negative demand on some days — these have been clamped to 0. Check if SKU has sufficient historical data.');
                // Clamp negatives
                trendData.trend = trendData.trend.map(t => ({
                    ...t,
                    predicted_demand: Math.max(0, t.predicted_demand ?? 0)
                }));
            }

            // Flag: single-day spike > 10× average (suspicious)
            const avgDemand = demands.reduce((a, b) => a + b, 0) / demands.length;
            if (maxDemand > avgDemand * 10 && demands.length > 3) {
                trendWarnings.push(`Unusually large demand spike detected (${maxDemand.toFixed(1)} units vs avg ${avgDemand.toFixed(1)}) — may be a model artefact. Review event calendar.`);
            }

            // Flag: flat zero forecast (no historical data)
            if (avgDemand === 0) {
                trendWarnings.push('All predicted demand values are zero — model may lack historical data for this SKU. Results are unreliable.');
            }
        }

        // ── National Holidays ──────────────────────────────────────
        let holidays = [];
        try {
            const hRes = await axios.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/LK`);
            holidays = hRes.data.map(h => ({ date: h.date, name: h.name, type: 'Holiday' }));
        } catch (e) {
            console.error('Failed to fetch Nager API:', e.message);
        }

        // ── Local Festival Calendar ────────────────────────────────
        const localFestivals = [
            { date: `${year}-01-01`, name: "New Year's Day", type: 'Event' },
            { date: `${year}-02-14`, name: "Valentine's Day Gifts & Promos", type: 'Event' },
            { date: `${year}-04-14`, name: 'Sinhala & Tamil New Year Festival', type: 'Festival' },
            { date: `${year}-05-12`, name: "Mother's Day Shopping", type: 'Event' },
            { date: `${year}-05-23`, name: 'Vesak Full Moon Poya', type: 'Festival' },
            { date: `${year}-06-16`, name: "Father's Day", type: 'Event' },
            { date: `${year}-06-21`, name: 'Poson Full Moon Poya', type: 'Festival' },
            { date: `${year}-08-19`, name: 'Nikini Full Moon Poya', type: 'Festival' },
            { date: `${year}-11-29`, name: 'Black Friday Sales', type: 'Promotion' },
            { date: `${year}-12-20`, name: 'Colombo Christmas Street & Holidays', type: 'Local Event' }
        ];

        let allEvents = [...holidays, ...localFestivals];

        // Filter to trend date window only
        const trendDates = (trendData.trend || []).map(t => t.date);
        const minDate = trendDates[0];
        const maxDate = trendDates[trendDates.length - 1];
        if (minDate && maxDate) {
            allEvents = allEvents.filter(e => e.date >= minDate && e.date <= maxDate);
        }

        // ── GPT-4o Event Narrative ─────────────────────────────────
        let synthesis = 'No major events detected in this window.';
        if (allEvents.length > 0) {
            const openai = new OpenAI();
            const prompt = `
                You are a Retail Analyst. The following events/holidays occur in ${location || 'Sri Lanka'} between ${minDate} and ${maxDate}:
                ${JSON.stringify(allEvents.map(e => `${e.name} on ${e.date}`))}

                Write one short paragraph (max 3 sentences) explaining how these events might impact retail sales in ${location || 'Sri Lanka'}.
                Do not invent demand numbers. Be concise and factual.
            `;
            try {
                const completion = await openai.chat.completions.create({
                    model: 'gpt-4o',
                    messages: [
                        { role: 'system', content: 'You are a concise retail analyst. Do not invent numbers.' },
                        { role: 'user', content: prompt }
                    ],
                    max_tokens: 150,
                    temperature: 0.6
                });
                synthesis = completion.choices[0].message.content.trim();
            } catch (e) {
                synthesis = 'Events found but narrative generation failed — review event list manually.';
            }
        }

        res.json({
            ...trendData,
            events: allEvents,
            event_narrative: synthesis,
            readiness_status: allEvents.length > 0 ? 'Requires Promotional Planning' : 'Standard Trend',
            output_warnings: trendWarnings,
            // Forecast metadata for transparency (Items 1, 4)
            forecast_metadata: {
                model: 'HybridForecaster — Random Forest (300 trees)',
                transform: 'log(1 + demand) → predict → expm1(result)',
                unit: 'predicted units per day',
                horizon_days: days,
                sku_id: sku.sku_id,
                note: 'Statistical forecast — validate against recent actual sales before making stock decisions'
            }
        });

    } catch (error) {
        console.error('Error in getFutureTrend:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ message: 'Error generating future trend', error: error.message });
        }
    }
};