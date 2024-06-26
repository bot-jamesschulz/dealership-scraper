
const supabase = require('./dbConfig');

exports.dbInsert = async (table, rows) => {
    console.log('inserting into db:', 'table:');
    console.log('table', table);

    const insertPromises = rows.map(row =>
        supabase
            .from(table)
            .insert(row)
            .select()
    );

    // Execute all insert operations concurrently
    const insertResults = await Promise.allSettled(insertPromises)
    const errors = [];

    insertResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && !result?.value?.error) {
            console.log(`Row ${index} inserted successfully`);
        } else {
            const resultError = result?.value?.error;
            if (resultError) errors.push(`Error inserting row ${index}: ${resultError?.message} ${resultError?.details}`, );
            else errors.push(result.reason);
        }
    });

    return errors.length > 0 ? errors : null;
    
    
};
