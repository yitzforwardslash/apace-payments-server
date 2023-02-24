const fs = require('fs');
const S3Bucket = require('../../utils/S3');
const logger = require('../../utils/Logger');

/**
 * Uploads image
 * @param {Buffer} imageContent
 * @returns {String}
 */
module.exports.uploadImage = async (imageContent, ext = '') => {
  const today = new Date();
  const params = {
    Key: `/images/${today.getMonth() + 1}/${today.getDate()}/${
      Date.now() + Number.parseInt(Math.random() * 1500)
    }${ext ? `.${ext}` : ''}`,
    Body: imageContent,
  };
  try {
    const uploadData = await S3Bucket.uploadAsync(params);
    return uploadData.key;
  } catch (error) {
    logger.error(error);
  }
};

/**
 *
 * @param {String} imageUrl
 * @returns {Buffer}
 */
module.exports.retrieveImage = async (imageUrl) => {
  try {
    const { Body } = await S3Bucket.getObject({ Key: imageUrl }).promise();
    return Buffer.from(Body);
  } catch (error) {
    logger.error(error);
  }
};

module.exports.uploadFile = async (filePath, fileName) => {
  const today = new Date();
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Key: `/files/${today.getMonth() + 1}/${today.getDate()}/${
      Date.now() + Number.parseInt(Math.random() * 1500)
    }${fileName}`,
    Body: fileContent,
  };

  try {
    const uploadData = await S3Bucket.uploadAsync(params);
    return uploadData.key;
  } catch (err) {
    logger.error(err);
    throw new Error("Something went wrong");
  }
};
