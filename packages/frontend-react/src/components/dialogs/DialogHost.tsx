import { Fragment } from "react";
import { dialogStore } from "./dialogStore";

export const DialogHost = () => {
  const entries = dialogStore((state) => state.entries);

  return entries.map((entry) => (
    <Fragment key={entry.id}>{entry.render(entry.open)}</Fragment>
  ));
};
