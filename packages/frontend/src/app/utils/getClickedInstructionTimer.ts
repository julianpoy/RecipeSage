import type { ParsedInstruction, ParsedTimer } from "@recipesage/util/shared";

const INSTRUCTION_TIMER_SELECTOR = ".instructionTimer";

export const getClickedInstructionTimer = (
  event: Event,
  instruction: ParsedInstruction,
): ParsedTimer | undefined => {
  const { target, currentTarget } = event;
  if (!(target instanceof Element) || !(currentTarget instanceof Element)) {
    return;
  }

  const timerElement = target.closest(INSTRUCTION_TIMER_SELECTOR);
  if (!timerElement) return;

  const timerElements = [
    ...currentTarget.querySelectorAll(INSTRUCTION_TIMER_SELECTOR),
  ];
  const timerIdx = timerElements.indexOf(timerElement);
  if (timerIdx === -1) return;

  return instruction.timers[timerIdx];
};
