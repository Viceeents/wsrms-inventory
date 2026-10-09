export const recoveryMessage =
  "System connection is being restored. Please wait.";
export function isDatabaseUnavailable(error) {
  return (
    /^(08|57P0[123])/.test(error?.code || "") ||
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "EPIPE",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "ENOTFOUND",
    ].includes(error?.code) ||
    /Connection terminated|Connection ended unexpectedly|timeout exceeded when trying to connect/i.test(
      error?.message || "",
    )
  );
}
