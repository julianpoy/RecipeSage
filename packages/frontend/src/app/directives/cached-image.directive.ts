import {
  Directive,
  ElementRef,
  Input,
  inject,
  type OnChanges,
} from "@angular/core";
import { ImageCacheService } from "../services/image-cache.service";
import { resolveStorageLocation } from "../utils/resolveStorageLocation";

@Directive({
  standalone: true,
  selector: "img[cachedSrc]",
})
export class CachedImageDirective implements OnChanges {
  private el = inject<ElementRef<HTMLImageElement>>(ElementRef);
  private imageCacheService = inject(ImageCacheService);

  @Input() cachedSrc?: string | null;

  private requestToken = 0;

  ngOnChanges() {
    const el = this.el.nativeElement;

    el.onerror = null;

    if (!this.cachedSrc) {
      el.removeAttribute("src");
      return;
    }

    const url = resolveStorageLocation(this.cachedSrc);

    const token = ++this.requestToken;

    el.src = url;
    el.onerror = () => {
      el.onerror = null;
      void this.imageCacheService.resolveCached(url).then((cached) => {
        if (token !== this.requestToken || !cached) return;
        el.src = cached;
      });
    };

    void this.imageCacheService.prime(url);
  }
}
