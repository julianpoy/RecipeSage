export const encodeCacheResultForTrpc = (result: unknown) => {
  return new Response(
    JSON.stringify({
      result: {
        data: result,
      },
    }),
    {
      headers: {
        swcache: "true",
        "content-type": "application/json",
      },
    },
  );
};
