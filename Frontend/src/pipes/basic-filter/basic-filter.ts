import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'basicFilter',
})
export class BasicFilterPipe implements PipeTransform {
  transform(items: any[], filter: string) {
    if (!items || !filter) {
      return items;
    }
    
    filter = filter.toLowerCase();

    return items.filter(function(item) {
      let found = false;
      if(item.description) {
        found = found || item.description.toLowerCase().indexOf(filter) !== -1;
      } else if(item.title) {
        found = found || item.title.toLowerCase().indexOf(filter) !== -1;
      }
      return found; 
    });
  }
}
