import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CalendarIcon, PlusIcon } from "lucide-react";
import { WSBroadcastEventType } from "@recipesage/util/shared";
import { Spinner } from "@/components/ui/spinner";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { NullState } from "../../../components/NullState";
import { useOfflineFirstQuery } from "../../../hooks/useOfflineFirstQuery";
import { useWebsocketEvent } from "../../../hooks/useWebsocketEvent";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";
import { openNewMealPlanModal } from "../new-meal-plan-modal/openNewMealPlanModal";

export const MealPlansPage = () => {
  const { t } = useTranslation();

  const meQuery = useOfflineFirstQuery(serverActions.users.getMe());
  const me = meQuery.data;
  const mealPlansQuery = useOfflineFirstQuery(
    serverActions.mealPlans.getMealPlans(),
  );
  const mealPlansData = mealPlansQuery.data;
  const mealPlans = useMemo(() => {
    if (!mealPlansData) return mealPlansData;
    return [...mealPlansData].sort((a, b) => a.title.localeCompare(b.title));
  }, [mealPlansData]);

  const loadPlans = () => {
    void mealPlansQuery.refetch();
  };

  useWebsocketEvent(WSBroadcastEventType.MealPlanUpdated, () => {
    loadPlans();
  });

  const newMealPlan = async () => {
    await openNewMealPlanModal();
    loadPlans();
  };

  return (
    <>
      <PageHeader title={t("pages.mealPlans.title")} />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-24">
          {mealPlans?.map((mealPlan) => (
            <Link
              key={mealPlan.id}
              to="/meal-planners/$mealPlanId"
              params={{ mealPlanId: mealPlan.id }}
              className="flex items-center gap-4 border-b px-4 py-3 hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
            >
              <CalendarIcon
                className="size-6 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-medium break-words">
                  <span dir="auto">{mealPlan.title}</span>
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("pages.mealPlans.metadata.createdOn", {
                    date: formatDate(mealPlan.createdAt, { now: true }),
                  })}
                </p>
                {mealPlan.collaboratorUsers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {t("pages.mealPlans.metadata.collaborators")}{" "}
                    {mealPlan.collaboratorUsers.map((collaboratorUser, idx) => {
                      if (me?.id === collaboratorUser.user.id) return null;
                      const isLast =
                        idx === mealPlan.collaboratorUsers.length - 1;
                      return (
                        <span key={collaboratorUser.user.id} dir="auto">
                          {collaboratorUser.user.name}
                          {(!isLast || me?.id !== mealPlan.user.id) && ","}{" "}
                        </span>
                      );
                    })}
                    {me?.id !== mealPlan.user.id && (
                      <span dir="auto">{mealPlan.user.name}</span>
                    )}
                  </p>
                )}
                <p className="text-sm text-muted-foreground">
                  {me?.id !== mealPlan.user.id && (
                    <span>
                      {t("pages.mealPlans.metadata.createdBy", {
                        name: mealPlan.user.name,
                      })}
                    </span>
                  )}
                  {me?.id === mealPlan.user.id && (
                    <span>{t("pages.mealPlans.metadata.youOwn")}</span>
                  )}
                </p>
              </div>
            </Link>
          ))}
          {mealPlans === undefined && (
            <NullState icon={<Spinner />}>
              <p className="text-muted-foreground">
                {t("pages.mealPlans.loading")}
              </p>
            </NullState>
          )}
          {mealPlans?.length === 0 && (
            <NullState
              icon={<CalendarIcon className="text-muted-foreground" />}
            >
              <p className="text-muted-foreground">
                {t("pages.mealPlans.noPlans")}
                <br />
                {t("pages.mealPlans.toCreate")}
              </p>
            </NullState>
          )}
        </div>
      </PageContent>
      <Fab
        aria-label={t("pages.newMealPlanModal.title")}
        onClick={() => void newMealPlan()}
      >
        <PlusIcon />
      </Fab>
    </>
  );
};
