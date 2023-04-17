const { extractLicenseInfoFromPackageJson } = require("./parser");

describe(`Handling of field 'licenses' of the package.json`, function() {

  it(`should handle a object on field 'licenses' (should be an array per definition)`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "licenses": {
            "type": "MIT",
            "url": "http://github.com/errcw/gaussian/blob/master/LICENSE"
          },
          // ...
        }
      )
    ).toEqual(
      {
      _valid: true,
      licenses: [
        {
          _valid: true,
          type: 'MIT',
          url: 'http://github.com/errcw/gaussian/blob/master/LICENSE'
        }
      ]
      }
    );
  });

  it(`should handle an array on field 'licenses'`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "licenses": [
            {
              "type": "BSD",
              "url": "http://github.com/estools/esutils/raw/master/LICENSE.BSD"
            },
            {
              "type": "MIT",
              "url": "http://github.com/no/valid/url/404"
            }
          ],
          // ...
        }
      )
    ).toEqual(
      {
      _valid: true,
      licenses: [
        {
          _valid: true,
          type: 'BSD',
          url: 'http://github.com/estools/esutils/raw/master/LICENSE.BSD'
        },
        {
          _valid: true,
          type: 'MIT',
          url: 'http://github.com/no/valid/url/404'
        }
      ]
      }
    );
  });

  it(`should handle the case of a missing 'licenses'`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
        licenses: []
      }
    );
  });

  it(`should handle the case of a null 'licenses' field`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "licenses": null,
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
        licenses: []
      }
    );
  });

  it(`should handle the case of a string 'licenses' field (not valid)`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "licenses": "ABC",
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
        licenses: []
      }
    );
  });

});

describe(`Handling of field 'license' of the package.json`, function() {

  it(`should handle strings on field 'license'`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "license": "MIT",
          // ...
        }
      )
    ).toEqual(
      {
      _valid: true,
      licenses: [
        {
          _valid: true,
          type: 'MIT',
        }
      ]
      }
    );
  });

  it(`should handle a missing field 'license'`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
        licenses: []
      }
    );
  });

  it(`should handle a null field 'license'`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "license": null,
          // ...
        }
      )
    ).toEqual(
      {
        _valid: false,
        licenses: []
      }
    );
  });

  it(`should handle an object with license-like infos on 'license' (defined as string)`, () => {
    expect(
      extractLicenseInfoFromPackageJson(
        {
          // ...
          "license": {
            "type": "BSD",
            "url": "http://github.com/estools/esutils/raw/master/LICENSE.BSD"
          },
          // ...
        }
      )
    ).toEqual(
      {
        _valid: true,
        licenses: [
          {
            _valid: true,
            type: 'BSD',
            url: 'http://github.com/estools/esutils/raw/master/LICENSE.BSD',
          }
        ]
      }
    );
  });

});
