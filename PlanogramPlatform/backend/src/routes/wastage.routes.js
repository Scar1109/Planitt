import express from 'express';
import axios from 'axios';
import InventorySnapshot from '../models/InventorySnapshot.js';
import Product from '../models/Product.js';
import Promotion from '../models/Promotion.js';
import Sale from '../models/Sale.js';
import pythonMLService from '../services/PythonMLService.js';
import openAIService from '../services/OpenAIService.js';
import { validate, schemas } from '../middleware/validation.js';
import logger from '../config/logger.js';

const router = express.Router();
const PROMO_SERVICE_URL = 'http://localhost:8001/api/v1';

/**
 * @route   GET /api/wastage/expiring/:storeId
 * @desc    Get products expiring soon at a store
 * @access  Public
 */
router.get('/expiring/:storeId', validate(schemas.storeIdParam), async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const days = parseInt(req.query.days) || 7;

        logger.info(`Getting expiring products for store ${storeId}, within ${days} days`);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);

        const expiringInventory = await InventorySnapshot.find({
            storeId,
            expiryDate: {
                $gte: new Date(),
                $lte: futureDate,
            },
            currentStock: { $gt: 0 },
        }).sort({ expiryDate: 1 });

        // Enrich with product details
        const enrichedProducts = await Promise.all(
            expiringInventory.map(async (inv) => {
                const product = await Product.findOne({ productId: inv.productId });
                return {
                    ...inv.toObject(),
                    productName: product?.name,
                    category: product?.category,
                    unitPrice: product?.unitPrice,
                    daysUntilExpiry: inv.daysUntilExpiry,
                };
            })
        );

        res.json({
            success: true,
            count: enrichedProducts.length,
            data: enrichedProducts,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/wastage/risk/:storeId/:productId
 * @desc    Get waste risk for a specific product
 * @access  Public
 */
router.get('/risk/:storeId/:productId', validate(schemas.productIdParam), async (req, res, next) => {
    try {
        const { storeId, productId } = req.params;

        logger.info(`Getting waste risk for product ${productId} at store ${storeId}`);

        const inventory = await InventorySnapshot.findOne({
            storeId,
            productId,
        }).sort({ snapshotDate: -1 });

        if (!inventory) {
            return res.status(404).json({
                success: false,
                error: 'Product inventory not found',
            });
        }

        const product = await Product.findOne({ productId });

        // Calculate simple risk score based on days until expiry
        let riskLevel = 'low';
        let riskScore = 0;

        if (inventory.expiryDate) {
            const daysUntilExpiry = inventory.daysUntilExpiry || 0;

            if (daysUntilExpiry <= 1) {
                riskLevel = 'critical';
                riskScore = 0.9;
            } else if (daysUntilExpiry <= 3) {
                riskLevel = 'high';
                riskScore = 0.7;
            } else if (daysUntilExpiry <= 7) {
                riskLevel = 'medium';
                riskScore = 0.4;
            } else {
                riskLevel = 'low';
                riskScore = 0.2;
            }
        }

        res.json({
            success: true,
            data: {
                productId,
                productName: product?.name,
                currentStock: inventory.currentStock,
                expiryDate: inventory.expiryDate,
                daysUntilExpiry: inventory.daysUntilExpiry,
                riskLevel,
                riskScore,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/wastage/action
 * @desc    Record a waste prevention action (markdown, donation, etc.)
 * @access  Public
 */
router.post('/action', async (req, res, next) => {
    try {
        const { productId, storeId, actionType, discountPercent, targetQuantity } = req.body;

        logger.info(`Recording waste action: ${actionType} for ${productId}`);

        // Create a promotion record
        const promotion = new Promotion({
            promotionId: `WASTE_${Date.now()}`,
            productId,
            storeId,
            promotionType: actionType === 'donate' ? 'clearance' : 'markdown',
            discountPercent: discountPercent || 0,
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            reason: 'expiry',
            targetQuantity,
            isActive: true,
        });

        await promotion.save();

        res.status(201).json({
            success: true,
            message: 'Waste prevention action recorded',
            data: promotion,
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/wastage/dashboard/:storeId
 * @desc    Get aggregated wastage dashboard data (KPIs, charts) — Enhanced with financial intelligence
 * @access  Public
 */
router.get('/dashboard/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const now = new Date();
        const dbCol = InventorySnapshot.collection;

        // --- Monthly Wastage (kg) ---
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthlyInventory = await dbCol.find({
            sku: { $exists: true },
            date: { $gte: monthStart, $lte: now },
            DiscardedQty: { $gt: 0 },
        }).toArray();
        const monthlyWastageKg = monthlyInventory.reduce((sum, inv) => sum + (inv.DiscardedQty || 0), 0);

        // Previous month for comparison
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        const prevMonthInventory = await dbCol.find({
            sku: { $exists: true },
            date: { $gte: prevMonthStart, $lte: prevMonthEnd },
            DiscardedQty: { $gt: 0 },
        }).toArray();
        const prevMonthlyWastageKg = prevMonthInventory.reduce((sum, inv) => sum + (inv.DiscardedQty || 0), 0);
        const wastageChangePercent = prevMonthlyWastageKg > 0
            ? Math.round(((monthlyWastageKg - prevMonthlyWastageKg) / prevMonthlyWastageKg) * 100)
            : 0;

        // --- Value at Risk (next 7 days) ---
        // Fetch items expiring in 1-7 days (including tomorrow)
        const atRiskInventory = await dbCol.find({
            sku: { $exists: true },
            DaysToExpiry: { $gt: 0, $lte: 7 },
            ClosingStock: { $gt: 0 },
        }).sort({ DaysToExpiry: 1 }).limit(200).toArray();

        // Cap tomorrow items (DaysToExpiry === 1) to max 5, keep all others
        const tomorrowItems = atRiskInventory.filter(i => i.DaysToExpiry === 1).slice(0, 5);
        const otherItems = atRiskInventory.filter(i => i.DaysToExpiry > 1);
        const cappedAtRiskInventory = [...tomorrowItems, ...otherItems];

        // Enrich at-risk items with product info
        const enrichedRiskItems = [];
        let totalValueAtRisk = 0;
        let totalRecoverableRevenue = 0;
        const categoryRiskMap = {};

        // BULK OPTIMIZATION: Get all required products in 1 query
        const skuList = [...new Set(cappedAtRiskInventory.map(inv => inv.sku))];
        const productsList = await Product.find({ sku: { $in: skuList } });
        const productMap = {};
        for (const p of productsList) productMap[p.sku] = p;

        // Fetch sales that happened today to deduct from snapshot stock
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todaySales = await Sale.find({
            sku: { $in: skuList },
            date: { $gte: todayStart }
        }).lean();
        const todaySalesMap = {};
        for (const sale of todaySales) {
            // Check both properties because DB uses `UnitsSold` but schema defines `unitsSold`
            todaySalesMap[sale.sku] = (todaySalesMap[sale.sku] || 0) + (sale.unitsSold || sale.UnitsSold || 0);
        }

        for (const inv of cappedAtRiskInventory) {
            const product = productMap[inv.sku];

            // Deduct today's sold units from the closing stock snapshot
            const soldToday = todaySalesMap[inv.sku] || 0;
            const remainingLiveStock = Math.max(0, (inv.ClosingStock || 0) - soldToday);

            // Per requirement: divide SKU units by 5 and round off to real value
            const stock = Math.round(remainingLiveStock / 5);

            // If the item is fully sold out today, it is no longer at risk
            if (stock <= 0) continue;

            const basePrice = product?.baseUnitPriceLKR || 0;
            const costPrice = product?.unitCostLKR || basePrice * 0.6;
            const value = stock * basePrice;
            totalValueAtRisk += value;

            const category = product?.category || 'Other';
            categoryRiskMap[category] = (categoryRiskMap[category] || 0) + value;

            // Determine baseline risk level
            let risk = 'Low';
            let action = 'Monitor';
            let fallbackDiscount = 0;
            const dte = inv.DaysToExpiry ?? 999;

            if (dte <= 1) {
                risk = 'Critical';
                fallbackDiscount = 50;
            } else if (dte <= 3) {
                risk = 'High';
                fallbackDiscount = 30;
            } else if (dte <= 5) {
                risk = 'Medium';
                fallbackDiscount = 15;
            } else if (dte <= 7) {
                risk = 'Low';
                fallbackDiscount = 10;
            }

            if (dte > 0 && dte <= 7) {
                action = `Discount ${fallbackDiscount}%`;
            } else if (dte <= 0) {
                action = 'Donate / Discard';
            }

            // Estimate recoverable revenue (at fallback discount level)
            const recoverableForItem = stock * basePrice * (1 - fallbackDiscount / 100);
            totalRecoverableRevenue += dte > 0 ? recoverableForItem : 0;

            let expiryLabelStr = 'Expired';
            if (dte > 0) {
                const dDate = new Date();
                dDate.setDate(dDate.getDate() + dte);
                expiryLabelStr = dDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }

            enrichedRiskItems.push({
                id: inv._id,
                sku: inv.sku,
                productName: product?.productName || inv.sku,
                category,
                daysToExpiry: dte,
                expiryLabel: expiryLabelStr,
                closingStock: stock,
                basePrice: Math.round(basePrice),
                costPrice: Math.round(costPrice),
                value: Math.round(value),
                risk,
                action,
                fallbackDiscount,
            });
        }

        // Sort risk items by urgency (critical first)
        const riskOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
        enrichedRiskItems.sort((a, b) => (riskOrder[a.risk] ?? 99) - (riskOrder[b.risk] ?? 99));

        const topRiskItems = enrichedRiskItems.slice(0, 10);

        // --- AI Savings (actions taken this month) ---
        const monthlyActions = await Promotion.find({
            reason: 'expiry',
            createdAt: { $gte: monthStart },
        });
        let aiSavingsLKR = 0;
        let totalDonationCount = 0;
        let totalDonationValue = 0;
        const promoSkus = [...new Set(monthlyActions.map(p => p.productId))];
        const promoProducts = await Product.find({ sku: { $in: promoSkus } });
        const promoProductMap = {};
        for (const p of promoProducts) promoProductMap[p.sku] = p;

        for (const promo of monthlyActions) {
            const promoProduct = promoProductMap[promo.productId];
            const unitPrice = promoProduct?.baseUnitPriceLKR || 0;
            const recoveredValue = (promo.targetQuantity || 0) * (1 - (promo.discountPercent || 0) / 100) * unitPrice;
            aiSavingsLKR += recoveredValue;

            if (promo.promotionType === 'clearance' || promo.promotionType === 'donation') {
                totalDonationCount += promo.targetQuantity || 0;
                totalDonationValue += (promo.targetQuantity || 0) * unitPrice;
            }
        }

        // --- Historical Wastage Trend (last 3 months) ---
        const historicalWastageTrend = [];
        for (let m = 2; m >= 0; m--) {
            const mStart = new Date(now.getFullYear(), now.getMonth() - m, 1);
            const mEnd = m === 0 ? now : new Date(now.getFullYear(), now.getMonth() - m + 1, 0);
            const mLabel = mStart.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

            const mInventory = await dbCol.find({
                sku: { $exists: true },
                date: { $gte: mStart, $lte: mEnd },
                DiscardedQty: { $gt: 0 },
            }).toArray();

            // Get product prices for value calculation
            const monthSkus = [...new Set(mInventory.map(inv => inv.sku))];
            const monthProducts = await Product.find({ sku: { $in: monthSkus } });
            const monthPriceMap = {};
            for (const p of monthProducts) monthPriceMap[p.sku] = p.baseUnitPriceLKR || 0;

            const mWastageValue = mInventory.reduce((sum, inv) => {
                const price = monthPriceMap[inv.sku] || 0;
                return sum + ((inv.DiscardedQty || 0) * price);
            }, 0);

            historicalWastageTrend.push({ month: mLabel, value: Math.round(mWastageValue) });
        }

        // --- Expiry Timeline (value per day for next 7 days) ---
        const expiryTimeline = [];
        for (let d = 1; d <= 7; d++) {
            const targetDate = new Date();
            targetDate.setDate(targetDate.getDate() + d);
            const dayLabel = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const dayItems = enrichedRiskItems.filter(item => item.daysToExpiry === d);
            const dayValue = dayItems.reduce((sum, item) => sum + item.value, 0);
            const dayCount = dayItems.length;
            expiryTimeline.push({ day: dayLabel, value: dayValue, count: dayCount });
        }

        // --- Category Breakdown ---
        const categoryBreakdown = Object.entries(categoryRiskMap)
            .map(([name, value]) => ({ name, value: Math.round(value) }))
            .sort((a, b) => b.value - a.value);

        // --- Smart Bundle Suggestions ---
        let bundleSuggestions = [];
        const criticalItems = enrichedRiskItems.filter(i => i.daysToExpiry <= 5 && i.daysToExpiry > 0);

        const usedSkus = new Set();

        if (criticalItems.length >= 2) {
            try {
                const aiPayload = criticalItems.map(i => ({
                    sku: i.sku,
                    name: i.productName,
                    category: i.category,
                    price: i.basePrice,
                    daysToExpiry: i.daysToExpiry
                }));

                const prompt = `You are a retail merchandising AI. I will provide a list of near-expiry items in JSON. 
Create up to 3 logical product bundles (2 items per bundle) to help clear stock. 
Only bundle items that make sense to buy together (e.g., pasta + sauce, snack + beverage).
Respond STRICTLY with valid JSON matching this schema:
{
  "bundles": [
    {
      "skus": ["SKU1", "SKU2"],
      "name": "Creative Bundle Name",
      "reason": "Why these pair well together"
    }
  ]
}`;
                
                const aiPromise = openAIService.simpleCompletion(prompt, JSON.stringify(aiPayload));
                const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('AI timeout')), 4000));
                
                const aiResponse = await Promise.race([aiPromise, timeoutPromise]);

                if (aiResponse && aiResponse.success && aiResponse.message) {
                    let parsedData;
                    try {
                        const jsonStr = aiResponse.message.replace(/```json/g, '').replace(/```/g, '').trim();
                        parsedData = JSON.parse(jsonStr);
                    } catch (e) {
                        logger.warn('Failed to parse AI bundle JSON, falling back to rules');
                    }

                    if (parsedData && Array.isArray(parsedData.bundles)) {
                        const itemMap = new Map(criticalItems.map(i => [i.sku, i]));

                        for (const b of parsedData.bundles) {
                            if (bundleSuggestions.length >= 3) break;
                            if (!b.skus || b.skus.length < 2) continue;
                            
                            const item1 = itemMap.get(b.skus[0]);
                            const item2 = itemMap.get(b.skus[1]);

                            if (item1 && item2 && !usedSkus.has(item1.sku) && !usedSkus.has(item2.sku)) {
                                usedSkus.add(item1.sku);
                                usedSkus.add(item2.sku);

                                const totalPrice = item1.basePrice + item2.basePrice;
                                const d1 = item1.daysToExpiry <= 1 ? 50 : item1.daysToExpiry <= 3 ? 30 : item1.daysToExpiry <= 5 ? 20 : 10;
                                const d2 = item2.daysToExpiry <= 1 ? 50 : item2.daysToExpiry <= 3 ? 30 : item2.daysToExpiry <= 5 ? 20 : 10;
                                
                                let bundleDiscountPercent = Math.round((d1 + d2) / 2) + 5;
                                bundleDiscountPercent = Math.min(60, Math.max(15, bundleDiscountPercent));
                                
                                const bundlePrice = Math.round(totalPrice * (1 - (bundleDiscountPercent / 100)));

                                bundleSuggestions.push({
                                    id: `bundle-${item1.sku}-${item2.sku}`,
                                    name: b.name || 'Smart Combo',
                                    reason: b.reason || 'AI Suggested Pair',
                                    items: [
                                        { sku: item1.sku, name: item1.productName, price: item1.basePrice },
                                        { sku: item2.sku, name: item2.productName, price: item2.basePrice },
                                    ],
                                    originalTotal: totalPrice,
                                    bundlePrice,
                                    savings: totalPrice - bundlePrice,
                                    savingsPercent: bundleDiscountPercent,
                                });
                            }
                        }
                    }
                }
            } catch (err) {
                logger.warn(`AI bundling failed: ${err.message}. Falling back to rule-based.`);
            }
        }

        // --- Fallback: Rule-based heuristic ---
        if (bundleSuggestions.length === 0 && criticalItems.length >= 2) {
            // Define logical complementary categories to form smart bundles
            const complementaryPairs = [
                ['Beverages', 'Snacks'],
                ['Bakery', 'Dairy'],
                ['Produce', 'Meat'],
                ['Spices', 'Produce'],
                ['Breakfast', 'Dairy'],
                ['Pantry', 'Spices']
            ];

            const createAndAddBundle = (item1, item2) => {
                const totalPrice = item1.basePrice + item2.basePrice;

                const getDiscountForDte = (dte) => {
                    if (dte <= 1) return 50;
                    if (dte <= 3) return 30;
                    if (dte <= 5) return 20;
                    if (dte <= 7) return 10;
                    return 0;
                };

                const d1 = getDiscountForDte(item1.daysToExpiry);
                const d2 = getDiscountForDte(item2.daysToExpiry);

                // Bundle discount = average of individual discounts + 5% incentive
                let bundleDiscountPercent = Math.round((d1 + d2) / 2) + 5;
                if (bundleDiscountPercent > 60) bundleDiscountPercent = 60;
                if (bundleDiscountPercent < 15) bundleDiscountPercent = 15;

                const bundlePrice = Math.round(totalPrice * (1 - (bundleDiscountPercent / 100)));

                bundleSuggestions.push({
                    id: `bundle-${item1.sku}-${item2.sku}`,
                    name: `${item1.category} & ${item2.category} Combo`,
                    reason: `Clearance pairing for ${item1.category} and ${item2.category}`,
                    items: [
                        { sku: item1.sku, name: item1.productName, price: item1.basePrice },
                        { sku: item2.sku, name: item2.productName, price: item2.basePrice },
                    ],
                    originalTotal: totalPrice,
                    bundlePrice,
                    savings: totalPrice - bundlePrice,
                    savingsPercent: bundleDiscountPercent,
                });
            };

        // 1. Try to find logical complementary matches first
        for (const [cat1, cat2] of complementaryPairs) {
            if (bundleSuggestions.length >= 3) break; // Limit bundles

            // Substring/case-insensitive category match
            const item1 = criticalItems.find(i => !usedSkus.has(i.sku) && i.category.toLowerCase().includes(cat1.toLowerCase()));
            const item2 = criticalItems.find(i => !usedSkus.has(i.sku) && i.category.toLowerCase().includes(cat2.toLowerCase()));

            if (item1 && item2 && item1.sku !== item2.sku) {
                usedSkus.add(item1.sku);
                usedSkus.add(item2.sku);
                createAndAddBundle(item1, item2);
            }
        }

        // 2. Fallback: Pair remaining items that are highest risk to clear stock effectively
        if (bundleSuggestions.length < 3) {
            const remainingItems = criticalItems
                .filter(i => !usedSkus.has(i.sku))
                .sort((a, b) => a.daysToExpiry - b.daysToExpiry);

            for (let i = 0; i < remainingItems.length - 1; i += 2) {
                if (bundleSuggestions.length >= 3) break;
                const item1 = remainingItems[i];
                const item2 = remainingItems[i + 1];
                usedSkus.add(item1.sku);
                usedSkus.add(item2.sku);
                createAndAddBundle(item1, item2);
            }
        }
        }

        res.json({
            success: true,
            data: {
                kpis: {
                    monthlyWastageKg: Math.round(monthlyWastageKg * 10) / 10,
                    wastageChangePercent,
                    valueAtRiskLKR: Math.round(totalValueAtRisk),
                    recoverableRevenueLKR: Math.round(totalRecoverableRevenue),
                    aiSavingsLKR: Math.round(aiSavingsLKR),
                    totalRiskItems: enrichedRiskItems.length,
                    donationStats: {
                        itemsDonated: totalDonationCount,
                        valueDonatedLKR: Math.round(totalDonationValue),
                        kgSavedFromLandfill: Math.round(totalDonationCount * 0.3 * 10) / 10,
                    },
                },
                historicalWastageTrend,
                expiryTimeline,
                categoryBreakdown,
                bundleSuggestions,
                riskItems: topRiskItems,
                totalRiskItems: enrichedRiskItems.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/wastage/smart-discount
 * @desc    Get AI-powered optimal discount for a near-expiry product
 *          Calls the Python Promotion Forecasting engine
 * @access  Public
 */
router.post('/smart-discount', async (req, res, next) => {
    try {
        const { sku, currentStock, daysToExpiry, basePrice, costPrice } = req.body;

        if (!sku || !currentStock || !basePrice) {
            return res.status(400).json({
                success: false,
                error: 'sku, currentStock, and basePrice are required',
            });
        }

        logger.info(`Smart discount request for ${sku}: stock=${currentStock}, dte=${daysToExpiry}`);

        // Fetch actual historical units sold from the Sale table over the past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSales = await Sale.find({ sku, date: { $gte: thirtyDaysAgo } }).lean();

        // Handle database capitalization discrepancies (UnitsSold vs unitsSold)
        const totalUnitsSold = recentSales.reduce((sum, sale) => sum + (sale.unitsSold || sale.UnitsSold || 0), 0);

        // Calculate average daily sales based on real sales data, fallback to heuristic if no data
        const avgDailySales = totalUnitsSold > 0
            ? (totalUnitsSold / 30)
            : Math.max(1, Math.round(currentStock / Math.max(daysToExpiry || 1, 1)));

        // Connect directly with the Promotion Forecasting module for the ideal best promotion
        try {
            // First fetch missing product info like category and brand needed by the Promo Engine
            const productDoc = await Product.findOne({ sku });

            const payload = {
                sku: {
                    sku_id: sku,
                    category: productDoc?.category || 'Unknown',
                    brand: productDoc?.brand || 'Unknown',
                    stock_level: currentStock,
                    base_price: basePrice,
                    cost_price: productDoc?.unitCostLKR || costPrice || basePrice * 0.6,
                    avg_daily_sales: avgDailySales,
                    days_to_expiry: daysToExpiry,
                    waste_risk_score: 0.8,
                    is_perishable: true,
                },
                duration_days: Math.min(daysToExpiry || 1, 7),
            };

            const promotionServicePort = process.env.PORT || 3000;
            const optimalResponse = await axios.post(`http://localhost:${promotionServicePort}/api/promotions/simulate/optimal`, payload, { timeout: 15000 });

            if (optimalResponse.data && optimalResponse.data.optimal_discount) {
                const best = optimalResponse.data.simulation;
                const mlDiscountPct = Math.round(optimalResponse.data.optimal_discount * 100);

                // Calculate Urgency-based requirement
                let urgencyBase = 10;
                if (daysToExpiry <= 1) urgencyBase = 50;
                else if (daysToExpiry <= 3) urgencyBase = 35;
                else if (daysToExpiry <= 5) urgencyBase = 20;

                // Blend ML logic with Urgency timeframe
                let blendedDiscountPct;
                if (daysToExpiry <= 1) {
                    // Critical: heavily weight the urgency rule (at least 50%)
                    blendedDiscountPct = Math.max(urgencyBase, Math.round((mlDiscountPct * 0.4) + (urgencyBase * 0.6)));
                } else if (daysToExpiry <= 3) {
                    // High: balance ML optimal & urgency base
                    blendedDiscountPct = Math.round((mlDiscountPct * 0.5) + (urgencyBase * 0.5));
                } else {
                    // Medium/Low: trust ML more but ensure a minimum floor
                    blendedDiscountPct = Math.max(mlDiscountPct, urgencyBase);
                }

                const optimalDiscountPct = Math.min(80, Math.max(5, blendedDiscountPct));

                const expectedSold = (best.uplift || 0) + (best.baseline || 0);
                const revenueSaved = Math.max(0, expectedSold * basePrice * (1 - (optimalDiscountPct / 100)));
                const wasteAvoid = Math.round((expectedSold / currentStock) * 100);

                return res.json({
                    success: true,
                    source: 'promotion-forecasting-module',
                    data: {
                        optimalDiscount: optimalDiscountPct,
                        expectedUplift: Math.ceil(best.uplift || 0),
                        profitLift: Math.round(best.profit_lift || 0),
                        revenueSaved: Math.round(revenueSaved),
                        expectedUnitsSold: Math.ceil(expectedSold),
                        wasteAvoidedPercent: Math.min(100, Math.max(0, wasteAvoid)),
                        allSimulations: (optimalResponse.data.top_5 || []).map(r => ({
                            discount: Math.round(r.discount * 100),
                            profitLift: Math.round(r.profit_lift || r.simulation.profit_lift || 0),
                            uplift: Math.round((r.simulation && r.simulation.uplift) || 0),
                        })),
                    },
                });
            }
        } catch (mlError) {
            logger.warn(`ML service unavailable for smart-discount: ${mlError.message}`);
        }

        // Fallback: Rule-based discount
        const dte = daysToExpiry || 1;
        let fallbackDiscount = 10;
        if (dte <= 1) fallbackDiscount = 50;
        else if (dte <= 3) fallbackDiscount = 30;
        else if (dte <= 5) fallbackDiscount = 15;

        const estimated = currentStock * 0.6; // estimated units sold at discount
        const revenueSaved = estimated * basePrice * (1 - fallbackDiscount / 100);

        res.json({
            success: true,
            source: 'rule-based',
            data: {
                optimalDiscount: fallbackDiscount,
                expectedUplift: Math.round(estimated * 0.3),
                profitLift: Math.round(revenueSaved * 0.2),
                revenueSaved: Math.round(revenueSaved),
                expectedUnitsSold: Math.round(estimated),
                wasteAvoidedPercent: Math.round((estimated / currentStock) * 100),
                allSimulations: [],
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   POST /api/wastage/auto-promote
 * @desc    Batch create AI-recommended promotions for near-expiry items
 * @access  Public
 */
router.post('/auto-promote', async (req, res, next) => {
    try {
        const { items, storeId } = req.body;

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'items array is required',
            });
        }

        logger.info(`Auto-promote request for ${items.length} items at store ${storeId}`);

        const createdPromotions = [];
        const errors = [];

        for (const item of items) {
            try {
                const promotion = new Promotion({
                    promotionId: `AI_WASTE_${Date.now()}_${item.sku}`,
                    productId: item.sku,
                    storeId: storeId || 'STORE-001',
                    promotionType: item.actionType === 'donate' ? 'clearance' : 'markdown',
                    discountPercent: item.discount || 0,
                    startDate: new Date(),
                    endDate: new Date(Date.now() + Math.max(item.daysToExpiry || 1, 1) * 24 * 60 * 60 * 1000),
                    reason: 'expiry',
                    targetQuantity: item.stock || 0,
                    isActive: true,
                    aiRecommended: true,
                    expectedUplift: item.expectedUplift || 0,
                    expectedRevenueSaved: item.revenueSaved || 0,
                    promotionSource: 'ai-wastage',
                });

                await promotion.save();
                createdPromotions.push({
                    sku: item.sku,
                    promotionId: promotion.promotionId,
                    discount: item.discount,
                });
            } catch (err) {
                errors.push({ sku: item.sku, error: err.message });
            }
        }

        res.status(201).json({
            success: true,
            message: `Created ${createdPromotions.length} promotions`,
            data: {
                created: createdPromotions,
                errors,
                totalCreated: createdPromotions.length,
                totalErrors: errors.length,
            },
        });
    } catch (error) {
        next(error);
    }
});

/**
 * @route   GET /api/wastage/actions/history/:storeId
 * @desc    Get past wastage prevention actions taken
 * @access  Public
 */
router.get('/actions/history/:storeId', async (req, res, next) => {
    try {
        const { storeId } = req.params;
        const limit = parseInt(req.query.limit) || 20;

        const actions = await Promotion.find({
            storeId,
            reason: 'expiry',
        })
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({
            success: true,
            count: actions.length,
            data: actions,
        });
    } catch (error) {
        next(error);
    }
});

export default router;

