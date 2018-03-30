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
    
    return filteredRecipes.sort(function(a, b) {
      var desc = options.sortBy.indexOf('-') == 0;
      var sortField = desc ? options.sortBy.substr(1) : options.sortBy;
      
      var aV = a[sortField];
      var bV = b[sortField].toLowerCase();
      if (typeof aV === 'string') {
        if (desc) {
          return aV.toLowerCase().localeCompare(bV.toLowerCase()) < 0;
        } else {
          return aV.toLowerCase().localeCompare(bV.toLowerCase()) > 0;
        }
      } else {
        if (desc) {
          return aV < bV;
        } else {
          return aV > bV;
        }
      }
    });
  }
}
