import { useId, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowLeftRightIcon,
  CalendarIcon,
  CodeXmlIcon,
  FileTextIcon,
  HeartPulseIcon,
  ImageIcon,
  LinkIcon,
  NetworkIcon,
  PrinterIcon,
  ScalingIcon,
  SendIcon,
  StarIcon,
  XIcon,
} from "lucide-react";
import type { RecipeSummary, UserPublic } from "@recipesage/prisma";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopyWithWebshare } from "../../components/copy-with-webshare/CopyWithWebshare";
import { ModalDialog } from "../../components/dialogs/ModalDialog";
import type { DialogControls } from "../../components/dialogs/openDialog";
import { PageContent } from "../../components/layout/PageContent";
import { PageFooter } from "../../components/layout/PageFooter";
import { PageHeader } from "../../components/layout/PageHeader";
import { RecipePreview } from "../../components/recipe-preview/RecipePreview";
import { SelectUserKnownUser } from "../../components/select-user-knownuser/SelectUserKnownUser";
import { loadingService } from "../../services/loadingService";
import { serverActions } from "../../services/serverActions";
import { printUrls, type RecipeTemplateModifiers } from "../../utils/printUrls";
import { resolveStorageLocation } from "../../utils/resolveStorageLocation";
import { getShareLinkOrigin, serverConfig } from "../../utils/serverConfig";

type ShareMethod = "account" | "link" | "embed";

const SHARE_METHODS: ShareMethod[] = ["account", "link", "embed"];

const isShareMethod = (value: unknown): value is ShareMethod =>
  SHARE_METHODS.some((method) => method === value);

type EmbedToggleKey =
  | "titleImage"
  | "verticalInstrIng"
  | "showPrintButton"
  | "hideSource"
  | "hideNotes"
  | "hideRating"
  | "hideNutrition"
  | "hideLinkedRecipes"
  | "showLastMade";

export type ShareModalRecipe = Pick<
  RecipeSummary,
  "id" | "title" | "recipeImages"
>;

const SettingRow = ({
  icon,
  label,
  checked,
  onCheckedChange,
}: {
  icon: ReactNode;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) => {
  const id = useId();

  return (
    <label
      htmlFor={id}
      className="flex min-h-12 cursor-pointer items-center gap-4 border-b px-4 py-2"
    >
      <span
        aria-hidden="true"
        className="flex shrink-0 text-muted-foreground [&_svg]:size-5"
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1 text-base break-words">{label}</span>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </label>
  );
};

const NumberRow = ({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  const id = useId();

  return (
    <div className="flex min-h-12 items-center gap-4 border-b px-4 py-2">
      <ScalingIcon
        aria-hidden="true"
        className="size-5 shrink-0 text-muted-foreground"
      />
      <label htmlFor={id} className="min-w-0 flex-1 text-base break-words">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        className="h-9 w-28"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
      />
    </div>
  );
};

export const ShareModal = ({
  controls,
  recipe,
}: {
  controls: DialogControls<void>;
  recipe: ShareModalRecipe;
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [recipientId, setRecipientId] = useState<string>();
  const [shareMethod, setShareMethod] = useState<ShareMethod>("account");
  const [enableJSONLD, setEnableJSONLD] = useState(true);
  const [embedHeight, setEmbedHeight] = useState("800");
  const [embedWidth, setEmbedWidth] = useState("600");
  const [embedConfig, setEmbedConfig] = useState<RecipeTemplateModifiers>({
    verticalInstrIng: false,
    titleImage: true,
    hideNotes: false,
    hideSource: false,
    hideSourceURL: false,
    hideRating: false,
    hideNutrition: false,
    hideLinkedRecipes: false,
    showLastMade: false,
    showPrintButton: true,
  });

  const recipeURL = `${getShareLinkOrigin()}/api/share/recipe/${recipe.id}`;
  const recipeEmbedURL = printUrls.recipeTemplate(recipe.id, embedConfig);
  const recipePreviewURL = recipeEmbedURL;

  const jsonLDCode = `<script>
      fetch('${serverConfig.apiBase}recipes/${recipe.id}/json-ld')
      .then(response => response.text())
      .then(structuredDataText => {
        const script = document.createElement('script');
        script.setAttribute('type', 'application/ld+json');
        script.textContent = structuredDataText;
        document.head.appendChild(script);
      });
    </script>`;

  const iframeCode = `<iframe
      style="box-shadow: 1px 1px 14px rgb(100,100,100); border: none; height: ${embedHeight}px; width: ${embedWidth}px;"
      src="${recipeEmbedURL}"
      scrolling="auto"
      frameborder="0"></iframe>`;

  let recipeEmbedCode = "";
  if (enableJSONLD) recipeEmbedCode += `${jsonLDCode}\n`;
  recipeEmbedCode += iframeCode;

  const setEmbedToggle = (key: EmbedToggleKey, checked: boolean) => {
    setEmbedConfig((prev) =>
      key === "hideSource"
        ? { ...prev, hideSource: checked, hideSourceURL: checked }
        : { ...prev, [key]: checked },
    );
  };

  const selectUser = (user: UserPublic | undefined) => {
    setRecipientId(user?.id);
  };

  const send = async () => {
    if (!recipientId) return;

    const loading = loadingService.start();

    const response = await serverActions.messages.createMessage({
      to: recipientId,
      body: "",
      recipeId: recipe.id,
    });
    loading.dismiss();
    if (!response) return;

    controls.close();
    void navigate({
      to: "/messages/$otherUserId",
      params: { otherUserId: recipientId },
    });
  };

  const embedToggles: {
    key: EmbedToggleKey;
    icon: ReactNode;
    label: string;
  }[] = [
    {
      key: "titleImage",
      icon: <ImageIcon />,
      label: t("pages.share.byEmbed.image"),
    },
    {
      key: "verticalInstrIng",
      icon: <ArrowLeftRightIcon />,
      label: t("pages.share.byEmbed.columns"),
    },
    {
      key: "showPrintButton",
      icon: <PrinterIcon />,
      label: t("pages.share.byEmbed.print"),
    },
    {
      key: "hideSource",
      icon: <LinkIcon />,
      label: t("pages.share.byEmbed.sources"),
    },
    {
      key: "hideNotes",
      icon: <FileTextIcon />,
      label: t("pages.share.byEmbed.notes"),
    },
    {
      key: "hideRating",
      icon: <StarIcon />,
      label: t("pages.share.byEmbed.rating"),
    },
    {
      key: "hideNutrition",
      icon: <HeartPulseIcon />,
      label: t("pages.share.byEmbed.nutrition"),
    },
    {
      key: "hideLinkedRecipes",
      icon: <NetworkIcon />,
      label: t("pages.share.byEmbed.linkedRecipes"),
    },
    {
      key: "showLastMade",
      icon: <CalendarIcon />,
      label: t("pages.share.byEmbed.lastMadeAt"),
    },
  ];

  const recipeImageLocation = recipe.recipeImages?.at(0)?.image.location;

  return (
    <ModalDialog controls={controls}>
      <PageHeader
        start={<></>}
        title={t("pages.share.title")}
        end={
          <Button
            variant="ghost"
            size="icon-lg"
            className="text-inherit hover:bg-white/10 hover:text-inherit"
            aria-label={t("generic.close")}
            onClick={() => controls.close()}
          >
            <XIcon className="size-6" />
          </Button>
        }
      />
      <PageContent padded={false}>
        <div className="flex items-center gap-4 px-4 py-3">
          {recipeImageLocation && (
            <img
              src={resolveStorageLocation(recipeImageLocation)}
              alt=""
              className="size-10 shrink-0 rounded-full object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <h2 dir="auto" className="text-base font-medium break-words">
              {recipe.title}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t("pages.share.description")}
            </p>
          </div>
        </div>

        <div className="mx-4">
          <Tabs
            value={shareMethod}
            onValueChange={(value) => {
              if (isShareMethod(value)) setShareMethod(value);
            }}
          >
            <TabsList className="h-10 w-full">
              <TabsTrigger value="account">
                {t("pages.share.byAccount")}
              </TabsTrigger>
              <TabsTrigger value="link">{t("pages.share.byLink")}</TabsTrigger>
              <TabsTrigger value="embed">
                {t("pages.share.byEmbed")}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {shareMethod === "link" && (
          <CopyWithWebshare
            webshareTitle={recipe.title}
            webshareText={`${recipe.title}:`}
            webshareURL={recipeURL}
            copyText={recipeURL}
          />
        )}

        {shareMethod === "embed" && (
          <div className="pt-4">
            <div className="flex flex-col min-[501px]:flex-row min-[501px]:items-start">
              <div className="flex justify-center">
                <RecipePreview
                  url={recipePreviewURL}
                  description={t("pages.share.embedPreview")}
                />
              </div>
              <div className="min-w-0 flex-1">
                {embedToggles.map((toggle) => (
                  <SettingRow
                    key={toggle.key}
                    icon={toggle.icon}
                    label={toggle.label}
                    checked={!!embedConfig[toggle.key]}
                    onCheckedChange={(checked) =>
                      setEmbedToggle(toggle.key, checked)
                    }
                  />
                ))}
              </div>
            </div>
            <NumberRow
              label={t("pages.share.byEmbed.height")}
              value={embedHeight}
              onValueChange={setEmbedHeight}
            />
            <NumberRow
              label={t("pages.share.byEmbed.width")}
              value={embedWidth}
              onValueChange={setEmbedWidth}
            />
            <SettingRow
              icon={<CodeXmlIcon />}
              label={t("pages.share.byEmbed.jsonLD")}
              checked={enableJSONLD}
              onCheckedChange={setEnableJSONLD}
            />
            <p className="px-4 pt-4 text-base">
              {t("pages.share.byEmbed.copy")}
            </p>
            <CopyWithWebshare disableWebshare copyText={recipeEmbedCode} />
          </div>
        )}

        {shareMethod === "account" && (
          <div className="p-4">
            <p className="px-4 pb-2 text-sm text-muted-foreground">
              {t("pages.share.byAccount.description")}
            </p>
            <SelectUserKnownUser onSelectedUserChange={selectUser} />
          </div>
        )}
      </PageContent>
      <PageFooter className="p-4">
        {shareMethod === "account" ? (
          <Button
            size="lg"
            className="w-full"
            disabled={!recipientId}
            onClick={() => void send()}
          >
            <SendIcon data-icon="inline-start" />
            {t("pages.share.send")}
          </Button>
        ) : (
          <Button size="lg" className="w-full" onClick={() => controls.close()}>
            <XIcon data-icon="inline-start" />
            {t("pages.share.close")}
          </Button>
        )}
      </PageFooter>
    </ModalDialog>
  );
};
