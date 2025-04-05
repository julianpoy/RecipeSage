import "./services/sentry-init.js";
import Sentry from "@sentry/node";

import { deleteObjects } from "./services/storage";

import { Op } from "sequelize";
import { sequelize, Image, Recipe_Image } from "./models/index.js";

const cleanupStaleImages = async () => {
  try {
    const lt = new Date();
    lt.setDate(lt.getDate() - 7); // Only remove images older than 7 days

    const staleImages = await Image.findAll({
      include: [
        {
          model: Recipe_Image,
          required: false,
          attributes: ["id"],
        },
      ],
      where: {
        [Op.and]: [
          sequelize.where(sequelize.col("Recipe_Images.id"), "IS", null),
          {
            createdAt: { [Op.lt]: lt },
          },
        ],
      },
      subQuery: false,
      limit: 50,
    });

    if (staleImages.length === 0) return process.exit(0);

    await deleteObjects(staleImages.map((image) => image.key));

    await Image.destroy({
      where: {
        id: {
          [Op.in]: staleImages.map((image) => image.id),
        },
      },
    });

    process.exit(0);
  } catch (e) {
    console.error(e);
    Sentry.captureException(e);

    process.exit(1);
  }
};

cleanupStaleImages();
