import axios from 'axios';
import logger from '../config/logger.js';
import config from '../config/index.js';

/**
 * Weather Controller
 * Fetches real-time weather data.
 * Primary: OpenWeatherMap (Requires Key)
 * Fallback: Open-Meteo (Free, No Key)
 */

// --- Helpers ---

// Map OWM Condition
const getOWMCondition = (iconCode, description) => {
    if (!iconCode) return description || 'Unknown';
    const code = iconCode.substring(0, 2);
    switch (code) {
        case '01': return 'Clear sky';
        case '02': return 'Partly cloudy';
        case '03': return 'Cloudy';
        case '04': return 'Overcast';
        case '09': return 'Rain showers';
        case '10': return 'Rain';
        case '11': return 'Thunderstorm';
        case '13': return 'Snow';
        case '50': return 'Mist/Fog';
        default: return description ? description.charAt(0).toUpperCase() + description.slice(1) : 'Unknown';
    }
};

// Map Open-Meteo Condition
const getOpenMeteoCondition = (code) => {
    const codes = {
        0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
        45: 'Fog', 48: 'Depositing rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
        55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
        71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 80: 'Slight rain showers',
        81: 'Moderate rain showers', 82: 'Violent rain showers', 95: 'Thunderstorm',
        96: 'Thunderstorm with slight hail', 99: 'Thunderstorm with heavy hail'
    };
    return codes[code] || 'Unknown';
};

// --- API Functions ---

// Fetch from OpenWeatherMap
const fetchOpenWeatherMap = async (city, country_code, lat, long, apiKey) => {
    const params = { appid: apiKey, units: 'metric' };
    if (lat && long) { params.lat = lat; params.lon = long; }
    else { params.q = `${city},${country_code}`; }

    const [currentRes, forecastRes] = await Promise.all([
        axios.get('https://api.openweathermap.org/data/2.5/weather', { params }),
        axios.get('https://api.openweathermap.org/data/2.5/forecast', { params })
    ]);

    const currentData = currentRes.data;
    const forecastData = forecastRes.data;

    // Aggregate 3h forecast to daily
    const dailyForecasts = {};
    forecastData.list.forEach(item => {
        const date = item.dt_txt.split(' ')[0];
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = { temps: [], conditions: [], precip: 0 };
        }
        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].conditions.push(item.weather[0]);
        dailyForecasts[date].precip += (item.rain ? (item.rain['3h'] || 0) : 0);
    });

    const formattedForecast = Object.keys(dailyForecasts).slice(0, 5).map(date => {
        const d = dailyForecasts[date];
        const midIndex = Math.floor(d.conditions.length / 2);
        return {
            date,
            temperatureHigh: Math.round(Math.max(...d.temps) * 10) / 10,
            temperatureLow: Math.round(Math.min(...d.temps) * 10) / 10,
            condition: getOWMCondition(d.conditions[midIndex].icon, d.conditions[midIndex].description),
            precipitationProbability: Math.round(d.precip * 10) / 10 // mapping amount to prob key for frontend compatibility
        };
    });

    return {
        location: currentData.name || city,
        coordinates: { lat: currentData.coord.lat, long: currentData.coord.lon },
        current: {
            temp_c: currentData.main.temp,
            condition: getOWMCondition(currentData.weather[0].icon, currentData.weather[0].description),
            humidity: currentData.main.humidity,
            precip_mm: currentData.rain ? (currentData.rain['1h'] || 0) : 0,
            wind_kph: currentData.wind.speed * 3.6,
            updated_at: new Date(currentData.dt * 1000).toISOString()
        },
        forecast: formattedForecast
    };
};

// Fetch from Open-Meteo (Fallback)
const fetchOpenMeteo = async (city, country_code, lat, long) => {
    // Default to Colombo coords if missing
    const latitude = lat || 6.9271;
    const longitude = long || 79.8612;

    const response = await axios.get('https://api.open-meteo.com/v1/forecast', {
        params: {
            latitude, longitude,
            current: 'temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m',
            daily: 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum',
            timezone: 'auto'
        }
    });

    const data = response.data;
    const current = data.current;

    return {
        location: city,
        coordinates: { lat: latitude, long: longitude },
        current: {
            temp_c: current.temperature_2m,
            condition: getOpenMeteoCondition(current.weather_code),
            humidity: current.relative_humidity_2m,
            precip_mm: current.precipitation,
            wind_kph: current.wind_speed_10m,
            updated_at: current.time
        },
        forecast: data.daily.time.map((date, index) => ({
            date,
            temperatureHigh: data.daily.temperature_2m_max[index],
            temperatureLow: data.daily.temperature_2m_min[index],
            condition: getOpenMeteoCondition(data.daily.weather_code[index]),
            precipitationProbability: data.daily.precipitation_sum[index]
        }))
    };
};

// --- Main Controller ---

export const getWeather = async (req, res) => {
    const { city = 'Colombo', country_code = 'LK', lat, long } = req.query;
    const apiKey = config.mongodb.openWeatherKey;

    try {
        if (!apiKey) throw new Error("No API Key");

        // Try OpenWeatherMap
        const data = await fetchOpenWeatherMap(city, country_code, lat, long, apiKey);
        return res.json({ success: true, source: 'OpenWeatherMap', ...data });

    } catch (error) {
        logger.warn(`OpenWeatherMap failed (${error.message}). Falling back to Open-Meteo.`);

        try {
            // Fallback to Open-Meteo
            const data = await fetchOpenMeteo(city, country_code, lat, long);
            return res.json({ success: true, source: 'Open-Meteo', ...data });
        } catch (fallbackError) {
            logger.error('All weather providers failed:', fallbackError.message);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch weather data',
                error: fallbackError.message
            });
        }
    }
};
