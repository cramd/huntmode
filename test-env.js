const fs = require('fs');
fs.writeFileSync('.env.test', 'FIREBASE_ADMIN_PRIVATE_KEY="hello\\\\nworld"\n');
require('dotenv').config({ path: '.env.test' });
console.log("Raw:", process.env.FIREBASE_ADMIN_PRIVATE_KEY);
console.log("Replaced:", process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'));
