require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4']);

const app = require('./app');
const { connectDB } = require('./config/db');

const PORT = Number(process.env.PORT || 5000);

async function start() {
    await connectDB(process.env.MONGO_URI);
    app.listen(PORT, () => {
        console.log(`POS Server running on port ${PORT}`);
    });
}

start().catch((error) => {
    console.error('Failed to start POS server:', error.message);
    process.exit(1);
});
