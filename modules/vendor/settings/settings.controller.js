const settingsService = require("./settings.service");

const updateDailyReportSetting = async (request, response, next) => {
    const {dailyReportEnabled} = request.body;

    try {
        const data = await settingsService.alterDailyReportEnabledValue(request.vendorId, dailyReportEnabled);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    updateDailyReportSetting
}
