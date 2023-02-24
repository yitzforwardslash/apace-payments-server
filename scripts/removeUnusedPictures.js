const S3 = require('../utils/S3');
const { getAllProfilePictures } = require('../modules/vendor/vendor.service');
const logger = require('../utils/Logger');
/**
 * 1- find all used pictures (from vendor service)
 * 2- find all s3 pictures
 * 3- remove any s3 picture that is not within used pictures
 * 4- log how much disk we have restored.
 */

module.exports = async () => {
  const unusedImages = await getUnusedImages();
  if (unusedImages.length === 0) {
    logger.info('There is no any unused image.');
    process.exit(1);
  }
  await deleteUnusedImages(unusedImages.map((image) => ({ Key: image.Key })));
  const toBeFreedMemory =
    unusedImages.reduce((prev, next) => prev + next.Size, 0) / 1000000;

  logger.info(
    'Successfully restored',
    toBeFreedMemory,
    'MBs from S3 for unused pictures'
  );
  process.exit(1);
};

const getUnusedImages = async () => {
  const allS3Objects = await S3.listAllObjects();
  const allUsedPictures = await getAllProfilePictures();
  return allS3Objects.filter(
    (object) =>
      allUsedPictures.findIndex(
        (element) => element === '/storage'.concat(object.Key)
      ) === -1
  );
};

const deleteUnusedImages = (objects) =>
  S3.deleteObjects({ Delete: { Objects: objects } }).promise();
