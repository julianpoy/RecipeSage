import type { JSONSchema7 } from "ai";

type JSONSchema7TypeName = Extract<NonNullable<JSONSchema7["type"]>, string>;

const isSchemaObject = (
  value: JSONSchema7 | boolean | undefined,
): value is JSONSchema7 => typeof value === "object" && value !== null;

const asTypeList = (
  value: JSONSchema7 | boolean,
): JSONSchema7TypeName[] | undefined => {
  if (!isSchemaObject(value)) return undefined;
  if (Object.keys(value).length !== 1) return undefined;
  if (value.type !== undefined) {
    return Array.isArray(value.type) ? value.type : [value.type];
  }
  if (Array.isArray(value.anyOf)) {
    const lists = value.anyOf.map(asTypeList);
    if (
      lists.every((list): list is JSONSchema7TypeName[] => list !== undefined)
    ) {
      return lists.flat();
    }
  }
  return undefined;
};

export const nullableUnionsToTypeArrays = (
  schema: JSONSchema7,
): JSONSchema7 => {
  if (Array.isArray(schema.anyOf)) {
    const memberTypeLists = schema.anyOf.map(asTypeList);
    if (
      memberTypeLists.every(
        (list): list is JSONSchema7TypeName[] => list !== undefined,
      )
    ) {
      const types = memberTypeLists.flat();
      if (types.includes("null")) {
        const rest = { ...schema };
        delete rest.anyOf;
        return nullableUnionsToTypeArrays({
          ...rest,
          type: [...new Set(types)],
        });
      }
    }

    const nonNull = schema.anyOf.filter(
      (member) => !(isSchemaObject(member) && member.type === "null"),
    );
    const hasNull = schema.anyOf.some(
      (member) => isSchemaObject(member) && member.type === "null",
    );
    const single = nonNull[0];
    if (
      hasNull &&
      nonNull.length === 1 &&
      isSchemaObject(single) &&
      typeof single.type === "string"
    ) {
      const rest = { ...schema };
      delete rest.anyOf;
      return nullableUnionsToTypeArrays({
        ...single,
        ...rest,
        type: [single.type, "null"],
      });
    }
  }

  const result: JSONSchema7 = { ...schema };

  if (schema.properties) {
    result.properties = Object.fromEntries(
      Object.entries(schema.properties).map(
        ([key, value]): [string, JSONSchema7 | boolean] => [
          key,
          isSchemaObject(value) ? nullableUnionsToTypeArrays(value) : value,
        ],
      ),
    );
  }

  if (Array.isArray(schema.items)) {
    result.items = schema.items.map((item) =>
      isSchemaObject(item) ? nullableUnionsToTypeArrays(item) : item,
    );
  } else if (isSchemaObject(schema.items)) {
    result.items = nullableUnionsToTypeArrays(schema.items);
  }

  if (Array.isArray(schema.anyOf)) {
    result.anyOf = schema.anyOf.map((member) =>
      isSchemaObject(member) ? nullableUnionsToTypeArrays(member) : member,
    );
  }

  return result;
};
