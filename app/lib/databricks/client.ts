import { DBSQLClient } from "@databricks/sql";

let cachedClient: DBSQLClient | null = null;

function normalizeHost(rawHost: string): string {
  return rawHost.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

async function getClient(): Promise<DBSQLClient> {
  if (cachedClient) return cachedClient;

  const hostRaw = process.env.DATABRICKS_HOST;
  const path = process.env.DATABRICKS_HTTP_PATH;
  const token = process.env.DATABRICKS_TOKEN;

  if (!hostRaw || !path || !token) {
    throw new Error(
      "Missing Databricks environment variables: DATABRICKS_HOST, DATABRICKS_HTTP_PATH, DATABRICKS_TOKEN",
    );
  }

  const host = normalizeHost(hostRaw);
  const client = new DBSQLClient();
  await client.connect({
    host,
    path,
    token,
  });

  cachedClient = client;
  return client;
}

export async function query<T = Record<string, unknown>>(
  sql: string,
  params: Record<string, unknown> = {},
): Promise<T[]> {
  const client = await getClient();
  const session = await client.openSession();

  try {
    const operation = await session.executeStatement(sql, { namedParameters: params });
    const rows = await operation.fetchAll();
    await operation.close();
    return rows as T[];
  } finally {
    await session.close();
  }
}
