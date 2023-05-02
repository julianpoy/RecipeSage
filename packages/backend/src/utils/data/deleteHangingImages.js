const Sequelize = require('sequelize');
const Op = Sequelize.Op;

const Image = require('../../models').Image;
const Recipe_Image = require('../../models').Recipe_Image;

const { deleteObjects } = require('../../services/storage');

const deleteHangingImagesForUser = async (userId, transaction) => {
  const userImages = await Image.findAll({
    where: {
      [Op.and]: [
        {
          userId,
        },
        Sequelize.where(
          Sequelize.col('Recipe_Images.id'),
          'IS',
          null
        )
      ]
    },
    include: [{
      model: Recipe_Image,
      attributes: [],
      required: false,
    }],
    attributes: ['key'],
    transaction,
  });

  await deleteObjects(
    userImages.map(image => image.key)
  );
};

module.exports = {
  deleteHangingImagesForUser,
};

