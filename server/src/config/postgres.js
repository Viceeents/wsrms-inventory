export function isNeonPooled(url) {
  if (!url) return false;
  const hostname = new URL(url).hostname;
  return (
    hostname.endsWith(".neon.tech") &&
    hostname.split(".")[0].endsWith("-pooler")
  );
}

export function directDatabaseUrl(url, override) {
  if (override) return override;
  if (!isNeonPooled(url)) return url;
  const direct = new URL(url);
  direct.hostname = direct.hostname.replace("-pooler.", ".");
  return direct.toString();
}

export function postgresPoolConfig(url, schema = "public") {
  if (!/^[a-z][a-z0-9_]*$/.test(schema))
    throw new Error("Invalid database schema name.");
  // PgBouncer rejects options=-c search_path. Public already uses the default.
  const connectionString = schema === "public" ? url : directDatabaseUrl(url);
  return {
    connectionString,
    ...(schema === "public" ? {} : { options: `-c search_path=${schema}` }),
    max: 10,
    connectionTimeoutMillis: 15000,
  };
}
