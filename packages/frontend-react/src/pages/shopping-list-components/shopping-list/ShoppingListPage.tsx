import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
  ShoppingCartIcon,
  Trash2Icon,
  Undo2Icon,
} from "lucide-react";
import type {
  ShoppingListItemSummary,
  ShoppingListSummary,
} from "@recipesage/prisma";
import {
  SHOPPING_LIST_CATEGORY_I18N,
  ShoppingListPreferenceKey,
  WSBroadcastEventType,
  getShoppingListItemGroupings,
  type ShoppingListItemSummariesByGroupAndCategory,
} from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { showAlert } from "../../../components/dialogs/showAlert";
import { showToast } from "../../../components/dialogs/showToast";
import { BackButton } from "../../../components/layout/BackButton";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { NullState } from "../../../components/NullState";
import { ShoppingListGroup } from "../../../components/shopping-list-group/ShoppingListGroup";
import { ShoppingListItem } from "../../../components/shopping-list-item/ShoppingListItem";
import { shoppingListCategoryI18nKeys } from "../../../components/shopping-list-item/shoppingListCategoryI18nKeys";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { preferencesStore } from "../../../stores/preferencesStore";
import type { NewShoppingListItemDraft } from "../new-shopping-list-item-modal/NewShoppingListItemModal";
import { openNewShoppingListItemModal } from "../new-shopping-list-item-modal/openNewShoppingListItemModal";
import { ShoppingListPopover } from "../shopping-list-popover/ShoppingListPopover";

const routeApi = getRouteApi("/shopping-lists/$shoppingListId");

interface ProcessedList {
  items: ShoppingListItemSummary[];
  completedItems: ShoppingListItemSummary[];
  groupTitles: string[];
  categoryTitles: string[];
  itemsByGroupTitle: Record<string, ShoppingListItemSummary[] | undefined>;
  itemsByCategoryTitle: Record<string, ShoppingListItemSummary[] | undefined>;
  groupsByCategoryTitle: ShoppingListItemSummariesByGroupAndCategory;
  itemsByRecipeId: Record<string, ShoppingListItemSummary[] | undefined>;
  recipeIds: string[];
}

const EMPTY_PROCESSED_LIST: ProcessedList = {
  items: [],
  completedItems: [],
  groupTitles: [],
  categoryTitles: [],
  itemsByGroupTitle: {},
  itemsByCategoryTitle: {},
  groupsByCategoryTitle: {},
  itemsByRecipeId: {},
  recipeIds: [],
};

const ShoppingListView = ({ shoppingListId }: { shoppingListId: string }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const preferences = preferencesStore((state) => state.preferences);
  const sortBy = preferences[ShoppingListPreferenceKey.SortBy];
  const groupCategories =
    preferences[ShoppingListPreferenceKey.GroupCategories];
  const groupSimilar = preferences[ShoppingListPreferenceKey.GroupSimilar];
  const showRecipeTitle =
    preferences[ShoppingListPreferenceKey.ShowRecipeTitle];
  const showAddedOn = preferences[ShoppingListPreferenceKey.ShowAddedOn];
  const showAddedByPreference =
    preferences[ShoppingListPreferenceKey.ShowAddedBy];
  const preferDelete = preferences[ShoppingListPreferenceKey.PreferDelete];

  const referenceRef = useRef("0");

  const [categoryTitleCollapsed, setCategoryTitleCollapsed] = useState<
    Record<string, boolean | undefined>
  >({});
  const [groupTitleExpanded, setGroupTitleExpanded] = useState<
    Record<string, boolean | undefined>
  >({});
  const [listNoLongerAvailable, setListNoLongerAvailable] = useState(false);

  const handleListNoLongerAvailable = useEffectEvent(() => {
    showToast({
      message: t("pages.shoppingList.noLongerAvailable"),
      duration: 5000,
    });

    void navigate({ to: "/shopping-lists", replace: true });
  });

  useEffect(() => {
    if (listNoLongerAvailable) handleListNoLongerAvailable();
  }, [listNoLongerAvailable]);

  const meQuery = useOfflineFirstQuery(serverActions.users.getMe());
  const me = meQuery.data;
  const shoppingListQuery = useOfflineFirstQuery(
    serverActions.shoppingLists.getShoppingList(
      {
        id: shoppingListId,
      },
      {
        404: () => setListNoLongerAvailable(true),
      },
    ),
  );
  const shoppingListItemsQuery = useOfflineFirstQuery(
    serverActions.shoppingLists.getShoppingListItems(
      {
        shoppingListId,
      },
      {
        404: () => setListNoLongerAvailable(true),
      },
    ),
  );
  const shoppingListsQuery = useOfflineFirstQuery(
    serverActions.shoppingLists.getShoppingLists(),
  );
  const shoppingList = shoppingListQuery.data;
  const shoppingListItems = shoppingListItemsQuery.data;

  const otherShoppingLists = useMemo<ShoppingListSummary[]>(
    () =>
      (shoppingListsQuery.data || [])
        .filter((list) => list.id !== shoppingListId)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [shoppingListsQuery.data, shoppingListId],
  );

  const loadList = () => {
    void shoppingListQuery.refetch();
    void shoppingListItemsQuery.refetch();
  };

  useWebsocketEvent(WSBroadcastEventType.ShoppingListUpdated, (data) => {
    if (
      data.shoppingListId === shoppingListId &&
      data.reference !== referenceRef.current
    ) {
      referenceRef.current = data.reference;
      loadList();
    }
  });

  const shoppingListTitle = shoppingList?.title;
  useEffect(() => {
    if (shoppingListTitle === undefined) return;
    document.title = t("generic.labeledPageTitle", {
      title: shoppingListTitle,
    });
  }, [shoppingListTitle, t]);

  const categoryOrder = shoppingList?.categoryOrder;
  const shoppingListLoaded = !!shoppingList;
  const processed = useMemo<ProcessedList>(() => {
    if (!shoppingListLoaded || !shoppingListItems) return EMPTY_PROCESSED_LIST;

    const parseCategoryTitle = (title: string) => {
      if (title.startsWith("::")) {
        const i18nStr = SHOPPING_LIST_CATEGORY_I18N[title.substring(2)];
        const i18nKey = shoppingListCategoryI18nKeys.find(
          (key) => key === i18nStr,
        );
        if (!i18nKey) return t("pages.shoppingList.category.uncategorized");

        return t(i18nKey);
      }

      return title;
    };

    const uncategorizedTitle = parseCategoryTitle("::uncategorized");

    const items = shoppingListItems
      .filter((item) => !item.completed)
      .map((el) => ({
        ...el,
        categoryTitle: parseCategoryTitle(
          el.categoryTitle || "::uncategorized",
        ),
      }));
    const completedItems = shoppingListItems
      .filter((item) => item.completed)
      .map((el) => ({
        ...el,
        categoryTitle: parseCategoryTitle(
          el.categoryTitle || "::uncategorized",
        ),
      }));

    const recipeIds: string[] = [];
    const itemsByRecipeId: Record<
      string,
      ShoppingListItemSummary[] | undefined
    > = {};

    for (const item of items) {
      // Recipe grouping
      if (!item.recipe) continue;

      const recipeId = `${item.recipe.id}${String(item.createdAt)}`;

      if (recipeIds.indexOf(recipeId) === -1) recipeIds.push(recipeId);

      const recipeItems = itemsByRecipeId[recipeId] || [];
      recipeItems.push(item);
      itemsByRecipeId[recipeId] = recipeItems;
    }

    const groupings = getShoppingListItemGroupings(
      items,
      sortBy,
      uncategorizedTitle,
      categoryOrder ?? null,
    );

    const { items: sortedCompletedItems } = getShoppingListItemGroupings(
      completedItems,
      sortBy,
      uncategorizedTitle,
      categoryOrder ?? null,
    );

    return {
      items: groupings.items,
      completedItems: sortedCompletedItems,
      groupTitles: groupings.groupTitles,
      categoryTitles: groupings.categoryTitles,
      itemsByGroupTitle: groupings.itemsByGroupTitle,
      itemsByCategoryTitle: groupings.itemsByCategoryTitle,
      groupsByCategoryTitle: groupings.groupsByCategoryTitle,
      itemsByRecipeId,
      recipeIds,
    };
  }, [shoppingListLoaded, shoppingListItems, sortBy, categoryOrder, t]);

  const hasCollaborators = !!shoppingList?.collaboratorUsers.length;
  const showAddedBy = showAddedByPreference && hasCollaborators;

  const completeItems = async (
    items: ShoppingListItemSummary[],
    completed: boolean,
  ) => {
    if (!shoppingList) return;

    if (completed && preferDelete) {
      return removeItems(items);
    }

    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const response = await serverActions.shoppingLists.updateShoppingListItems({
      shoppingListId,
      items: items.map((item) => ({
        id: item.id,
        completed,
      })),
      reference,
    });
    if (!response) {
      loading.dismiss();
      return;
    }

    loadList();

    loading.dismiss();
  };

  const recategorizeItems = async (
    items: ShoppingListItemSummary[],
    categoryTitle: string,
  ) => {
    if (!shoppingList) return;

    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const response = await serverActions.shoppingLists.updateShoppingListItems({
      shoppingListId,
      items: items.map((item) => ({
        id: item.id,
        categoryTitle,
      })),
      reference,
    });
    if (!response) {
      loading.dismiss();
      return;
    }

    loadList();

    loading.dismiss();
  };

  const retitleItems = async (
    items: ShoppingListItemSummary[],
    title: string,
  ) => {
    if (!shoppingList) return;

    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const response = await serverActions.shoppingLists.updateShoppingListItems({
      shoppingListId,
      items: items.map((item) => ({
        id: item.id,
        title,
      })),
      reference,
    });
    if (!response) {
      loading.dismiss();
      return;
    }

    loadList();

    loading.dismiss();
  };

  const _createItemsInList = (
    items: ShoppingListItemSummary[],
    destinationShoppingListId: string,
  ) => {
    const rawItemsById = new Map(
      (shoppingListItems || []).map((item) => [item.id, item]),
    );

    return serverActions.shoppingLists.createShoppingListItems({
      shoppingListId: destinationShoppingListId,
      items: items.map((item) => ({
        title: item.title,
        recipeId: item.recipeId,
        completed: item.completed,
        categoryTitle: rawItemsById.get(item.id)?.categoryTitle || undefined,
      })),
    });
  };

  const copyItemsToList = async (
    items: ShoppingListItemSummary[],
    destinationShoppingListId: string,
  ) => {
    if (!shoppingList) return;
    if (!items.length) return;

    const destination = otherShoppingLists.find(
      (list) => list.id === destinationShoppingListId,
    );
    if (!destination) return;

    const loading = loadingService.start();

    const createResponse = await _createItemsInList(items, destination.id);
    loading.dismiss();
    if (!createResponse) return;

    showToast({
      message: t("pages.shoppingList.copiedToList", {
        itemCount: items.length,
        title: destination.title,
      }),
      duration: 5000,
    });
  };

  const moveItemsToList = async (
    items: ShoppingListItemSummary[],
    destinationShoppingListId: string,
  ) => {
    if (!shoppingList) return;
    if (!items.length) return;

    const destination = otherShoppingLists.find(
      (list) => list.id === destinationShoppingListId,
    );
    if (!destination) return;

    const loading = loadingService.start();

    const createResponse = await _createItemsInList(items, destination.id);
    if (!createResponse) {
      loading.dismiss();
      return;
    }

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const deleteResponse =
      await serverActions.shoppingLists.deleteShoppingListItems(
        {
          shoppingListId,
          ids: items.map((item) => item.id),
          reference,
        },
        {
          0: () => {},
          500: () => {},
        },
      );

    loadList();
    loading.dismiss();

    if (!deleteResponse) {
      void showAlert({
        header: t("pages.shoppingList.movedToListPartialFailure.header"),
        message: t("pages.shoppingList.movedToListPartialFailure", {
          title: destination.title,
        }),
        buttons: [{ text: t("generic.okay") }],
      });
      return;
    }

    showToast({
      message: t("pages.shoppingList.movedToList", {
        itemCount: items.length,
        title: destination.title,
      }),
      duration: 5000,
    });
  };

  const _addItems = async (items: NewShoppingListItemDraft[]) => {
    if (!shoppingList) return;

    const sanitizedItems = items
      .map((el) => ({
        title: el.title.trim(),
        completed: el.completed,
        recipeId: el.recipeId,
      }))
      .filter((el) => el.title.length > 0);

    if (sanitizedItems.length === 0) return;

    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const response = await serverActions.shoppingLists.createShoppingListItems({
      shoppingListId,
      items: sanitizedItems,
      reference,
    });
    if (!response) {
      loading.dismiss();
      return;
    }

    loadList();
    loading.dismiss();
  };

  const removeItems = async (items: ShoppingListItemSummary[]) => {
    if (!shoppingList) return;
    if (!items.length) return;

    const loading = loadingService.start();

    const reference = crypto.randomUUID();
    referenceRef.current = reference;

    const response = await serverActions.shoppingLists.deleteShoppingListItems({
      shoppingListId,
      ids: items.map((el) => el.id),
      reference,
    });
    if (!response) {
      loading.dismiss();
      return;
    }

    loadList();
    loading.dismiss();

    showToast({
      message: t("pages.shoppingList.removed", { itemCount: items.length }),
      duration: 5000,
      action: {
        text: t("pages.shoppingList.removed.undo"),
        handler: () => {
          void _addItems(
            items.map((el) => ({
              ...el,
              completed: false,
            })),
          );
        },
      },
    });
  };

  const removeRecipe = (recipeId: string) => {
    void removeItems(processed.itemsByRecipeId[recipeId] || []);
  };

  const removeItemsConfirm = (items: ShoppingListItemSummary[]) => {
    void showAlert({
      header: t("pages.shoppingList.removeMultiple.header"),
      message: t("pages.shoppingList.removeMultiple.message"),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: () => {
            void removeItems(items);
          },
        },
      ],
    });
  };

  const newShoppingListItem = async () => {
    const data = await openNewShoppingListItemModal();
    if (!data || !data.items) return;
    void _addItems(data.items);
  };

  const toggleCategoryCollapsed = (categoryTitle: string) => {
    setCategoryTitleCollapsed((prev) => ({
      ...prev,
      [categoryTitle]: !prev[categoryTitle],
    }));
  };

  const renderItem = (item: ShoppingListItemSummary) => (
    <ShoppingListItem
      title={item.title}
      completed={item.completed}
      recipeTitle={(showRecipeTitle && item.recipe?.title) || undefined}
      createdAt={(showAddedOn && item.createdAt) || undefined}
      ownerName={
        (showAddedByPreference && hasCollaborators && item.user.name) ||
        undefined
      }
      hideDeleteOption={preferDelete}
      otherShoppingLists={otherShoppingLists}
      onCompleteToggle={() => void completeItems([item], true)}
      onRecategorize={(category) => void recategorizeItems([item], category)}
      onTitleUpdate={(title) => void retitleItems([item], title)}
      onDeleteClick={() => void removeItems([item])}
      onMoveToList={(listId) => void moveItemsToList([item], listId)}
      onCopyToList={(listId) => void copyItemsToList([item], listId)}
    />
  );

  const renderGroup = (
    group: { title: string; items: ShoppingListItemSummary[] },
    categoryTitle?: string,
  ) => (
    <ShoppingListGroup
      group={group}
      categoryTitle={categoryTitle}
      groupTitleExpanded={groupTitleExpanded}
      onGroupTitleExpandedChange={setGroupTitleExpanded}
      showRecipeTitle={showRecipeTitle}
      showAddedOn={showAddedOn}
      showAddedBy={showAddedBy}
      hideDeleteOption={preferDelete}
      otherShoppingLists={otherShoppingLists}
      onCompleteToggle={(items) => void completeItems(items, true)}
      onRecategorize={(items, category) =>
        void recategorizeItems(items, category)
      }
      onTitleUpdate={(items, title) => void retitleItems(items, title)}
      onDeleteClick={(items) => void removeItems(items)}
      onMoveToList={(items, listId) => void moveItemsToList(items, listId)}
      onCopyToList={(items, listId) => void copyItemsToList(items, listId)}
    />
  );

  const renderCategoryHeader = (categoryTitle: string) => {
    const collapsed = !!categoryTitleCollapsed[categoryTitle];
    return (
      <button
        type="button"
        className="flex min-h-12 w-full cursor-pointer items-center gap-2 px-4 pt-3 pb-1 text-start text-xl font-medium"
        aria-expanded={!collapsed}
        onClick={() => toggleCategoryCollapsed(categoryTitle)}
      >
        <span dir="auto">{categoryTitle}</span>
        {collapsed ? (
          <ChevronUpIcon className="size-5 shrink-0" aria-hidden="true" />
        ) : (
          <ChevronDownIcon className="size-5 shrink-0" aria-hidden="true" />
        )}
      </button>
    );
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/shopping-lists" }} />}
        title={t("pages.shoppingList.title", {
          title: shoppingList?.title || "",
        })}
        end={
          <ShoppingListPopover
            shoppingListId={shoppingListId}
            shoppingList={shoppingList}
            shoppingListItems={shoppingListItems}
            isOwner={!!shoppingList && me?.id === shoppingList.user.id}
            setReference={(reference) => {
              referenceRef.current = reference;
            }}
            onReload={loadList}
          />
        }
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-24">
          <div>
            {groupCategories && groupSimilar && (
              <div>
                {processed.categoryTitles.map((categoryTitle) => (
                  <div key={categoryTitle} className="mb-2">
                    {renderCategoryHeader(categoryTitle)}
                    {!categoryTitleCollapsed[categoryTitle] && (
                      <div>
                        {(
                          processed.groupsByCategoryTitle[categoryTitle] || []
                        ).map((group) => (
                          <div key={group.title} className="odd:bg-stripe">
                            {renderGroup(group, categoryTitle)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!groupCategories && groupSimilar && (
              <div>
                {processed.groupTitles.map((groupTitle) => (
                  <div key={groupTitle} className="odd:bg-stripe">
                    {renderGroup({
                      title: groupTitle,
                      items: processed.itemsByGroupTitle[groupTitle] || [],
                    })}
                  </div>
                ))}
              </div>
            )}
            {groupCategories && !groupSimilar && (
              <div>
                {processed.categoryTitles.map((categoryTitle) => (
                  <div key={categoryTitle} className="mb-2">
                    {renderCategoryHeader(categoryTitle)}
                    {!categoryTitleCollapsed[categoryTitle] && (
                      <div>
                        {(
                          processed.itemsByCategoryTitle[categoryTitle] || []
                        ).map((item) => (
                          <div key={item.id} className="odd:bg-stripe">
                            {renderItem(item)}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!groupCategories && !groupSimilar && (
              <div>
                {processed.items.map((item) => (
                  <div key={item.id} className="odd:bg-stripe">
                    {renderItem(item)}
                  </div>
                ))}
              </div>
            )}
            {shoppingListItems === undefined && (
              <NullState icon={<Spinner />}>
                <p className="text-muted-foreground">
                  {t("pages.shoppingList.loading")}
                </p>
              </NullState>
            )}
            {shoppingListItems?.length === 0 && (
              <NullState
                icon={<ShoppingCartIcon className="text-muted-foreground" />}
              >
                <p className="text-muted-foreground">
                  {t("pages.shoppingList.nullState.1")}
                  <br />
                  {t("pages.shoppingList.nullState.2")}
                </p>
                <Button
                  size="lg"
                  className="mt-6"
                  onClick={() => void newShoppingListItem()}
                >
                  <PlusIcon data-icon="inline-start" />
                  {t("pages.shoppingList.nullState.add")}
                </Button>
              </NullState>
            )}
          </div>

          {processed.recipeIds.length > 0 && (
            <div className="mt-6">
              <div className="border-b px-4 py-3 text-base">
                {t("pages.shoppingList.recipes")}
              </div>
              {processed.recipeIds.map((recipeId) => {
                const recipe = processed.itemsByRecipeId[recipeId]?.[0]?.recipe;
                if (!recipe) return null;
                return (
                  <div
                    key={recipeId}
                    className="flex min-h-12 items-center gap-1 border-b ps-4 pe-1 hover:bg-muted"
                  >
                    <Link
                      to="/recipe/$recipeId"
                      params={{ recipeId: recipe.id }}
                      className="min-w-0 flex-1 py-3"
                    >
                      <span dir="auto">{recipe.title}</span>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      className="text-destructive hover:text-destructive"
                      aria-label={t("pages.shoppingList.removeRecipe")}
                      onClick={() => removeRecipe(recipeId)}
                    >
                      <Trash2Icon className="size-5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {processed.completedItems.length > 0 && (
            <div className="mt-6">
              <div className="flex min-h-12 items-center gap-2 border-b ps-4 pe-2">
                <span className="min-w-0 flex-1 text-base">
                  {t("pages.shoppingList.completed")}
                </span>
                <Button
                  size="icon-lg"
                  aria-label={t("pages.shoppingList.restoreAll")}
                  onClick={() =>
                    void completeItems(processed.completedItems, false)
                  }
                >
                  <Undo2Icon className="size-5" />
                </Button>
                <Button
                  size="icon-lg"
                  className="bg-destructive text-white hover:bg-destructive/80"
                  aria-label={t("pages.shoppingList.deleteAll")}
                  onClick={() => removeItemsConfirm(processed.completedItems)}
                >
                  <Trash2Icon className="size-5" />
                </Button>
              </div>
              {processed.completedItems.map((item) => (
                <ShoppingListItem
                  key={item.id}
                  title={item.title}
                  completed={item.completed}
                  recipeTitle={
                    (showRecipeTitle && item.recipe?.title) || undefined
                  }
                  createdAt={(showAddedOn && item.createdAt) || undefined}
                  ownerName={
                    (showAddedByPreference &&
                      hasCollaborators &&
                      item.user.name) ||
                    undefined
                  }
                  showDeleteButton
                  hideDeleteOption
                  hideRecategorizeOptions
                  otherShoppingLists={otherShoppingLists}
                  onCompleteToggle={() => void completeItems([item], false)}
                  onRecategorize={(category) =>
                    void recategorizeItems([item], category)
                  }
                  onTitleUpdate={(title) => void retitleItems([item], title)}
                  onDeleteClick={() => void removeItems([item])}
                  onMoveToList={(listId) =>
                    void moveItemsToList([item], listId)
                  }
                  onCopyToList={(listId) =>
                    void copyItemsToList([item], listId)
                  }
                />
              ))}
            </div>
          )}
        </div>
      </PageContent>
      <Fab
        aria-label={t("pages.newShoppingListItem.title")}
        onClick={() => void newShoppingListItem()}
      >
        <PlusIcon />
      </Fab>
    </>
  );
};

export const ShoppingListPage = () => {
  const { shoppingListId } = routeApi.useParams();

  return (
    <ShoppingListView key={shoppingListId} shoppingListId={shoppingListId} />
  );
};
