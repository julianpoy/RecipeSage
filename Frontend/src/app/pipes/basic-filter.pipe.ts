import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'basicFilter',
})
export class BasicFilterPipe implements PipeTransform {
  transform(recipes: any[], filter: string, options: any) {
    if (!recipes || recipes.length === 0 || !options) {
      return recipes;
    }

    setTimeout(options.onchange, 0);

    // Mutate array for VirtualScroll
    let filteredRecipes = recipes.slice();

    if (options.viewOptions.selectedLabels && options.viewOptions.selectedLabels.length > 0) {
      filteredRecipes = recipes.filter(el => {
        return el.labels.some(label => {
          return options.viewOptions.selectedLabels.indexOf(label.title) > -1;
        });
      });
    }

    if (filteredRecipes.length === 0) return filteredRecipes;

    if (filteredRecipes[0].score) {
      return filteredRecipes.sort((a: any, b: any) => {
        if (a.score = b.score) return 0;
        return a.score < b.score ? 1 : -1;
      });
    }

    return filteredRecipes.sort((a: any, b: any) => {
      const desc = options.viewOptions.sortBy.indexOf('-') == 0;
      const sortField = desc ? options.viewOptions.sortBy.substr(1) : options.viewOptions.sortBy;

      const aV = a[sortField];
      const bV = b[sortField];

      switch (sortField) {
        case 'title':
          if (desc) {
            return aV.toLowerCase().localeCompare(bV.toLowerCase());
          } else {
            return bV.toLowerCase().localeCompare(aV.toLowerCase());
          }
        case 'created':
        case 'updated':
          if (Date.parse(aV) === Date.parse(bV)) return 0;
          if (desc) {
            return Date.parse(aV) < Date.parse(bV) ? 1 : -1;
          } else {
            return Date.parse(aV) > Date.parse(bV) ? 1 : -1;
          }
        default:
          if (aV === bV) return 0;
          if (desc) {
            return aV < bV ? 1 : -1;
          } else {
            return aV > bV ? 1 : -1;
          }
      }
    });
  }
}
