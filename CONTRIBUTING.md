# Contributing

CascadeLens welcomes focused changes that make evidence-graded scenario analysis easier to use without weakening its claim boundaries.

## A 15-minute first contribution

1. Install Python 3.11 or newer and clone the repository.
2. Install the package locally: `python -m pip install -e .`.
3. Run one checked example: `python examples/python/quickstart.py`.
4. Choose an issue labelled [`good first issue`](https://github.com/limingrui679-design/CascadeLens/labels/good%20first%20issue).
5. Make one narrow change and add or update a test.
6. Run `python -m unittest discover -s tests_python -v`.
7. Open a pull request using the template; describe what changed and what the result does **not** prove.

Documentation-only fixes do not require Node.js. Changes to the hosted website or TypeScript compatibility layer also require `npm ci` and `npm run ci`.

## Contribution paths

| Path | Good first task | Required evidence |
|---|---|---|
| Python import | Add a documented scalar field or negative fixture | Import test + preserved assumption status |
| Python API | Improve typing, errors, or a bounded helper | Positive, negative, and boundary tests |
| Notebook | Add a small reproducible workflow | Executable inputs + no inflated outcome claims |
| Documentation | Clarify a method, failure, or tutorial | Links and commands checked locally |
| Web product | Improve case selection, import, or accessibility | Render, accessibility, and interaction tests |
| Connector | Normalize a documented public source | License, temporal, size, and fixture contracts |
| Historical replay | Add a frozen preregistered case | Cutoff, input/outcome partition, all failures retained |

## Non-negotiable boundaries

- Preserve source, valid time, knowledge time, license, and evidence grade.
- Do not promote `TEXT_EXTRACTED` or `MODEL_INFERRED` edges into primary estimates.
- Public data are not client data; a hosted page is not deployment or adoption.
- A deterministic match is not empirical accuracy or external validation.
- Do not commit secrets, personal data, proprietary data, or restricted source payloads.
- Historical outcomes must remain outside frozen input artifacts and become available only after the complete result window.

## Development checks

Python:

```bash
python -m pip install -e .
python -m unittest discover -s tests_python -v
cascadelens demo --out work/demo-riskpack
cascadelens verify work/demo-riskpack
```

Hosted interface and release compatibility:

```bash
npm ci
npm run ci
```

## Pull requests

Keep one user problem per pull request. State:

- the user-visible outcome;
- the files and contracts affected;
- the tests or manual checks performed;
- backward-compatibility impact;
- the exact evidence boundary after the change.

Maintainers may ask for a smaller change, a failing regression test, a source/license record, or a clearer non-claim before review.

Security findings must follow [`SECURITY.md`](SECURITY.md), not a public issue. Community behavior follows [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md).
