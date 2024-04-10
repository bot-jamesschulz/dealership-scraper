const supabase = require('./dbConfig');

exports.dbDelete = async (table, dealershipHostname) => {

    const { data, error } = await supabase
    .from(table)
    .delete()
    .eq('dealership', dealershipHostname)

    if (error) console.log(error)

    console.log('data', data)
};
