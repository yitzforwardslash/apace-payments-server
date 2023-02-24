const fs = require('fs');

const docs = require('./docs');
const docsContent = JSON.stringify(docs);
fs.writeFileSync('./swagger_output.json', docsContent);
