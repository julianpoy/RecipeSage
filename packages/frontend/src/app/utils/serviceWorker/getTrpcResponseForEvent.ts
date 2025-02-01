import superjson from "superjson";

export const getTrpcResponseBodyForFetchResponse = async <T>(
  response: Response,
) => {
  const clone = response.clone();
  const responseJson = await clone.json();

  const output = superjson.parse<T>(responseJson);

  return output;
};
