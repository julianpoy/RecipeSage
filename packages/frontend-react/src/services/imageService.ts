import { b642u8 } from "@recipesage/util/shared";
import type { ImageSummary } from "@recipesage/prisma";
import { httpService } from "./httpService";
import type { ErrorHandlers } from "./httpErrorHandler";

const create = (file: File, errorHandlers?: ErrorHandlers) => {
  const formData: FormData = new FormData();
  formData.append("file", file, file.name);

  return httpService.multipartRequestWithWrapper<ImageSummary>({
    path: "images/createRecipeImage",
    method: "POST",
    payload: formData,
    query: {},
    errorHandlers,
  });
};

export const imageService = {
  create,

  createFromB64(b64: string, errorHandlers?: ErrorHandlers) {
    const u8 = b642u8(b64);
    const file = new File([u8], "image");

    return create(file, errorHandlers);
  },
};
