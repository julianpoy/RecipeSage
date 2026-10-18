import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  FolderOpenIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  TagIcon,
  TagsIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import type { LabelGroupSummary, LabelSummary } from "@recipesage/prisma";
import { ManageLabelsPreferenceKey } from "@recipesage/util/shared";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import { showAlert } from "../../../components/dialogs/showAlert";
import { Fab } from "../../../components/layout/Fab";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { NullState } from "../../../components/NullState";
import { useActionQuery } from "../../../hooks/useActionQuery";
import { loadingService } from "../../../services/loadingService";
import { serverActions } from "../../../services/serverActions";
import { preferencesStore } from "../../../stores/preferencesStore";
import { formatDate } from "../../../utils/formatDate";
import { LabelsPopover } from "../labels-popover/LabelsPopover";
import { openManageLabelGroupModal } from "../manage-label-group-modal/openManageLabelGroupModal";
import { openManageLabelModal } from "../manage-label-modal/openManageLabelModal";
import { openNewLabelItemModal } from "../new-label-item-modal/openNewLabelItemModal";

const SEARCH_DEBOUNCE_MS = 100;

const headerButtonClassName =
  "text-inherit hover:bg-white/10 hover:text-inherit";

const rowButtonClassName =
  "flex min-w-0 flex-1 cursor-pointer items-center gap-6 py-2 ps-4 text-start outline-none";

const sortByTitle = <T extends { title: string }>(items: T[]) =>
  [...items].sort((a, b) => a.title.localeCompare(b.title));

export const LabelsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const showCreatedAt = preferencesStore(
    (state) => state.preferences[ManageLabelsPreferenceKey.ShowCreatedAt],
  );

  const labelsQuery = useActionQuery(["labels.getLabels"], () =>
    serverActions.labels.getLabels(),
  );
  const labelGroupsQuery = useActionQuery(["labelGroups.getLabelGroups"], () =>
    serverActions.labelGroups.getLabelGroups(),
  );

  const isFetching = labelsQuery.isFetching || labelGroupsQuery.isFetching;
  const loading = labelsQuery.isPending || labelGroupsQuery.isPending;

  useEffect(() => {
    if (!isFetching) return;
    const loadingRef = loadingService.start();
    return () => {
      loadingRef.dismiss();
    };
  }, [isFetching]);

  const labelsData = labelsQuery.data;
  const labelGroupsData = labelGroupsQuery.data;
  const labels = useMemo(
    () => (labelsData && labelGroupsData ? sortByTitle(labelsData) : []),
    [labelsData, labelGroupsData],
  );
  const labelGroups = useMemo(
    () => (labelsData && labelGroupsData ? sortByTitle(labelGroupsData) : []),
    [labelsData, labelGroupsData],
  );

  const [searchInput, setSearchInput] = useState("");
  const [searchText, setSearchText] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(
    () => () => {
      clearTimeout(searchDebounceRef.current);
    },
    [],
  );

  const onSearchInput = (value: string) => {
    setSearchInput(value);
    clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchText(value);
    }, SEARCH_DEBOUNCE_MS);
  };

  const term = searchText.trim().toLowerCase();
  const filteredLabels = term
    ? labels.filter((label) => label.title.toLowerCase().includes(term))
    : labels;
  const filteredLabelGroups = term
    ? labelGroups.filter((labelGroup) =>
        labelGroup.title.toLowerCase().includes(term),
      )
    : labelGroups;

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedLabelIdsState, setSelectedLabelIds] = useState<string[]>([]);
  const selectedLabelIds = selectedLabelIdsState.filter((labelId) =>
    labels.some((label) => label.id === labelId),
  );

  const load = async () => {
    await Promise.all([labelsQuery.refetch(), labelGroupsQuery.refetch()]);
  };

  const clearSelectedLabels = () => {
    setSelectionMode(false);
    setSelectedLabelIds([]);
  };

  const onSelectionModeChange = (nextSelectionMode: boolean) => {
    setSelectionMode(nextSelectionMode);
    if (!nextSelectionMode) {
      clearSelectedLabels();
    }
  };

  const newItem = async () => {
    await openNewLabelItemModal();
    void load();
  };

  const manageLabelGroup = async (labelGroup: LabelGroupSummary) => {
    await openManageLabelGroupModal({ labelGroup });
    void load();
  };

  const manageLabel = async (label: LabelSummary) => {
    await openManageLabelModal({ label });
    void load();
  };

  const selectLabel = (label: LabelSummary) => {
    setSelectedLabelIds((prev) =>
      prev.includes(label.id)
        ? prev.filter((labelId) => labelId !== label.id)
        : [...prev, label.id],
    );
  };

  const deleteSelectedLabels = async () => {
    const labelTitles = selectedLabelIds
      .map((labelId) => labels.find((label) => label.id === labelId)?.title)
      .filter((labelTitle) => !!labelTitle)
      .join(", ");

    await showAlert({
      header: t("pages.labels.modal.delete.header"),
      message: t("pages.labels.modal.delete.message", { labelTitles }),
      buttons: [
        {
          text: t("generic.cancel"),
          role: "cancel",
          handler: () => {},
        },
        {
          text: t("generic.delete"),
          variant: "destructive",
          handler: async () => {
            const loadingRef = loadingService.start();
            const response = await serverActions.labels.deleteLabels({
              ids: selectedLabelIds,
              includeAttachedRecipes: false,
            });
            if (!response) {
              loadingRef.dismiss();
              return;
            }

            clearSelectedLabels();

            await load();

            loadingRef.dismiss();
          },
        },
      ],
    });
  };

  const browseLabelRecipes = (label: LabelSummary) => {
    void navigate({
      to: "/list/$folder",
      params: { folder: "main" },
      search: { labels: label.title },
      state: { showBack: true },
    });
  };

  return (
    <>
      <PageHeader
        start={
          selectionMode ? (
            <Button
              variant="ghost"
              size="icon-lg"
              className={headerButtonClassName}
              aria-label={t("pages.labelsPopover.options.unselectLabels")}
              onClick={clearSelectedLabels}
            >
              <XIcon className="size-6" />
            </Button>
          ) : undefined
        }
        title={
          selectionMode
            ? t("pages.labels.selectionModeTitle", {
                count: selectedLabelIds.length,
              })
            : t("pages.labels.title")
        }
        end={
          <>
            {selectionMode && selectedLabelIds.length > 0 && (
              <Button
                variant="ghost"
                size="icon-lg"
                className={headerButtonClassName}
                aria-label={t("generic.delete")}
                onClick={() => void deleteSelectedLabels()}
              >
                <Trash2Icon className="size-6" />
              </Button>
            )}
            <LabelsPopover
              selectionMode={selectionMode}
              onSelectionModeChange={onSelectionModeChange}
            />
          </>
        }
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-24">
          {loading && (
            <NullState icon={<Spinner />}>
              <p>{t("pages.labels.loading")}</p>
            </NullState>
          )}

          {!loading && (
            <div className="p-3">
              <InputGroup className="h-10">
                <InputGroupAddon>
                  <SearchIcon />
                </InputGroupAddon>
                <InputGroupInput
                  type="search"
                  dir="auto"
                  autoComplete="off"
                  placeholder={t("pages.labels.searchPlaceholder")}
                  value={searchInput}
                  onChange={(event) => onSearchInput(event.target.value)}
                />
              </InputGroup>
            </div>
          )}

          {!loading &&
            !!searchText &&
            !filteredLabels.length &&
            !filteredLabelGroups.length && (
              <NullState icon={<TagIcon />}>
                <p>{t("pages.labels.noResults")}</p>
              </NullState>
            )}

          {!loading && (!searchText || filteredLabels.length > 0) && (
            <section className="pb-4">
              <div className="border-b px-4 py-3">
                <h2 className="text-2xl font-medium">
                  {t("pages.labels.label.sectionTitle", {
                    count: labels.length,
                  })}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("pages.labels.label.sectionDescription", {
                    count: labels.length,
                  })}
                </p>
              </div>
              {!labels.length && (
                <NullState icon={<TagIcon />}>
                  <p>
                    {t("pages.labels.label.nullState.1")}
                    <br />
                    {t("pages.labels.label.nullState.2")}
                  </p>
                </NullState>
              )}
              {filteredLabels.map((label) => (
                <div
                  key={label.id}
                  className="ms-4 flex items-center gap-1 border-b pe-2 hover:bg-muted"
                >
                  <button
                    type="button"
                    className={rowButtonClassName}
                    onClick={() =>
                      selectionMode
                        ? selectLabel(label)
                        : void manageLabel(label)
                    }
                  >
                    <TagIcon className="size-6 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block truncate text-base">
                        {label.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {t("pages.labels.label.recipeCount", {
                          count: label._count.recipeLabels,
                        })}{" "}
                        {label.labelGroup ? (
                          <span>
                            {t("pages.labels.label.group", {
                              title: label.labelGroup.title,
                            })}
                          </span>
                        ) : (
                          <span>{t("pages.labels.label.noGroup")}</span>
                        )}{" "}
                        {showCreatedAt && (
                          <span>
                            {t("pages.labels.label.createdAt", {
                              dateString: formatDate(label.createdAt),
                            })}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <Button
                    size="icon-lg"
                    aria-label={t("pages.manageLabelModal.title", {
                      name: label.title,
                    })}
                    onClick={() => void manageLabel(label)}
                  >
                    <PencilIcon />
                  </Button>
                  <Button
                    size="icon-lg"
                    aria-label={t("pages.manageLabelModal.view")}
                    onClick={() => browseLabelRecipes(label)}
                  >
                    <FolderOpenIcon />
                  </Button>
                  {selectedLabelIds.includes(label.id) && (
                    <Badge>{t("pages.labels.label.selected")}</Badge>
                  )}
                </div>
              ))}
            </section>
          )}

          {!loading && (!searchText || filteredLabelGroups.length > 0) && (
            <section className="pb-4">
              <div className="border-b px-4 py-3">
                <h2 className="text-2xl font-medium">
                  {t("pages.labels.group.sectionTitle")}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {t("pages.labels.group.sectionDescription", {
                    count: labelGroups.length,
                  })}
                </p>
              </div>
              {!labelGroups.length && (
                <NullState icon={<TagsIcon />}>
                  <p>
                    {t("pages.labels.group.nullState.1")}
                    <br />
                    {t("pages.labels.group.nullState.2")}
                  </p>
                </NullState>
              )}
              {filteredLabelGroups.map((labelGroup) => (
                <div
                  key={labelGroup.id}
                  className="ms-4 flex items-center gap-1 border-b pe-2 hover:bg-muted"
                >
                  <button
                    type="button"
                    className={rowButtonClassName}
                    onClick={() => void manageLabelGroup(labelGroup)}
                  >
                    <TagsIcon className="size-6 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1">
                      <span dir="auto" className="block truncate text-base">
                        {labelGroup.title}
                      </span>
                      <span className="block text-sm text-muted-foreground">
                        {t("pages.labels.group.labelCount", {
                          count: labelGroup.labels.length,
                        })}{" "}
                        {showCreatedAt && (
                          <span>
                            {t("pages.labels.group.createdAt", {
                              dateString: formatDate(labelGroup.createdAt),
                            })}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                  <Button
                    size="icon-lg"
                    aria-label={t("pages.manageLabelGroupModal.title")}
                    onClick={() => void manageLabelGroup(labelGroup)}
                  >
                    <PencilIcon />
                  </Button>
                </div>
              ))}
            </section>
          )}
        </div>
      </PageContent>
      <Fab
        aria-label={t("pages.newLabelItemModal.title")}
        onClick={() => void newItem()}
      >
        <PlusIcon />
      </Fab>
    </>
  );
};
