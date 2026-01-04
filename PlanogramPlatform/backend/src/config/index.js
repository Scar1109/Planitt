// Config module - reads from environment variables
import dotenv from 'dotenv';
dotenv.config();

const config = {
    mongodb: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017',
        openWeatherKey: process.env.OPENWEATHER_API_KEY || process.env.WEATHER_API_KEY || null
    },
    server: {
        port: process.env.PORT || 3000,
        env: process.env.NODE_ENV || 'development'
    },
    openai: {
        apiKey: process.env.OPENAI_API_KEY || null,
        model: process.env.OPENAI_MODEL,
        maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS) || 1000,
        temperature: parseFloat(process.env.OPENAI_TEMPERATURE) || 0.7
    }
};

export default config;
