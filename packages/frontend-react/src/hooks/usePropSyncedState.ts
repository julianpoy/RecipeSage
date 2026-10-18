import { useState, type Dispatch, type SetStateAction } from "react";

export const usePropSyncedState = <T>(
  prop: T,
): [T, Dispatch<SetStateAction<T>>] => {
  const [state, setState] = useState(prop);
  const [prevProp, setPrevProp] = useState(prop);

  if (!Object.is(prop, prevProp)) {
    setPrevProp(prop);
    setState(prop);
  }

  return [state, setState];
};
