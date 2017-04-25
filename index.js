const postcss = require('postcss');
const fs = require('fs');

// Default filter regex
const NO_LOWER_CASE = /^[^a-z]+$/;

// Regex to match and extract the variable name (without the beginning `--`) in
// the value part of a declaration
const CSS_VAR_NAME = /var\(--([^)]+)\)/g;

// Use this as a cache for values read from files, keyed by their path.
let constantsFileCache = {};

/**
 * Returns a function for the main PostCSS chain.
 *
 * @param {string} options.file  Optional. Path to a file to read constants
 *                               from. Default false.
 * @param {RegExp} options.regex Optional. Regular expression to select
 *                               constants by from their names. Default
 *                               `/^[^a-z]+$/` (filters out any variable names
 *                               that contain lowercase letters.)
 * @return {Function|boolean} The function for PostCSS to run if a file was
 *                            supplied or false otherwise.
 */
function process({file = false, regex = NO_LOWER_CASE} = {}) {
  return root => {
    if (!file) {
      root.walkDecls(decl => {
        decl.value = resolveValue(decl.value, getConstants(root, regex));
      });
      return;
    }

    // Promise for async
    return new Promise(resolve => {

      // Get constants from file
      getConstantsFromFile(file, regex)
        .then(fileConstants => {
          // Merge with constants from current processing root
          const constants = getConstants(root, regex, fileConstants);

          root.walkDecls(decl => {
            decl.value = resolveValue(decl.value, constants);
          });

          resolve();
        });
    });
  }
}

/**
 * Replaces `var()` constant instances within a string with the relevant value.
 *
 * @param {string} value     The string value to process.
 * @param {object} constants Object of constants.
 * @return {string} Returns the processed string with any values resolved.
 */
function resolveValue(value, constants) {
  // Value does not contain any custom properties, return with given value.
  if (!value.includes('var(--')) {
    return value;
  }

  return value.replace(CSS_VAR_NAME, (match, p1) => {
    if (p1 in constants) {
      return constants[p1];
    }

    return match;
  });
}

/**
 * Get constants from a file.
 *
 * @param {string} file  Path to the file to read from.
 * @param {RegExp} regex Regular expression to select constants by from their
 *                       names.
 * @return {Promise} Resolves with object of constants.
 */
function getConstantsFromFile(file, regex) {
  return new Promise((resolve, reject) => {
    // If values from this file are already in cache:
    if (file in constantsFileCache) {
      resolve(constantsFileCache[file]);
      return;
    }

    fs.readFile(file, 'utf8', (err, data) => {
      if (err) return reject(err);

      // Parse file CSS
      const root = postcss.parse(data);

      constantsFileCache[file] = getConstants(root, regex);
      resolve(constantsFileCache[file]);
    });
  });
}

/**
 * Gets constants from a PostCSS root.
 *
 * @param {Root}   file      PostCSS Root object.
 * @param {RegExp} regex     Regular expression to select constants by from
 *                           their names.
 * @param {object} constants Optional. An object of existing constants to merge
 *                           new definitions into.
 * @return {object} Object of constants.
 */
function getConstants(root, regex, constants = {}) {
  root.walk(node => {
    if (node.type == 'rule' && node.selector == ':root') {
      node.walkDecls(decl => {
        if (decl.prop.indexOf('--') === 0 && regex.test(decl.prop)) {
          constants[decl.prop.substr(2)] = resolveValue(decl.value, constants);
          decl.remove();
        }
      });
      return false;
    }
  });

  return constants;
}

module.exports = postcss.plugin('postcss-consts', (options = {}) => {
    // If string option passed, then it is a file path string
    if (typeof options == 'string') {
      options = {file: options};
    }

    // If regex-type option passed, then it is the regex
    else if (options instanceof RegExp) {
      options = {regex: options};
    }

    return process(options);
});
