import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "labelAutocompleteFilter",
})
export class LabelAutocompleteFilterPipe implements PipeTransform {
  transform(
    labels: any[],
    updateWhenChanged: any,
    filter: string,
    selectedLabels: any[],
  ) {
    return labels.filter((el) => {
      if (selectedLabels.indexOf(el.toLowerCase()) > -1) return false;
      if (!filter || filter.length === 0) return true;
      return el.toLowerCase().indexOf(filter.toLowerCase()) > -1;
    });
  }
}
