import { Injectable } from '@angular/core';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

export interface HttpResponse {
  status: number;
  data: any;
}

export class HttpError extends Error {
  public response: HttpResponse;

  constructor(message: string, response: HttpResponse) {
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

  request(data: AxiosRequestConfig): Promise<HttpResponse> {
    return this.axiosClient.request(data).then(response => {
      return {
        status: response.status,
        data: response.data
      };
    }).catch(err => {
      const response = {
        status: err.status ? err.response.status : 0, // 0 For no network
        data: err.response ? err.response.data : null
      };

      const httpError = new HttpError(err.message, response);

      throw httpError;
    });
  }
}
