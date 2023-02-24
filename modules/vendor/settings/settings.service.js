const {vendor: Vendor} = require("../../../prisma/prismaClient")

const alterDailyReportEnabledValue = async (id, dailyReportEnabled) => {
    await Vendor.update({
        where: {id},
        data: {
            dailyReportEnabled
        },
    });

    return {dailyReportEnabled};
}

module.exports = {
    alterDailyReportEnabledValue
}