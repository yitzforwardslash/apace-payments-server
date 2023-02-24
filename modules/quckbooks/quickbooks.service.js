const {
  globalSiteSetting,
  quickbooksSalesAccount,
  invoice: Invoice,
} = require('../../prisma/prismaClient');
const QuickBooks = require('../../utils/QuickBooks');

module.exports.saveToken = (token, realmId) =>
  Promise.all([
    globalSiteSetting.upsert({
      where: { key: 'quickbooks_token' },
      update: { key: 'quickbooks_token', value: token },
      create: { key: 'quickbooks_token', value: token },
    }),
    globalSiteSetting.upsert({
      where: { key: 'quickbooks_realmId' },
      update: { key: 'quickbooks_realmId', value: realmId },
      create: { key: 'quickbooks_realmId', value: realmId },
    }),
  ]);

module.exports.getQuickbookData = async () => {
  const data = await globalSiteSetting.findMany({
    where: { key: { in: ['quickbooks_token', 'quickbooks_realmId'] } },
  });
  const token = data.find((item) => item.key === 'quickbooks_token');
  const realmId = data.find((item) => item.key === 'quickbooks_realmId');

  return {
    token: token ? token.value : null,
    realmId: realmId ? realmId.value : null,
  };
};

module.exports.getUndepositedFundsAccount = async () => {
  let account = await quickbooksSalesAccount.findFirst({
    where: { subType: 'UndepositedFunds' },
  });
  if (!account) {
    const quickbooksData = await this.getQuickbookData();
    if (!quickbooksData.token) return null;

    const existingAccount = await QuickBooks.getAccounts(
      JSON.parse(quickbooksData.token),
      quickbooksData.realmId,
      `select * from Account WHERE AccountSubType='UndepositedFunds'`
    );
    if (existingAccount && existingAccount.length) {
      account = await quickbooksSalesAccount.create({
        data: {
          type: existingAccount[0].AccountType,
          subType: existingAccount[0].AccountSubType,
          quickbooksName: existingAccount[0].Name,
          quickbooksId: existingAccount[0].Id,
          quickbooksSyncToken: existingAccount[0].SyncToken,
        },
      });

      return account;
    }

    const createdAccount = await QuickBooks.createSalesAccount(
      JSON.parse(quickbooksData.token),
      quickbooksData.realmId,
      {
        AccountType: 'Other Current Asset',
        AccountSubType: 'UndepositedFunds',
        Name: 'UndepositedFunds Account',
      }
    );

    account = await quickbooksSalesAccount.create({
      data: {
        quickbooksId: createdAccount.Id,
        quickbooksSyncToken: createdAccount.SyncToken,
        quickbooksName: createdAccount.Name,
      },
    });
  }

  return account;
};

module.exports.syncInvoiceFromQuickbooks = async (quickbooksId) => {
  console.log('Syncing invoice', quickbooksId);

  const invoice = await Invoice.findFirst({ where: { quickbooksId } });
  if (!invoice) {
    throw new Error('Invalid invoice id');
  }

  const quickbooksData = await this.getQuickbookData();

  const qbInvoice = await QuickBooks.getInvoice(
    JSON.parse(quickbooksData.token),
    quickbooksData.realmId,
    quickbooksId
  );

  const update = {
    quickbooksSyncToken: qbInvoice.SyncToken,
  };

  if (qbInvoice.Balance === 0 && invoice.status === 'unpaid') {
    // mark invoice as paid
    update.status = 'paid';
  }
  await Invoice.update({
    where: { id: invoice.id },
    data: update,
  });
};

module.exports.handlePayment = async (paymentId) => {
  const quickbooksData = await this.getQuickbookData();
  const payment = await QuickBooks.getPayment(
    JSON.parse(quickbooksData.token),
    quickbooksData.realmId,
    paymentId
  );
  if (payment && payment.Line) {
    const LinkedTxns = payment.Line.reduce(
      (acc, item) => acc.concat(item.LinkedTxn),
      []
    );
    console.log({ LinkedTxns });
    for await (const item of LinkedTxns) {
      if (item.TxnType === 'Invoice') {
        await this.syncInvoiceFromQuickbooks(item.TxnId);
      }
    }
  }
};

// module.exports.syncInvoiceFromQuickbooks('185');
