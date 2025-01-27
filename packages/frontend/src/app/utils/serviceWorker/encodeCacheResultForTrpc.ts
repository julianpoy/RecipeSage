import superjson from "superjson";

export const encodeCacheResultForTrpc = (result: unknown) => {
  return new Response(
    JSON.stringify({
      result: {
        data: superjson.serialize(result),
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
