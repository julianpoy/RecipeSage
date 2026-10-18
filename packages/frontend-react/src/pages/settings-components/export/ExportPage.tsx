import { useState } from "react";
import * as Sentry from "@sentry/react";
import {
  ChevronRightIcon,
  CloudDownloadIcon,
  FileTextIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ExportJobSummary, JobSummary } from "@recipesage/prisma";
import { JOB_RESULT_CODES } from "@recipesage/util/shared";
import { Button } from "@/components/ui/button";
import { BackButton } from "../../../components/layout/BackButton";
import { PageContent } from "../../../components/layout/PageContent";
import { PageHeader } from "../../../components/layout/PageHeader";
import type { TranslationKey } from "../../../i18n/TranslationKey";
import { serverActions } from "../../../services/serverActions";
import { formatDate } from "../../../utils/formatDate";
import { resolveStorageLocation } from "../../../utils/resolveStorageLocation";
import { JobRow } from "../jobs/JobRow";
import { useJobsPoll } from "../jobs/useJobsPoll";
import { ListButtonRow } from "../list-rows/ListButtonRow";

export enum ExportFormat {
  PDF = "pdf",
  TXT = "txt",
  JSONLD = "jsonld",
}

const JOB_POLL_INTERVAL_MS = 60_000;

const getJobFailureI18n = (exportJob: ExportJobSummary): TranslationKey => {
  switch (exportJob.resultCode) {
    case JOB_RESULT_CODES.timeout: {
      return "pages.jobs.status.fail.timeout";
    }
    case JOB_RESULT_CODES.interrupted: {
      return "pages.jobs.status.fail.interrupted";
    }
    default: {
      return "pages.export.jobs.status.fail.unknown";
    }
  }
};

const getJobTitleI18n = (job: ExportJobSummary): TranslationKey => {
  const exportType = job.meta.exportType;
  if (!exportType) return "pages.export.jobs.job";

  switch (exportType) {
    case "pdf": {
      return "pages.export.jobs.job.pdf";
    }
    case "jsonld": {
      return "pages.export.jobs.job.jsonld";
    }
    case "txt": {
      return "pages.export.jobs.job.txt";
    }
    default: {
      Sentry.captureMessage("Job ExportType not handled", {
        extra: {
          exportType,
        },
      });
      return "pages.export.jobs.job";
    }
  }
};

const isExportJob = (job: JobSummary): job is ExportJobSummary =>
  job.type === "EXPORT";

const downloadJob = async (job: ExportJobSummary) => {
  if (job.status !== "SUCCESS") return;

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

export const ExportPage = () => {
  const { t } = useTranslation();
  const [showJobs, setShowJobs] = useState(5);
  const { jobs, setupJobStatusPoll } = useJobsPoll({
    intervalMs: JOB_POLL_INTERVAL_MS,
    listenWebsocket: true,
  });

  const exportJobs = jobs.filter(isExportJob);

  const startExport = async (format: ExportFormat) => {
    const response = await serverActions.jobs.startExportJob({
      format,
    });

    if (response) {
      setupJobStatusPoll();
    }
  };

  const detailIcon = (
    <ChevronRightIcon
      aria-hidden="true"
      className="size-4! text-muted-foreground rtl:rotate-180"
    />
  );

  return (
    <>
      <PageHeader
        start={<BackButton fallback={{ to: "/settings" }} />}
        title={t("pages.export.title")}
      />
      <PageContent padded={false} className="py-4">
        <div className="mx-auto max-w-page">
          {!!exportJobs.length && (
            <div>
              <div className="px-4 py-2">
                <p>{t("pages.export.jobs")}</p>
                <p className="text-sm text-muted-foreground">
                  {t("pages.export.jobs.subtitle")}
                </p>
              </div>
              {exportJobs.slice(0, showJobs).map((exportJob) => (
                <JobRow
                  key={exportJob.id}
                  icon={<FileTextIcon aria-hidden="true" />}
                  title={t(getJobTitleI18n(exportJob))}
                  onClick={
                    exportJob.status === "SUCCESS"
                      ? () => void downloadJob(exportJob)
                      : undefined
                  }
                  detailIcon={
                    exportJob.status === "SUCCESS" ? (
                      <CloudDownloadIcon aria-hidden="true" />
                    ) : undefined
                  }
                  progress={
                    exportJob.status === "RUN"
                      ? exportJob.progress || 0
                      : undefined
                  }
                >
                  <span>
                    {t("pages.export.jobs.job.created", {
                      timestamp: formatDate(exportJob.createdAt, {
                        now: true,
                        times: true,
                      }),
                    })}
                  </span>
                  <br />
                  {exportJob.status === "CREATE" && (
                    <span className="text-primary">
                      {t("pages.export.status.create")}
                    </span>
                  )}
                  {exportJob.status === "RUN" && (
                    <span className="text-primary">
                      {t("pages.export.status.run")}
                    </span>
                  )}
                  {exportJob.status === "FAIL" && (
                    <span className="text-destructive">
                      {t("pages.export.status.fail")}{" "}
                      {t(getJobFailureI18n(exportJob))}
                    </span>
                  )}
                  {exportJob.status === "SUCCESS" && (
                    <span className="text-green-600 dark:text-green-400">
                      {t("pages.export.status.success")}
                    </span>
                  )}
                </JobRow>
              ))}
              {exportJobs.length > showJobs && (
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
          <div>
            <div className="flex flex-col gap-4 px-4 py-6 text-sm text-muted-foreground">
              <p>{t("pages.export.description1")}</p>
              <p>
                {t("pages.export.description2")}
                <br />
                {t("pages.export.description3")}
              </p>
            </div>
            <div className="border-t">
              <ListButtonRow
                icon={<CloudDownloadIcon aria-hidden="true" />}
                end={detailIcon}
                onClick={() => void startExport(ExportFormat.JSONLD)}
              >
                {t("pages.export.jsonld")}
              </ListButtonRow>
              <ListButtonRow
                icon={<CloudDownloadIcon aria-hidden="true" />}
                end={detailIcon}
                onClick={() => void startExport(ExportFormat.TXT)}
              >
                {t("pages.export.txt")}
              </ListButtonRow>
              <ListButtonRow
                icon={<CloudDownloadIcon aria-hidden="true" />}
                end={detailIcon}
                onClick={() => void startExport(ExportFormat.PDF)}
              >
                {t("pages.export.pdf")}
              </ListButtonRow>
            </div>
          </div>
        </div>
      </PageContent>
    </>
  );
};
