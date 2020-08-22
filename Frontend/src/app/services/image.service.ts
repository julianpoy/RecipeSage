import { Injectable } from '@angular/core';

import { HttpService } from './http.service';
import { UtilService } from './util.service';

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

  create(file: File) {
    const formData: FormData = new FormData();
    formData.append('image', file, file.name);

    const url = this.utilService.getBase() + 'images/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      data: formData
    }).then(response => response.data);
  }

  createFromUrl(imageURL: string) {
    const data = {
      imageURL
    };

    const url = this.utilService.getBase() + 'images/' + this.utilService.getTokenQuery();

    return this.httpService.request({
      method: 'post',
      url,
      data
    }).then(response => response.data);
  }
}
