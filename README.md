# basta

[![npm version](https://img.shields.io/npm/v/basta.svg)](https://www.npmjs.com/package/basta)
[![PyPI version](https://img.shields.io/pypi/v/basta-cli.svg)](https://pypi.org/project/basta-cli/)
[![license](https://img.shields.io/npm/l/basta.svg)](https://github.com/kucherenko/basta/blob/master/LICENSE)

basta finds code that nothing runs: unused files, exports, module-private
declarations and imports. It reads JavaScript, TypeScript, JSX and TSX, the
components of Vue, Svelte and Astro, and Python. For Rust it reads the
compiler's own diagnostics.

It is one self-contained Rust binary. There are no runtime dependencies and no
install scripts, and nothing needs configuring before the first run.

```bash
npm install -g basta        # or: pip install basta-cli, cargo install basta
basta .
```

```
Unused files (1)
 - src/legacy-export.ts  certain 95%  11 lines

Unused exports (1)
 - function src/invoice.ts:21:17 renderReceipt  high 85%  3 lines

Unused symbols (1)
 - function src/invoice.ts:29:10 describeTotal  certain 90%  3 lines

Unused imports (1)
 - import src/invoice.ts:2:10 roundToCents  certain 100%  1 lines

Found 4 dead code findings in 4 files (31.6% of 57 lines).
Done in 12ms
```

To try it without installing, run `npx basta .` or `uvx --from basta-cli basta .`.
On PyPI the package is called `basta-cli`, because `basta` there is an
unrelated astronomy package. The command is `basta` either way.

## How it decides

basta builds the import graph from the project's entry points and walks it,
instead of counting references. A helper whose only caller is itself dead gets
reported too, and that cascade is most of what a reference-counting linter
misses.

Static analysis of JavaScript and Python cannot be certain, so every finding
carries a confidence score from 0 to 100, with the reasons it is not higher: a
file that calls `eval` or `getattr`, a decorator basta does not recognise, a
wildcard re-export, a name that shows up in a string literal, a file whose
path is written out in one. `--min-confidence` sets the floor, which is 60 by
default.

It follows the conventions of each language. A package's `__init__.py`
re-exports are its API, so they are not reported as unused imports.
`from __future__ import annotations` is a directive. `# noqa: F401` and
PEP 484's `import x as x` mark a deliberate re-export. A quoted annotation
under `if TYPE_CHECKING:` uses the import that supplies it.
`compilerOptions.paths` in `tsconfig.json` is resolved, so the
`@/components/x` alias in the default Next.js template reaches the file it
names. CommonJS counts too: `require('./x')`, `module.exports = { a }` and a
literal `import('./x')` are edges like any `import`. A shell script or CI
workflow that names a source file keeps that file alive.

In a Vue, Svelte or Astro component basta reads the markup as well as the
script. An import that only `<Chart />` renders, a Svelte store read as
`$page`, and a name used only inside a template literal in an attribute all
count as uses.

## Entry points

Every finding means that nothing reaches the code, so the entry points decide
the whole result. basta takes them from:

- `package.json`: `main`, `module`, `bin`, `exports`, `files` and `scripts`;
- `pyproject.toml`: `[project.scripts]` and the entry-point tables;
- scripts in the tree that name a source file: `*.sh`, CI workflows,
  Makefiles, Dockerfiles;
- conventions: `src/index.ts`, `__main__.py`, `manage.py`, `*.config.ts`,
  `.d.ts` declarations, shebangs, `if __name__ == "__main__"`, and every
  `__init__.py`.

It also recognises more than 50 frameworks and tools from the project's
dependencies and config files, and takes their conventions as entry points:
the routes of Next.js, Nuxt, SvelteKit, Astro and Remix, Storybook stories,
and the rest that `basta --list-frameworks` prints. `--framework <name>`
declares one the detection misses, `--no-frameworks` turns detection off, and
`--frameworks-config` (or a `basta.frameworks.yaml` in the working directory)
adds your own definitions.

When a project starts somewhere none of that covers, say so once:

```bash
basta . --entry 'src/handlers/**' --entry 'scripts/*.ts'
```

## Rust

basta has no Rust parser, and it does not need one: the compiler already knows
what is unused. Pipe its diagnostics in, and they are reported next to
everything else, at 100% confidence:

```bash
cargo check --all-targets --message-format=json | basta . --rust-diagnostics -
```

basta never runs cargo itself, because that would execute the project's build
scripts and procedural macros.

## Configuration

A project that keeps a `.jscpd.json` can put basta's settings in its
`deadCode` section, which `jscpd --dead-code` reads too:

```json
{
  "deadCode": {
    "minConfidence": 80,
    "entry": ["tools/*.js"],
    "ignore": ["**/generated/**"]
  }
}
```

basta looks for `.jscpd.json`, `.config/jscpd.json` or the `jscpd` key of
`package.json` in the working directory, and `-c <file>` names another one.
A flag on the command line wins over the file.

## Usage

```
basta [PATHS]...

  --categories <LIST>          unused-file, unused-export, unused-symbol,
                               unused-import, unused-member, or `all`
  --min-confidence <N>         drop findings below this score (default: 60)
  --min-lines <N>              only report declarations this many lines or longer
  --entry <GLOB>               treat matching files as entry points (repeatable)
  --ignore <GLOB>              skip matching files (repeatable)
  --include-tests              report dead code inside test files
  --include-entry-exports      report exports of entry points
  --framework <NAME>           treat this framework as present (repeatable)
  --no-frameworks              do not detect frameworks
  --frameworks-config <FILE>   add framework definitions, as YAML or JSON
  --rust-diagnostics <FILE>    Rust dead code from `cargo check --message-format=json`
                               output, or `-` to read it from stdin
  -c, --config <FILE>          the jscpd config file with the deadCode section
  -r, --reporters <LIST>       console, json, sarif, html, markdown, csv, xml,
                               codeclimate, openmetrics, badge, xcode, ai, silent
  -o, --output <DIR>           where file reporters write (default: report)
  --threshold <PERCENT>        fail when dead code exceeds this share
  --exit-code <CODE>           exit with this code when anything is found
  --format <FORMAT>            restrict the scan (repeatable)
  --list                       print the formats basta analyzes
  --list-frameworks            print the frameworks basta recognises
```

`basta --help` lists the rest, such as `--no-gitignore`, `--follow-symlinks`
and `--workers`.

## In CI

```bash
basta . --reporters json,sarif --threshold 5
```

`--threshold` fails the run when dead code exceeds that share of the scanned
lines, and `--exit-code` sets the code to fail with. The SARIF report uploads
to GitHub code scanning like any other analyzer's.

## pre-commit

The repository publishes a hook for [pre-commit](https://pre-commit.com/) and
[prek](https://github.com/j178/prek). It installs the `basta-cli` wheel, so it
needs no Node.js:

```yaml
repos:
  - repo: https://github.com/kucherenko/basta
    rev: v0.3.1
    hooks:
      - id: basta
```

The hook scans the whole project on every commit, since removing code in one
file can leave its only helper dead in another, and a run takes milliseconds.
It fails when anything is found. To change that, pass your own `args`, for
example `["--exit-code", "1", "--min-confidence", "90"]`, or
`["--threshold", "5"]` to allow some dead code.

## Known gaps

- Class members are matched by name, because basta does not infer types. That
  rule is off by default, and `--categories all` turns it on.
- PEP 420 namespace packages are not import roots: `from lib.x import y`
  resolves only when `lib/` has an `__init__.py`.

## How this repository is built

basta's engine lives in the [jscpd](https://github.com/kucherenko/jscpd)
workspace, next to the tokenizer and reporters it shares with the copy/paste
detector, where it also runs as `jscpd --dead-code`. This repository carries
that workspace as a submodule pinned to one commit. Releases are cut here, on
their own schedule, and never wait for a jscpd release.

```bash
git clone --recurse-submodules https://github.com/kucherenko/basta.git
cd basta/jscpd/rust && cargo build --release -p basta
```

To release, move the submodule to the jscpd commit you want, set the same
version in `pyproject.toml` (both `version` and the `basta-cli` pin), commit,
and push a `v*` tag. The workflow checks that the tag, the crate, the npm
manifest and `pyproject.toml` all name the same version before it publishes
anything.
