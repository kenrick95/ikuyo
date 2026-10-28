# Dependency security backports

Run `pnpm test:dependencies` to exercise the installed dependency code, then
`pnpm audit` to check current advisories. CI runs the security regressions.

Two advisories are excluded from pnpm's version-based report because their fixes
are applied through version-specific `pnpm.patchedDependencies`. Installation
fails if either patch cannot be applied; tests check the installed packages.

- [GHSA-jrc7-96c5-q579](https://github.com/advisories/GHSA-jrc7-96c5-q579):
  MapLibre 5.24.0 snapshots the live attribute collection before removing unsafe
  attributes. This backports the upstream 6.4.1 sanitizer fix to the source and
  all four distributed browser bundles. MapTiler SDK 4.2 and geocoding control 3.1
  require MapLibre 5; MapLibre 6 removes the default export and APIs the SDK uses.
  The tests render malicious custom and tile-source attribution through the
  real attribution control in each bundle, checking consecutive unsafe attributes
  are removed while legitimate credits remain.
- [GHSA-gcqx-w48m-w2h4](https://github.com/TehShrike/deepmerge/issues/273):
  Deepmerge 4.3.1 rejects `__proto__` keys in both target-copy and source-merge
  loops, in its source and both distributed bundles. There is no patched upstream
  release. The tests use the package resolved by the Sass plugin and cover
  null-prototype targets, own `__proto__` properties, primitive targets, nested
  null placeholders, and normal Sass option merging.

Remove each patch and its corresponding audit exclusion together when the
parent dependencies support an upstream fixed release. Keep the regression tests.
