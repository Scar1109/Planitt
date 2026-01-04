import logger from '../config/logger.js';

/**
 * Events Controller
 * Returns upcoming events and holidays for Sri Lanka.
 * These events affect demand forecasting.
 */

// Sri Lankan holidays and events for 2025-2026
const getSriLankanHolidays = () => {
    const now = new Date();
    const year = now.getFullYear();

    // Major Sri Lankan holidays (approximate dates - Poya days vary)
    const holidays = [
        // 2025
        { date: `2025-01-13`, name: "Duruthu Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2025-01-14`, name: "Thai Pongal", type: "holiday", expectedImpact: "high", demandMultiplier: 1.3 },
        { date: `2025-02-04`, name: "Independence Day", type: "public", expectedImpact: "medium", demandMultiplier: 1.15 },
        { date: `2025-02-12`, name: "Navam Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2025-03-14`, name: "Medin Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2025-04-13`, name: "Sinhala & Tamil New Year Eve", type: "holiday", expectedImpact: "high", demandMultiplier: 1.5 },
        { date: `2025-04-14`, name: "Sinhala & Tamil New Year", type: "public", expectedImpact: "high", demandMultiplier: 1.6 },
        { date: `2025-04-18`, name: "Good Friday", type: "public", expectedImpact: "medium", demandMultiplier: 1.2 },
        { date: `2025-05-01`, name: "May Day", type: "public", expectedImpact: "medium", demandMultiplier: 1.15 },
        { date: `2025-05-12`, name: "Vesak Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.4 },
        { date: `2025-06-10`, name: "Poson Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.3 },
        { date: `2025-07-10`, name: "Esala Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2025-08-08`, name: "Nikini Poya", type: "poya", expectedImpact: "medium", demandMultiplier: 1.2 },
        { date: `2025-09-07`, name: "Binara Poya", type: "poya", expectedImpact: "medium", demandMultiplier: 1.2 },
        { date: `2025-10-06`, name: "Vap Poya", type: "poya", expectedImpact: "medium", demandMultiplier: 1.2 },
        { date: `2025-10-20`, name: "Deepavali", type: "holiday", expectedImpact: "high", demandMultiplier: 1.35 },
        { date: `2025-11-05`, name: "Il Poya", type: "poya", expectedImpact: "medium", demandMultiplier: 1.2 },
        { date: `2025-12-04`, name: "Unduvap Poya", type: "poya", expectedImpact: "medium", demandMultiplier: 1.2 },
        { date: `2025-12-25`, name: "Christmas", type: "public", expectedImpact: "high", demandMultiplier: 1.4 },

        // 2026
        { date: `2026-01-03`, name: "Duruthu Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2026-01-14`, name: "Thai Pongal", type: "holiday", expectedImpact: "high", demandMultiplier: 1.3 },
        { date: `2026-02-01`, name: "Navam Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2026-02-04`, name: "Independence Day", type: "public", expectedImpact: "medium", demandMultiplier: 1.15 },
        { date: `2026-03-03`, name: "Medin Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2026-04-01`, name: "Bak Poya", type: "poya", expectedImpact: "high", demandMultiplier: 1.25 },
        { date: `2026-04-13`, name: "Sinhala & Tamil New Year Eve", type: "holiday", expectedImpact: "high", demandMultiplier: 1.5 },
        { date: `2026-04-14`, name: "Sinhala & Tamil New Year", type: "public", expectedImpact: "high", demandMultiplier: 1.6 },
    ];

    return holidays;
};

// Calculate days until event
const calculateDaysUntil = (date) => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);
    const diff = eventDate.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const getEvents = async (req, res) => {
    try {
        const { city = 'Colombo', country_code = 'LK', days = 30 } = req.query;

        const allHolidays = getSriLankanHolidays();
        const now = new Date();

        // Filter upcoming events within the specified days
        const upcomingEvents = allHolidays
            .map(holiday => ({
                ...holiday,
                id: `${holiday.date}-${holiday.name.replace(/\s+/g, '-').toLowerCase()}`,
                daysUntil: calculateDaysUntil(holiday.date),
                weekday: new Date(holiday.date).toLocaleDateString('en-US', { weekday: 'long' }),
                affectedCategories: holiday.type === 'poya'
                    ? ['groceries', 'vegetables', 'fruits']
                    : ['all']
            }))
            .filter(event => event.daysUntil >= 0 && event.daysUntil <= parseInt(days))
            .sort((a, b) => a.daysUntil - b.daysUntil);

        res.json({
            success: true,
            source: 'sri_lanka_calendar',
            location: city,
            events: upcomingEvents,
            totalEvents: upcomingEvents.length
        });

    } catch (error) {
        logger.error('Events API error:', error.message);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch events',
            error: error.message
        });
    }
};
