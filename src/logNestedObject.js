function logNestedObject(obj, indent = '') {
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (typeof value === 'object' && value !== null) {
            // If the value is an object, recursively log its keys and values
            console.log(`${indent}${key}:`);
            logNestedObject(value, `${indent}  `);
        } else {
            // If the value is not an object, log the key and value
            console.log(`${indent}${key}: ${value}`);
        }
        }
    }
}

module.exports = logNestedObject;