import { AlertView, type AlertOptions, type AlertResult } from "./AlertView";
import { openDialog } from "./openDialog";

export const showAlert = async (
  options: AlertOptions,
): Promise<AlertResult> => {
  const result = await openDialog<AlertResult>((controls) => (
    <AlertView options={options} controls={controls} />
  ));

  return result || { role: "backdrop", values: {} };
};
