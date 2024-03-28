require('dotenv').config()
const { createClient } = require('@supabase/supabase-js');

const key = process.env.SUPABASE_SERVICE_KEY
const connectionString = process.env.SUPABASE_URL;

let supabase;
try {
    supabase = createClient(connectionString, key);

    if (supabase.auth && supabase.storage) {
        console.log('Connection successful!')
    } else {
        console.log('Connection failed.')
    }
} catch (err) {
    console.log(err)
}

module.exports = supabase;

