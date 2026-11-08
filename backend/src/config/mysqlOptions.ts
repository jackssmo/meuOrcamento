import type { ConnectionOptions } from 'mysql2';

export function getMysqlOptions(): ConnectionOptions {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    const parsed = new URL(databaseUrl);
    parsed.searchParams.delete('ssl-mode');

    const options: ConnectionOptions = {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 3306,
      user: decodeURIComponent(parsed.username),
      password: decodeURIComponent(parsed.password),
      database: parsed.pathname.replace(/^\//, ''),
      enableKeepAlive: true,
      keepAliveInitialDelay: 10000,
      dateStrings: true,
    };

    if (process.env.DB_SSL_CA) {
      options.ssl = {
        ca: process.env.DB_SSL_CA,
        rejectUnauthorized: true,
      };
    } else {
      options.ssl = { rejectUnauthorized: false };
    }

    return options;
  }

  const required = (name: string): string => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} não configurado.`);
    return value;
  };

  return {
    host: required('DB_HOST'),
    user: required('DB_USER'),
    password: required('DB_PASSWORD'),
    database: required('DB_NAME'),
    port: Number(process.env.DB_PORT || 3306),
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    dateStrings: true,
    ...(process.env.DB_SSL === 'true'
      ? { ssl: { rejectUnauthorized: false } }
      : {}),
  };
}
