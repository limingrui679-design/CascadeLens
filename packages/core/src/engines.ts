import { runCascade } from "./cascade";
import { compareCanonicalStrings } from "./canonical";
import { ENGINE_VERSION } from "./types";
import type {
  BoundMode,
  CascadeEnginePlugin,
  CascadeResult,
  GraphSnapshot,
  ShockScenario,
} from "./types";

export class EngineRegistry {
  readonly #engines = new Map<string, CascadeEnginePlugin>();

  constructor(includeBuiltIn = true) {
    if (includeBuiltIn) {
      this.register({
        id: "dependency_cascade",
        version: ENGINE_VERSION,
        run: runCascade,
      });
    }
  }

  register(engine: CascadeEnginePlugin): void {
    if (!/^[a-z][a-z0-9_-]{1,63}$/.test(engine.id)) {
      throw new TypeError("Engine id must be a lowercase, URL-safe identifier.");
    }
    if (this.#engines.has(engine.id)) {
      throw new Error(`Engine ${engine.id} is already registered.`);
    }
    this.#engines.set(engine.id, engine);
  }

  list(): Array<{ id: string; version: string }> {
    return [...this.#engines.values()]
      .map(({ id, version }) => ({ id, version }))
      .sort((left, right) => compareCanonicalStrings(left.id, right.id));
  }

  async run(
    snapshot: GraphSnapshot,
    scenario: ShockScenario,
    bound: BoundMode,
  ): Promise<CascadeResult> {
    const engine = this.#engines.get(scenario.propagation.engine);
    if (!engine) throw new Error(`Engine ${scenario.propagation.engine} is not registered.`);
    return engine.run(snapshot, scenario, bound);
  }
}
