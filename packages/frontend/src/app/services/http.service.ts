import { Injectable } from '@angular/core';
import axios, {AxiosInstance, AxiosRequestConfig, RawAxiosResponseHeaders} from 'axios';

import { API_BASE_URL } from 'src/environments/environment';
import { HttpErrorHandlerService, ErrorHandlers } from './http-error-handler.service';
import {UtilService} from './util.service';

export interface HttpResponse<ResponseType> {
  // 'ok' is the successor to 'success' since 'success' is present in HttpError as well and cannot be used for type narrowing
  ok: boolean;
  success: boolean;
  status: number;
  data: ResponseType;
  headers: RawAxiosResponseHeaders;
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
    const {
      success,
      status,
      data
    } = response;
    this.success = success;
    this.status = status;
    this.data = data;
  }
}

const REQUEST_TIMEOUT_FALLBACK = 10 * 60 * 1000; // 10 minutes

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  axiosClient: AxiosInstance;

  constructor(
    private httpErrorHandlerService: HttpErrorHandlerService,
    private utilService: UtilService,
  ) {
    this.axiosClient = axios.create({
      timeout: REQUEST_TIMEOUT_FALLBACK,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });
  }

  getBase(): string {
    if (window.location.hostname === 'beta.recipesage.com') return 'https://api.beta.recipesage.com/';

    const subpathBase = `${window.location.protocol}//${window.location.hostname}/api/`;

    return (window as any).API_BASE_OVERRIDE || API_BASE_URL || subpathBase;
  }

  requestWithWrapper<ResponseType>(
    path: string,
    method: string,
    payload?: any,
    query?: { [key: string]: QueryVal },
    errorHandlers?: ErrorHandlers
  ) {
    return this._requestWithWrapper<ResponseType>(
      {},
      path,
      method,
      payload || {},
      query || {},
      errorHandlers,
    );
  }

  multipartRequestWithWrapper<ResponseType>(
    path: string,
    method: string,
    payload?: any,
    query?: { [key: string]: QueryVal },
    errorHandlers?: ErrorHandlers
  ) {
    return this._requestWithWrapper<ResponseType>(
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
      },
      path,
      method,
      payload || {},
      query || {},
      errorHandlers,
    );
  }

  async _requestWithWrapper<ResponseType>(
    axiosOverrides: AxiosRequestConfig,
    path: string,
    method: string,
    payload: any,
    query: { [key: string]: QueryVal },
    errorHandlers?: ErrorHandlers
  ): Promise<HttpResponse<ResponseType> | HttpError<ResponseType>> {
    let url = this.getBase() + path + this.utilService.getTokenQuery();

    if (query) {
      const params = Object.entries(query)
        .filter(([key, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          return encodeURIComponent(key) + '=' + encodeURIComponent(value)
        })
        .join('&');
      url += `&${params}`;
    }

    return this.requestWithErrorHandlers({
      method,
      url,
      data: payload,
      ...axiosOverrides,
    }, errorHandlers);
  }

  async requestWithErrorHandlers<ResponseType>(
    requestConfig: AxiosRequestConfig,
    errorHandlers: ErrorHandlers
  ) {
    try {
      const response = await this.request<ResponseType>(requestConfig);

      return response;
    } catch(err) {
      this.httpErrorHandlerService.handleError(err, errorHandlers);

      if (err instanceof HttpError) return err as HttpError<ResponseType>;
      else throw err;
    }
  }

  async request<ResponseType>(requestConfig: AxiosRequestConfig) {
    try {
      const { status, headers, data } = await this.axiosClient.request<ResponseType>(requestConfig);

      return {
        ok: true,
        success: true,
        status,
        headers,
        data
      };
    } catch(err) {
      const response = {
        ok: false,
        success: false,
        status: err.response ? err.response.status : 0, // 0 For no network
        data: err.response ? err.response.data : null,
        headers: err.headers || null,
      };

      const httpError = new HttpError<ResponseType>(err.message, response);

      throw httpError;
    }
  }
}
