import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { BanIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { NullState } from "../../../components/NullState";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { blockAndReportUserService } from "../../../services/blockAndReportUserService";
import { loadingService } from "../../../services/loadingService";
import type { RouterOutputs } from "../../../services/server-actions/ActionsBase";
import { serverActions } from "../../../services/serverActions";
import { UserAvatar } from "../UserAvatar";

type BlockedUser = RouterOutputs["users"]["getMyBlockedUsers"][number];

export const BlockedUsersPage = () => {
  const { t } = useTranslation();

  const blockedUsersQuery = useActionQuery(["users.getMyBlockedUsers"], () =>
    serverActions.users.getMyBlockedUsers(),
  );
  const { isPending, refetch } = blockedUsersQuery;
  const blockedUsers = blockedUsersQuery.data;

  useEffect(() => {
    if (!isPending) return;
    const loading = loadingService.start();
    return () => loading.dismiss();
  }, [isPending]);

  const unblockUser = async (blockedUser: BlockedUser) => {
    const unblocked = await blockAndReportUserService.unblockUser(blockedUser);
    if (unblocked) void refetch();
  };

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/people" }} />}
        title={t("pages.blockedUsers.title")}
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page">
          {isPending && (
            <NullState icon={<Spinner />}>
              <p className="text-sm text-muted-foreground">
                {t("pages.blockedUsers.loading")}
              </p>
            </NullState>
          )}

          {blockedUsers && !blockedUsers.length && (
            <NullState
              icon={
                <BanIcon aria-hidden="true" className="text-muted-foreground" />
              }
            >
              <p className="px-4 text-sm text-muted-foreground">
                {t("pages.blockedUsers.nullState")}
              </p>
            </NullState>
          )}

          {!!blockedUsers?.length && (
            <ul>
              {blockedUsers.map((blockedUser) => {
                const content = (
                  <>
                    <UserAvatar profileImages={blockedUser.profileImages} />
                    <span className="min-w-0 flex-1 truncate">
                      <span dir="auto">{blockedUser.name}</span>
                    </span>
                  </>
                );

                return (
                  <li
                    key={blockedUser.id}
                    className="flex min-h-14 items-center gap-2 border-b pe-4"
                  >
                    {blockedUser.enableProfile && blockedUser.handle ? (
                      <Link
                        to="/people/$handle"
                        params={{ handle: `@${blockedUser.handle}` }}
                        className="flex min-h-14 min-w-0 flex-1 items-center gap-4 ps-4 hover:bg-muted"
                      >
                        {content}
                      </Link>
                    ) : (
                      <div className="flex min-h-14 min-w-0 flex-1 items-center gap-4 ps-4">
                        {content}
                      </div>
                    )}
                    <Button
                      className="shrink-0"
                      onClick={() => void unblockUser(blockedUser)}
                    >
                      {t("pages.blockedUsers.unblock")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </PageContent>
    </>
  );
};
