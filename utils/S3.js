const AWS = require('aws-sdk');
const { S3Key, S3Secret } = process.env;

AWS.config.update({
  accessKeyId: S3Key,
  secretAccessKey: S3Secret,
  region: 'us-east-1',
});

const S3Bucket = new AWS.S3({ params: { Bucket: 'apace-profiles' } });

S3Bucket.uploadAsync = (parameters) =>
  new Promise((resolve, reject) =>
    S3Bucket.upload(parameters, (error, data) => {
      if (error) {
        return reject(error);
      }
      resolve(data);
    })
  );

const findAllObjects = async function* (opts) {
  opts = { ...opts };
  do {
    const data = await S3Bucket.listObjectsV2(opts).promise();
    opts.ContinuationToken = data.NextContinuationToken;
    yield data;
  } while (opts.ContinuationToken);
};

S3Bucket.listAllObjects = async () => {
  const content = [];
  for await (const data of findAllObjects({
    Bucket: 'apace-profiles',
  })) {
    content.push(...data.Contents);
  }
  return content;
};

module.exports = S3Bucket;
