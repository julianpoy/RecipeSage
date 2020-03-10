const Raven = require('raven');

const UtilService = require('./services/util');

var Op = require("sequelize").Op;
var SQ = require('./models').sequelize;
var Image = require('./models').Image;
var Recipe_Image = require('./models').Recipe_Image;

const cleanupStaleImages = async () => {
  try {
    let lt = new Date();
    lt.setDate(lt.getDate() - 7); // Only remove images older than 7 days

    const staleImages = await Image.findAll({
      include: [{
        model: Recipe_Image,
        required: false,
        attributes: ['id']
      }],
      where: {
        [Op.and]: [
          SQ.where(
            SQ.col('Recipe_Images.id'),
            'IS',
            null
          ),
          {
            createdAt: { [Op.lt]: lt }
          }
        ]
      },
      subQuery: false,
      limit: 50
    });

    if (staleImages.length === 0) return process.exit(0);

    await UtilService.deleteS3Objects(staleImages.map(image => image.key));

    await Image.destroy({
      where: {
        id: {
          [Op.in]: staleImages.map(image => image.id)
        }
      }
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    Raven.captureException(e);

    process.exit(1);
  }
};

cleanupStaleImages();
