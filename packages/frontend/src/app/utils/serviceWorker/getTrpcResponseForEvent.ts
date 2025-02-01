import superjson from "superjson";

export const getTrpcResponseBodyForFetchResponse = async <T>(
  response: Response,
) => {
  const text = await response.clone().text();

  const output = superjson.parse<T>(text);

  return output;
};
