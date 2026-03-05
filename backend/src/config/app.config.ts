export default () => ({
  app: {
    port: Number(process.env.PORT ?? '4010'),
    host: process.env.HOST ?? '0.0.0.0'
  },
  auth: {
    accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access-secret',
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh-secret',
    refreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? '30')
  }
});
