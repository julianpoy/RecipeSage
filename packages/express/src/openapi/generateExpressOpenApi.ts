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
import { AuthenticationEnforcement } from "../authenticationEnforcement";

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

const errorResponse = (
  description: string,
  schemaName: string,
): oas31.ResponseObject => ({
  description,
  content: {
    "application/json": {
      schema: { $ref: `#/components/schemas/${schemaName}` },
    },
  },
});

const buildSecurity = (
  authentication: AuthenticationEnforcement,
): oas31.SecurityRequirementObject[] => {
  switch (authentication) {
    case AuthenticationEnforcement.Required:
      return [{ [SECURITY_SCHEME_NAME]: [] }];
    case AuthenticationEnforcement.Optional:
      return [{}, { [SECURITY_SCHEME_NAME]: [] }];
    case AuthenticationEnforcement.None:
      return [];
  }
};

const buildResponses = (
  meta: OpenApiRouteMeta,
  schema: OpenApiRouteSchema,
  authentication: AuthenticationEnforcement,
): NonNullable<ZodOpenApiOperationObject["responses"]> => {
  const hasInput = Boolean(
    schema.body || schema.query || schema.params || meta.upload,
  );
  const requiresAuth = authentication === AuthenticationEnforcement.Required;

  return {
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
    ...(hasInput
      ? { 400: errorResponse("Invalid input data", "error.BAD_REQUEST") }
      : {}),
    ...(requiresAuth
      ? {
          401: errorResponse(
            "Authorization not provided",
            "error.UNAUTHORIZED",
          ),
          403: errorResponse("Insufficient access", "error.FORBIDDEN"),
        }
      : {}),
    500: errorResponse("Internal server error", "error.INTERNAL_SERVER_ERROR"),
  };
};

const buildOperation = (
  meta: OpenApiRouteMeta,
  schema: OpenApiRouteSchema,
  authentication: AuthenticationEnforcement,
): ZodOpenApiOperationObject => {
  const operation: ZodOpenApiOperationObject = {
    operationId: meta.operationId,
    summary: meta.summary,
    tags: meta.tags,
    security: buildSecurity(authentication),
    responses: buildResponses(meta, schema, authentication),
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

  for (const {
    openapi,
    authentication,
    schema,
  } of getRegisteredOpenApiRoutes()) {
    paths[openapi.path] = {
      ...paths[openapi.path],
      [openapi.method]: buildOperation(openapi, schema, authentication),
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
      version: process.env.VERSION ?? "development",
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
