module.exports = (request, response, next) => {
  if (request.files) {
    request.body.files = request.files;
    delete request.files;
  }
  next();
};
