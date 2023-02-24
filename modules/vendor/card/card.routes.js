const router = require('express').Router({mergeParams: true});
const portalAuthentication = require("../../../middlewares/portalAuthentication");
const cardController = require("./card.controller");
const cardValidator = require("./card.validator");


router.get('/', portalAuthentication, cardController.getVendorCards);

router.post(
    '/',
    portalAuthentication,
    cardValidator.validateAddCard,
    cardController.createNewCard
);

router.delete('/:cardId',
    portalAuthentication,
    cardController.deleteCard
)

router.post(
    '/default',
    portalAuthentication,
    cardValidator.validateUpdateDefaultCard,
    cardController.updateDefaultCard
);

module.exports = router;