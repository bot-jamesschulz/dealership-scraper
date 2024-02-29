const supabase = require('./dbConfig');

exports.dbDelete = async (table, key) => {

    const { data, error } = await supabase
    .from(table)
    .delete()
    .neq(key, null)

    if (error) console.log(error)

    console.log('data', data)
};
