import Sequelize, { Op } from "sequelize";

import { Image, Recipe_Image } from "../../models/index.js";

import { deleteObjects } from "@recipesage/util/server/storage";

export const deleteHangingImagesForUser = async (userId, transaction) => {
  const userImages = await Image.findAll({
    where: {
      [Op.and]: [
        {
          userId,
        },
        Sequelize.where(Sequelize.col("Recipe_Images.id"), "IS", null),
      ],
    },
    include: [
      {
        model: Recipe_Image,
        attributes: [],
        required: false,
      },
    ],
    attributes: ["key"],
    transaction,
  });

  await deleteObjects(userImages.map((image) => image.key));
};
