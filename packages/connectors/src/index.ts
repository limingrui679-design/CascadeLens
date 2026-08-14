export * from "./catalog";
export * from "./csv";
export * from "./network";
export * from "./manifest";
export * from "./types";
export * from "./pipeline-node";
export * from "./worldgraph-mapping";
export * from "./zip";
export * from "./adapters/un-comtrade";
export * from "./adapters/oecd-icio";
export * from "./adapters/sec-edgar";
export * from "./adapters/gleif";
export * from "./adapters/faostat";
export * from "./adapters/openfda";
export * from "./adapters/ofac";
export * from "./adapters/wits";
export * from "./adapters/unctad-lsci";
export * from "./adapters/imf-portwatch";
export * from "./adapters/bea-input-output";
export * from "./xlsx";

import type { ConnectorAdapter, ConnectorId } from "./types";
import { unComtradeAdapter } from "./adapters/un-comtrade";
import { oecdIcioAdapter } from "./adapters/oecd-icio";
import { secEdgarAdapter } from "./adapters/sec-edgar";
import { gleifAdapter } from "./adapters/gleif";
import { faostatAdapter } from "./adapters/faostat";
import { openFdaAdapter } from "./adapters/openfda";
import { ofacAdapter } from "./adapters/ofac";
import { witsAdapter } from "./adapters/wits";
import { unctadLsciAdapter } from "./adapters/unctad-lsci";
import { imfPortwatchAdapter } from "./adapters/imf-portwatch";
import { beaInputOutputAdapter } from "./adapters/bea-input-output";

export const adapters: Record<ConnectorId, ConnectorAdapter<never>> = {
  "un-comtrade": unComtradeAdapter as ConnectorAdapter<never>,
  "oecd-icio": oecdIcioAdapter as ConnectorAdapter<never>,
  "sec-edgar": secEdgarAdapter as ConnectorAdapter<never>,
  gleif: gleifAdapter as ConnectorAdapter<never>,
  faostat: faostatAdapter as ConnectorAdapter<never>,
  "openfda-drug-shortages": openFdaAdapter as ConnectorAdapter<never>,
  "ofac-sls": ofacAdapter as ConnectorAdapter<never>,
  "world-bank-wits": witsAdapter as ConnectorAdapter<never>,
  "unctad-lsci": unctadLsciAdapter as ConnectorAdapter<never>,
  "imf-portwatch": imfPortwatchAdapter as ConnectorAdapter<never>,
  "bea-input-output": beaInputOutputAdapter as ConnectorAdapter<never>,
};
