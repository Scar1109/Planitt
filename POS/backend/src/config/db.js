const mongoose = require('mongoose');

async function connectDB(uri) {
    const mongoUri = uri || process.env.MONGO_URI || 'mongodb://localhost:27017/planitt-pos';
    const conn = await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        family: 4
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
}

module.exports = {
    connectDB,
    mongoose,
};
