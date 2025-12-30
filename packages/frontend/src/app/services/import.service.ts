import { AlertController } from "@ionic/angular";
import { Injectable, inject } from "@angular/core";

import { HttpService, UploadProgressHandler } from "./http.service";
import { ErrorHandlers } from "./http-error-handler.service";
import { UtilService } from "./util.service";
import { EventService } from "./event.service";
import { TranslateService } from "@ngx-translate/core";

@Injectable({
  providedIn: "root",
})
export class ImportService {
  private alertCtrl = inject(AlertController);
  private events = inject(EventService);
  private httpService = inject(HttpService);
  private utilService = inject(UtilService);
  private translate = inject(TranslateService);

  getImportLabel() {
    const date = new Date();

    return this.translate.instant("pages.import.defaultLabel", {
      dateStamp: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, "0")}-${date.getDate().toString().padStart(2, "0")} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}:${date.getSeconds().toString().padStart(2, "0")}`,
    });
  }

  importEnex(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/enex",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importTextfiles(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/textfiles",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importJsonLD(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/jsonld",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importFdxz(
    file: Blob,
    options: {
      excludeImages: boolean;
      includeStockRecipes: boolean;
      includeTechniques: boolean;
    },
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/fdxz",
      method: "POST",
      payload: formData,
      query: {
        ...options,
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importLivingcookbook(
    file: Blob,
    options: {
      excludeImages: boolean;
    },
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/livingcookbook",
      method: "POST",
      payload: formData,
      query: {
        ...options,
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importPaprika(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/paprika",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importPepperplate(
    payload: {
      username: string;
      password: string;
    },
    errorHandlers?: ErrorHandlers,
  ) {
    return this.httpService.requestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/pepperplate",
      method: "POST",
      payload,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
    });
  }

  importUrls(urls: string[], errorHandlers?: ErrorHandlers) {
    return this.httpService.requestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/urls",
      method: "POST",
      payload: {
        urls,
      },
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
    });
  }

  importCopymethat(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/copymethat",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importRecipekeeper(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/recipekeeper",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importCookmate(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/cookmate",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importCSV(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/csv",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importPDFs(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/pdfs",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }

  importImages(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return this.httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/images",
      method: "POST",
      payload: formData,
      query: {
        labels: this.getImportLabel(),
      },
      errorHandlers,
      listeners: {
        onUploadProgress,
      },
    });
  }
}
