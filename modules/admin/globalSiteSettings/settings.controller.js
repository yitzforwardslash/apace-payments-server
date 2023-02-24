const settingsService = require("./settings.service");

const getGlobalSiteSettings = async (request, response, next) => {
    const {cursor, pageLength, page} = request.query;

    try {
        const data = await settingsService.retrieveSettings(cursor, pageLength, page);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const updateGlobalSiteSettings = async (request, response, next) => {
    try {
        const data = await settingsService.alterSetting(request.body, request.admin.id);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

const addGlobalSiteSetting = async (request, response, next) => {
    const {key, value} = request.body;

    try {
        const data = await settingsService.addNewSetting({key, value}, request.admin.id);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getGlobalSiteSettings,
    updateGlobalSiteSettings,
    addGlobalSiteSetting
}