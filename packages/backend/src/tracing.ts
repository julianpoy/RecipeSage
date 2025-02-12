import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { PrismaInstrumentation } from "@prisma/instrumentation";

const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_COLLECTOR_URI,
});
const sdk = new NodeSDK({
  traceExporter,
  instrumentations: [
    getNodeAutoInstrumentations(),
    new PrismaInstrumentation({
      middleware: true,
    }),
  ],
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: "recipesage_api",
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.VERSION,
  }),
});

sdk.start();

const termHandler = () => {
  sdk.shutdown();
};

process.on("SIGTERM", termHandler);
process.on("SIGINT", termHandler);
