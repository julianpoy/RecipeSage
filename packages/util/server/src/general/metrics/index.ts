import client from "prom-client";

client.register.setDefaultLabels({
  environment: process.env.ENVIRONMENT || "development",
});

/**
 * All app-wide (server-side) metrics should live here.
 * All of these metrics are non-PII and only help monitor overall system health, especially when it comes to new releases.
 *
 * VERY IMPORTANT:
 * - The cardinality of all labels _must remain low_. Do not put IDs, or other highly-variable parameters within labels. Only values with known-quantities should be included in labels
 * - All names and labels must be snake_case
 */
export const metrics = {
  apiRequest: new client.Histogram({
    name: "api_request",
    help: "Every time a request hits the app",
    labelNames: ["method", "path", "status_code"],
    buckets: [0.05, 0.1, 0.3, 0.7, 2, 5, 15, 30], // Each of these is tracked in seconds
  }),

  userCreated: new client.Counter({
    name: "user_created",
    help: "New account created",
    labelNames: ["auth_type"],
  }),
  userLogin: new client.Counter({
    name: "user_login",
    help: "A login to an account",
    labelNames: ["auth_type"],
  }),

  websocketMessageIncoming: new client.Counter({
    name: "websocket_message_incoming",
    help: "A websocket message was received by the server from a client",
    labelNames: ["message_type"],
  }),
  websocketMessageOutgoing: new client.Counter({
    name: "websocket_message_outgoing",
    help: "A websocket message was sent from the server to a client",
    labelNames: ["message_type"],
  }),
  websocketBroadcastFailed: new client.Counter({
    name: "websocket_broadcast_failed",
    help: "A websocket broadcast could not be delivered to the GRIP proxy and was dropped. Occasional failures are expected, a sustained rise means the proxy is unreachable or misconfigured",
    labelNames: ["message_type"],
  }),

  jobStarted: new client.Counter({
    name: "job_started",
    help: "A job has been started",
    labelNames: ["job_type", "import_type"],
  }),
  jobFinished: new client.Histogram({
    name: "job_finished",
    help: "A job has finished successfully",
    labelNames: ["job_type", "import_type"],
  }),
  jobFailed: new client.Histogram({
    name: "job_failed",
    help: "A job has failed",
    labelNames: ["job_type", "import_type", "expected"],
  }),
  pepperplateAuthFailure: new client.Counter({
    name: "pepperplate_auth_failure",
    help: "A request to pepperplate has failed to authenticate",
    labelNames: ["field"],
  }),

  clipRequested: new client.Counter({
    name: "clip_requested",
    help: "A clip request",
    labelNames: [
      "form", // Either 'html' or 'url'
    ],
  }),
  clipCacheLookup: new client.Counter({
    name: "clip_cache_lookup",
    help: "A lookup against the clip cache during a url clip",
    labelNames: [
      "result", // One of: 'hit' | 'miss'
    ],
  }),
  clipStartedProcessing: new client.Counter({
    name: "clip_started_processing",
    help: "A clip started with a given processor. This can happen multiple times for a single clip",
    labelNames: [
      "method", // One of: 'jsonld' | 'microdata' | 'llm'
    ],
  }),
  clipSuccess: new client.Counter({
    name: "clip_success",
    help: "A clip request succeeded",
    labelNames: [
      "form", // Either 'html' or 'url'
      "method", // One of: 'jsonld' | 'microdata' | 'llm' | 'merged' | 'pdf' | 'image' | 'cached'
    ],
  }),
  clipError: new client.Counter({
    name: "clip_error",
    help: "A clip request failed",
    labelNames: [
      "form", // Either 'html' or 'url'
      "method", // One of: 'structured-parse' | 'jsonld' | 'microdata' | 'llm' | 'pdf' | 'image' | 'timeout' | 'fetch' | 'empty'
    ],
  }),
  clipUngrounded: new client.Counter({
    name: "clip_ungrounded",
    help: "An LLM clip result was rejected because it was not grounded in the page text. The clip may still succeed via another method, so this is not counted as a clip error",
    labelNames: [
      "form", // Either 'html' or 'url'
    ],
  }),
  clipPartialContent: new client.Counter({
    name: "clip_partial_content",
    help: "A clip collected results but the merge of them was still missing ingredients or instructions. These still count as a clip success, so a sustained rise means clip quality is degrading without clip_error moving",
    labelNames: [
      "form", // Either 'html' or 'url'
    ],
  }),

  convertImagesToRecipe: new client.Counter({
    name: "convert_images_to_recipe",
    help: "A image was converted to a recipe",
    labelNames: [],
  }),
  convertTextToRecipe: new client.Counter({
    name: "convert_text_to_recipe",
    help: "Text was converted to a recipe",
    labelNames: [],
  }),
  convertPDFToRecipe: new client.Counter({
    name: "convert_pdf_to_recipe",
    help: "PDF was converted to a recipe",
    labelNames: [],
  }),
  convertDocumentToRecipe: new client.Counter({
    name: "convert_document_to_recipe",
    help: "A document was converted to a recipe",
    labelNames: [],
  }),
  convertImageToText: new client.Counter({
    name: "convert_image_to_text",
    help: "Image was converted to text",
    labelNames: [],
  }),

  stripeWebhookSuccess: new client.Counter({
    name: "stripe_webhook_success",
    help: "A webhook was successfully handled",
    labelNames: ["eventType"],
  }),

  llmRetryAttempt: new client.Counter({
    name: "llm_retry_attempt",
    help: "An LLM call returned an unusable response and is being retried. A sustained rise means a model or prompt is producing malformed output",
    labelNames: ["category", "reason"],
  }),
  llmRetryExhausted: new client.Counter({
    name: "llm_retry_exhausted",
    help: "An LLM call was still returning an unusable response on the final attempt and the error was rethrown to the caller",
    labelNames: ["category", "reason"],
  }),

  llmTokensConsumed: new client.Histogram({
    name: "llm_tokens_consumed",
    help: "Every time a request hits the app",
    labelNames: ["category"],
    buckets: [50, 500, 1000, 10_000, 50_000, 200_000, 500_000, 1_000_000],
  }),

  rateLimitClientIpUnresolved: new client.Counter({
    name: "rate_limit_client_ip_unresolved",
    help: "Rate limiting is enabled but the client IP could not be resolved, so the request was allowed through unlimited. A sustained nonzero rate indicates a trust proxy or client IP header misconfiguration",
    labelNames: [],
  }),
};

// Collect default system metrics (such as memory/cpu usage)
client.collectDefaultMetrics();
