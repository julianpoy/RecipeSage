import { useRef, type ChangeEvent } from "react";
import { Capacitor } from "@capacitor/core";
import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleMinusIcon,
  InfoIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ImageSummary } from "@recipesage/prisma";
import { cn } from "@/lib/utils";
import { showAlert } from "../dialogs/showAlert";
import { showToast } from "../dialogs/showToast";
import { imageService } from "../../services/imageService";
import { loadingService } from "../../services/loadingService";
import { capabilitiesStore } from "../../stores/capabilitiesStore";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE_MB = 39;

const FRAME_CLASSES =
  "relative mx-4 my-2 flex size-[200px] items-center justify-center rounded-sm bg-card shadow-[1px_1px_5px_rgba(0,0,0,0.35)] max-[450px]:size-[150px]";

export const MultiImageUpload = ({
  images,
  onImageUpdate,
}: {
  images: ImageSummary[];
  onImageUpdate: (images: ImageSummary[]) => void;
}) => {
  const { t } = useTranslation();
  const capabilities = capabilitiesStore((state) => state.capabilities);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showContributorHintIcon =
    !capabilities.multipleImages || !capabilities.highResImages;

  const uploadFiles = async (files: File[]) => {
    if (!files.length) return;

    if (images.length + files.length > MAX_IMAGES) {
      showToast({
        message: t("components.multiImageUpload.imageLimit"),
      });
      return;
    }

    const loading = loadingService.start();

    let someUploadFailed = false;
    let someUploadHadUnsupportedFormat = false;
    const uploadedImages: ImageSummary[] = [];
    for (const file of files) {
      const isOverMaxSize = file.size / 1024 / 1024 > MAX_FILE_SIZE_MB; // Image is larger than MAX_FILE_SIZE_MB

      if (isOverMaxSize) {
        someUploadFailed = true;
        continue;
      }

      const response = await imageService.create(file, {
        415: () => {
          someUploadFailed = true;
          someUploadHadUnsupportedFormat = true;
        },
        "*": () => (someUploadFailed = true),
      });
      if (response.success) uploadedImages.push(response.data);
    }

    if (someUploadFailed) {
      showToast({
        message: someUploadHadUnsupportedFormat
          ? t("components.multiImageUpload.imageFormatError")
          : t("components.multiImageUpload.imageError"),
      });
    }

    loading.dismiss();

    onImageUpdate([...images, ...uploadedImages]);
  };

  const captureImage = async () => {
    let photo;
    try {
      photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 85,
        width: 2160,
      });
    } catch {
      return;
    }

    if (!photo.webPath) return;

    const response = await fetch(photo.webPath);
    const blob = await response.blob();
    const format = photo.format || "jpeg";
    const file = new File([blob], `photo.${format}`, {
      type: blob.type || `image/${format}`,
    });

    await uploadFiles([file]);
  };

  const filePicker = () => {
    if (Capacitor.isNativePlatform()) {
      void captureImage();
      return;
    }
    fileInputRef.current?.click();
  };

  const addImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files[0]) return;

    const fileList = Array.from(files);
    event.target.value = "";
    await uploadFiles(fileList);
  };

  const reorderImage = (image: ImageSummary, direction: number) => {
    const imgIdx = images.indexOf(image);
    let newImgIdx = imgIdx + direction;
    if (newImgIdx < 0) newImgIdx = 0;
    if (newImgIdx > images.length - 1) newImgIdx = images.length - 1;

    const reordered = [...images];
    reordered.splice(imgIdx, 1);
    reordered.splice(newImgIdx, 0, image);

    onImageUpdate(reordered);
  };

  const removeImage = (image: ImageSummary) => {
    onImageUpdate(images.filter((entry) => entry !== image));
  };

  const showContributorHint = () =>
    showAlert({
      header: t("components.multiImageUpload.contributorHint.header"),
      message: t("components.multiImageUpload.contributorHint.message"),
      preline: true,
      buttons: [{ text: t("generic.okay") }],
    });

  const contributorHintButton = (
    <button
      type="button"
      aria-label={t("components.multiImageUpload.contributorHint.header")}
      className="absolute start-0 top-0 z-[1] flex -translate-x-[40%] -translate-y-[40%] cursor-pointer rounded-full bg-background text-primary rtl:translate-x-[40%]"
      onClick={(event) => {
        event.stopPropagation();
        void showContributorHint();
      }}
    >
      <InfoIcon className="size-6" />
    </button>
  );

  return (
    <div>
      <input
        ref={fileInputRef}
        multiple={capabilities.multipleImages}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={(event) => void addImage(event)}
      />

      <div className="flex overflow-x-auto py-4">
        {images.map((image, i) => (
          <div
            key={image.id}
            className="text-center first:ms-auto last:me-auto"
          >
            <div className={FRAME_CLASSES}>
              <button
                type="button"
                aria-label={t("components.multiImageUpload.remove")}
                className="absolute end-0 top-0 z-[1] flex translate-x-[40%] -translate-y-[40%] cursor-pointer rounded-full bg-background text-destructive rtl:-translate-x-[40%]"
                onClick={() => removeImage(image)}
              >
                <CircleMinusIcon className="size-5" />
              </button>
              {i === 0 && showContributorHintIcon && contributorHintButton}
              <img
                src={resolveStorageLocation(image.location)}
                alt=""
                className="size-[200px] rounded-sm object-cover max-[450px]:size-[150px]"
              />
            </div>
            {images.length > 1 && (
              <div className="mt-1 flex items-center justify-center">
                <button
                  type="button"
                  aria-label={t("components.multiImageUpload.moveEarlier")}
                  disabled={i === 0}
                  className={cn(
                    "mx-2 flex cursor-pointer",
                    i === 0 && "pointer-events-none opacity-0",
                  )}
                  onClick={() => reorderImage(image, -1)}
                >
                  <ChevronLeftIcon className="size-7 rtl:rotate-180" />
                </button>
                <span>{i + 1}</span>
                <button
                  type="button"
                  aria-label={t("components.multiImageUpload.moveLater")}
                  disabled={i >= images.length - 1}
                  className={cn(
                    "mx-2 flex cursor-pointer",
                    i >= images.length - 1 && "pointer-events-none opacity-0",
                  )}
                  onClick={() => reorderImage(image, 1)}
                >
                  <ChevronRightIcon className="size-7 rtl:rotate-180" />
                </button>
              </div>
            )}
          </div>
        ))}

        {images.length < MAX_IMAGES &&
          (images.length === 0 || capabilities.multipleImages) && (
            <div className="text-center first:ms-auto last:me-auto">
              <div
                role="button"
                tabIndex={0}
                className={cn(
                  FRAME_CLASSES,
                  "cursor-pointer outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/30",
                )}
                onClick={filePicker}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;
                  event.preventDefault();
                  filePicker();
                }}
              >
                {images.length === 0 &&
                  showContributorHintIcon &&
                  contributorHintButton}
                <span className="px-2.5">
                  +
                  <br />
                  {t("components.multiImageUpload.add")}
                </span>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
