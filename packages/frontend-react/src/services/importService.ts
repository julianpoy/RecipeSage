import { httpService, type UploadProgressHandler } from "./httpService";
import { i18n } from "../i18n/i18n";
import type { ErrorHandlers } from "./httpErrorHandler";

class ImportService {
  getImportLabel() {
    const date = new Date();

    return i18n.t("pages.import.defaultLabel", {
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

  importMela(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/mela",
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

  importCrouton(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/crouton",
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

  importCookbookManagerCom(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/cookbookmanagercom",
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

  importFlavorish(
    file: Blob,
    errorHandlers?: ErrorHandlers,
    onUploadProgress?: UploadProgressHandler,
  ) {
    const formData: FormData = new FormData();
    formData.append("file", file);

    return httpService.multipartRequestWithWrapper<{
      jobId: string;
    }>({
      path: "import/job/flavorish",
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
    return httpService.requestWithWrapper<{
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
    return httpService.requestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

    return httpService.multipartRequestWithWrapper<{
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

export const importService = new ImportService();
