import ical, { ICalEventData } from "ical-generator";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { convertPrismaDateToDatestamp } from "@recipesage/util/server/db";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";
import {
  getSignedDownloadUrl,
  ObjectTypes,
} from "@recipesage/util/server/storage";

const HISTORICAL_DATE_LIMIT_DAYS = 30; // We return this number of past days of meal plan items

const schema = {
  params: z.object({
    mealPlanId: z.string(),
  }),
};

export const mealPlansIcalHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.None,
  },
  async (req, res) => {
    const mealPlan = await prisma.mealPlan.findUnique({
      where: {
        id: req.params.mealPlanId,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (!mealPlan) {
      throw new NotFoundError("Meal plan not found or you do not have access");
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - HISTORICAL_DATE_LIMIT_DAYS);

    const mealPlanItems = await prisma.mealPlanItem.findMany({
      where: {
        mealPlanId: req.params.mealPlanId,
        scheduledDate: {
          gte: dateLimit,
        },
      },
      select: {
        id: true,
        title: true,
        scheduled: true,
        scheduledDate: true,
        meal: true,
        createdAt: true,
        updatedAt: true,
        recipeId: true,
        recipe: {
          select: {
            id: true,
            title: true,
            updatedAt: true,
            recipeImages: {
              select: {
                order: true,
                image: {
                  select: {
                    key: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const icalEvents: ICalEventData[] = [];
    for (const mealPlanItem of mealPlanItems) {
      const signedImages = await Promise.all(
        mealPlanItem.recipe?.recipeImages
          .sort((a, b) => a.order - b.order)
          .map((el) =>
            getSignedDownloadUrl(ObjectTypes.RECIPE_IMAGE, el.image.key, {
              expiresInSeconds: 604800,
              fileExtension: ".jpg",
            }),
          ) || [],
      );

      let lastModified = mealPlanItem.updatedAt;
      if (
        mealPlanItem.recipe?.updatedAt &&
        mealPlanItem.recipe?.updatedAt > lastModified
      ) {
        lastModified = mealPlanItem.recipe.updatedAt;
      }

      icalEvents.push({
        start:
          mealPlanItem.scheduled ||
          convertPrismaDateToDatestamp(mealPlanItem, "scheduledDate")
            .scheduledDate,
        allDay: true,
        summary: mealPlanItem.recipe?.title || mealPlanItem.title,
        url: `https://recipesage.com/#/meal-planners/${mealPlan.id}`,
        attachments: signedImages,
        lastModified,
      });
    }

    const mealPlanICal = ical({
      name: `RecipeSage ${mealPlan.title}`,
      events: icalEvents,
    });

    res.writeHead(200, {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="calendar.ics"',
    });

    res.end(mealPlanICal.toString());
  },
);
