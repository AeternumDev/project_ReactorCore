// PostgreSQL-Verbindung via pg
// TODO: Implementierung in Sprint 2

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.warn("DATABASE_URL ist nicht gesetzt.");
}

export { connectionString };
