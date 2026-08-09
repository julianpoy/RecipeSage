import { z } from "zod";
import {
  createDocument,
  oas31,
  ZodOpenApiOperationObject,
  ZodOpenApiPathsObject,
  ZodOpenApiRequestBodyObject,
} from "zod-openapi";
import {
  getRegisteredOpenApiRoutes,
  OpenApiRouteMeta,
  OpenApiRouteSchema,
} from "./registry";

const SECURITY_SCHEME_NAME = "Authorization";

const buildRequestBody = (
  meta: OpenApiRouteMeta,
  schema: OpenApiRouteSchema,
): ZodOpenApiRequestBodyObject | undefined => {
  if (meta.upload) {
    const fileSchema: oas31.SchemaObject = {
      type: "string",
      format: "binary",
    };

    return {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            properties: {
              [meta.upload.field]: meta.upload.multiple
                ? { type: "array", items: fileSchema }
                : fileSchema,
            },
            required: [meta.upload.field],
          },
        },
      },
    };
  }

  if (schema.body) {
    return {
      required: true,
      content: {
        "application/json": {
          schema: schema.body,
        },
      },
    };
  }

  return undefined;
};

const buildOperation = (
  meta: OpenApiRouteMeta,
  schema: OpenApiRouteSchema,
): ZodOpenApiOperationObject => {
  const operation: ZodOpenApiOperationObject = {
    summary: meta.summary,
    tags: meta.tags,
    security: [{ [SECURITY_SCHEME_NAME]: [] }],
    responses: {
      [meta.successStatus ?? 200]: {
        description: "Success",
        ...(schema.response
          ? {
              content: {
                "application/json": {
                  schema: schema.response,
                },
              },
            }
          : {}),
      },
    },
  };

  if (meta.description) {
    operation.description = meta.description;
  }

  const requestParams: NonNullable<ZodOpenApiOperationObject["requestParams"]> =
    {};
  if (schema.query instanceof z.ZodObject) {
    requestParams.query = schema.query;
  }
  if (schema.params instanceof z.ZodObject) {
    requestParams.path = schema.params;
  }
  if (Object.keys(requestParams).length > 0) {
    operation.requestParams = requestParams;
  }

  const requestBody = buildRequestBody(meta, schema);
  if (requestBody) {
    operation.requestBody = requestBody;
  }

  return operation;
};

export interface ExpressOpenApiParts {
  paths: oas31.PathsObject;
  schemas: oas31.ComponentsObject["schemas"];
  securitySchemes: Record<string, oas31.SecuritySchemeObject>;
}

export const generateExpressOpenApiParts = (): ExpressOpenApiParts => {
  const paths: ZodOpenApiPathsObject = {};

  for (const { openapi, schema } of getRegisteredOpenApiRoutes()) {
    paths[openapi.path] = {
      ...paths[openapi.path],
      [openapi.method]: buildOperation(openapi, schema),
    };
  }

  const securitySchemes: Record<string, oas31.SecuritySchemeObject> = {
    [SECURITY_SCHEME_NAME]: {
      type: "http",
      scheme: "bearer",
    },
  };

  const document = createDocument({
    openapi: "3.1.0",
    info: {
      title: "RecipeSage Express API",
      version: "1.0.0",
    },
    paths,
    components: {
      securitySchemes,
    },
  });

  return {
    paths: document.paths ?? {},
    schemas: document.components?.schemas,
    securitySchemes,
  };
};
