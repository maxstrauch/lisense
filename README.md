lisense
===

The module `lisense` (pronounced: `license`) provides a proper CLI interface to get all licenses for a node project in a usable format and importantly to include only production license.

The problem is fairly simple: for many projects a compilation of all needed licenses is needed. There are different packages out there which will generate such information. Namely the:

 - [`npm-license-crawler`](https://www.npmjs.com/package/npm-license-crawler)
 - [`license-checker`](https://github.com/davglass/license-checker)

Both have different problems: the `npm-license-crawler` includes an old version of `license-checker` and seems not to be updated regularly. The `license-checker` has problems with recursive dependencies in `package.json` files and will result in a stack-size-exceeded error.

Furthermore, both application does not provide a _proper_ UNIX like command-line application which uses exit code and a commond argument syntax like most UNIX applications.

So `lisense` was born. See the CLI interface:

    $ npx lisense -h
    Usage: lisense [options]

    Options:
    -V, --version               output the version number
    -d, --dir <directory>       The directory to use as base directory to start scanning (default:
                                "/Users/maximilianstrauch/Documents/Projekte/lisense")
    -p, --prod                  Only inspect packages used for prod deployment (no devDependencies) (default: false)
    -v, --verbose               Enable verbose program output (default: false)
    -c, --csv <file>            CSV output of results (default: false)
    -j, --json <file>           JSON output of results (default: false)
    -f, --fail <license-regex>  Fail with exit code 2 if at least one of the license names matches the given regex (default: null)
    -r, --report <mode>         Generates a report on stderr with one of the modes: none (default), short, long (default: "none")
    -l, --licenses              Print a list of used licenses
    -z, --fail-on-missing       Fails the application with exit code 3 iff there is at least one node_module which cannot be inspected
    --pedantic                  Checks at some places if data can be confirmed from an other source (e.g. NPM)
    -h, --help                  output usage information


Roadmap
---

This module is currently actively developed (last update: Feb 2020) and will receive more features (not breaking the current interface) and proper test coverage. This documentation will also be adapted and extended.