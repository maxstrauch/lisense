🗄️ lisense
===
*__Checks your Node modules licenses with ease__*

The module `lisense` (pronounced: `license`) is a CLI tool to get license information for a NodeJS project in a usable format to be processed in CI/CD pipelines and to include only production license.

## Sample output

For itself, license will print out (for production node modules) the following:

    $ npx lisense --report short -p
    Inspecting node_modules of lisense@1.6.0 ...
    MIT (11)
        ascii-table, chalk, commander, debug, ms, ansi-styles, supports-color, has-flag, @types/color-name, ...

Besides the graphical output for e.g. CI/CD pipelines you can also export the data directly to CSV or JSON and generate license about pages with it.

## 📌 Usage

    $ npx lisense -h
    Usage: lisense [options]

    Options:
        -V, --version                  output the version number
        -d, --dir <directory>          The directory to use as base directory to start scanning. Use a - for input mode where a list of directories, one per line, can be provided using stdin (default: current directory)
        -p, --prod                     Only inspect packages used for prod deployment (no devDependencies) (default: false)
        -u, --without-url              Excludes repository and license url from output (default: false)
        -t, --without-parent           Excludes the parent information (default: false)
        -s, --short                    Excludes the urls and parent information from output (default: false)
        -v, --verbose                  Enable verbose program output (default: false)
        -q, --quiet                    Force quiet mode on stdout (if errors are thrown they are still outputted but they are printed to stderr) (default: false)
        -c, --csv <file>               CSV output of results (default: false)
        -m, --markdown <file>          Markdown output of results (default: false)
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

## 🍱 Parsing functionality

`lisense` tries as hard as possible to provide accurate and clean information on the _version number_, _license of the package_ and _SCM URL_ (e.g. GitHub, GitLab, ...). This is not always possible due to the fact that there is no defined standard on _how_ - for example - to place this information inside the `package.json`. Some modules have no `license` or `repository` fields inside the `package.json` but a custom "format". The file `parser.js` is entirely dedicated to extract the most information out of the available data. The two extensive test files (`parser-license.spec.js` & `parser-scm.spec.js`) try to cover the most important formats and check if the extracted information is correct and as clean of a text string as possible.

For example, `lisense` now recognizes the following values for the field `repository` inside the `package.json`:


    github:user/repo/goo.git                                                --> https://github.com/user/repo/goo.git
    gist:0bce1161cfd2aa91ae7cad9abb42c342                                   --> https://gist.github.com/0bce1161cfd2aa91ae7cad9abb42c342
    bitbucket:multicoreware/x265_git                                        --> https://bitbucket.org/multicoreware/x265_git/
    gitlab:gitlab-org/gitlab.git                                            --> https://gitlab.com/gitlab-org/gitlab.git
    npm/lodash                                                              --> https://www.npmjs.com/package/lodash
    git@github.com:tsertkov/exec-sh.git                                     --> https://github.com/tsertkov/exec-sh.git
    git://github.com/isaacs/rimraf.git                                      --> https://github.com/isaacs/rimraf.git
    git+ssh://github.com/Azure/azure-sdk-for-js.git                         --> https://github.com/Azure/azure-sdk-for-js.git
    git+ssh://git@github.com/Azure/azure-sdk-for-js.git                     --> https://github.com/Azure/azure-sdk-for-js.git
    git+https://github.com/facebook/react.git                               --> https://github.com/facebook/react.git
    github.com/megawac/MutationObserver.js                                  --> https://github.com/megawac/MutationObserver.js
    https://vadimdez@github.com/VadimDez/ng2-pdf-viewer.git/blob/master/    --> https://github.com/VadimDez/ng2-pdf-viewer.git/blob/master/


The following report is a test report for running `npm run test:parsing` and shows e.g. under (2) and (4) the different accepted strings for unclean input:

    1. Handling of field 'license' of the package.json
        ✔ should handle an object with license-like infos on 'license' (defined as string) (1ms)
        ✔ should handle a null field 'license' (<1ms)
        ✔ should handle a missing field 'license' (<1ms)
        ✔ should handle strings on field 'license' (1ms)

    2. Parses different string types on 'repository' in package.json as per definition
        ✔ should extract gists, e.g. 'gist:11081aaa281' (<1ms)
        ✔ should extract bitbucket links, e.g. 'bitbucket:multicoreware/x265_git' (<1ms)
        ✔ should extract npm packages as repository, e.g. 'npm/lodash' (<1ms)
        ✔ should extract repos in form of 'github:user/repo' (<1ms)
        ✔ should extract gitlab repos, e.g. 'gitlab:gitlab-org/gitlab.git' (<1ms)

    3. Parses object types on 'repository' in package.json
        ✔ should process the object without directory info (<1ms)
        ✔ should handle URLs with no protocol (object) (<1ms)
        ✔ should handle empty / missing value / missing field (<1ms)
        ✔ should process the object without type info (<1ms)
        ✔ should handle an empty object (<1ms)
        ✔ should handle non git repository types (<1ms)
        ✔ should handle strings (<1ms)
        ✔ should handle URLs with no protocol (string) (<1ms)
        ✔ should process the object and removes the 'git+' prefixes on repo URLs (<1ms)

    4. Parses different string types on 'repository' in package.json
        ✔ should extract repos in form of 'git@github.com:user/repo' (<1ms)
        ✔ should extract repos in form of 'git://github.com/user/repo' (for strings) (<1ms)
        ✔ should extract repos in form of 'git://github.com/user/repo' (inside 'repository' object) (<1ms)
        ✔ should extract repos in form of 'git+ssh://github.com/user/repo' (beginning with 'git+ssh://') (<1ms)
        ✔ should detect GitHub URLs if no other clue is given (<1ms)
        ✔ should cleanup 'git+' prefixes on repo URLs (<1ms)
        ✔ should extract username-@-notation from URLs (<1ms)
        ✔ should extract repos in form of 'git+ssh://git@github.com/user/repo' (beginning with 'git+ssh://' and user in hostname) (<1ms)

    5. Handling of field 'licenses' of the package.json
        ✔ should handle an array on field 'licenses' (<1ms)
        ✔ should handle a object on field 'licenses' (should be an array per definition) (<1ms)
        ✔ should handle the case of a string 'licenses' field (not valid) (<1ms)
        ✔ should handle the case of a null 'licenses' field (<1ms)
        ✔ should handle the case of a missing 'licenses' (<1ms)

**Important:** because of all this _inaccuracies_ or _the missing standard_ it might be that the license information for your project, generated by `lisense`, is not a 100% correct - but very close.

## 📚 History

The problem is fairly simple: for many projects a compilation of all needed licenses is needed. There are different packages out there which will generate such information. Namely the:

 - [`npm-license-crawler`](https://www.npmjs.com/package/npm-license-crawler)
 - [`license-checker`](https://github.com/davglass/license-checker)

Both have different problems: the `npm-license-crawler` includes an old version of `license-checker` and seems not to be updated regularly. The `license-checker` has problems with recursive dependencies in `package.json` files and will result in a stack-size-exceeded error.

Furthermore, both application does not provide a _proper_ UNIX like command-line application which uses exit code and a commond argument syntax like most UNIX applications.

This is the reason why `lisense` was born

## 🎒 Contributors

 * [PsclDev](https://github.com/PsclDev)
 * [Sebastyle](https://github.com/Sebastyle)
 * [Stitzinger](https://github.com/stitzinger)
 * [maxstrauch](https://github.com/maxstrauch) (myself, owner)

## 📣 License

See file `LICENSE`.