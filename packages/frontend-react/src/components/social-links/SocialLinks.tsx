import { MessageSquareMoreIcon } from "lucide-react";

const GITHUB_PATH =
  "M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.56v-1.96c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.74.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.18-3.08-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.8 1.18 1.83 1.18 3.08 0 4.41-2.69 5.39-5.25 5.67.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z";

export const SocialLinks = () => (
  <div className="flex flex-col">
    <a
      href="https://discord.gg/yCfzBft"
      target="_blank"
      rel="noreferrer noopener"
      className="flex min-h-11 items-center gap-4 rounded-xl px-4 py-2 text-sm text-primary hover:bg-muted"
    >
      <MessageSquareMoreIcon
        className="size-5 text-muted-foreground"
        aria-hidden="true"
      />
      <span>Discord</span>
    </a>
    <a
      href="https://github.com/julianpoy/recipesage"
      target="_blank"
      rel="noreferrer noopener"
      className="flex min-h-11 items-center gap-4 rounded-xl px-4 py-2 text-sm text-primary hover:bg-muted"
    >
      <svg
        viewBox="0 0 24 24"
        className="size-5 fill-current text-muted-foreground"
        aria-hidden="true"
      >
        <path d={GITHUB_PATH} />
      </svg>
      <span>GitHub</span>
    </a>
  </div>
);
