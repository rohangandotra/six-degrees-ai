
require('dotenv').config({ path: '.env.local' });
console.log('Available Env Vars:', Object.keys(process.env).filter(k => k.includes('URL') || k.includes('KEY') || k.includes('DB')));
