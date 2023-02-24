const express = require('express');
const AptPay = require('../../utils/AptPay');

/**
 * 
 * @param {express.Request} request 
 * @param {express.Response} response 
 * @param {express.NextFunction} next 
 */
module.exports.validateRequestHMAC = (request, response, next) => {
    const bodyHashHeader = request.header('body-hash');
    const bodyHash = AptPay.signHmacSha512(request.body ? JSON.stringify(request.body) : '');

    if (bodyHashHeader != bodyHash) {
        return response.status(401).send('Unauthorized');
    }

    return next();
}