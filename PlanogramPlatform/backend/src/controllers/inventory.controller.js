import InventorySnapshot from "../models/InventorySnapshot.js";
import Sale from "../models/Sale.js";
import Product from "../models/Product.js";

/**
 * Get Low Stock Alerts - Real data from database
 * Analyzes inventory levels against average daily sales to determine stock health
 */
export const getLowStockAlerts = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        // Get the most recent date with inventory data
        const latestInventory = await InventorySnapshot.findOne()
            .sort({ date: -1 })
            .select('date');

        if (!latestInventory) {
            return res.json({
                success: true,
                alerts: [],
                message: "No inventory data available"
            });
        }

        const latestDate = latestInventory.date;

        // Get all products with their latest inventory snapshot
        const latestSnapshots = await InventorySnapshot.find({ date: latestDate })
            .lean();

        // Calculate average daily sales for the last 14 days for each product
        const twoWeeksAgo = new Date(latestDate);
        twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

        const salesAggregation = await Sale.aggregate([
            {
                $match: {
                    date: { $gte: twoWeeksAgo, $lte: latestDate }
                }
            },
            {
                $group: {
                    _id: "$sku",
                    totalSold: { $sum: "$unitsSold" },
                    salesDays: { $addToSet: "$date" }
                }
            },
            {
                $project: {
                    sku: "$_id",
                    totalSold: 1,
                    daysWithSales: { $size: "$salesDays" },
                    avgDailySales: {
                        $divide: ["$totalSold", { $max: [{ $size: "$salesDays" }, 1] }]
                    }
                }
            }
        ]);

        // Create a map of SKU to avg daily sales
        const salesMap = {};
        salesAggregation.forEach(s => {
            salesMap[s.sku] = {
                avgDailySales: Math.ceil(s.avgDailySales),
                totalSold: s.totalSold,
                daysWithSales: s.daysWithSales
            };
        });

        // Get product details
        const products = await Product.find().lean();
        const productMap = {};
        products.forEach(p => {
            productMap[p.sku] = p;
        });

        // Analyze low stock situations
        const lowStockAlerts = [];

        for (const snapshot of latestSnapshots) {
            const currentStock = snapshot.closingStock || 0;
            const salesData = salesMap[snapshot.sku] || { avgDailySales: 0, totalSold: 0 };
            const productInfo = productMap[snapshot.sku] || {};

            // Skip products with no sales history (they might be new or discontinued)
            if (salesData.avgDailySales === 0) continue;

            const avgDailyDemand = salesData.avgDailySales;
            const daysOfStock = avgDailyDemand > 0 ? Math.floor(currentStock / avgDailyDemand) : 999;
            const weeklyDemand = avgDailyDemand * 7;

            // Determine alert level based on days of stock remaining
            let alertLevel = null;
            let alertMessage = "";
            let urgency = 0;

            if (daysOfStock <= 1) {
                alertLevel = "critical";
                alertMessage = "Stockout imminent! Order immediately";
                urgency = 3;
            } else if (daysOfStock <= 3) {
                alertLevel = "high";
                alertMessage = `Only ${daysOfStock} days of stock remaining`;
                urgency = 2;
            } else if (daysOfStock <= 5) {
                alertLevel = "medium";
                alertMessage = `${daysOfStock} days of stock - order soon`;
                urgency = 1;
            }

            if (alertLevel) {
                lowStockAlerts.push({
                    sku: snapshot.sku,
                    name: productInfo.productName || snapshot.sku,
                    category: productInfo.category || 'Unknown',
                    brand: productInfo.brand || 'Unknown',
                    currentStock: Math.round(currentStock),
                    avgDailyDemand: Math.round(avgDailyDemand),
                    daysOfStock: daysOfStock,
                    weeklyDemand: Math.round(weeklyDemand),
                    suggestedOrder: Math.max(0, Math.round(weeklyDemand * 2 - currentStock)),
                    alertLevel,
                    alertMessage,
                    urgency,
                    // Additional real data
                    soldQtyToday: snapshot.soldQty || 0,
                    discardedQty: snapshot.discardedQty || 0,
                    lastOrderQty: snapshot.orderPlacedQty || 0,
                    supplierLeadDays: snapshot.supplierLeadTimeDays || 3,
                    snapshotDate: latestDate
                });
            }
        }

        // Sort by urgency (critical first, then by stock level)
        lowStockAlerts.sort((a, b) => {
            if (b.urgency !== a.urgency) return b.urgency - a.urgency;
            return a.daysOfStock - b.daysOfStock;
        });

        // Return top N alerts
        const topAlerts = lowStockAlerts.slice(0, parseInt(limit));

        res.json({
            success: true,
            alerts: topAlerts,
            totalLowStock: lowStockAlerts.length,
            summary: {
                critical: lowStockAlerts.filter(a => a.alertLevel === 'critical').length,
                high: lowStockAlerts.filter(a => a.alertLevel === 'high').length,
                medium: lowStockAlerts.filter(a => a.alertLevel === 'medium').length
            },
            dataDate: latestDate,
            analyzedProducts: latestSnapshots.length
        });

    } catch (error) {
        console.error("Error fetching low stock alerts:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get Inventory Summary Statistics
 */
export const getInventorySummary = async (req, res) => {
    try {
        // Get the most recent date with inventory data
        const latestInventory = await InventorySnapshot.findOne()
            .sort({ date: -1 })
            .select('date');

        if (!latestInventory) {
            return res.json({
                success: true,
                summary: null,
                message: "No inventory data available"
            });
        }

        const latestDate = latestInventory.date;

        // Aggregate inventory stats
        const stats = await InventorySnapshot.aggregate([
            { $match: { date: latestDate } },
            {
                $group: {
                    _id: null,
                    totalProducts: { $sum: 1 },
                    totalStock: { $sum: "$closingStock" },
                    totalSold: { $sum: "$soldQty" },
                    totalDiscarded: { $sum: "$discardedQty" },
                    avgClosingStock: { $avg: "$closingStock" },
                    lowStockCount: {
                        $sum: { $cond: [{ $lt: ["$closingStock", 20] }, 1, 0] }
                    },
                    outOfStock: {
                        $sum: { $cond: [{ $eq: ["$closingStock", 0] }, 1, 0] }
                    }
                }
            }
        ]);

        res.json({
            success: true,
            summary: stats[0] || null,
            dataDate: latestDate
        });

    } catch (error) {
        console.error("Error fetching inventory summary:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
