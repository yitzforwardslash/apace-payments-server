const logsService = require("./logs.service");

const getLogs = async (request, response, next) =>{
    const { cursor, pageLength, page} = request.query;

    try{
        const data = await logsService.retrieveLogs(cursor, pageLength, page);

        response.status(200).send({
            success: true,
            data
        });
    } catch (error) {
        next(error);
    }
}

module.exports = {
    getLogs
}