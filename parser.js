const fs = require('fs');
const path = require('path');

var readdirRec = function(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
      file = path.join(dir, file);
      var stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
          /* Recurse into a subdirectory */
          results = results.concat(readdirRec(file));
      } else { 
          /* Is a file */
          results.push(file);
      }
  });
  return results;
}

var readdir = function(dir) {
  var results = [];
  var list = fs.readdirSync(dir);
  list.forEach(function(file) {
      file = path.join(dir, file);
      results.push(file);
  });
  return results;
}

var ioutil = {
  ReadFile: (path) => {
    try {
      return fs.readFileSync(path).toString() || '';
    } catch (ex) {
      return null;
    }
  },
  Readdir: readdir,
};


// ----

const GIT_REF_STR_MATCHER = new RegExp('(.*?)@(.*?):(.*?)\\/(.*?)$', 'im');
const CUSTOM_COPYRIGHT_MATCHER = new RegExp('^copyright.*?\\(?c?\\)?.*?[0-9]?.*?$', 'i');
const README_MD_LICENSE_HEADING = new RegExp('^#*.*?licen[s|c]e$', 'i');
const URL_USER_IN_HOSTNAME_MATCHER = new RegExp('://.*?@(.*?)/', 'i');
const GITHUB_REPO_SHORT_REGEX_MATCHER = new RegExp('^[^\/]+\/[^\/]+$', 'i')

const SCM_INFO_PARSERS = [
  // GitHub ref: 'github:user/repo'
  {
    canApply: (str) => str.toLowerCase().startsWith('github:'),
    apply: (str) => {
      const parts = str.substring(7).split('/');
      if (parts.length >= 2) {
        return {
          _valid: true,
          type: 'git',
          directory: '',
          url: `https://github.com/${parts[0]}/${parts.slice(1).join('/')}`,
        };
      }
    }
  },

  // Bitbucket ref: 'bitbucked:user/repo'
  {
    canApply: (str) => str.toLowerCase().startsWith('bitbucket:'),
    apply: (str) => {
      const parts = str.substring(10).split('/');
      if (parts.length >= 2) {
        let fullPath = parts.slice(1).join('/');
        if (!fullPath.endsWith('/')) {
          fullPath += '/'
        }
        return {
          _valid: true,
          type: 'git',
          directory: '',
          url: `https://bitbucket.org/${parts[0]}/${fullPath}`,
        };
      }
    }
  },

  // GitLab ref: 'gitlab:user/repo'
  {
    canApply: (str) => str.toLowerCase().startsWith('gitlab:'),
    apply: (str) => {
      const parts = str.substring(7).split('/');
      if (parts.length >= 2) {
        return {
          _valid: true,
          type: 'git',
          directory: '',
          url: `https://gitlab.com/${parts[0]}/${parts.slice(1).join('/')}`,
        };
      }
    }
  },

  // Reference to a GIST
  {
    canApply: (str) => str.toLowerCase().startsWith('gist:'),
    apply: (str) => {
      return {
        _valid: true,
        type: 'gist',
        directory: '',
        url: `https://gist.github.com/${str.substring(5)}`,
      };
    }
  },

  // Reference to a npm package directly
  {
    canApply: (str) => str.startsWith('npm/'),
    apply: (str) => {
      return {
        _valid: true,
        type: 'npm',
        directory: '',
        url: `https://www.npmjs.com/package/${str.substring(4)}`,
      };
    }
  },

  // It might start with git://
  {
    canApply: (str) => str.startsWith('git://') || str.startsWith('git+ssh://'),
    apply: (str) => {
      const offset = str.startsWith('git://') ? 3 : 7;
      // Only for github we know out of the box that https is supported
      let url = `${str.indexOf('github.com') > -1 ? 'https' : 'http'}${str.substring(offset)}`;

      const m = url.match(URL_USER_IN_HOSTNAME_MATCHER);
      if (m && m[0] && m[1] && m.index) {
        const lenOriginal = m[0].length;
        url = `${url.substring(0, m.index)}://${m[1]}/${url.substring(m.index+lenOriginal)}`;
      }

      return {
        _valid: true,
        type: 'git',
        directory: '',
        url,
      };
    }
  },

  // Just an URL string
  {
    canApply: (str) => {
      return (str.startsWith('http://') || str.startsWith('https://')) &&
      ((str.indexOf('github.com') > -1) || str.endsWith('.git'));
    },
    apply: (url) => {
      const m = url.match(URL_USER_IN_HOSTNAME_MATCHER);
      if (m && m[0] && m[1] && m.index) {
        const lenOriginal = m[0].length;
        url = `${url.substring(0, m.index)}://${m[1]}/${url.substring(m.index+lenOriginal)}`;
      }

      return {
        _valid: true,
        type: 'git',
        directory: '',
        url,
      };
    }
  },

  // Case: check for "git@PROVIER:USER/REPO_PATH"
  {
    canApply: (str) => !!str.match(GIT_REF_STR_MATCHER),
    apply: (str) => {
      const m = str.match(GIT_REF_STR_MATCHER);
      if (m && m.length === 5) {
        if (m[2].indexOf('github.com') > -1) {
          return {
            _valid: true,
            type: 'git',
            directory: '',
            url: `https://github.com/${m[3]}/${m[4]}`,
          };
        } else {
          return {
            _valid: true,
            type: 'other',
            directory: '',
            url: `${tred.indexOf('github.com') > -1 ? 'https' : 'http'}${tred.substring(3)}`,
          };
        }
      }
    }
  },

  {
    canApply: (str) => {
      return !!str.match(GITHUB_REPO_SHORT_REGEX_MATCHER);
    },
    apply: (str) => {
      return {
        _valid: true,
        type: 'git',
        directory: '',
        url: `https://github.com/${str}`,
      };
    }
  },

  {
    canApply: (str) => {
      // Either invalid string or already with a protocol prefix
      if (!str || str.startsWith('http')) {
        return false;
      }

      // Is it parseable?
      try {
        new URL(`http://${(str || '').trim()}`)
      } catch (ex) {
        return false;
      }

      return true;
    },
    apply: (str) => {
      // We don't know if the target server supports https, so to be sure, we provide
      // http and the target server should have a https redirect or HSTS or something
      let scheme = 'http';
      if (
          str.indexOf('github.com') > -1 || 
          str.indexOf('gitlab.com') > -1 || 
          str.indexOf('bitbucket.com') > -1
      ) {
        scheme = 'https';
      }

      return {
        _valid: true,
        type: str.toLowerCase().indexOf('git') > -1 ? 'git' : 'other',
        directory: '',
        url: `${scheme}://${str.trim()}`,
      };
    }
  },
]

function _extractSCMInfoFromString(repoInfo) {
  let tred = (`${repoInfo || ''}`).trim();
  
  if (!tred) {
    return { _valid: false, };
  }

  tred = _cleanupRepoUrl(tred);

  // Parse it
  for (const p of SCM_INFO_PARSERS) {
    if (p.canApply(tred)) {
      const r = p.apply(tred);
      if (r && r._valid === true) {
        return r;
      }
    }
  }

  return { _valid: false };
}

function _extractSCMInfo(packageJson) {
  if (!packageJson || (typeof packageJson) !== 'object') {
    return { _valid: false };
  }
  const repo = packageJson.repository;

  if (repo === null || repo === undefined) {
    return { _valid: false };
  }

  // It might be "only" a string to parse on this field
  if ((typeof repo) === 'string') {
    return _extractSCMInfoFromString(repo);
  }

  if ((typeof repo) === 'object') {
    const keys = Object.getOwnPropertyNames(repo);
    if (keys.indexOf('type') > -1 && keys.indexOf('url') > -1) {
      const repoInfo = {
        _valid: true,
        type: repo['type'],
        directory: repo['directory'] || '',
        url: repo['url'],
      };

      // Try to parse it
      const parsed = _extractSCMInfoFromString(repoInfo.url);
      if (parsed._valid) {
        // Return the parsed one:
        return {
          ...parsed,
          directory: repoInfo.directory || parsed.directory || '',
        };
      }

      // Return the fallback value
      return repoInfo;
    }

    // Fallback: we're missing the 
    if (keys.indexOf('url') > -1) {
      return _extractSCMInfoFromString(repo['url']);
    }
  }

  return { _valid: false };
}

function _cleanupRepoUrl(bareUrl) {
  if (bareUrl.startsWith('git+http')) {
    bareUrl = bareUrl.substring(4);
  }

  return bareUrl;
}

function extractSCMInfo(packageJson) {
  const ret = _extractSCMInfo(packageJson);
  if (!ret._valid) {
    return ret;
  }

  const result = {
    ...ret,
    type: (`${ret.type || ''}`).toLowerCase(),
    url: _cleanupRepoUrl(ret.url),
  };
 
  if (!['git', 'svn', 'gist', 'npm'].includes(result.type)) {
    result.type = 'other';
  }

  return result;
}

function _parseSingleLicenseObject(obj) {
  if (!obj || (typeof obj) !== 'object') {
    return { _valid: false };
  }

  if (obj['type'] && obj['url']) {
    return {
      _valid: true, 
      type: (obj['type'] || '').trim(),
      url: obj['url'],
    };
  } else if (obj['type']) {
    return {
      _valid: true, 
      type: (obj['type'] || '').trim(),
      url: '',
    };
  }

  return { _valid: false };
}

function extractLicenseInfoFromPackageJson(packageJson) {
  // Handle field 'licenses'
  if (packageJson && Array.isArray(packageJson['licenses'])) {
    const objs = packageJson['licenses'].map(l => _parseSingleLicenseObject(l))
    const valid = objs.reduce((p, c) => p && c._valid, true);
    if (valid) {
      return { _valid: true, licenses: objs };
    }
  } else if (packageJson && (typeof packageJson['licenses']) === 'object') {
    const obj = _parseSingleLicenseObject(packageJson['licenses']);
    if (obj._valid) {
      return { _valid: true, licenses: [obj] };
    }
  }

  // Handle field 'license'
  if (packageJson && (typeof packageJson['license']) === 'string' && packageJson['license'].length > 1) {
    return { _valid: true, licenses: [ { _valid: true, type: packageJson['license'], } ] };
  } else if (packageJson && Array.isArray(packageJson['license'])) {
    const result = {
      _valid: true, 
      licenses: packageJson['license'].map(l => {
        if ((typeof l) === 'string') {
          return { _valid: true, type: (`${l || ''}`).trim(), };
        } else {
          return _parseSingleLicenseObject(l);
        }
      }).filter(l => l._valid)
    };

    return {
      ...result,
      _valid: result.licenses.length > 0
    };
  } else if (packageJson && (typeof packageJson['license']) === 'object' && packageJson['license']) {
    if ((typeof packageJson['license']['type']) !== 'undefined') {
      return {
        _valid: true, 
        licenses: [
          {
            _valid: true,
            type: packageJson['license']['type'],
            ...(
              (typeof packageJson['license']['url']) !== 'undefined' ? 
              { url: packageJson['license']['url'] } : 
              {}
            )
          }
        ]
      };
    }
  }

  return { _valid: false, licenses: [] };
}

function _extractLicenseInfoFromFile(filePath) {
  const data = ioutil.ReadFile(filePath);
  if (!data) {
    // Maybe file read error etc.
    return { _valid: false };
  }

  return _extractLicenseInfoFromString(data);
}

function _extractLicenseInfoFromString(data) {
  if (!data) {
    return { _valid: false };
  }

  const lines = data.split('\n');
  if (!Array.isArray(lines) || lines.length < 1) {
    // Empty file
    return { _valid: false };
  }

  // Check for the standard license header like: 'Copyright (C) 1969 ...'
  const m = lines[0].trim().match(CUSTOM_COPYRIGHT_MATCHER);
  if (m) {
    return {
      _valid: true,
      _confidence: 0.5,
      type: 'CUSTOM_LICENSE',
      licenseLine: lines[0],
    };
  }

  const beginning = lines.slice(0, Math.min(2, lines.length-1));
  // Check if MIT license
  const hasMitLicense = beginning.findIndex(p => {
    return (
      (p.toLowerCase().indexOf('mit license') > -1) ||
      (p.toLowerCase().indexOf('the mit license') > -1) ||
      (p.toLowerCase().indexOf('the mit license (mit)') > -1)
    )
  });

  if (hasMitLicense > -1) {
    return {
      _valid: true,
      _confidence: 0.75,
      type: 'MIT',
      licenseLine: lines[hasMitLicense],
    };
  }

  // Check for GNU GPL license
  const hasGnuGplLicense = beginning.findIndex(p => {
    return (
      (p.toUpperCase().indexOf('GNU GENERAL PUBLIC LICENSE') > -1) ||
      (p.toUpperCase().indexOf('GENERAL PUBLIC LICENSE') > -1)
    )
  });

  if (hasGnuGplLicense > -1) {
    return {
      _valid: true,
      _confidence: 0.75,
      type: 'GPL',
      licenseLine: lines[hasGnuGplLicense],
    };
  }

  // @see https://github.com/Illumina/licenses
  // Sorry, could not find anything
  return { _valid: false };
}

function isLicenseFileFilename(filename) {
  const pathl = (`${filename || ''}`).toLowerCase();
  
  // For American English ;-) 
  return ((pathl.endsWith('/license') || pathl.endsWith('/license.md') || 
    pathl.endsWith('/license.txt') || pathl.indexOf('/license') > -1)) ||
    // For British English ;-) 
    ((pathl.endsWith('/licence') || pathl.endsWith('/licence.md') || 
    pathl.endsWith('/licence.txt') || pathl.indexOf('/licence') > -1));
}

function extractLicenseInfoFromFiles(modulePath) {
  let files = readdirRec(modulePath);

  if (!Array.isArray(files) || files.length < 1) {
    return { _valid: false, licenses: [] };
  }

  // We need to exclude all node_modules wich are inside a module
  // itself and want to make sure, only to get the contents of the
  // requested node_module and its subdirectories
  files = files.filter(path => {
    const subpath = path.substring(modulePath.length) || '';
    return subpath.indexOf('node_modules') < 0
  });

  // Let's try to filter out all license files
  files = files.filter(path => isLicenseFileFilename(path));

  // Nothing found
  if (files.length < 1) {
    return { _valid: false, licenses: [] };
  }

  // Try to process the found files
  const rets = files.map(path => {
    const extr = _extractLicenseInfoFromFile(path)
    return {
      ...extr,
      _source: path.substring(modulePath.length + 1),
    } 
  });

  return {
    _valid: rets.filter(r => r._valid).length > 0,
    licenses: rets.filter(r => r._valid) || [],
  };
}

function extractLicenseInfoFromReadme(modulePath) {
  let files = ioutil.Readdir(modulePath);

  if (!Array.isArray(files) || files.length < 1) {
    return { _valid: false, licenses: [] };
  }

  // Find the README file
  files = files.filter(path => {
    const lpath = (`${path || ''}`).toLowerCase();
    return lpath.endsWith(`/readme.md`) || lpath.endsWith(`/readme`) || lpath.indexOf(`/readme`) > -1
  });

  // Nothing found
  if (files.length < 1) {
    return { _valid: false, licenses: [] };
  }

  const README = ioutil.ReadFile(files[0]);
  if (!README) {
    return { _valid: false, licenses: [] };
  }
  
  // Check if we have a markdown license heading
  const lines = README.split('\n');
  const idxLicenseHeading = lines.findIndex(p => (`${p || ''}`).trim().match(README_MD_LICENSE_HEADING))
  if (idxLicenseHeading > -1 && (idxLicenseHeading + 1) < lines.length) {
    const licenseTxt = lines.slice(idxLicenseHeading + 1).join('\n').trim();
    const ret = _extractLicenseInfoFromString(licenseTxt);
    if (ret._valid) {
      return {
        _valid: true, 
        licenses: [
          {
            ...ret,
            _confidence: Math.max(0.01, ret._confidence - 0.5),
            _source: files[0].substring(modulePath.length + 1),
          }
        ]
      };
    }
  }

  return { _valid: false, licenses: [] };
}

function extractLicenseInfo(packageJson, moduleRootPath) {
  // First we try to find a license inside the package.json
  const ret = extractLicenseInfoFromPackageJson(packageJson);
  if (ret._valid) {
    return ret;
  }

  // Then we check the file system
  const ret2 = extractLicenseInfoFromFiles(moduleRootPath);
  if (ret2._valid) {
    return ret2;
  }

  // And finally, let's look into the README if there is a license line
  const ret3 = extractLicenseInfoFromReadme(moduleRootPath);
  if (ret3._valid) {
    return ret3;
  }

  // And only if we can't find info inside the package.json or
  // the filesystem, we give up
  return { _valid: false };
}

function combineSubpathWithRepo(repoInfo, subPath) {
  if (!subPath || !repoInfo || !repoInfo._valid) {
    return null;
  }

  if (!repoInfo.url || !repoInfo.url.startsWith('http')) {
    return null;
  }

  // Get the URL and clean it up
  let url = repoInfo.url;
  if (url.endsWith('.git')) {
    url = url.substring(0, url.length - 4);
  } else if (url.endsWith('/')) {
    url = url.substring(0, url.length - 1);
  }

  if (subPath.startsWith('/')) {
    subPath = subPath.substring(1);
  }

  // For the mainstream git repo providers, we need to find a path into
  // the repo rather than providing the URL; furthermore we assume the
  // branch 'master'
  if (url.indexOf('github.com')) {
    return `${url}/blob/master/${subPath}`;
  }

  // e.g. https://bitbucket.org/multicoreware/x265_git/src/master/COPYING
  if (url.indexOf('bitbucket.com')) {
    return `${url}/src/master/${subPath}`;
  }

  // e.g. https://gitlab.com/gitlab-org/gitlab/-/blob/master/.gitlab-ci.yml
  if (url.indexOf('gitlab.com')) {
    return `${url}/-/blob/master/${subPath}`;
  }

  // Fallack
  return `${url}/${subPath}`;
}

module.exports = {
  extractLicenseInfo,
  extractLicenseInfoFromFiles,

  // Main functions
  combineSubpathWithRepo,
  extractSCMInfo,
  extractLicenseInfoFromPackageJson,
};