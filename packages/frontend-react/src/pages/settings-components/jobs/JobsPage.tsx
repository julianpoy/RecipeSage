import { useState } from "react";
import {
  BookIcon,
  CloudDownloadIcon,
  CloudUploadIcon,
  FileTextIcon,
  ListIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import { NullState } from "../../../components/NullState";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";
import { resolveStorageLocation } from "../../../utils/resolveStorageLocation";
import { JobFailedUrls } from "./JobFailedUrls";
import { JobRow } from "./JobRow";
import { useJobsPoll } from "./useJobsPoll";

const JOB_POLL_INTERVAL_MS = 60_000;

const isDownloadable = (job: JobSummary) =>
  job.status === "SUCCESS" &&
  (job.type === "EXPORT" || job.type === "COOKBOOK");

const getJobIcon = (job: JobSummary) => {
  switch (job.type) {
    case "COOKBOOK":
      return <BookIcon aria-hidden="true" />;
    case "IMPORT":
      return <CloudUploadIcon aria-hidden="true" />;
    default:
      return <FileTextIcon aria-hidden="true" />;
  }
};

const getJobTitleI18n = (job: JobSummary): TranslationKey => {
  switch (job.type) {
    case "COOKBOOK":
      return "pages.jobs.job.cookbook";
    case "IMPORT":
      return "pages.jobs.job.import";
    case "EXPORT": {
      switch (job.meta.exportType) {
        case "pdf":
          return "pages.jobs.job.export.pdf";
        case "txt":
          return "pages.jobs.job.export.txt";
        case "jsonld":
          return "pages.jobs.job.export.jsonld";
        default:
          return "pages.jobs.job.export";
      }
    }
    default:
      return "pages.jobs.job.export";
  }
};

const getJobFailureI18n = (job: JobSummary): TranslationKey => {
  switch (job.resultCode) {
    case JOB_RESULT_CODES.badFile:
      return "pages.import.jobs.status.fail.badFile";
    case JOB_RESULT_CODES.emptyFile:
      return "pages.import.jobs.status.fail.emptyFile";
    case JOB_RESULT_CODES.badCredentials:
      return "pages.import.jobs.status.fail.badCredentials";
    case JOB_RESULT_CODES.tooManyRecipes:
      return "pages.import.jobs.status.fail.tooManyRecipes";
    case JOB_RESULT_CODES.timeout:
      return "pages.jobs.status.fail.timeout";
    case JOB_RESULT_CODES.interrupted:
      return "pages.jobs.status.fail.interrupted";
    default:
      return "pages.import.jobs.status.fail.unknown";
  }
};

const getImportPartialCount = (job: JobSummary): number =>
  job.type === "IMPORT" ? job.meta.partialCount || 0 : 0;

const getImportFailedCount = (job: JobSummary): number =>
  job.type === "IMPORT" ? job.meta.failedCount || 0 : 0;

const getImportFailedUrls = (job: JobSummary): string[] =>
  job.type === "IMPORT" ? job.meta.failedUrls || [] : [];

const downloadJob = async (job: JobSummary) => {
  if (!isDownloadable(job)) return;

  const response = await serverActions.jobs.getJobDownloadUrlById({
    id: job.id,
  });
  if (!response) return;
  window.open(
    resolveStorageLocation(response.signedUrl),
    "_blank",
    'rel="noopener"',
  );
};

export const JobsPage = () => {
  const { t } = useTranslation();
  const [showJobs, setShowJobs] = useState(10);
  const { jobs } = useJobsPoll({
    intervalMs: JOB_POLL_INTERVAL_MS,
    listenWebsocket: true,
  });

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/settings" }} />}
        title={t("pages.jobs.title")}
      />
      <PageContent padded={false} className="py-4">
        <div className="mx-auto max-w-page">
          <p className="px-4 pb-2 text-sm text-muted-foreground">
            {t("pages.jobs.subtitle")}
          </p>

          {jobs.length ? (
            <>
              <div>
                {jobs.slice(0, showJobs).map((job) => {
                  const partialCount = getImportPartialCount(job);
                  const failedCount = getImportFailedCount(job);
                  const downloadable = isDownloadable(job);

                  return (
                    <JobRow
                      key={job.id}
                      icon={getJobIcon(job)}
                      title={t(getJobTitleI18n(job))}
                      onClick={
                        downloadable ? () => void downloadJob(job) : undefined
                      }
                      detailIcon={
                        downloadable ? (
                          <CloudDownloadIcon aria-hidden="true" />
                        ) : undefined
                      }
                      progress={
                        job.status === "RUN" ? job.progress || 0 : undefined
                      }
                      extra={
                        getImportFailedUrls(job).length ? (
                          <JobFailedUrls urls={getImportFailedUrls(job)} />
                        ) : undefined
                      }
                    >
                      <span>
                        {t("pages.import.jobs.job.created", {
                          timestamp: formatDate(job.createdAt, {
                            now: true,
                            times: true,
                          }),
                        })}
                      </span>
                      <br />
                      {job.status === "CREATE" && (
                        <span>{t("pages.import.status.create")}</span>
                      )}
                      {job.status === "RUN" && (
                        <span className="text-primary">
                          {t("pages.jobs.status.run")}
                        </span>
                      )}
                      {job.status === "FAIL" && (
                        <span className="text-destructive">
                          {t("pages.jobs.status.fail")}{" "}
                          {t(getJobFailureI18n(job))}
                        </span>
                      )}
                      {job.status === "SUCCESS" && (
                        <>
                          <span className="text-green-600 dark:text-green-400">
                            {t("pages.jobs.status.success")}
                          </span>
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
                        </>
                      )}
                    </JobRow>
                  );
                })}
              </div>
              {jobs.length > showJobs && (
                <Button
                  variant="ghost"
                  size="lg"
                  className="ms-2 mt-2 text-primary"
                  onClick={() => setShowJobs((prev) => prev + 10)}
                >
                  {t("generic.showMore")}
                </Button>
              )}
            </>
          ) : (
            <NullState icon={<ListIcon aria-hidden="true" />}>
              <p className="text-muted-foreground">{t("pages.jobs.empty")}</p>
            </NullState>
          )}
        </div>
      </PageContent>
    </>
  );
};
