import { Injectable, inject } from "@angular/core";
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

import {
  HttpErrorHandlerService,
  ErrorHandlers,
} from "./http-error-handler.service";
import { UtilService } from "./util.service";
import { getBase } from "../utils/getBase";
import { TranslateService } from "@ngx-translate/core";

export interface HttpResponse<ResponseType> {
  success: boolean;
  status: number;
  data: ResponseType;
}

type QueryVal = string | boolean | number;

export class HttpError<ResponseType> extends Error {
  public response: HttpResponse<ResponseType>;
  public success: boolean;
  public status: number;
  public data: ResponseType;

  constructor(message: string, response: HttpResponse<ResponseType>) {
    super(message);

    this.response = response;
    const { success, status, data } = response;
    this.success = success;
    this.status = status;
    this.data = data;
  }
}

export type UploadProgressHandler = NonNullable<
  AxiosRequestConfig<any>["onUploadProgress"]
>;

const REQUEST_TIMEOUT_FALLBACK = 10 * 60 * 1000; // 10 minutes

@Injectable({
  providedIn: "root",
})
export class HttpService {
  private httpErrorHandlerService = inject(HttpErrorHandlerService);
  private utilService = inject(UtilService);
  private translate = inject(TranslateService);

  axiosClient: AxiosInstance;

  constructor() {
    this.axiosClient = axios.create({
      timeout: REQUEST_TIMEOUT_FALLBACK,
      headers: {
        "X-Initialized-At": Date.now().toString(),
        "Content-Type": "application/json",
      },
    });

    this.axiosClient.interceptors.request.use((config) => {
      config.headers.set(
        "X-RecipeSage-Language",
        this.translate.getCurrentLang(),
      );
      return config;
    });
  }

  requestWithWrapper<ResponseType>(opts: {
    path: string;
    method: string;
    payload?: any;
    query?: { [key: string]: QueryVal };
    errorHandlers?: ErrorHandlers;
  }) {
    return this._requestWithWrapper<ResponseType>({
      axiosOverrides: {
        headers: {
          Authorization: this.utilService.getToken()
            ? `Bearer ${this.utilService.getToken()}`
            : undefined,
        },
      },
      path: opts.path,
      method: opts.method,
      payload: opts.payload || {},
      query: opts.query || {},
      errorHandlers: opts.errorHandlers,
    });
  }

  multipartRequestWithWrapper<ResponseType>(opts: {
    path: string;
    method: string;
    payload?: any;
    query?: { [key: string]: QueryVal };
    errorHandlers?: ErrorHandlers;
    listeners?: {
      onUploadProgress?: UploadProgressHandler;
    };
  }) {
    return this._requestWithWrapper<ResponseType>({
      axiosOverrides: {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: this.utilService.getToken()
            ? `Bearer ${this.utilService.getToken()}`
            : undefined,
        },
        onUploadProgress: opts.listeners?.onUploadProgress,
      },
      path: opts.path,
      method: opts.method,
      payload: opts.payload || {},
      query: opts.query || {},
      errorHandlers: opts.errorHandlers,
    });
  }

  async _requestWithWrapper<ResponseType>(opts: {
    axiosOverrides: AxiosRequestConfig;
    path: string;
    method: string;
    payload: any;
    query: { [key: string]: QueryVal };
    errorHandlers?: ErrorHandlers;
  }): Promise<HttpResponse<ResponseType> | HttpError<ResponseType>> {
    const { axiosOverrides, path, method, payload, query, errorHandlers } =
      opts;

    let url = getBase() + path + this.utilService.getTokenQuery();

    if (query) {
      const params = Object.entries(query)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          return encodeURIComponent(key) + "=" + encodeURIComponent(value);
        })
        .join("&");
      url += `&${params}`;
    }

    try {
      const response = await this.request<ResponseType>({
        method,
        url,
        data: payload,
        ...axiosOverrides,
      });

      return response;
    } catch (err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);

      if (err instanceof HttpError) return err as HttpError<ResponseType>;
      else throw err;
    }
  }

  async request<ResponseType>(requestConfig: AxiosRequestConfig) {
    try {
      const { status, data } =
        await this.axiosClient.request<ResponseType>(requestConfig);

      return {
        success: true,
        status,
        data,
      };
    } catch (err: any) {
      const response = {
        success: false,
        status: err.response ? err.response.status : 0, // 0 For no network
        data: err.response ? err.response.data : null,
      };

      const httpError = new HttpError<ResponseType>(err.message, response);

      throw httpError;
    }
  }
}
