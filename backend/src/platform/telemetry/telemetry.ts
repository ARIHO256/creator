type TelemetrySdk = {
  start?: () => Promise<void> | void;
  shutdown?: () => Promise<void> | void;
};

let telemetrySdk: TelemetrySdk | null = null;

export async function bootstrapTelemetry(options: {
  enabled: boolean;
  serviceName: string;
  serviceVersion: string;
  exporterUrl: string;
  deploymentEnvironment: string;
  region: string;
}) {
  if (!options.enabled || !options.exporterUrl) {
    return;
  }

  try {
    const sdkModuleName = '@opentelemetry/sdk-node';
    const resourceModuleName = '@opentelemetry/resources';
    const semanticModuleName = '@opentelemetry/semantic-conventions';
    const autoModuleName = '@opentelemetry/auto-instrumentations-node';
    const exporterModuleName = '@opentelemetry/exporter-trace-otlp-http';

    const [{ NodeSDK }, { resourceFromAttributes }, semantic, { getNodeAutoInstrumentations }, { OTLPTraceExporter }] =
      await Promise.all([
        import(sdkModuleName),
        import(resourceModuleName),
        import(semanticModuleName),
        import(autoModuleName),
        import(exporterModuleName)
      ]);

    const attributes = {
      [semantic.SEMRESATTRS_SERVICE_NAME]: options.serviceName,
      [semantic.SEMRESATTRS_SERVICE_VERSION]: options.serviceVersion,
      [semantic.SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: options.deploymentEnvironment,
      [semantic.SEMRESATTRS_CLOUD_REGION]: options.region
    } as Record<string, string>;

    telemetrySdk = new NodeSDK({
      resource: resourceFromAttributes(attributes),
      traceExporter: new OTLPTraceExporter({
        url: options.exporterUrl
      }),
      instrumentations: [getNodeAutoInstrumentations()]
    });

    await telemetrySdk.start?.();
    console.info('[telemetry] OpenTelemetry bootstrap enabled');
  } catch (error: any) {
    console.warn(`[telemetry] bootstrap skipped: ${error?.message ?? error}`);
    telemetrySdk = null;
  }
}

export async function shutdownTelemetry() {
  if (!telemetrySdk?.shutdown) {
    return;
  }
  try {
    await telemetrySdk.shutdown();
  } catch (error: any) {
    console.warn(`[telemetry] shutdown failed: ${error?.message ?? error}`);
  } finally {
    telemetrySdk = null;
  }
}
