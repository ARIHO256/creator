export const REALTIME_INSTANCE_ID = `${process.pid}-${Math.random().toString(16).slice(2)}`;

export type RealtimePublishMeta = {
  eventType: string;
  streamId: string;
};

export type RealtimePublishEnvelope = {
  event: Record<string, unknown>;
  meta?: RealtimePublishMeta;
  source: string;
};
