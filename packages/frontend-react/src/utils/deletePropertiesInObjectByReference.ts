export const deletePropertiesInObjectByReference = (
  object: Record<string, unknown>,
) => {
  for (const variableKey in object) {
    if (Object.hasOwn(object, variableKey)) {
      delete object[variableKey];
    }
  }
};
