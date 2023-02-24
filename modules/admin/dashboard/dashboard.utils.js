const isNumeric = (value) => {
    return !isNaN(parseFloat(value)) && isFinite(value);
};

module.exports = {
    isNumeric
}