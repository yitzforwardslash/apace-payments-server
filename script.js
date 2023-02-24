// const { getPlaidToken } = require('./testing/utils/fundingSource');
const bcrypt = require('bcrypt');

async function main() {
  // const tokens = await getPlaidToken();
  const hashedPassword = await bcrypt.hash('123456', 15);

  console.log(hashedPassword);
}

main().then(console.log).catch(console.log);
