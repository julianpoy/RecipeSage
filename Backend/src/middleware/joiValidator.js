const joiValidator = (joiSchema) => {
  return (req, res, next) => {
    const { error } = joiSchema.validate({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (error) {
      return res.status(400).send(error.message);
    }

    next();
  };
}

module.exports = {
  joiValidator,
};
