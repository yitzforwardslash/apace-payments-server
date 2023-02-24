const {body} = require("express-validator");
const validateRequest = require("../../../middlewares/validateRequest");

const validateUpdateDailyReportSetting = [
    body('dailyReportEnabled')
        .exists()
        .isBoolean()
        .withMessage('Please provide a valid boolean value for daily report setting'),
    validateRequest,
];


module.exports = {
    validateUpdateDailyReportSetting
}