import { Pipe, PipeTransform } from "@angular/core";

@Pipe({
  name: "shoppingListCollaboratorFilter",
})
export class ShoppingListCollaboratorFilterPipe implements PipeTransform {
  transform(
    users: any[],
    updateWhenChanged: any,
    filter: string,
    selectedUserIds: any[],
  ) {
    return users.filter((user) => {
      if (selectedUserIds.indexOf(user.id) > -1) return false;
      if (!filter || filter.length === 0) return true;
      return (
        (user.name + (user.email || ""))
          .toLowerCase()
          .indexOf(filter.toLowerCase()) > -1
      );
    });
  }
}
