/* eslint-disable @typescript-eslint/no-explicit-any */

import { BadRequestError, ForbiddenError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { indexRecipes } from "@recipesage/util/server/search";
import { JobStatus, JobType } from "@prisma/client";
import {
  importStandardizedRecipes,
  StandardizedRecipeImportEntry,
} from "@recipesage/util/server/db";
import { JobMeta, prisma } from "@recipesage/prisma";
import * as Sentry from "@sentry/node";
import * as xmljs from "xml-js";
import { z } from "zod";
import { cleanLabelTitle, JOB_RESULT_CODES } from "@recipesage/util/shared";
import { getImportJobResultCode } from "@recipesage/util/server/general";

const schema = {
  body: z.object({
    username: z.string(),
    password: z.string(),
  }),
  query: z.object({
    labels: z.string().optional(),
  }),
};

const XML_CHAR_MAP = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;",
};

function escapeXml(s: any) {
  return s.replace(/[<>&"']/g, function (ch: any) {
    return (XML_CHAR_MAP as any)[ch];
  });
}

export const pepperplateHandler = defineHandler(
  {
    schema,
    authentication: AuthenticationEnforcement.Required,
  },
  async (req, res) => {
    const userLabels =
      req.query.labels?.split(",").map((label) => cleanLabelTitle(label)) || [];

    const username = escapeXml(req.body.username.trim());
    const password = escapeXml(req.body.password);

    const authResponse = await fetch(
      "http://www.pepperplate.com/services/syncmanager5.asmx",
      {
        method: "POST",
        headers: {
          "content-type": "text/xml",
        },
        body: `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
    xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <GenerateLoginToken xmlns="http://api.pepperplate.com/">
          <email>${username}</email>
          <password>${password}</password>
        </GenerateLoginToken>
      </soap:Body>
    </soap:Envelope>
    `,
      },
    );

    const authResponseText = await authResponse.text();

    if (authResponseText.indexOf("<Status>UnknownEmail</Status>") > -1) {
      throw new ForbiddenError("Incorrect pepperplate username");
    } else if (
      authResponseText.indexOf("<Status>IncorrectPassword</Status>") > -1
    ) {
      throw new ForbiddenError("Incorrect pepperplate password");
    }

    const userToken = authResponseText.match(/<Token>(.*)<\/Token>/)?.[1];
    if (!userToken) {
      throw new Error(
        "Pepperplate usertoken incorrect format: " + authResponseText,
      );
    }

    const job = await prisma.job.create({
      data: {
        userId: res.locals.session.userId,
        type: JobType.IMPORT,
        status: JobStatus.RUN,
        progress: 1,
        meta: {
          importType: "pepperplate",
          importLabels: userLabels,
        } satisfies JobMeta,
      },
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

      let pepperplateRecipes = [];
      let syncToken;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const syncResponse = await fetch(
          "http://www.pepperplate.com/services/syncmanager5.asmx",
          {
            method: "POST",
            headers: {
              "content-type": "text/xml",
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
        <soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema"
        xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
          <soap:Body>
            <RetrieveRecipes xmlns="http://api.pepperplate.com/">
              <userToken>${userToken}</userToken>
              ${syncToken ? `<syncToken>${syncToken}</syncToken>` : ""}
              <count>50</count>
            </RetrieveRecipes>
          </soap:Body>
        </soap:Envelope>
        `,
          },
        );

        const syncResponseText = await syncResponse.text();

        console.log("repeat");

        const recipeJson = JSON.parse(
          xmljs.xml2json(syncResponseText, { compact: true, spaces: 4 }),
        );

        syncToken =
          recipeJson["soap:Envelope"]["soap:Body"]["RetrieveRecipesResponse"][
            "RetrieveRecipesResult"
          ]["SynchronizationToken"]._text;

        console.log("new sync token!", syncToken);

        const items =
          recipeJson["soap:Envelope"]["soap:Body"]["RetrieveRecipesResponse"][
            "RetrieveRecipesResult"
          ]["Items"]["RecipeSync"];

        if (items && items.length > 0) {
          pepperplateRecipes.push(...items);
        } else {
          break;
        }

        if (!syncToken) {
          break;
        }
      }

      pepperplateRecipes = pepperplateRecipes.filter((pepperRecipe) => {
        return (pepperRecipe.Delete || {})._text !== "true";
      });

      const objToArr = (item: any) => {
        if (!item) return [];
        if (item.length || item.length === 0) return item;
        return [item];
      };

      for (const pepperRecipe of pepperplateRecipes) {
        const ingredientGroups = objToArr(
          (pepperRecipe.Ingredients || {}).IngredientSyncGroup,
        );

        const finalIngredients = ingredientGroups
          .sort(
            (a: any, b: any) =>
              parseInt((a.DisplayOrder || {})._text || 0, 10) -
              parseInt((b.DisplayOrder || {})._text || 0, 10),
          )
          .map((ingredientGroup: any) => {
            const ingredients = [];
            if (ingredientGroup.Title && ingredientGroup.Title._text) {
              ingredients.push(`[${ingredientGroup.Title._text}]`);
            }
            const innerIngredients = objToArr(
              (ingredientGroup.Ingredients || {}).IngredientSync,
            )
              .sort(
                (a: any, b: any) =>
                  parseInt((a.DisplayOrder || {})._text || 0, 10) -
                  parseInt((b.DisplayOrder || {})._text || 0, 10),
              )
              .map((ingredient: any) =>
                (
                  ((ingredient.Quantity || {})._text || "") +
                  " " +
                  ingredient.Text._text
                ).trim(),
              )
              .join("\r\n");
            return [...ingredients, innerIngredients].join("\r\n");
          })
          .join("\r\n");

        const directionGroups = objToArr(
          (pepperRecipe.Directions || {}).DirectionSyncGroup,
        );

        const finalDirections = directionGroups
          .sort(
            (a: any, b: any) =>
              parseInt((a.DisplayOrder || {})._text || 0, 10) -
              parseInt((b.DisplayOrder || {})._text || 0, 10),
          )
          .map((directionGroup: any) => {
            const directions = [];
            if (directionGroup.Title && directionGroup.Title._text) {
              directions.push(`[${directionGroup.Title._text}]`);
            }
            const innerDirections = objToArr(
              (directionGroup.Directions || {}).DirectionSync,
            )
              .sort(
                (a: any, b: any) =>
                  parseInt((a.DisplayOrder || {})._text || 0, 10) -
                  parseInt((b.DisplayOrder || {})._text || 0, 10),
              )
              .map((direction: any) => direction.Text._text)
              .join("\r\n");
            return [...directions, innerDirections].join("\r\n");
          })
          .join("\r\n");

        const imageUrl = pepperRecipe.ImageUrl && pepperRecipe.ImageUrl._text;

        standardizedRecipeImportInput.push({
          recipe: {
            title: pepperRecipe.Title._text,
            description: (pepperRecipe.Description || {})._text || "",
            notes: (pepperRecipe.Note || {})._text || "",
            ingredients: finalIngredients || "",
            instructions: finalDirections || "",
            totalTime: (pepperRecipe.TotalTime || {})._text || "",
            activeTime: (pepperRecipe.ActiveTime || {})._text || "",
            source:
              (pepperRecipe.Source || {})._text ||
              (pepperRecipe.ManualSource || {})._text ||
              "",
            url: (pepperRecipe.Url || {})._text || "",
            yield: (pepperRecipe.Yield || {})._text || "",
            folder: "main",
          },
          labels: [
            ...objToArr((pepperRecipe.Tags || {}).TagSync).map(
              (tag: any) => tag.Text._text,
            ),
            ...userLabels,
          ],
          images: imageUrl ? [imageUrl] : [],
        });
      }

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 50,
        },
      });

      const createdRecipeIds = await importStandardizedRecipes(
        res.locals.session.userId,
        standardizedRecipeImportInput,
      );

      const recipesToIndex = await prisma.recipe.findMany({
        where: {
          id: {
            in: createdRecipeIds,
          },
          userId: res.locals.session.userId,
        },
      });

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          progress: 75,
        },
      });

      await indexRecipes(recipesToIndex);

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: JobStatus.SUCCESS,
          resultCode: JOB_RESULT_CODES.success,
          progress: 100,
        },
      });
    };

    start().catch(async (e) => {
      const isBadCredentialsError = e instanceof BadRequestError;

      await prisma.job.update({
        where: {
          id: job.id,
        },
        data: {
          status: JobStatus.FAIL,
          resultCode: getImportJobResultCode({
            isBadCredentials: isBadCredentialsError,
          }),
        },
      });

      if (!isBadCredentialsError) {
        Sentry.captureException(e, {
          extra: {
            jobId: job.id,
          },
        });
        console.error(e);
      }
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
