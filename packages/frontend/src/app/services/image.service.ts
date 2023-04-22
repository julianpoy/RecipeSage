import { Injectable } from '@angular/core';

import { HttpError, HttpService } from './http.service';
import { UtilService } from './util.service';
import {ErrorHandlers} from './http-error-handler.service';
import {CORS_PROXY_BASE_URL} from '../../environments/environment';

export interface Image {
  id: string;
  location: string;
}

@Injectable({
  providedIn: 'root'
})
export class ImageService {

  constructor(
    private httpService: HttpService,
    private utilService: UtilService
  ) {}

  create(file: File, errorHandlers?: ErrorHandlers) {
    const formData: FormData = new FormData();
    formData.append('image', file, file.name);

    return this.httpService.multipartRequestWithWrapper<Image>(
      'images',
      'POST',
      formData,
      {},
      errorHandlers
    );
  }

  async createFromUrl(payload: {
    imageURL: string
  }, errorHandlers?: ErrorHandlers) {
    const imageResponse = await this.httpService.requestWithErrorHandlers<ArrayBuffer>({
      url: `${CORS_PROXY_BASE_URL}${payload.imageURL}`,
      method: 'GET',
      responseType: 'arraybuffer'
    }, errorHandlers);

    if (imageResponse instanceof HttpError) return imageResponse;

    const imageFile = new File([imageResponse.data], 'image');

    return this.create(imageFile, errorHandlers);
  }
}
