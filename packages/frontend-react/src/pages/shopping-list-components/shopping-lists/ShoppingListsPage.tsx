import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  BanIcon,
  ListIcon,
  PlusIcon,
  ShoppingCartIcon,
  SlidersHorizontalIcon,
} from "lucide-react";
import { WSBroadcastEventType } from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { NullState } from "../../../components/NullState";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";
import { openNewShoppingListModal } from "../new-shopping-list-modal/openNewShoppingListModal";
import { openShoppingListIgnoreModal } from "../shopping-list-ignore-modal/openShoppingListIgnoreModal";

export const ShoppingListsPage = () => {
  const { t } = useTranslation();
  const [optionsOpen, setOptionsOpen] = useState(false);

  const meQuery = useOfflineFirstQuery(serverActions.users.getMe());
  const me = meQuery.data;
  const shoppingListsQuery = useOfflineFirstQuery(
    serverActions.shoppingLists.getShoppingLists(),
  );
  const shoppingListsData = shoppingListsQuery.data;
  const shoppingLists = useMemo(() => {
    if (!shoppingListsData) return shoppingListsData;
    return [...shoppingListsData].sort((a, b) =>
      a.title.localeCompare(b.title),
    );
  }, [shoppingListsData]);

  useWebsocketEvent(WSBroadcastEventType.ShoppingListUpdated, () => {
    void shoppingListsQuery.refetch();
  });

  const newShoppingList = () => {
    void openNewShoppingListModal();
  };

  const showIgnoreModal = () => {
    setOptionsOpen(false);
    void openShoppingListIgnoreModal();
  };

  return (
    <>
      <PageHeader
        title={t("pages.shoppingLists.title")}
        end={
          <Popover open={optionsOpen} onOpenChange={setOptionsOpen}>
            <PopoverTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="text-inherit hover:bg-white/10 hover:text-inherit aria-expanded:bg-white/10 aria-expanded:text-inherit"
                  aria-label={t("generic.options")}
                />
              }
            >
              <SlidersHorizontalIcon className="size-6" />
            </PopoverTrigger>
            <PopoverContent
              align="end"
              className="w-72 max-w-[calc(100vw-2rem)] gap-3"
            >
              <h2 className="text-base font-medium">{t("generic.options")}</h2>
              <Button
                className="h-auto min-h-9 w-full whitespace-normal"
                onClick={showIgnoreModal}
              >
                <BanIcon data-icon="inline-start" />
                {t("pages.shoppingLists.editIgnore")}
              </Button>
            </PopoverContent>
          </Popover>
        }
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-24">
          {shoppingLists?.map((shoppingList) => (
            <Link
              key={shoppingList.id}
              to="/shopping-lists/$shoppingListId"
              params={{ shoppingListId: shoppingList.id }}
              className="flex items-center gap-4 border-b px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <ListIcon
                className="size-6 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium break-words">
                  <span dir="auto">{shoppingList.title}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("pages.shoppingLists.created", {
                    date: formatDate(shoppingList.createdAt, { now: true }),
                  })}
                </p>
                {shoppingList.collaboratorUsers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("pages.shoppingLists.collaboration")}{" "}
                    {shoppingList.collaboratorUsers.map(
                      (collaboratorUser, idx) => {
                        if (me?.id === collaboratorUser.user.id) return null;
                        const isLast =
                          idx === shoppingList.collaboratorUsers.length - 1;
                        return (
                          <span key={collaboratorUser.user.id} dir="auto">
                            {collaboratorUser.user.name}
                            {(!isLast || me?.id !== shoppingList.userId) &&
                              ","}{" "}
                          </span>
                        );
                      },
                    )}
                    {me?.id !== shoppingList.userId && (
                      <span dir="auto">{shoppingList.user.name}</span>
                    )}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {me?.id !== shoppingList.userId && (
                    <span>
                      {t("pages.shoppingLists.createdBy", {
                        name: shoppingList.user.name,
                      })}
                    </span>
                  )}
                  {me?.id === shoppingList.userId && (
                    <span>{t("pages.shoppingLists.owner")}</span>
                  )}
                </p>
              </div>
              <Badge>{shoppingList._count.items}</Badge>
            </Link>
          ))}
          {shoppingLists === undefined && (
            <NullState icon={<Spinner />}>
              <p className="text-muted-foreground">
                {t("pages.shoppingLists.loading")}
              </p>
            </NullState>
          )}
          {shoppingLists?.length === 0 && (
            <NullState
              icon={<ShoppingCartIcon className="text-muted-foreground" />}
            >
              <p className="text-muted-foreground">
                {t("pages.shoppingLists.nullState.1")}
                <br />
                {t("pages.shoppingLists.nullState.2")}
              </p>
            </NullState>
          )}
        </div>
      </PageContent>
      <Fab
        aria-label={t("pages.newShoppingList.title")}
        onClick={newShoppingList}
      >
        <PlusIcon />
      </Fab>
    </>
  );
};
