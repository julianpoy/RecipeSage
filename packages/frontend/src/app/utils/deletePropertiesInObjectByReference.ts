export const deletePropertiesInObjectByReference = (
  object: Record<string, unknown>,
) => {
  for (var variableKey in object) {
    if (object.hasOwnProperty(variableKey)) {
      delete object[variableKey];
    }
  }
};
