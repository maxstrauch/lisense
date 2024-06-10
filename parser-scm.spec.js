const { extractSCMInfo } = require("./parser");

// @see https://docs.npmjs.com/cli/v8/configuring-npm/package-json#repository
describe(`Parses different string types on 'repository' in package.json as per definition`, function() {

  it(`should extract repos in form of 'github:user/repo'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "github:user/repo/goo.git",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/user/repo/goo.git'
      }
    );    
  });

  it(`should extract gists, e.g. 'gist:11081aaa281'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "gist:0bce1161cfd2aa91ae7cad9abb42c342",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'gist',
        directory: '',
        url: 'https://gist.github.com/0bce1161cfd2aa91ae7cad9abb42c342'
      }
    );    
  });

  it(`should extract bitbucket links, e.g. 'bitbucket:multicoreware/x265_git'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "bitbucket:multicoreware/x265_git",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://bitbucket.org/multicoreware/x265_git/'
      }
    );    
  });

  it(`should extract gitlab repos, e.g. 'gitlab:gitlab-org/gitlab.git'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "gitlab:gitlab-org/gitlab.git",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://gitlab.com/gitlab-org/gitlab.git'
      }
    );    
  });

  it(`should extract npm packages as repository, e.g. 'npm/lodash'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "npm/lodash",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'npm',
        directory: '',
        url: 'https://www.npmjs.com/package/lodash'
      }
    );    
  });
  
  it(`should have a fallback for implicit GitHub repos as it is the defacto standard (or seems to be), e.g. 'chalk/supports-color'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "chalk/supports-color",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/chalk/supports-color',
      }
    );    
  });
});


describe(`Parses different string types on 'repository' in package.json`, function() {

  it(`should extract repos in form of 'git@github.com:user/repo'`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "git@github.com:tsertkov/exec-sh.git",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/tsertkov/exec-sh.git'
      }
    );    
  });

  it(`should extract repos in form of 'git://github.com/user/repo' (for strings)`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "git://github.com/isaacs/rimraf.git",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/isaacs/rimraf.git'
      }
    );    
  });

  it(`should extract repos in form of 'git://github.com/user/repo' (inside 'repository' object)`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "git",
            "url": "git://github.com/algolia/algoliasearch-client-javascript.git"
          },
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/algolia/algoliasearch-client-javascript.git'
      }
    );    
  });

  it(`should extract repos in form of 'git+ssh://github.com/user/repo' (beginning with 'git+ssh://')`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "git",
            "url": "git+ssh://github.com/Azure/azure-sdk-for-js.git"
          },
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/Azure/azure-sdk-for-js.git'
      }
    );    
  });

  it(`should extract repos in form of 'git+ssh://git@github.com/user/repo' (beginning with 'git+ssh://' and user in hostname)`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "git",
            "url": "git+ssh://git@github.com/Azure/azure-sdk-for-js.git"
          },
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/Azure/azure-sdk-for-js.git'
      }
    );    
  });

  it(`should extract username-@-notation from URLs`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "https://vadimdez@github.com/VadimDez/ng2-pdf-viewer.git/blob/master/"
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/VadimDez/ng2-pdf-viewer.git/blob/master/'
      }
    );    
  });

  it(`should detect GitHub URLs if no other clue is given`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "https://github.com/Rich-Harris/vlq",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/Rich-Harris/vlq'
      }
    );    
  });

  it(`should cleanup 'git+' prefixes on repo URLs`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "git+https://github.com/facebook/react.git",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/facebook/react.git'
      }
    );    
  });

});

describe(`Parses object types on 'repository' in package.json`, function() {

  it(`should handle empty / missing value / missing field`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": null
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
      }
    );

    expect(
      extractSCMInfo(
        {
          // ...
          "repository": undefined
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
      }
    );

    expect(
      extractSCMInfo(
        {
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
      }
    );
  });

  it(`should handle an empty object`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {}
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
      }
    );
  });

  it(`should handle strings`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "https://github.com/facebook/react.git"
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        url: 'https://github.com/facebook/react.git',
        type: 'git',
        directory: '',
      }
    );
  });

  it(`should process the object and removes the 'git+' prefixes on repo URLs`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "git",
            "url": "git+https://github.com/facebook/react.git",
            "directory": "packages/eslint-plugin-react-hooks"
          }
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: 'packages/eslint-plugin-react-hooks',
        url: 'https://github.com/facebook/react.git'
      }
    );    
  });

  it(`should process the object without directory info`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "git",
            "url": "git+https://github.com/lodash/lodash.git"
          }
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/lodash/lodash.git'
      }
    );    
  });

  it(`should process the object without type info`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "url": "git+https://github.com/mikeal/aws-sign.git"
          }
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/mikeal/aws-sign.git'
      }
    );    
  });

  it(`should handle non git repository types`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "a-web-page",
            "url": "https://www.gutenberg.org/files/68606/68606-h/68606-h.htm"
          }
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'other',
        directory: '',
        url: 'https://www.gutenberg.org/files/68606/68606-h/68606-h.htm'
      }
    );    
  });

  it(`should handle URLs with no protocol (string)`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": "github.com/megawac/MutationObserver.js"
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/megawac/MutationObserver.js'
      }
    );    
  });  

  it(`should handle URLs with no protocol (object)`, () => {
    expect(
      extractSCMInfo(
        {
          // ...
          "repository": {
            "type": "git",
            "url": "github.com/megawac/MutationObserver.js"
          }
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        type: 'git',
        directory: '',
        url: 'https://github.com/megawac/MutationObserver.js'
      }
    );    
  });    

});
