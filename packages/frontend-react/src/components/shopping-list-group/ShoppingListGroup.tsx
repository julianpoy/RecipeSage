import { useState } from "react";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type {
  ShoppingListItemSummary,
  ShoppingListSummary,
} from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ShoppingListItem } from "../shopping-list-item/ShoppingListItem";

export const ShoppingListGroup = ({
  categoryTitle = "",
  group,
  groupTitleExpanded,
  onGroupTitleExpandedChange,
  showRecipeTitle,
  showAddedOn,
  showAddedBy,
  hideDeleteOption,
  otherShoppingLists,
  onCompleteToggle,
  onRecategorize,
  onTitleUpdate,
  onDeleteClick,
  onMoveToList,
  onCopyToList,
}: {
  categoryTitle?: string;
  group: { title: string; items: ShoppingListItemSummary[] };
  groupTitleExpanded: Record<string, boolean | undefined>;
  onGroupTitleExpandedChange: (
    groupTitleExpanded: Record<string, boolean | undefined>,
  ) => void;
  showRecipeTitle: boolean;
  showAddedOn: boolean;
  showAddedBy: boolean;
  hideDeleteOption?: boolean;
  otherShoppingLists?: ShoppingListSummary[];
  onCompleteToggle: (items: ShoppingListItemSummary[]) => void;
  onRecategorize: (items: ShoppingListItemSummary[], category: string) => void;
  onTitleUpdate: (items: ShoppingListItemSummary[], title: string) => void;
  onDeleteClick: (items: ShoppingListItemSummary[]) => void;
  onMoveToList: (
    items: ShoppingListItemSummary[],
    shoppingListId: string,
  ) => void;
  onCopyToList: (
    items: ShoppingListItemSummary[],
    shoppingListId: string,
  ) => void;
}) => {
  const [optimisticCompleted, setOptimisticCompleted] = useState<{
    from: boolean;
    value: boolean;
  }>();

  const expandedKey = categoryTitle + group.title;
  const expanded = !!groupTitleExpanded[expandedKey];

  const renderItem = (
    item: ShoppingListItemSummary,
    items: ShoppingListItemSummary[],
  ) => (
    <ShoppingListItem
      key={item.id}
      title={item.title}
      completed={item.completed}
      recipeTitle={(showRecipeTitle && item.recipe?.title) || undefined}
      createdAt={(showAddedOn && item.createdAt) || undefined}
      ownerName={(showAddedBy && item.user.name) || undefined}
      hideDeleteOption={hideDeleteOption}
      otherShoppingLists={otherShoppingLists}
      onCompleteToggle={() => onCompleteToggle(items)}
      onRecategorize={(category) => onRecategorize(items, category)}
      onTitleUpdate={(title) => onTitleUpdate(items, title)}
      onDeleteClick={() => onDeleteClick(items)}
      onMoveToList={(shoppingListId) => onMoveToList(items, shoppingListId)}
      onCopyToList={(shoppingListId) => onCopyToList(items, shoppingListId)}
    />
  );

  if (group.items.length === 1) {
    return renderItem(group.items[0], group.items);
  }

  if (group.items.length === 0) return null;

  const firstCompleted = group.items[0].completed;
  const displayCompleted =
    optimisticCompleted && optimisticCompleted.from === firstCompleted
      ? optimisticCompleted.value
      : firstCompleted;

  return (
    <div>
      <div className="flex min-h-12 items-center gap-1 ps-4 pe-1">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-4 py-2.5">
          <Checkbox
            className="size-5"
            checked={displayCompleted}
            onCheckedChange={(checked) => {
              setOptimisticCompleted({ from: firstCompleted, value: checked });
              onCompleteToggle(group.items);
            }}
          />
          <div className="min-w-0 flex-1 leading-6 break-words" dir="auto">
            {group.title}
          </div>
        </label>
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-muted-foreground"
          aria-label={group.title}
          aria-expanded={expanded}
          onClick={() =>
            onGroupTitleExpandedChange({
              ...groupTitleExpanded,
              [expandedKey]: !expanded,
            })
          }
        >
          {expanded ? (
            <ChevronDownIcon className="size-5" />
          ) : (
            <ChevronUpIcon className="size-5" />
          )}
        </Button>
      </div>
      {expanded && (
        <div className="ms-10">
          {group.items.map((item) => renderItem(item, [item]))}
        </div>
      )}
    </div>
  );
};
