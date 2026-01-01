import mongoose from "mongoose";

const WeatherSchema = new mongoose.Schema({
    date: { type: Date, index: true },
    avgTemperatureC: Number,
    rainfallMM: Number,
    condition: String,
    humidityPercent: Number
});

export default mongoose.model("Weather", WeatherSchema);