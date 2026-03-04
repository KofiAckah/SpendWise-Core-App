// ==============================================================
// telemetry.js – OpenTelemetry SDK initialisation
// Must be loaded BEFORE any other module (via --import flag)
//
// Traces are exported to Jaeger via OTLP HTTP (port 4318).
// The endpoint is controlled by the OTEL_EXPORTER_OTLP_ENDPOINT
// environment variable injected by ECS / docker-compose.
// ==============================================================

import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_DEPLOYMENT_ENVIRONMENT } from '@opentelemetry/semantic-conventions';

const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
  ? `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
  : 'http://localhost:4318/v1/traces';

const exporter = new OTLPTraceExporter({ url: otlpEndpoint });

const sdk = new NodeSDK({
  resource: new Resource({
    [SEMRESATTRS_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'spendwise-backend',
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
  }),
  traceExporter: exporter,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy fs instrumentation
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();
console.log(`✓ OpenTelemetry SDK started  →  ${otlpEndpoint}`);

process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('OpenTelemetry SDK shut down'))
    .catch((err) => console.error('Error shutting down SDK', err))
    .finally(() => process.exit(0));
});
