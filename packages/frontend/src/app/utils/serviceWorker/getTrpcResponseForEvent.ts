export const getTrpcResponseBodyForFetchResponse = async <T>(
  response: Response,
): Promise<T | undefined> => {
  if (response.status !== 200 && response.status !== 201) {
    return undefined;
  }

  try {
    const json = await response.clone().json();

    if (!json.result?.data) {
      return undefined;
    }

    const output = json.result.data;

    return output;
  } catch (e) {
    console.error(e);

    return undefined;
  }
};
