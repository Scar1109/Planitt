const mongoose = require('mongoose');
const path = require('path');

// Mock a simple connection script
async function checkData() {
    try {
        await mongoose.connect('mongodb://localhost:27017/planitt'); // Adjust DB name if known
        console.log('Connected to DB');
        
        const db = mongoose.connection.db;
        const inventory = await db.collection('inventorysnapshots').find({ storeId: 'STORE-001' }).toArray();
        console.log('Total inventory items for STORE-001:', inventory.length);
        
        const critical = inventory.filter(i => i.DaysToExpiry > 0 && i.DaysToExpiry <= 7);
        console.log('Critical items (1-7 days):', critical.length);
        
        if (critical.length > 0) {
            console.log('Sample critical item:', JSON.stringify(critical[0]));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkData();
