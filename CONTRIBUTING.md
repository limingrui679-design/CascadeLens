# Contributing

CascadeLens accepts four contribution types:

1. **Connector:** acquire and normalize a documented data source.
2. **Engine:** implement the typed cascade-engine interface and baseline tests.
3. **Replay pack:** add a frozen historical or quasi-historical case.
4. **Product:** improve the web, CLI, SDK, accessibility, documentation, or release system.

Every contribution must preserve source, time, license, and evidence-grade boundaries. A replay pull request must state its decision cutoff, input snapshot, outcome partition, case classification, limitations, and rebuild command. A connector must declare redistribution mode and include recorded fixtures without committing restricted data.

Run `npm run ci` before opening a pull request. New behavior needs positive, negative, and boundary tests.
