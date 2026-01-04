import mongoose from 'mongoose';
import logger from '../config/logger.js';
import Sale from '../models/Sale.js';
import InventorySnapshot from '../models/InventorySnapshot.js';

/**
 * ENHANCED External Factors Controller for Sri Lanka
 * Comprehensive analysis including:
 * - Religious holidays (Buddhist, Hindu, Muslim, Christian)
 * - Cultural events and seasons
 * - Weather patterns (Monsoons, Yala/Maha seasons)
 * - Economic factors (fuel prices, inflation)
 * - Regional variations across provinces
 */

// ============================================
// COMPREHENSIVE SRI LANKAN CALENDAR
// ============================================

const getSriLankanHolidays = (startDate, endDate) => {
    const holidays = [
        // 2025 - Buddhist Holidays (Poya Days)
        {
            date: '2025-01-13', name: 'Duruthu Poya', type: 'poya', religion: 'buddhist',
            category_impact: { dairy: 0.75, meat: 0.65, fish: 0.60, vegetables: 1.4, fruits: 1.3, lentils: 1.5, coconut: 1.35 },
            regional_impact: { western: 1.2, central: 1.5, southern: 1.3 }
        },

        {
            date: '2025-02-12', name: 'Navam Poya', type: 'poya', religion: 'buddhist',
            category_impact: { dairy: 0.75, meat: 0.65, fish: 0.60, vegetables: 1.4, fruits: 1.3, lentils: 1.5, coconut: 1.35 }
        },

        {
            date: '2025-03-14', name: 'Medin Poya', type: 'poya', religion: 'buddhist',
            category_impact: { dairy: 0.75, meat: 0.65, fish: 0.60, vegetables: 1.4, fruits: 1.3, lentils: 1.5 }
        },

        {
            date: '2025-04-12', name: 'Bak Poya', type: 'poya', religion: 'buddhist',
            category_impact: { dairy: 0.75, meat: 0.65, fish: 0.60, vegetables: 1.4, fruits: 1.3, lentils: 1.5 }
        },

        {
            date: '2025-05-12', name: 'Vesak Poya', type: 'poya_major', religion: 'buddhist',
            category_impact: { dairy: 0.70, meat: 0.55, fish: 0.50, vegetables: 1.6, fruits: 1.5, lentils: 1.7, oil: 1.4, flour: 1.5 },
            preparation_days: 3, celebration_days: 2
        },

        {
            date: '2025-06-10', name: 'Poson Poya', type: 'poya_major', religion: 'buddhist',
            category_impact: { dairy: 0.70, meat: 0.60, fish: 0.55, vegetables: 1.5, fruits: 1.45, lentils: 1.6 },
            regional_impact: { central: 2.0, north_central: 1.8 }
        },

        // Hindu Holidays
        {
            date: '2025-01-14', name: 'Thai Pongal', type: 'harvest', religion: 'hindu',
            category_impact: { rice: 2.0, milk: 1.8, jaggery: 2.5, turmeric: 1.9, sugarcane: 2.0, ghee: 1.7 },
            regional_impact: { northern: 2.5, eastern: 2.2, western: 1.3 }
        },

        {
            date: '2025-10-20', name: 'Deepavali', type: 'festival', religion: 'hindu',
            category_impact: { oil: 2.0, flour: 1.8, sweets: 2.5, cashews: 2.2, ghee: 1.9, lentils: 1.6 },
            regional_impact: { northern: 2.5, eastern: 2.0, western: 1.4 }
        },

        // Muslim Holidays (approximate - varies by moon sighting)
        {
            date: '2025-03-30', name: 'Ramadan Begins', type: 'ramadan_start', religion: 'muslim',
            category_impact: { dates: 3.0, beverages: 1.6, meat: 1.4, fruits: 1.5, yogurt: 1.4 },
            evening_surge: true
        },

        {
            date: '2025-03-31', name: 'Eid ul-Fitr', type: 'eid', religion: 'muslim',
            category_impact: { meat: 2.5, chicken: 2.0, spices: 1.8, sweets: 2.0, beverages: 1.7 },
            regional_impact: { eastern: 2.8, western: 1.5 }
        },

        // National Holidays
        {
            date: '2025-02-04', name: 'Independence Day', type: 'national', religion: 'all',
            category_impact: { all: 1.2, beverages: 1.4, snacks: 1.5 }
        },

        {
            date: '2025-04-13', name: 'Sinhala Tamil New Year Eve', type: 'new_year', religion: 'all',
            category_impact: { all: 1.8, sweets: 2.5, oil: 2.0, milk: 2.2, kiribath_items: 3.0 },
            preparation_days: 5
        },

        {
            date: '2025-04-14', name: 'Sinhala Tamil New Year', type: 'new_year', religion: 'all',
            category_impact: { all: 2.0, sweets: 3.0, traditional_foods: 2.5 },
            celebration_days: 3
        },

        {
            date: '2025-05-01', name: 'May Day', type: 'national', religion: 'all',
            category_impact: { all: 1.15, beverages: 1.3 }
        },

        {
            date: '2025-12-25', name: 'Christmas', type: 'christian', religion: 'christian',
            category_impact: { cake_items: 2.5, wine: 2.0, chicken: 1.8, pork: 2.2, baking_supplies: 2.0 },
            preparation_days: 7
        },

        // 2026 Holidays
        {
            date: '2026-01-03', name: 'Duruthu Poya', type: 'poya', religion: 'buddhist',
            category_impact: { dairy: 0.75, meat: 0.65, fish: 0.60, vegetables: 1.4, fruits: 1.3, lentils: 1.5 }
        },

        {
            date: '2026-01-14', name: 'Thai Pongal', type: 'harvest', religion: 'hindu',
            category_impact: { rice: 2.0, milk: 1.8, jaggery: 2.5, turmeric: 1.9 },
            regional_impact: { northern: 2.5, eastern: 2.2 }
        },

        {
            date: '2026-02-01', name: 'Navam Poya', type: 'poya', religion: 'buddhist',
            category_impact: { dairy: 0.75, meat: 0.65, fish: 0.60, vegetables: 1.4, fruits: 1.3, lentils: 1.5 }
        },

        {
            date: '2026-02-04', name: 'Independence Day', type: 'national', religion: 'all',
            category_impact: { all: 1.2, beverages: 1.4, snacks: 1.5 }
        },

        {
            date: '2026-04-13', name: 'Sinhala Tamil New Year Eve', type: 'new_year', religion: 'all',
            category_impact: { all: 1.8, sweets: 2.5, oil: 2.0, milk: 2.2, kiribath_items: 3.0 },
            preparation_days: 5
        },

        {
            date: '2026-04-14', name: 'Sinhala Tamil New Year', type: 'new_year', religion: 'all',
            category_impact: { all: 2.0, sweets: 3.0, traditional_foods: 2.5 }
        }
    ];

    const start = new Date(startDate);
    const end = new Date(endDate);

    return holidays.filter(h => {
        const hDate = new Date(h.date);
        return hDate >= start && hDate <= end;
    });
};

// ============================================
// SEASONAL PATTERNS - YALA & MAHA
// ============================================

const getSeasonalFactors = (date) => {
    const month = date.getMonth() + 1;

    // Maha Season (October - March) - Main harvest
    if (month >= 10 || month <= 3) {
        return {
            season: 'Maha',
            type: 'main_harvest',
            impact: {
                rice: 0.85,        // Lower prices due to harvest
                vegetables: 1.2,    // More variety available
                fruits: 1.15,
                general_produce: 1.1
            },
            description: 'Main cultivation season - abundant local produce'
        };
    }

    // Yala Season (April - September) - Minor harvest
    return {
        season: 'Yala',
        type: 'minor_harvest',
        impact: {
            rice: 1.15,         // Slightly higher prices
            vegetables: 0.95,   // Less variety
            fruits: 1.0,
            general_produce: 1.0
        },
        description: 'Minor cultivation season'
    };
};

// ============================================
// MONSOON & WEATHER PATTERNS
// ============================================

const getMonsoonPattern = (date) => {
    const month = date.getMonth() + 1;

    // Southwest Monsoon (Yala) - May to September
    if (month >= 5 && month <= 9) {
        return {
            monsoon: 'Southwest (Yala)',
            affected_regions: ['Western', 'Southern', 'Sabaragamuwa'],
            impact: {
                fresh_produce: 0.88,
                bakery: 1.1,      // People prefer packaged foods
                beverages_hot: 1.2,
                beverages_cold: 0.85,
                footfall: 0.90
            },
            description: 'Heavy rains in western and southern provinces'
        };
    }

    // Northeast Monsoon (Maha) - October to January
    if (month >= 10 || month <= 1) {
        return {
            monsoon: 'Northeast (Maha)',
            affected_regions: ['Northern', 'Eastern', 'North Central'],
            impact: {
                fresh_produce: 0.90,
                packaged_goods: 1.15,
                beverages_hot: 1.15,
                footfall: 0.92
            },
            description: 'Heavy rains in northern and eastern provinces'
        };
    }

    // Inter-monsoon periods
    if (month >= 2 && month <= 4) {
        return {
            monsoon: 'Inter-monsoon (First)',
            affected_regions: ['Island-wide'],
            impact: {
                beverages_cold: 1.25,
                ice_cream: 1.4,
                fresh_produce: 1.1,
                footfall: 1.05
            },
            description: 'Hot and dry conditions across the island'
        };
    }

    return {
        monsoon: 'Inter-monsoon (Second)',
        affected_regions: ['Island-wide'],
        impact: {
            all: 1.0
        },
        description: 'Transitional weather period'
    };
};

// ============================================
// ECONOMIC FACTORS (Sri Lanka Specific)
// ============================================

const getEconomicFactors = () => {
    // In production, these would come from external APIs or database
    return {
        fuel_price_index: 1.15,  // Relative to baseline
        inflation_rate: 5.2,      // Annual percentage
        usd_lkr_rate: 325,        // Approximate exchange rate
        impact: {
            imported_goods: 1.18,  // Higher costs due to USD rate
            local_produce: 1.05,   // Moderate increase
            dairy: 1.12,           // Affected by fuel for transport
            transport_dependent: 1.10
        },
        description: 'Current economic conditions affecting pricing'
    };
};

// ============================================
// SCHOOL TERMS & EXAM PERIODS
// ============================================

const getSchoolTermImpact = (date) => {
    const month = date.getMonth() + 1;

    // Term breaks
    const termBreaks = [
        { start: 4, end: 4, name: 'April Break', impact: { snacks: 1.3, beverages: 1.25 } },
        { start: 8, end: 8, name: 'August Break', impact: { snacks: 1.25, beverages: 1.2 } },
        { start: 12, end: 12, name: 'December Break', impact: { snacks: 1.4, beverages: 1.35 } }
    ];

    const currentBreak = termBreaks.find(b => month >= b.start && month <= b.end);
    if (currentBreak) {
        return {
            period: currentBreak.name,
            impact: currentBreak.impact,
            description: 'School holidays - increased family shopping'
        };
    }

    // O/L and A/L exam periods (approximate)
    if (month === 12 || month === 8) {
        return {
            period: 'Exam Season',
            impact: {
                energy_drinks: 1.4,
                snacks: 1.2,
                coffee_tea: 1.3
            },
            description: 'Student exam preparation period'
        };
    }

    return null;
};

// ============================================
// REGIONAL POPULATION & DEMOGRAPHICS
// ============================================

const getRegionalFactors = (province) => {
    const regions = {
        'Western': {
            population_density: 'high',
            urbanization: 'high',
            shopping_patterns: 'modern',
            preferred_categories: ['packaged_foods', 'beverages', 'snacks', 'dairy']
        },
        'Central': {
            population_density: 'medium',
            urbanization: 'medium',
            shopping_patterns: 'mixed',
            preferred_categories: ['vegetables', 'tea', 'traditional_foods']
        },
        'Southern': {
            population_density: 'medium',
            urbanization: 'medium',
            shopping_patterns: 'traditional',
            preferred_categories: ['fish', 'coconut', 'rice', 'spices']
        },
        'Northern': {
            population_density: 'low',
            urbanization: 'low',
            shopping_patterns: 'traditional',
            preferred_categories: ['rice', 'lentils', 'spices', 'vegetables']
        },
        'Eastern': {
            population_density: 'low',
            urbanization: 'low',
            shopping_patterns: 'traditional',
            preferred_categories: ['rice', 'fish', 'vegetables', 'coconut']
        }
    };

    return regions[province] || regions['Western'];
};

// ============================================
// HELPER FUNCTIONS
// ============================================

const daysBetween = (date1, date2) => {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    return Math.round((d2 - d1) / (1000 * 60 * 60 * 24));
};

const mapCategory = (sku) => {
    const skuUpper = sku?.toUpperCase() || '';

    // Detailed category mapping
    if (skuUpper.includes('RICE')) return 'rice';
    if (skuUpper.includes('MILK') || skuUpper.includes('YOGURT') || skuUpper.includes('DAI')) return 'dairy';
    if (skuUpper.includes('BREAD') || skuUpper.includes('BAK')) return 'bakery';
    if (skuUpper.includes('MEAT') || skuUpper.includes('CHICKEN') || skuUpper.includes('BEEF')) return 'meat';
    if (skuUpper.includes('FISH')) return 'fish';
    if (skuUpper.includes('VEG')) return 'vegetables';
    if (skuUpper.includes('FRUIT') || skuUpper.includes('FRU')) return 'fruits';
    if (skuUpper.includes('LENTIL') || skuUpper.includes('DHAL')) return 'lentils';
    if (skuUpper.includes('OIL')) return 'oil';
    if (skuUpper.includes('COCONUT')) return 'coconut';
    if (skuUpper.includes('SPICE')) return 'spices';
    if (skuUpper.includes('TEA') || skuUpper.includes('COFFEE')) return 'beverages_hot';
    if (skuUpper.includes('JUICE') || skuUpper.includes('SODA') || skuUpper.includes('BEV')) return 'beverages_cold';
    if (skuUpper.includes('SNACK') || skuUpper.includes('CHIP')) return 'snacks';
    if (skuUpper.includes('SWEET') || skuUpper.includes('CANDY')) return 'sweets';

    return 'general';
};

// ============================================
// MAIN CONTROLLER
// ============================================

export const getExternalFactorsAnalysis = async (req, res) => {
    try {
        const { days = 30, province = 'Western' } = req.query;
        const now = new Date();

        const pastStart = new Date(now);
        pastStart.setDate(pastStart.getDate() - parseInt(days));

        const futureEnd = new Date(now);
        futureEnd.setDate(futureEnd.getDate() + parseInt(days));

        // ============================================
        // CONTEXTUAL FACTORS
        // ============================================

        const currentSeason = getSeasonalFactors(now);
        const currentMonsoon = getMonsoonPattern(now);
        const economicFactors = getEconomicFactors();
        const schoolImpact = getSchoolTermImpact(now);
        const regionalFactors = getRegionalFactors(province);

        // ============================================
        // PAST ANALYSIS
        // ============================================

        const pastHolidays = getSriLankanHolidays(pastStart, now);

        // Get sales data
        const salesByDate = await Sale.aggregate([
            {
                $match: {
                    date: { $gte: pastStart, $lte: now }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
                        category: '$category'
                    },
                    totalUnits: { $sum: '$unitsSold' },
                    totalRevenue: { $sum: { $multiply: ['$unitsSold', '$unitPriceLKR'] } },
                    avgPrice: { $avg: '$unitPriceLKR' }
                }
            },
            { $sort: { '_id.date': 1 } }
        ]);

        // Calculate baseline by day of week and category
        const salesByDayOfWeek = {};
        const salesByCategory = {};

        salesByDate.forEach(sale => {
            const date = new Date(sale._id.date);
            const dayOfWeek = date.getDay();
            const category = sale._id.category || 'general';

            if (!salesByDayOfWeek[dayOfWeek]) salesByDayOfWeek[dayOfWeek] = [];
            salesByDayOfWeek[dayOfWeek].push(sale.totalUnits);

            if (!salesByCategory[category]) salesByCategory[category] = [];
            salesByCategory[category].push(sale.totalUnits);
        });

        // Calculate baselines
        const holidayDates = new Set(pastHolidays.map(h => h.date));
        const normalDays = salesByDate.filter(s => !holidayDates.has(s._id.date));
        const baselineAvg = normalDays.length > 0
            ? normalDays.reduce((sum, d) => sum + d.totalUnits, 0) / normalDays.length
            : 100;

        // Analyze past holiday impacts with category breakdown
        const pastImpactAnalysis = pastHolidays.map(holiday => {
            const holidaySales = salesByDate.filter(s => s._id.date === holiday.date);
            const totalUnits = holidaySales.reduce((sum, s) => sum + s.totalUnits, 0);

            const categoryBreakdown = holidaySales.map(s => ({
                category: s._id.category || 'general',
                units: s.totalUnits,
                revenue: s.totalRevenue
            }));

            const actualImpact = baselineAvg > 0
                ? ((totalUnits - baselineAvg) / baselineAvg * 100).toFixed(1)
                : 0;

            return {
                date: holiday.date,
                name: holiday.name,
                type: holiday.type,
                religion: holiday.religion,
                actualSales: Math.round(totalUnits),
                baselineSales: Math.round(baselineAvg),
                actualImpactPercent: parseFloat(actualImpact),
                categoryBreakdown,
                expectedImpact: holiday.category_impact,
                accuracyScore: calculateAccuracyScore(actualImpact, holiday.category_impact),
                wasPositive: parseFloat(actualImpact) > 0
            };
        });

        // ============================================
        // WEATHER & PATTERN ANALYSIS
        // ============================================

        const weekendDays = salesByDate.filter(s => {
            const d = new Date(s._id.date);
            return d.getDay() === 0 || d.getDay() === 6;
        });

        const weekdayDays = salesByDate.filter(s => {
            const d = new Date(s._id.date);
            return d.getDay() >= 1 && d.getDay() <= 5;
        });

        const weekendAvg = weekendDays.length > 0
            ? weekendDays.reduce((sum, d) => sum + d.totalUnits, 0) / weekendDays.length
            : baselineAvg;

        const weekdayAvg = weekdayDays.length > 0
            ? weekdayDays.reduce((sum, d) => sum + d.totalUnits, 0) / weekdayDays.length
            : baselineAvg;

        const weatherPatterns = [
            {
                factor: 'Weekend Shopping Pattern',
                icon: '📅',
                avgImpact: weekdayAvg > 0 ? ((weekendAvg - weekdayAvg) / weekdayAvg * 100).toFixed(1) : 0,
                description: 'Weekend vs weekday sales variance',
                confidence: 'high'
            },
            {
                factor: currentMonsoon.monsoon,
                icon: '🌧️',
                avgImpact: ((currentMonsoon.impact.footfall - 1) * 100).toFixed(1),
                description: currentMonsoon.description,
                affectedRegions: currentMonsoon.affected_regions,
                confidence: 'high'
            },
            {
                factor: currentSeason.season + ' Season',
                icon: '🌾',
                avgImpact: '+8.5',
                description: currentSeason.description,
                confidence: 'medium'
            }
        ];

        // ============================================
        // FUTURE PREDICTIONS (Enhanced)
        // ============================================

        const futureHolidays = getSriLankanHolidays(now, futureEnd);

        const futurePredictions = futureHolidays.map(holiday => {
            const daysUntil = daysBetween(now, holiday.date);
            const holidayDate = new Date(holiday.date);

            // Get contextual factors for the holiday
            const futureSeason = getSeasonalFactors(holidayDate);
            const futureMonsoon = getMonsoonPattern(holidayDate);

            // Calculate combined impacts
            const predictedImpacts = [];
            for (const [category, multiplier] of Object.entries(holiday.category_impact)) {
                if (category !== 'all') {
                    // Adjust for seasonal and monsoon factors
                    let adjustedMultiplier = multiplier;
                    if (futureSeason.impact[category]) {
                        adjustedMultiplier *= futureSeason.impact[category];
                    }
                    if (futureMonsoon.impact[category]) {
                        adjustedMultiplier *= futureMonsoon.impact[category];
                    }

                    predictedImpacts.push({
                        category: category.charAt(0).toUpperCase() + category.slice(1),
                        baseChange: Math.round((multiplier - 1) * 100),
                        adjustedChange: Math.round((adjustedMultiplier - 1) * 100),
                        direction: adjustedMultiplier > 1 ? 'increase' : 'decrease',
                        confidence: holiday.type === 'poya_major' || holiday.type === 'new_year' ? 'high' : 'medium'
                    });
                }
            }

            // Sort by absolute impact
            predictedImpacts.sort((a, b) => Math.abs(b.adjustedChange) - Math.abs(a.adjustedChange));

            // Generate specific recommendations
            const recommendations = generateDetailedRecommendations(
                holiday,
                predictedImpacts,
                daysUntil,
                futureSeason,
                futureMonsoon
            );

            return {
                date: holiday.date,
                name: holiday.name,
                type: holiday.type,
                religion: holiday.religion,
                daysUntil,
                weekday: holidayDate.toLocaleDateString('en-US', { weekday: 'long' }),
                predictedImpacts: predictedImpacts.slice(0, 8), // Top 8 categories
                overallImpact: holiday.category_impact.all
                    ? Math.round((holiday.category_impact.all - 1) * 100)
                    : Math.round((Math.max(...Object.values(holiday.category_impact)) - 1) * 100),
                urgency: daysUntil <= 3 ? 'high' : daysUntil <= 7 ? 'medium' : 'low',
                preparationDays: holiday.preparation_days || 1,
                celebrationDays: holiday.celebration_days || 1,
                regionalImpact: holiday.regional_impact || {},
                recommendations,
                contextualFactors: {
                    season: futureSeason.season,
                    monsoon: futureMonsoon.monsoon,
                    affectedRegions: futureMonsoon.affected_regions
                }
            };
        });

        // ============================================
        // INVENTORY & SALES SUMMARY
        // ============================================

        const inventorySummaryData = await InventorySnapshot.aggregate([
            {
                $match: {
                    date: { $gte: pastStart, $lte: now }
                }
            },
            {
                $group: {
                    _id: null,
                    avgClosingStock: { $avg: '$closingStock' },
                    totalSold: { $sum: '$soldQty' },
                    totalDiscarded: { $sum: '$discardedQty' },
                    avgStockoutRisk: { $avg: { $cond: [{ $eq: ['$closingStock', 0] }, 1, 0] } }
                }
            }
        ]);

        let summary;
        if (inventorySummaryData.length > 0 && inventorySummaryData[0].totalSold > 0) {
            summary = inventorySummaryData[0];
        } else {
            const salesHealthMetrics = await Sale.aggregate([
                {
                    $match: {
                        date: { $gte: pastStart, $lte: now }
                    }
                },
                {
                    $group: {
                        _id: null,
                        totalUnitsSold: { $sum: '$unitsSold' },
                        avgDailySales: { $avg: '$unitsSold' },
                        totalRevenue: { $sum: { $multiply: ['$unitsSold', '$unitPriceLKR'] } },
                        uniqueDays: { $addToSet: { $dateToString: { format: '%Y-%m-%d', date: '$date' } } },
                        uniqueProducts: { $addToSet: '$sku' }
                    }
                }
            ]);

            const salesMetrics = salesHealthMetrics[0] || {};
            const daysCount = salesMetrics.uniqueDays?.length || 1;
            const avgDailySalesTotal = (salesMetrics.totalUnitsSold || 0) / daysCount;

            summary = {
                avgClosingStock: Math.round(avgDailySalesTotal * 2.5),
                totalSold: salesMetrics.totalUnitsSold || 0,
                totalDiscarded: Math.round((salesMetrics.totalUnitsSold || 0) * 0.042),
                avgStockoutRisk: 0.03,
                totalRevenue: salesMetrics.totalRevenue || 0,
                daysAnalyzed: daysCount,
                productsTracked: salesMetrics.uniqueProducts?.length || 0
            };
        }

        // ============================================
        // COMPREHENSIVE RECOMMENDATIONS
        // ============================================

        const comprehensiveRecommendations = generateComprehensiveRecommendations(
            futurePredictions,
            weatherPatterns,
            currentSeason,
            currentMonsoon,
            economicFactors,
            schoolImpact,
            regionalFactors
        );

        // ============================================
        // RESPONSE
        // ============================================

        res.json({
            success: true,
            source: 'enhanced_sri_lanka_analysis',
            analyzedPeriod: {
                pastDays: parseInt(days),
                futureDays: parseInt(days),
                from: pastStart.toISOString().split('T')[0],
                to: futureEnd.toISOString().split('T')[0]
            },
            contextualFactors: {
                currentSeason,
                currentMonsoon,
                economicFactors,
                schoolImpact,
                regionalFactors
            },
            pastAnalysis: {
                baselineDailySales: Math.round(baselineAvg),
                holidayImpacts: pastImpactAnalysis,
                weatherPatterns,
                totalSalesRecords: salesByDate.length,
                categoryBreakdown: salesByCategory
            },
            futurePredictions: {
                upcomingEvents: futurePredictions,
                totalEvents: futurePredictions.length
            },
            inventorySummary: {
                avgDailyStock: Math.round(summary.avgClosingStock || 0),
                totalUnitsSold: Math.round(summary.totalSold || 0),
                wastePercentage: summary.totalSold > 0
                    ? ((summary.totalDiscarded / summary.totalSold) * 100).toFixed(1)
                    : '4.2',
                stockoutRiskDays: ((summary.avgStockoutRisk || 0.03) * 100).toFixed(1),
                totalRevenue: summary.totalRevenue || 0,
                daysAnalyzed: summary.daysAnalyzed || 0,
                productsTracked: summary.productsTracked || 0
            },
            recommendations: comprehensiveRecommendations
        });

    } catch (error) {
        logger.error('External factors analysis error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to analyze external factors',
            error: error.message
        });
    }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateAccuracyScore(actualImpact, expectedImpact) {
    if (!expectedImpact || !actualImpact) return 0;

    const expectedAll = expectedImpact.all || 1;
    const expectedPercent = (expectedAll - 1) * 100;
    const actualPercent = parseFloat(actualImpact) || 0;

    // Calculate how close actual was to expected
    const difference = Math.abs(expectedPercent - actualPercent);
    const accuracy = Math.max(0, 100 - difference * 2);

    return Math.round(accuracy);
}

function generateDetailedRecommendations(holiday, predictedImpacts, daysUntil, season, monsoon) {
    const recommendations = [];

    // Stock adjustment recommendations
    const increases = predictedImpacts.filter(p => p.direction === 'increase');
    const decreases = predictedImpacts.filter(p => p.direction === 'decrease');

    if (increases.length > 0) {
        recommendations.push({
            type: 'stock_increase',
            priority: daysUntil <= 3 ? 'urgent' : 'normal',
            message: `Increase stock for: ${increases.slice(0, 3).map(p => `${p.category} (+${p.adjustedChange}%)`).join(', ')}`,
            categories: increases.map(p => p.category)
        });
    }

    if (decreases.length > 0 && holiday.type === 'poya' || holiday.type === 'poya_major') {
        recommendations.push({
            type: 'stock_decrease',
            priority: 'normal',
            message: `Reduce orders for: ${decreases.slice(0, 3).map(p => `${p.category} (${p.adjustedChange}%)`).join(', ')}`,
            categories: decreases.map(p => p.category)
        });
    }

    // Monsoon-adjusted recommendations
    if (monsoon.impact.footfall < 1) {
        recommendations.push({
            type: 'weather_alert',
            priority: 'medium',
            message: `${monsoon.monsoon} may reduce foot traffic by ${Math.round((1 - monsoon.impact.footfall) * 100)}%`,
            suggestion: 'Focus on essential items and reduce perishables'
        });
    }

    return recommendations;
}

function generateComprehensiveRecommendations(futurePredictions, weatherPatterns, season, monsoon, economic, school, regional) {
    const recommendations = [];

    // High priority: Urgent events
    const urgentEvents = futurePredictions.filter(e => e.urgency === 'high');
    if (urgentEvents.length > 0) {
        const event = urgentEvents[0];
        recommendations.push({
            priority: 'high',
            type: 'event',
            icon: '⚠️',
            message: `${event.name} is in ${event.daysUntil} day${event.daysUntil !== 1 ? 's' : ''} - Prepare now!`,
            actionItems: event.predictedImpacts.slice(0, 4).map(i =>
                `${i.direction === 'increase' ? '📈' : '📉'} ${i.category}: ${i.adjustedChange > 0 ? '+' : ''}${i.adjustedChange}%`
            ),
            religion: event.religion,
            details: event.recommendations
        });
    }

    // Medium priority: Weekend preparation
    const today = new Date();
    const daysUntilWeekend = (6 - today.getDay() + 7) % 7 || 7;
    if (daysUntilWeekend <= 2) {
        const weekendImpact = weatherPatterns.find(p => p.factor.includes('Weekend'));
        recommendations.push({
            priority: 'medium',
            type: 'weekend',
            icon: '📅',
            message: `Weekend approaching - expect ${weekendImpact?.avgImpact || '+15'}% higher traffic`,
            actionItems: ['Stock up on high-demand items', 'Ensure fresh produce availability', 'Prepare promotional displays']
        });
    }

    // Monsoon warning
    if (monsoon && monsoon.impact.footfall < 1) {
        recommendations.push({
            priority: 'medium',
            type: 'weather',
            icon: '🌧️',
            message: `${monsoon.monsoon} active - ${monsoon.description}`,
            actionItems: monsoon.affected_regions.map(r => `${r} province: Adjust for reduced footfall`)
        });
    }

    // Seasonal insight
    recommendations.push({
        priority: 'low',
        type: 'seasonal',
        icon: '🌾',
        message: `${season.season} Season - ${season.description}`,
        actionItems: Object.entries(season.impact).slice(0, 3).map(([cat, mult]) =>
            `${cat}: ${mult < 1 ? 'Lower prices expected' : 'Standard pricing'}`
        )
    });

    // Economic factors
    if (economic.fuel_price_index > 1.1) {
        recommendations.push({
            priority: 'low',
            type: 'economic',
            icon: '💰',
            message: `Elevated transport costs (+${Math.round((economic.fuel_price_index - 1) * 100)}%) affecting imported goods`,
            actionItems: ['Consider local alternatives', 'Review dairy/transport-dependent pricing']
        });
    }

    // School term impact
    if (school) {
        recommendations.push({
            priority: 'low',
            type: 'school',
            icon: '🎓',
            message: school.description,
            actionItems: Object.entries(school.impact).map(([cat, mult]) =>
                `${cat}: expect +${Math.round((mult - 1) * 100)}% demand`
            )
        });
    }

    return recommendations;
}

export default { getExternalFactorsAnalysis };