import axios, { AxiosError, type AxiosRequestConfig } from "axios";

import { httpErrorHandler, type ErrorHandlers } from "./httpErrorHandler";
import {
  HttpError,
  type HttpErrorResponse,
  type HttpResponse,
} from "./HttpError";
import { session } from "../utils/session";
import { serverConfig } from "../utils/serverConfig";

type QueryVal = string | boolean | number;

export type UploadProgressHandler = NonNullable<
  AxiosRequestConfig["onUploadProgress"]
>;

const REQUEST_TIMEOUT_FALLBACK = 10 * 60 * 1000; // 10 minutes

type RequestResult<ResponseType> =
  | { ok: true; response: HttpResponse<ResponseType> }
  | { ok: false; error: HttpError<ResponseType | null> };

const axiosClient = axios.create({
  timeout: REQUEST_TIMEOUT_FALLBACK,
  headers: {
    "X-Initialized-At": Date.now().toString(),
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  config.headers.set("X-RecipeSage-Language", window.currentRSLanguage);
  return config;
});

const getAuthorizationHeader = () => {
  const token = session.getToken();
  return token ? `Bearer ${token}` : undefined;
};

const request = async <ResponseType>(
  requestConfig: AxiosRequestConfig,
): Promise<RequestResult<ResponseType>> => {
  try {
    const { status, data } =
      await axiosClient.request<ResponseType>(requestConfig);

    return {
      ok: true,
      response: {
        success: true,
        status,
        data,
      },
    };
  } catch (err) {
    const axiosResponse = err instanceof AxiosError ? err.response : undefined;
    const response: HttpErrorResponse<ResponseType | null> = {
      success: false,
      status: axiosResponse ? axiosResponse.status : 0, // 0 For no network
      data: axiosResponse ? axiosResponse.data : null,
    };

    const message = err instanceof Error ? err.message : String(err);

    return {
      ok: false,
      error: new HttpError<ResponseType | null>(message, response),
    };
  }
};

const requestWithErrorHandling = async <ResponseType>(opts: {
  axiosOverrides: AxiosRequestConfig;
  path: string;
  method: string;
  payload: unknown;
  query: { [key: string]: QueryVal };
  errorHandlers?: ErrorHandlers;
}): Promise<HttpResponse<ResponseType> | HttpError<ResponseType | null>> => {
  const { axiosOverrides, path, method, payload, query, errorHandlers } = opts;

  let url = serverConfig.apiBase + path + session.getTokenQuery();

  if (query) {
    const params = Object.entries(query)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        return encodeURIComponent(key) + "=" + encodeURIComponent(value);
      })
      .join("&");
    url += `&${params}`;
  }

  const result = await request<ResponseType>({
    method,
    url,
    data: payload,
    ...axiosOverrides,
  });

  if (result.ok) return result.response;

  httpErrorHandler.handleError(result.error, errorHandlers);
  return result.error;
};

export const httpService = {
  request,

  requestWithWrapper<ResponseType>(opts: {
    path: string;
    method: string;
    payload?: unknown;
    query?: { [key: string]: QueryVal };
    errorHandlers?: ErrorHandlers;
  }) {
    return requestWithErrorHandling<ResponseType>({
      axiosOverrides: {
        headers: {
          Authorization: getAuthorizationHeader(),
        },
      },
      path: opts.path,
      method: opts.method,
      payload: opts.payload || {},
      query: opts.query || {},
      errorHandlers: opts.errorHandlers,
    });
  },

  multipartRequestWithWrapper<ResponseType>(opts: {
    path: string;
    method: string;
    payload?: unknown;
    query?: { [key: string]: QueryVal };
    errorHandlers?: ErrorHandlers;
    listeners?: {
      onUploadProgress?: UploadProgressHandler;
    };
  }) {
    return requestWithErrorHandling<ResponseType>({
      axiosOverrides: {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: getAuthorizationHeader(),
        },
        onUploadProgress: opts.listeners?.onUploadProgress,
      },
      path: opts.path,
      method: opts.method,
      payload: opts.payload || {},
      query: opts.query || {},
      errorHandlers: opts.errorHandlers,
    });
  },
};
