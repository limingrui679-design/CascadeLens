import { readFile } from "node:fs/promises";
import {
  analyzeScenario,
  type GraphSnapshot,
  type ShockScenario,
} from "../../packages/sdk/src/index";

const root = new URL("../../content/cases/suez-route-restress/", import.meta.url);
const [snapshot, scenario] = await Promise.all([
  readFile(new URL("graph/snapshot.json", root), "utf8").then(
    (text) => JSON.parse(text) as GraphSnapshot,
  ),
  readFile(new URL("scenario.json", root), "utf8").then(
    (text) => JSON.parse(text) as ShockScenario,
  ),
]);

const analysis = await analyzeScenario(snapshot, scenario);

process.stdout.write(
  `${JSON.stringify(
    {
      scenarioId: scenario.scenarioId,
      status: analysis.benchmark.status,
      upperImpact: analysis.bounds.upper.totalWeightedImpact,
      recommendationStatus: analysis.interventions.recommendationStatus,
    },
    null,
    2,
  )}\n`,
);
