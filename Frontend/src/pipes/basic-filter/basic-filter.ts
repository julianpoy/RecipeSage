import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'basicFilter',
})
export class BasicFilterPipe implements PipeTransform {
  transform(recipes: any[], filter: string, options: any) {
    if (!recipes || !options) {
      return recipes;
    }
    
    var filteredRecipes = recipes;
    
    if (options.selectedLabels && options.selectedLabels.length > 0) {
      filteredRecipes = recipes.filter(function(el) {
        return el.labels.some(function(label) {
          return options.selectedLabels.indexOf(label.title) > -1;
        });
      });
    }
    
    return filteredRecipes.sort(function(a: any, b: any) {
      var desc = options.sortBy.indexOf('-') == 0;
      var sortField = desc ? options.sortBy.substr(1) : options.sortBy;
      
      var aV = a[sortField];
      var bV = b[sortField];
      
      switch(sortField) {
        case "title":
          if (desc) {
            return aV.toLowerCase().localeCompare(bV.toLowerCase());
          } else {
            return bV.toLowerCase().localeCompare(aV.toLowerCase());
          }
          break;
        case "created":
        case "updated":
          if (desc) {
            return Date.parse(aV) < Date.parse(bV) ? 1 : -1;
          } else {
            return Date.parse(aV) > Date.parse(bV) ? 1 : -1;
          }
          break;
        default:
          if (desc) {
            return aV < bV ? 1 : -1;
          } else {
            return aV > bV ? 1 : -1;
          }
          break;
      }
    });
  }
}
