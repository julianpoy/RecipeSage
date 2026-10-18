import { useState, type ReactNode } from "react";
import type { LinkProps } from "@tanstack/react-router";
import * as Sentry from "@sentry/react";
import { ChevronRightIcon, CloudUploadIcon, InboxIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ImportJobSummary, JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { formatDate } from "../../../utils/formatDate";
import { JobFailedUrls } from "../jobs/JobFailedUrls";
import { JobRow } from "../jobs/JobRow";
import { useJobsPoll } from "../jobs/useJobsPoll";
import { ListLinkRow } from "../list-rows/ListLinkRow";

const JOB_POLL_INTERVAL_MS = 7500;

const getJobFailureI18n = (importJob: ImportJobSummary): TranslationKey => {
  switch (importJob.resultCode) {
    case JOB_RESULT_CODES.badFile: {
      return "pages.import.jobs.status.fail.badFile";
    }
    case JOB_RESULT_CODES.emptyFile: {
      return "pages.import.jobs.status.fail.emptyFile";
    }
    case JOB_RESULT_CODES.badCredentials: {
      return "pages.import.jobs.status.fail.badCredentials";
    }
    case JOB_RESULT_CODES.tooManyRecipes: {
      return "pages.import.jobs.status.fail.tooManyRecipes";
    }
    case JOB_RESULT_CODES.timeout: {
      return "pages.jobs.status.fail.timeout";
    }
    case JOB_RESULT_CODES.interrupted: {
      return "pages.jobs.status.fail.interrupted";
    }
    default: {
      return "pages.import.jobs.status.fail.unknown";
    }
  }
};

const getJobTitleI18n = (job: ImportJobSummary): TranslationKey => {
  const importType = job.meta.importType;
  if (!importType) return "pages.import.jobs.job";

  switch (importType) {
    case "fdxz":
    case "lcb": {
      return "pages.import.livingCookbook";
    }
    case "pepperplate": {
      return "pages.import.pepperplate";
    }
    case "paprika": {
      return "pages.import.paprika";
    }
    case "mela": {
      return "pages.import.mela";
    }
    case "crouton": {
      return "pages.import.crouton";
    }
    case "cookbookmanagercom": {
      return "pages.import.cookbookManagerCom";
    }
    case "flavorish": {
      return "pages.import.flavorish";
    }
    case "jsonld": {
      return "pages.import.jsonld";
    }
    case "recipekeeper": {
      return "pages.import.recipeKeeper";
    }
    case "copymethat": {
      return "pages.import.copymethat";
    }
    case "cookmate": {
      return "pages.import.cookmate";
    }
    case "textFiles": {
      return "pages.import.textFiles";
    }
    case "enex": {
      return "pages.import.enex";
    }
    case "urls": {
      return "pages.import.urls";
    }
    case "csv": {
      return "pages.import.csv";
    }
    case "pdfs": {
      return "pages.import.pdfs";
    }
    case "images": {
      return "pages.import.images";
    }
    default: {
      Sentry.captureMessage("Job ImportType not handled", {
        extra: {
          importType,
        },
      });
      return "pages.import.jobs.job";
    }
  }
};

const isImportJob = (job: JobSummary): job is ImportJobSummary =>
  job.type === "IMPORT";

const getImportJobLink = (job: ImportJobSummary): LinkProps | undefined => {
  const importLabels = job.meta.importLabels;
  if (!importLabels?.length || job.status !== "SUCCESS") return undefined;

  return {
    to: "/list/$folder",
    params: { folder: "main" },
    search: { labels: importLabels.join(",") },
  };
};

const ImporterRow = ({
  link,
  title,
  subtitle,
}: {
  link: LinkProps;
  title: string;
  subtitle?: ReactNode;
}) => (
  <ListLinkRow {...link} icon={<CloudUploadIcon aria-hidden="true" />} detail>
    <span className="block">{title}</span>
    {subtitle && (
      <span className="block text-sm text-muted-foreground">{subtitle}</span>
    )}
  </ListLinkRow>
);

export const ImportPage = () => {
  const { t } = useTranslation();
  const [showJobs, setShowJobs] = useState(5);
  const { jobs } = useJobsPoll({
    intervalMs: JOB_POLL_INTERVAL_MS,
    listenWebsocket: false,
  });

  const importJobs = jobs.filter(isImportJob);
  const runningJob = importJobs.find((job) => job.status === "RUN");

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/settings" }} />}
        title={t("pages.import.title")}
      />
      <PageContent padded={false}>
        <div className="mx-auto max-w-page pb-12">
          {!!importJobs.length && (
            <div>
              <div className="px-4 py-3">
                <p>{t("pages.import.jobs")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("pages.import.jobs.subtitle")}
                </p>
              </div>
              {importJobs.slice(0, showJobs).map((importJob) => {
                const link = getImportJobLink(importJob);
                const partialCount = importJob.meta.partialCount || 0;
                const failedCount = importJob.meta.failedCount || 0;
                const failedUrls = importJob.meta.failedUrls || [];

                return (
                  <JobRow
                    key={importJob.id}
                    icon={<InboxIcon aria-hidden="true" />}
                    title={t(getJobTitleI18n(importJob))}
                    link={link}
                    detailIcon={
                      link ? (
                        <ChevronRightIcon
                          aria-hidden="true"
                          className="size-4! self-center rtl:rotate-180"
                        />
                      ) : undefined
                    }
                    progress={
                      importJob.status === "RUN"
                        ? runningJob?.progress || 0
                        : undefined
                    }
                    extra={
                      failedUrls.length ? (
                        <JobFailedUrls urls={failedUrls} />
                      ) : undefined
                    }
                  >
                    <span>
                      {t("pages.import.jobs.job.created", {
                        timestamp: formatDate(importJob.createdAt, {
                          now: false,
                          times: true,
                        }),
                      })}
                    </span>
                    <br />
                    {importJob.status === "CREATE" && (
                      <span className="text-primary">
                        {t("pages.import.status.create")}
                      </span>
                    )}
                    {importJob.status === "RUN" && (
                      <span className="text-primary">
                        {t("pages.import.status.run")}
                      </span>
                    )}
                    {importJob.status === "FAIL" && (
                      <span className="text-destructive">
                        {t("pages.import.status.fail")}{" "}
                        {t(getJobFailureI18n(importJob))}
                      </span>
                    )}
                    {importJob.status === "SUCCESS" && (
                      <span className="text-green-600 dark:text-green-400">
                        {t("pages.import.status.success")}
                      </span>
                    )}
                    {!!partialCount && (
                      <>
                        <br />
                        <span className="text-amber-600 dark:text-amber-400">
                          {t("pages.jobs.status.import.partial", {
                            count: partialCount,
                          })}
                        </span>
                      </>
                    )}
                    {!!failedCount && (
                      <>
                        <br />
                        <span className="text-amber-600 dark:text-amber-400">
                          {t("pages.jobs.status.import.failed", {
                            count: failedCount,
                          })}
                        </span>
                      </>
                    )}
                  </JobRow>
                );
              })}
              {importJobs.length > showJobs && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="ms-2 mt-2 text-primary"
                  onClick={() => setShowJobs((prev) => prev + 5)}
                >
                  {t("generic.showMore")}
                </Button>
              )}
            </div>
          )}
          {!runningJob && (
            <div className="mt-4">
              <p className="px-4 pb-4 text-sm text-muted-foreground">
                {t("pages.import.description")}
                <br />
                <a
                  href="https://docs.recipesage.com/docs/tutorials/settings/import/"
                  target="_blank"
                  rel="noopener"
                  className="text-primary hover:underline"
                >
                  {t("pages.import.viewDocumentation")}
                </a>
              </p>
              <nav className="border-t">
                <ImporterRow
                  link={{ to: "/settings/import/json-ld" }}
                  title={t("pages.import.jsonld")}
                  subtitle={t("pages.import.jsonld.subtitle")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/textfiles" }}
                  title={t("pages.import.textFiles")}
                  subtitle={t("pages.import.textFiles.subtitle")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/urls" }}
                  title={t("pages.import.urls")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/pdfs" }}
                  title={t("pages.import.pdfs")}
                  subtitle={t("pages.import.pdfs.subtitle")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/images" }}
                  title={t("pages.import.images")}
                  subtitle={t("pages.import.images.subtitle")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/csv" }}
                  title={t("pages.import.csv")}
                  subtitle={t("pages.import.csv.subtitle")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/paprika" }}
                  title={t("pages.import.paprika")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/mela" }}
                  title={t("pages.import.mela")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/crouton" }}
                  title={t("pages.import.crouton")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/recipe-keeper" }}
                  title={t("pages.import.recipeKeeper")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/enex" }}
                  title={t("pages.import.enex")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/copymethat" }}
                  title={t("pages.import.copymethat")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/cookmate" }}
                  title={t("pages.import.cookmate")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/cookbookmanagercom" }}
                  title={t("pages.import.cookbookManagerCom")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/flavorish" }}
                  title={t("pages.import.flavorish")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/pepperplate" }}
                  title={t("pages.import.pepperplate")}
                />
                <ImporterRow
                  link={{ to: "/settings/import/livingcookbook" }}
                  title={t("pages.import.livingCookbook")}
                />
              </nav>
            </div>
          )}
        </div>
      </PageContent>
    </>
  );
};
