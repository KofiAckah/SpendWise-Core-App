// ==============================================================
// logger.js – Structured JSON logger (Winston)
//
// Every log line automatically includes:
//   trace_id / span_id  — injected from the active OTel span,
//                         enabling direct log↔trace correlation
//                         in Grafana (Loki/CloudWatch + Jaeger).
// ==============================================================

import winston from 'winston';
import { trace } from '@opentelemetry/api';

const { combine, timestamp, json } = winston.format;

// Custom format: attach OTel trace context when a span is active
const traceContextFormat = winston.format((info) => {
  const span = trace.getActiveSpan();
  if (span) {
    const ctx = span.spanContext();
    info.trace_id   = ctx.traceId;
    info.span_id    = ctx.spanId;
    info.trace_flags = `0${ctx.traceFlags.toString(16)}`;
  }
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    traceContextFormat(),
    timestamp({ format: 'YYYY-MM-DDTHH:mm:ss.SSSZ' }),
    json(),
  ),
  defaultMeta: {
    service: process.env.OTEL_SERVICE_NAME || 'spendwise-backend',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [new winston.transports.Console()],
});

export default logger;
