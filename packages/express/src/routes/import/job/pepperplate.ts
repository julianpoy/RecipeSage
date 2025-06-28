/* eslint-disable @typescript-eslint/no-explicit-any */

import { ForbiddenError } from "../../../errors";
import {
  AuthenticationEnforcement,
  defineHandler,
} from "../../../defineHandler";
import { StandardizedRecipeImportEntry } from "@recipesage/util/server/db";
import xmljs from "xml-js";
import { z } from "zod";
import {
  importJobFailCommon,
  importJobFinishCommon,
  importJobSetupCommon,
  metrics,
} from "@recipesage/util/server/general";

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
    const userId = res.locals.session.userId;

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
      metrics.pepperplateAuthFailure.inc({
        field: "username",
      });
      throw new ForbiddenError("Incorrect pepperplate username");
    }
    if (authResponseText.indexOf("<Status>IncorrectPassword</Status>") > -1) {
      metrics.pepperplateAuthFailure.inc({
        field: "password",
      });
      throw new ForbiddenError("Incorrect pepperplate password");
    }

    const userToken = authResponseText.match(/<Token>(.*)<\/Token>/)?.[1];
    if (!userToken) {
      metrics.pepperplateAuthFailure.inc({
        field: "unknown",
      });
      throw new Error(
        "Pepperplate usertoken incorrect format: " + authResponseText,
      );
    }

    const { job, timer, importLabels } = await importJobSetupCommon({
      userId,
      importType: "pepperplate",
      labels: req.query.labels?.split(",") || [],
    });

    // We complete this work outside of the scope of the request
    const start = async () => {
      const standardizedRecipeImportInput: StandardizedRecipeImportEntry[] = [];

      let pepperplateRecipes = [];
      let syncToken;

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

        const recipeJson = JSON.parse(
          xmljs.xml2json(syncResponseText, { compact: true, spaces: 4 }),
        );

        syncToken =
          recipeJson["soap:Envelope"]["soap:Body"]["RetrieveRecipesResponse"][
            "RetrieveRecipesResult"
          ]["SynchronizationToken"]._text;

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
            ...importLabels,
          ],
          images: imageUrl ? [imageUrl] : [],
        });
      }

      await importJobFinishCommon({
        timer,
        job,
        userId,
        standardizedRecipeImportInput,
        importTempDirectory: undefined,
      });
    };

    start().catch(async (error) => {
      await importJobFailCommon({
        timer,
        job,
        error,
      });
    });

    return {
      statusCode: 201,
      data: {
        jobId: job.id,
      },
    };
  },
);
