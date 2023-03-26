const SQ = require('../../models').sequelize;
const Op = require('../../models').Op;
const Image = require('../../models').Image;
const Recipe_Image = require('../../models').Recipe_Image;

const {deleteStorageObjects} = require('../../services/storage');

const deleteHangingImagesForUser = async (userId, transaction) => {
  const userImages = await Image.findAll({
    where: {
      [Op.and]: [
        {
          userId,
        },
        SQ.where(
          SQ.col('Recipe_Images.id'),
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

  await deleteStorageObjects(
    userImages.map(image => image.key)
  );
};

module.exports = {
  deleteHangingImagesForUser,
};

