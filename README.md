🗄️ lisense
===
*__Checks your Node modules licenses with ease__*

The module `lisense` (pronounced: `license`) is a CLI tool to get license information for a NodeJS project in a usable format to be processed in CI/CD pipelines and to include only production license.

## Sample output

For itself, license will print out (for production node modules) the following:

    $ npx lisense --report short -p
    Inspecting node_modules of lisense@1.4.0 ...
    MIT (11)
        ascii-table, chalk, commander, debug, ms, ansi-styles, supports-color, has-flag, @types/color-name, ...

Besides the graphical output for e.g. CI/CD pipelines you can also export the data directly to CSV or JSON and generate license about pages with it.

## 📌 Usage

    $ npx lisense -h
    Usage: lisense [options]

    Options:
    -V, --version                  output the version number
    -d, --dir <directory>          The directory to use as base directory to start scanning. Use a - for input mode where a list of directories, one per line,
                                    can be provided using stdin (default: "/Users/maximilianstrauch/Documents/Projekte/lisense")
    -p, --prod                     Only inspect packages used for prod deployment (no devDependencies) (default: false)
    -v, --verbose                  Enable verbose program output (default: false)
    -c, --csv <file>               CSV output of results (default: false)
    -j, --json <file>              JSON output of results (default: false)
    -f, --fail <license-regex>     Fail with exit code 2 if at least one of the license names matches the given regex (default: null)
    -r, --report <mode>            Generates a report on stderr with one of the modes: none (default), short, long (default: "none")
    -l, --licenses                 Print a list of used licenses
    -z, --fail-on-missing          Fails the application with exit code 3 iff there is at least one node_module which cannot be inspected
    --pedantic                     Checks at some places if data can be confirmed from an other source (e.g. NPM)
    -w, --whitelist <file>         JSON file to define a whitelist of allowed licenses and packages (default: false)
    --create-new-whitelist <file>  Creates an empty, example whitlist file and exits regardless of any other flag (default: false)
    -h, --help                     output usage information

### Whitelist feature

The `-w` or `--whitelist` flag can be used together with a JSON file which whitelists allowed licenses and excluded packages. See the following example file:

```json
[
    {
        "license": "MIT",
        "modules": []
    },
    {
        "license": "UNKNOWN",
        "modules": [
            "atob",
            "deep",
            "a",
            "garply"            
        ]
    }
]
```

If executed with this file, the following will happen:

 - if there are any packages with licenses other than `MIT` or `UNKNWON` they will be listed and license will exit with code `4`
 - all packages with license `MIT` are accepted (since the array is empty)
 - only the four listes packages with license type `UNKNOWN` are accepted; any other packages with type `UNKNOWN` will cause license to exit with code `4`

This is a very useful feature to lock the used licenses inside the current project since all new packages might generate violations (if not already listed) which need then be checked before the CI/CD pipeline continues to run succcessfully.

__*Tip:*__ The commandline switch `--create-new-whitelist` can be used to generate a template.

## 📚 History

The problem is fairly simple: for many projects a compilation of all needed licenses is needed. There are different packages out there which will generate such information. Namely the:

 - [`npm-license-crawler`](https://www.npmjs.com/package/npm-license-crawler)
 - [`license-checker`](https://github.com/davglass/license-checker)

Both have different problems: the `npm-license-crawler` includes an old version of `license-checker` and seems not to be updated regularly. The `license-checker` has problems with recursive dependencies in `package.json` files and will result in a stack-size-exceeded error.

Furthermore, both application does not provide a _proper_ UNIX like command-line application which uses exit code and a commond argument syntax like most UNIX applications.

This is the reason why `lisense` was born

## 🎒 Contributors

 * [Sebastyle](https://github.com/Sebastyle)
 * [Stitzinger](https://github.com/stitzinger)
 * [maxstrauch](https://github.com/maxstrauch) (myself, owner)

## 📣 License

See file `LICENSE`.