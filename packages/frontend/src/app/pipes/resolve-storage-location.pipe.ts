import { Pipe, type PipeTransform } from "@angular/core";
import { resolveStorageLocation } from "../utils/resolveStorageLocation";

@Pipe({
  standalone: true,
  name: "resolveStorageLocation",
})
export class ResolveStorageLocationPipe implements PipeTransform {
  transform(location: string | null | undefined): string | null | undefined {
    if (!location) return location;

    return resolveStorageLocation(location);
  }
}
