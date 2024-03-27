function condition(inventoryType) {
    if (inventoryType === 'new') return inventoryType;
    if (inventoryType === 'used' || inventoryType === 'owned') return 'used';

    return null;
}

module.exports = condition;