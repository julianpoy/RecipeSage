import { ZodType } from "zod";
import { AuthenticationEnforcement } from "../authenticationEnforcement";

export type OpenApiRouteMethod = "get" | "post" | "put" | "patch" | "delete";

export interface OpenApiRouteUpload {
  field: string;
  multiple?: boolean;
}

export interface OpenApiRouteMeta {
  operationId: string;
  method: OpenApiRouteMethod;
  path: string;
  tags: string[];
  summary: string;
  description?: string;
  successStatus?: number;
  upload?: OpenApiRouteUpload;
}

export interface OpenApiRouteSchema {
  params?: ZodType;
  query?: ZodType;
  body?: ZodType;
  response?: ZodType;
}

export interface RegisteredOpenApiRoute {
  openapi: OpenApiRouteMeta;
  authentication: AuthenticationEnforcement;
  schema: OpenApiRouteSchema;
}

const registry: RegisteredOpenApiRoute[] = [];

export const registerOpenApiRoute = (route: RegisteredOpenApiRoute) => {
  registry.push(route);
};

export const getRegisteredOpenApiRoutes =
  (): readonly RegisteredOpenApiRoute[] => registry;
