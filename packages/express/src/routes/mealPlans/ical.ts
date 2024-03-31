import ical from "ical-generator";
import { prisma } from "@recipesage/prisma";
import { z } from "zod";
import { convertPrismaDateToDatestamp } from "@recipesage/util/server/db";
import { NotFoundError } from "../../errors";
import { AuthenticationEnforcement, defineHandler } from "../../defineHandler";

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
        items: {
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
                ingredients: true,
              },
            },
          },
        },
      },
    });

    if (!mealPlan) {
      throw new NotFoundError("Meal plan not found or you do not have access");
    }

    const icalEvents = mealPlan.items.map((item) => ({
      start:
        item.scheduled ||
        convertPrismaDateToDatestamp(item, "scheduledDate").scheduledDate,
      allDay: true,
      summary: item.recipe?.title || item.title,
      url: `https://recipesage.com/#/meal-planners/${mealPlan.id}`,
    }));

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
