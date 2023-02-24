const {invoice: Invoice} = require('../prisma/prismaClient')


module.exports = async () => {
  const invoices = await Invoice.findMany({
    where: {
      
    }
  })
}