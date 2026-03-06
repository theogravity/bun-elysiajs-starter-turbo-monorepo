import { getSimplePrettyTerminal } from "@loglayer/transport-simple-pretty-terminal";
import { type ILogLayer, LogLayer } from "loglayer";

const transport = getSimplePrettyTerminal({ runtime: "browser" });

export const logger = new LogLayer({
  transport,
  contextFieldName: "context",
  metadataFieldName: "metadata",
  errorFieldName: "err",
});

/**
 * Returns the singleton logger instance.
 */
export function getLogger(): ILogLayer {
  return logger;
}
