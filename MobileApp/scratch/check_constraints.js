const mongoose = require('mongoose');

async function checkConstraints() {
    try {
        await mongoose.connect('mongodb://localhost:27017/planitt');
        console.log('Connected to DB');
        
        const db = mongoose.connection.db;
        const constraints = await db.collection('constraints').find({}).toArray();
        console.log('Total constraints in DB:', constraints.length);
        if (constraints.length > 0) {
            console.log('First constraint:', JSON.stringify(constraints[0], null, 2));
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkConstraints();
