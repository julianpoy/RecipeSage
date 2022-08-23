import { Injectable } from '@angular/core';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface HttpResponse<ResponseType> {
  status: number;
  data: ResponseType;
}

export class HttpError<ResponseType> extends Error {
  public response: HttpResponse<ResponseType>;

  constructor(message: string, response: HttpResponse<ResponseType>) {
    super(message);

    this.response = response;
  }
}

const REQUEST_TIMEOUT_FALLBACK = 10 * 60 * 1000; // 10 minutes

@Injectable({
  providedIn: 'root'
})
export class HttpService {

  axiosClient: AxiosInstance;

  constructor() {
    this.axiosClient = axios.create({
      timeout: REQUEST_TIMEOUT_FALLBACK,
      headers: {
        'X-Initialized-At': Date.now().toString(),
        'Content-Type': 'application/json'
      }
    });
  }

  async request<ResponseType>(requestConfig: AxiosRequestConfig) {
    try {
      const { status, data } = await this.axiosClient.request<ResponseType>(requestConfig);

      return {
        status,
        data
      };
    } catch(err) {
      const response = {
        status: err.response ? err.response.status : 0, // 0 For no network
        data: err.response ? err.response.data : null
      };

      const httpError = new HttpError<ResponseType>(err.message, response);

      throw httpError;
    }
  }
}
