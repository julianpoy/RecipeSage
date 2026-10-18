import { useState } from "react";
import { ArrowLeftIcon, ArrowRightIcon, XIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";
import { Button } from "@/components/ui/button";
import { ModalDialog } from "../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../components/dialogs/openDialog";
import { PageHeader } from "../../components/layout/PageHeader";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";

const SWIPER_MODULES = [Pagination];

export const ImageViewer = ({
  controls,
  imageUrls,
}: {
  controls: DialogControls<void>;
  imageUrls: string[];
}) => {
  const { t } = useTranslation();
  const [swiper, setSwiper] = useState<SwiperInstance>();
  const [slideNum, setSlideNum] = useState(0);

  return (
    <ModalDialog controls={controls} className="bg-[#222428] text-white">
      <PageHeader
        className="bg-[#222428] text-white"
        start={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <div className="relative min-h-0 flex-1 overscroll-none">
        {slideNum > 0 && (
          <button
            type="button"
            aria-label={t("generic.previous")}
            className="absolute start-1.5 top-1/2 z-10 flex size-[50px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => swiper?.slidePrev()}
          >
            <ArrowLeftIcon className="size-8 rtl:rotate-180" />
          </button>
        )}
        <Swiper
          className="h-full [--swiper-pagination-bullet-inactive-color:#ffffff] [--swiper-theme-color:var(--primary)]"
          modules={SWIPER_MODULES}
          pagination
          centeredSlides
          onSwiper={setSwiper}
          onSlideChange={(instance) => setSlideNum(instance.activeIndex)}
        >
          {imageUrls.map((imageUrl) => (
            <SwiperSlide key={imageUrl}>
              <div className="flex h-full items-center justify-center">
                <img
                  src={resolveStorageLocation(imageUrl)}
                  alt=""
                  className="size-full object-contain"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        {slideNum < imageUrls.length - 1 && (
          <button
            type="button"
            aria-label={t("generic.next")}
            className="absolute end-1.5 top-1/2 z-10 flex size-[50px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-black/75 text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            onClick={() => swiper?.slideNext()}
          >
            <ArrowRightIcon className="size-8 rtl:rotate-180" />
          </button>
        )}
      </div>
    </ModalDialog>
  );
};
