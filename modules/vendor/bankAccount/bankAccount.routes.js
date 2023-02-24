const router = require('express').Router({mergeParams: true});
const portalAuthentication = require("../../../middlewares/portalAuthentication");
const bankAccountController = require("./bankAccount.controller");
const bankAccountValidator = require("./bankAccount.validator");


router.get('/', portalAuthentication, bankAccountController.getVendorBankAccounts);

router.post(
    '/',
    portalAuthentication,
    bankAccountValidator.validateAddBankAccount,
    bankAccountController.createNewBankAccount
);

router.delete('/:bankAccountId',
    portalAuthentication,
    bankAccountController.deleteBankAccount
)

router.post(
    '/default',
    portalAuthentication,
    bankAccountValidator.validateUpdateDefaultBankAccount,
    bankAccountController.updateDefaultBankAccount
);

module.exports = router;