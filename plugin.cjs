"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/semver/internal/constants.js
var require_constants = __commonJS({
  "node_modules/semver/internal/constants.js"(exports2, module2) {
    "use strict";
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module2.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports2, module2) {
    "use strict";
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module2.exports = debug;
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports2, module2) {
    "use strict";
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants();
    var debug = require_debug();
    exports2 = module2.exports = {};
    var re = exports2.re = [];
    var safeRe = exports2.safeRe = [];
    var src = exports2.src = [];
    var safeSrc = exports2.safeSrc = [];
    var t = exports2.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token, max] of safeRegexReplacements) {
        value = value.split(`${token}*`).join(`${token}{0,${max}}`).split(`${token}+`).join(`${token}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      safeSrc[index] = safe;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NONNUMERICIDENTIFIER]}|${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports2.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports2.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports2.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports2, module2) {
    "use strict";
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options) => {
      if (!options) {
        return emptyOpts;
      }
      if (typeof options !== "object") {
        return looseOption;
      }
      return options;
    };
    module2.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports2, module2) {
    "use strict";
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      if (typeof a === "number" && typeof b === "number") {
        return a === b ? 0 : a < b ? -1 : 1;
      }
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module2.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports2, module2) {
    "use strict";
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options) {
        options = parseOptions(options);
        if (version instanceof _SemVer) {
          if (version.loose === !!options.loose && version.includePrerelease === !!options.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options);
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        const m = version.trim().match(options.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.major < other.major) {
          return -1;
        }
        if (this.major > other.major) {
          return 1;
        }
        if (this.minor < other.minor) {
          return -1;
        }
        if (this.minor > other.minor) {
          return 1;
        }
        if (this.patch < other.patch) {
          return -1;
        }
        if (this.patch > other.patch) {
          return 1;
        }
        return 0;
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        if (release.startsWith("pre")) {
          if (!identifier && identifierBase === false) {
            throw new Error("invalid increment argument: identifier is empty");
          }
          if (identifier) {
            const match = `-${identifier}`.match(this.options.loose ? re[t.PRERELEASELOOSE] : re[t.PRERELEASE]);
            if (!match || match[1] !== identifier) {
              throw new Error(`invalid identifier: ${identifier}`);
            }
          }
        }
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          // If the input is a non-prerelease version, this acts the same as
          // prepatch.
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "release":
            if (this.prerelease.length === 0) {
              throw new Error(`version ${this.raw} is not a prerelease`);
            }
            this.prerelease.length = 0;
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          // This probably shouldn't be used publicly.
          // 1.0.0 'pre' would become 1.0.0-0 which is the wrong direction.
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module2.exports = SemVer;
  }
});

// node_modules/semver/functions/parse.js
var require_parse = __commonJS({
  "node_modules/semver/functions/parse.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = (version, options, throwErrors = false) => {
      if (version instanceof SemVer) {
        return version;
      }
      try {
        return new SemVer(version, options);
      } catch (er) {
        if (!throwErrors) {
          return null;
        }
        throw er;
      }
    };
    module2.exports = parse;
  }
});

// node_modules/semver/functions/valid.js
var require_valid = __commonJS({
  "node_modules/semver/functions/valid.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var valid = (version, options) => {
      const v = parse(version, options);
      return v ? v.version : null;
    };
    module2.exports = valid;
  }
});

// node_modules/semver/functions/clean.js
var require_clean = __commonJS({
  "node_modules/semver/functions/clean.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var clean = (version, options) => {
      const s = parse(version.trim().replace(/^[=v]+/, ""), options);
      return s ? s.version : null;
    };
    module2.exports = clean;
  }
});

// node_modules/semver/functions/inc.js
var require_inc = __commonJS({
  "node_modules/semver/functions/inc.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var inc = (version, release, options, identifier, identifierBase) => {
      if (typeof options === "string") {
        identifierBase = identifier;
        identifier = options;
        options = void 0;
      }
      try {
        return new SemVer(
          version instanceof SemVer ? version.version : version,
          options
        ).inc(release, identifier, identifierBase).version;
      } catch (er) {
        return null;
      }
    };
    module2.exports = inc;
  }
});

// node_modules/semver/functions/diff.js
var require_diff = __commonJS({
  "node_modules/semver/functions/diff.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var diff = (version1, version2) => {
      const v1 = parse(version1, null, true);
      const v2 = parse(version2, null, true);
      const comparison = v1.compare(v2);
      if (comparison === 0) {
        return null;
      }
      const v1Higher = comparison > 0;
      const highVersion = v1Higher ? v1 : v2;
      const lowVersion = v1Higher ? v2 : v1;
      const highHasPre = !!highVersion.prerelease.length;
      const lowHasPre = !!lowVersion.prerelease.length;
      if (lowHasPre && !highHasPre) {
        if (!lowVersion.patch && !lowVersion.minor) {
          return "major";
        }
        if (lowVersion.compareMain(highVersion) === 0) {
          if (lowVersion.minor && !lowVersion.patch) {
            return "minor";
          }
          return "patch";
        }
      }
      const prefix = highHasPre ? "pre" : "";
      if (v1.major !== v2.major) {
        return prefix + "major";
      }
      if (v1.minor !== v2.minor) {
        return prefix + "minor";
      }
      if (v1.patch !== v2.patch) {
        return prefix + "patch";
      }
      return "prerelease";
    };
    module2.exports = diff;
  }
});

// node_modules/semver/functions/major.js
var require_major = __commonJS({
  "node_modules/semver/functions/major.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var major = (a, loose) => new SemVer(a, loose).major;
    module2.exports = major;
  }
});

// node_modules/semver/functions/minor.js
var require_minor = __commonJS({
  "node_modules/semver/functions/minor.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var minor = (a, loose) => new SemVer(a, loose).minor;
    module2.exports = minor;
  }
});

// node_modules/semver/functions/patch.js
var require_patch = __commonJS({
  "node_modules/semver/functions/patch.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var patch = (a, loose) => new SemVer(a, loose).patch;
    module2.exports = patch;
  }
});

// node_modules/semver/functions/prerelease.js
var require_prerelease = __commonJS({
  "node_modules/semver/functions/prerelease.js"(exports2, module2) {
    "use strict";
    var parse = require_parse();
    var prerelease = (version, options) => {
      const parsed = parse(version, options);
      return parsed && parsed.prerelease.length ? parsed.prerelease : null;
    };
    module2.exports = prerelease;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module2.exports = compare;
  }
});

// node_modules/semver/functions/rcompare.js
var require_rcompare = __commonJS({
  "node_modules/semver/functions/rcompare.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var rcompare = (a, b, loose) => compare(b, a, loose);
    module2.exports = rcompare;
  }
});

// node_modules/semver/functions/compare-loose.js
var require_compare_loose = __commonJS({
  "node_modules/semver/functions/compare-loose.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var compareLoose = (a, b) => compare(a, b, true);
    module2.exports = compareLoose;
  }
});

// node_modules/semver/functions/compare-build.js
var require_compare_build = __commonJS({
  "node_modules/semver/functions/compare-build.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var compareBuild = (a, b, loose) => {
      const versionA = new SemVer(a, loose);
      const versionB = new SemVer(b, loose);
      return versionA.compare(versionB) || versionA.compareBuild(versionB);
    };
    module2.exports = compareBuild;
  }
});

// node_modules/semver/functions/sort.js
var require_sort = __commonJS({
  "node_modules/semver/functions/sort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var sort = (list, loose) => list.sort((a, b) => compareBuild(a, b, loose));
    module2.exports = sort;
  }
});

// node_modules/semver/functions/rsort.js
var require_rsort = __commonJS({
  "node_modules/semver/functions/rsort.js"(exports2, module2) {
    "use strict";
    var compareBuild = require_compare_build();
    var rsort = (list, loose) => list.sort((a, b) => compareBuild(b, a, loose));
    module2.exports = rsort;
  }
});

// node_modules/semver/functions/gt.js
var require_gt = __commonJS({
  "node_modules/semver/functions/gt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gt = (a, b, loose) => compare(a, b, loose) > 0;
    module2.exports = gt;
  }
});

// node_modules/semver/functions/lt.js
var require_lt = __commonJS({
  "node_modules/semver/functions/lt.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lt = (a, b, loose) => compare(a, b, loose) < 0;
    module2.exports = lt;
  }
});

// node_modules/semver/functions/eq.js
var require_eq = __commonJS({
  "node_modules/semver/functions/eq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var eq = (a, b, loose) => compare(a, b, loose) === 0;
    module2.exports = eq;
  }
});

// node_modules/semver/functions/neq.js
var require_neq = __commonJS({
  "node_modules/semver/functions/neq.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var neq = (a, b, loose) => compare(a, b, loose) !== 0;
    module2.exports = neq;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module2.exports = gte;
  }
});

// node_modules/semver/functions/lte.js
var require_lte = __commonJS({
  "node_modules/semver/functions/lte.js"(exports2, module2) {
    "use strict";
    var compare = require_compare();
    var lte = (a, b, loose) => compare(a, b, loose) <= 0;
    module2.exports = lte;
  }
});

// node_modules/semver/functions/cmp.js
var require_cmp = __commonJS({
  "node_modules/semver/functions/cmp.js"(exports2, module2) {
    "use strict";
    var eq = require_eq();
    var neq = require_neq();
    var gt = require_gt();
    var gte = require_gte();
    var lt = require_lt();
    var lte = require_lte();
    var cmp = (a, op, b, loose) => {
      switch (op) {
        case "===":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a === b;
        case "!==":
          if (typeof a === "object") {
            a = a.version;
          }
          if (typeof b === "object") {
            b = b.version;
          }
          return a !== b;
        case "":
        case "=":
        case "==":
          return eq(a, b, loose);
        case "!=":
          return neq(a, b, loose);
        case ">":
          return gt(a, b, loose);
        case ">=":
          return gte(a, b, loose);
        case "<":
          return lt(a, b, loose);
        case "<=":
          return lte(a, b, loose);
        default:
          throw new TypeError(`Invalid operator: ${op}`);
      }
    };
    module2.exports = cmp;
  }
});

// node_modules/semver/functions/coerce.js
var require_coerce = __commonJS({
  "node_modules/semver/functions/coerce.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var parse = require_parse();
    var { safeRe: re, t } = require_re();
    var coerce = (version, options) => {
      if (version instanceof SemVer) {
        return version;
      }
      if (typeof version === "number") {
        version = String(version);
      }
      if (typeof version !== "string") {
        return null;
      }
      options = options || {};
      let match = null;
      if (!options.rtl) {
        match = version.match(options.includePrerelease ? re[t.COERCEFULL] : re[t.COERCE]);
      } else {
        const coerceRtlRegex = options.includePrerelease ? re[t.COERCERTLFULL] : re[t.COERCERTL];
        let next;
        while ((next = coerceRtlRegex.exec(version)) && (!match || match.index + match[0].length !== version.length)) {
          if (!match || next.index + next[0].length !== match.index + match[0].length) {
            match = next;
          }
          coerceRtlRegex.lastIndex = next.index + next[1].length + next[2].length;
        }
        coerceRtlRegex.lastIndex = -1;
      }
      if (match === null) {
        return null;
      }
      const major = match[2];
      const minor = match[3] || "0";
      const patch = match[4] || "0";
      const prerelease = options.includePrerelease && match[5] ? `-${match[5]}` : "";
      const build = options.includePrerelease && match[6] ? `+${match[6]}` : "";
      return parse(`${major}.${minor}.${patch}${prerelease}${build}`, options);
    };
    module2.exports = coerce;
  }
});

// node_modules/semver/internal/lrucache.js
var require_lrucache = __commonJS({
  "node_modules/semver/internal/lrucache.js"(exports2, module2) {
    "use strict";
    var LRUCache = class {
      constructor() {
        this.max = 1e3;
        this.map = /* @__PURE__ */ new Map();
      }
      get(key) {
        const value = this.map.get(key);
        if (value === void 0) {
          return void 0;
        } else {
          this.map.delete(key);
          this.map.set(key, value);
          return value;
        }
      }
      delete(key) {
        return this.map.delete(key);
      }
      set(key, value) {
        const deleted = this.delete(key);
        if (!deleted && value !== void 0) {
          if (this.map.size >= this.max) {
            const firstKey = this.map.keys().next().value;
            this.delete(firstKey);
          }
          this.map.set(key, value);
        }
        return this;
      }
    };
    module2.exports = LRUCache;
  }
});

// node_modules/semver/classes/range.js
var require_range = __commonJS({
  "node_modules/semver/classes/range.js"(exports2, module2) {
    "use strict";
    var SPACE_CHARACTERS = /\s+/g;
    var Range = class _Range {
      constructor(range, options) {
        options = parseOptions(options);
        if (range instanceof _Range) {
          if (range.loose === !!options.loose && range.includePrerelease === !!options.includePrerelease) {
            return range;
          } else {
            return new _Range(range.raw, options);
          }
        }
        if (range instanceof Comparator) {
          this.raw = range.value;
          this.set = [[range]];
          this.formatted = void 0;
          return this;
        }
        this.options = options;
        this.loose = !!options.loose;
        this.includePrerelease = !!options.includePrerelease;
        this.raw = range.trim().replace(SPACE_CHARACTERS, " ");
        this.set = this.raw.split("||").map((r) => this.parseRange(r.trim())).filter((c) => c.length);
        if (!this.set.length) {
          throw new TypeError(`Invalid SemVer Range: ${this.raw}`);
        }
        if (this.set.length > 1) {
          const first = this.set[0];
          this.set = this.set.filter((c) => !isNullSet(c[0]));
          if (this.set.length === 0) {
            this.set = [first];
          } else if (this.set.length > 1) {
            for (const c of this.set) {
              if (c.length === 1 && isAny(c[0])) {
                this.set = [c];
                break;
              }
            }
          }
        }
        this.formatted = void 0;
      }
      get range() {
        if (this.formatted === void 0) {
          this.formatted = "";
          for (let i = 0; i < this.set.length; i++) {
            if (i > 0) {
              this.formatted += "||";
            }
            const comps = this.set[i];
            for (let k = 0; k < comps.length; k++) {
              if (k > 0) {
                this.formatted += " ";
              }
              this.formatted += comps[k].toString().trim();
            }
          }
        }
        return this.formatted;
      }
      format() {
        return this.range;
      }
      toString() {
        return this.range;
      }
      parseRange(range) {
        const memoOpts = (this.options.includePrerelease && FLAG_INCLUDE_PRERELEASE) | (this.options.loose && FLAG_LOOSE);
        const memoKey = memoOpts + ":" + range;
        const cached = cache.get(memoKey);
        if (cached) {
          return cached;
        }
        const loose = this.options.loose;
        const hr = loose ? re[t.HYPHENRANGELOOSE] : re[t.HYPHENRANGE];
        range = range.replace(hr, hyphenReplace(this.options.includePrerelease));
        debug("hyphen replace", range);
        range = range.replace(re[t.COMPARATORTRIM], comparatorTrimReplace);
        debug("comparator trim", range);
        range = range.replace(re[t.TILDETRIM], tildeTrimReplace);
        debug("tilde trim", range);
        range = range.replace(re[t.CARETTRIM], caretTrimReplace);
        debug("caret trim", range);
        let rangeList = range.split(" ").map((comp) => parseComparator(comp, this.options)).join(" ").split(/\s+/).map((comp) => replaceGTE0(comp, this.options));
        if (loose) {
          rangeList = rangeList.filter((comp) => {
            debug("loose invalid filter", comp, this.options);
            return !!comp.match(re[t.COMPARATORLOOSE]);
          });
        }
        debug("range list", rangeList);
        const rangeMap = /* @__PURE__ */ new Map();
        const comparators = rangeList.map((comp) => new Comparator(comp, this.options));
        for (const comp of comparators) {
          if (isNullSet(comp)) {
            return [comp];
          }
          rangeMap.set(comp.value, comp);
        }
        if (rangeMap.size > 1 && rangeMap.has("")) {
          rangeMap.delete("");
        }
        const result = [...rangeMap.values()];
        cache.set(memoKey, result);
        return result;
      }
      intersects(range, options) {
        if (!(range instanceof _Range)) {
          throw new TypeError("a Range is required");
        }
        return this.set.some((thisComparators) => {
          return isSatisfiable(thisComparators, options) && range.set.some((rangeComparators) => {
            return isSatisfiable(rangeComparators, options) && thisComparators.every((thisComparator) => {
              return rangeComparators.every((rangeComparator) => {
                return thisComparator.intersects(rangeComparator, options);
              });
            });
          });
        });
      }
      // if ANY of the sets match ALL of its comparators, then pass
      test(version) {
        if (!version) {
          return false;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        for (let i = 0; i < this.set.length; i++) {
          if (testSet(this.set[i], version, this.options)) {
            return true;
          }
        }
        return false;
      }
    };
    module2.exports = Range;
    var LRU = require_lrucache();
    var cache = new LRU();
    var parseOptions = require_parse_options();
    var Comparator = require_comparator();
    var debug = require_debug();
    var SemVer = require_semver();
    var {
      safeRe: re,
      t,
      comparatorTrimReplace,
      tildeTrimReplace,
      caretTrimReplace
    } = require_re();
    var { FLAG_INCLUDE_PRERELEASE, FLAG_LOOSE } = require_constants();
    var isNullSet = (c) => c.value === "<0.0.0-0";
    var isAny = (c) => c.value === "";
    var isSatisfiable = (comparators, options) => {
      let result = true;
      const remainingComparators = comparators.slice();
      let testComparator = remainingComparators.pop();
      while (result && remainingComparators.length) {
        result = remainingComparators.every((otherComparator) => {
          return testComparator.intersects(otherComparator, options);
        });
        testComparator = remainingComparators.pop();
      }
      return result;
    };
    var parseComparator = (comp, options) => {
      comp = comp.replace(re[t.BUILD], "");
      debug("comp", comp, options);
      comp = replaceCarets(comp, options);
      debug("caret", comp);
      comp = replaceTildes(comp, options);
      debug("tildes", comp);
      comp = replaceXRanges(comp, options);
      debug("xrange", comp);
      comp = replaceStars(comp, options);
      debug("stars", comp);
      return comp;
    };
    var isX = (id) => !id || id.toLowerCase() === "x" || id === "*";
    var replaceTildes = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceTilde(c, options)).join(" ");
    };
    var replaceTilde = (comp, options) => {
      const r = options.loose ? re[t.TILDELOOSE] : re[t.TILDE];
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("tilde", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0 <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          ret = `>=${M}.${m}.0 <${M}.${+m + 1}.0-0`;
        } else if (pr) {
          debug("replaceTilde pr", pr);
          ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
        } else {
          ret = `>=${M}.${m}.${p} <${M}.${+m + 1}.0-0`;
        }
        debug("tilde return", ret);
        return ret;
      });
    };
    var replaceCarets = (comp, options) => {
      return comp.trim().split(/\s+/).map((c) => replaceCaret(c, options)).join(" ");
    };
    var replaceCaret = (comp, options) => {
      debug("caret", comp, options);
      const r = options.loose ? re[t.CARETLOOSE] : re[t.CARET];
      const z = options.includePrerelease ? "-0" : "";
      return comp.replace(r, (_, M, m, p, pr) => {
        debug("caret", comp, _, M, m, p, pr);
        let ret;
        if (isX(M)) {
          ret = "";
        } else if (isX(m)) {
          ret = `>=${M}.0.0${z} <${+M + 1}.0.0-0`;
        } else if (isX(p)) {
          if (M === "0") {
            ret = `>=${M}.${m}.0${z} <${M}.${+m + 1}.0-0`;
          } else {
            ret = `>=${M}.${m}.0${z} <${+M + 1}.0.0-0`;
          }
        } else if (pr) {
          debug("replaceCaret pr", pr);
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}-${pr} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p}-${pr} <${+M + 1}.0.0-0`;
          }
        } else {
          debug("no pr");
          if (M === "0") {
            if (m === "0") {
              ret = `>=${M}.${m}.${p}${z} <${M}.${m}.${+p + 1}-0`;
            } else {
              ret = `>=${M}.${m}.${p}${z} <${M}.${+m + 1}.0-0`;
            }
          } else {
            ret = `>=${M}.${m}.${p} <${+M + 1}.0.0-0`;
          }
        }
        debug("caret return", ret);
        return ret;
      });
    };
    var replaceXRanges = (comp, options) => {
      debug("replaceXRanges", comp, options);
      return comp.split(/\s+/).map((c) => replaceXRange(c, options)).join(" ");
    };
    var replaceXRange = (comp, options) => {
      comp = comp.trim();
      const r = options.loose ? re[t.XRANGELOOSE] : re[t.XRANGE];
      return comp.replace(r, (ret, gtlt, M, m, p, pr) => {
        debug("xRange", comp, ret, gtlt, M, m, p, pr);
        const xM = isX(M);
        const xm = xM || isX(m);
        const xp = xm || isX(p);
        const anyX = xp;
        if (gtlt === "=" && anyX) {
          gtlt = "";
        }
        pr = options.includePrerelease ? "-0" : "";
        if (xM) {
          if (gtlt === ">" || gtlt === "<") {
            ret = "<0.0.0-0";
          } else {
            ret = "*";
          }
        } else if (gtlt && anyX) {
          if (xm) {
            m = 0;
          }
          p = 0;
          if (gtlt === ">") {
            gtlt = ">=";
            if (xm) {
              M = +M + 1;
              m = 0;
              p = 0;
            } else {
              m = +m + 1;
              p = 0;
            }
          } else if (gtlt === "<=") {
            gtlt = "<";
            if (xm) {
              M = +M + 1;
            } else {
              m = +m + 1;
            }
          }
          if (gtlt === "<") {
            pr = "-0";
          }
          ret = `${gtlt + M}.${m}.${p}${pr}`;
        } else if (xm) {
          ret = `>=${M}.0.0${pr} <${+M + 1}.0.0-0`;
        } else if (xp) {
          ret = `>=${M}.${m}.0${pr} <${M}.${+m + 1}.0-0`;
        }
        debug("xRange return", ret);
        return ret;
      });
    };
    var replaceStars = (comp, options) => {
      debug("replaceStars", comp, options);
      return comp.trim().replace(re[t.STAR], "");
    };
    var replaceGTE0 = (comp, options) => {
      debug("replaceGTE0", comp, options);
      return comp.trim().replace(re[options.includePrerelease ? t.GTE0PRE : t.GTE0], "");
    };
    var hyphenReplace = (incPr) => ($0, from, fM, fm, fp, fpr, fb, to, tM, tm, tp, tpr) => {
      if (isX(fM)) {
        from = "";
      } else if (isX(fm)) {
        from = `>=${fM}.0.0${incPr ? "-0" : ""}`;
      } else if (isX(fp)) {
        from = `>=${fM}.${fm}.0${incPr ? "-0" : ""}`;
      } else if (fpr) {
        from = `>=${from}`;
      } else {
        from = `>=${from}${incPr ? "-0" : ""}`;
      }
      if (isX(tM)) {
        to = "";
      } else if (isX(tm)) {
        to = `<${+tM + 1}.0.0-0`;
      } else if (isX(tp)) {
        to = `<${tM}.${+tm + 1}.0-0`;
      } else if (tpr) {
        to = `<=${tM}.${tm}.${tp}-${tpr}`;
      } else if (incPr) {
        to = `<${tM}.${tm}.${+tp + 1}-0`;
      } else {
        to = `<=${to}`;
      }
      return `${from} ${to}`.trim();
    };
    var testSet = (set, version, options) => {
      for (let i = 0; i < set.length; i++) {
        if (!set[i].test(version)) {
          return false;
        }
      }
      if (version.prerelease.length && !options.includePrerelease) {
        for (let i = 0; i < set.length; i++) {
          debug(set[i].semver);
          if (set[i].semver === Comparator.ANY) {
            continue;
          }
          if (set[i].semver.prerelease.length > 0) {
            const allowed = set[i].semver;
            if (allowed.major === version.major && allowed.minor === version.minor && allowed.patch === version.patch) {
              return true;
            }
          }
        }
        return false;
      }
      return true;
    };
  }
});

// node_modules/semver/classes/comparator.js
var require_comparator = __commonJS({
  "node_modules/semver/classes/comparator.js"(exports2, module2) {
    "use strict";
    var ANY = /* @__PURE__ */ Symbol("SemVer ANY");
    var Comparator = class _Comparator {
      static get ANY() {
        return ANY;
      }
      constructor(comp, options) {
        options = parseOptions(options);
        if (comp instanceof _Comparator) {
          if (comp.loose === !!options.loose) {
            return comp;
          } else {
            comp = comp.value;
          }
        }
        comp = comp.trim().split(/\s+/).join(" ");
        debug("comparator", comp, options);
        this.options = options;
        this.loose = !!options.loose;
        this.parse(comp);
        if (this.semver === ANY) {
          this.value = "";
        } else {
          this.value = this.operator + this.semver.version;
        }
        debug("comp", this);
      }
      parse(comp) {
        const r = this.options.loose ? re[t.COMPARATORLOOSE] : re[t.COMPARATOR];
        const m = comp.match(r);
        if (!m) {
          throw new TypeError(`Invalid comparator: ${comp}`);
        }
        this.operator = m[1] !== void 0 ? m[1] : "";
        if (this.operator === "=") {
          this.operator = "";
        }
        if (!m[2]) {
          this.semver = ANY;
        } else {
          this.semver = new SemVer(m[2], this.options.loose);
        }
      }
      toString() {
        return this.value;
      }
      test(version) {
        debug("Comparator.test", version, this.options.loose);
        if (this.semver === ANY || version === ANY) {
          return true;
        }
        if (typeof version === "string") {
          try {
            version = new SemVer(version, this.options);
          } catch (er) {
            return false;
          }
        }
        return cmp(version, this.operator, this.semver, this.options);
      }
      intersects(comp, options) {
        if (!(comp instanceof _Comparator)) {
          throw new TypeError("a Comparator is required");
        }
        if (this.operator === "") {
          if (this.value === "") {
            return true;
          }
          return new Range(comp.value, options).test(this.value);
        } else if (comp.operator === "") {
          if (comp.value === "") {
            return true;
          }
          return new Range(this.value, options).test(comp.semver);
        }
        options = parseOptions(options);
        if (options.includePrerelease && (this.value === "<0.0.0-0" || comp.value === "<0.0.0-0")) {
          return false;
        }
        if (!options.includePrerelease && (this.value.startsWith("<0.0.0") || comp.value.startsWith("<0.0.0"))) {
          return false;
        }
        if (this.operator.startsWith(">") && comp.operator.startsWith(">")) {
          return true;
        }
        if (this.operator.startsWith("<") && comp.operator.startsWith("<")) {
          return true;
        }
        if (this.semver.version === comp.semver.version && this.operator.includes("=") && comp.operator.includes("=")) {
          return true;
        }
        if (cmp(this.semver, "<", comp.semver, options) && this.operator.startsWith(">") && comp.operator.startsWith("<")) {
          return true;
        }
        if (cmp(this.semver, ">", comp.semver, options) && this.operator.startsWith("<") && comp.operator.startsWith(">")) {
          return true;
        }
        return false;
      }
    };
    module2.exports = Comparator;
    var parseOptions = require_parse_options();
    var { safeRe: re, t } = require_re();
    var cmp = require_cmp();
    var debug = require_debug();
    var SemVer = require_semver();
    var Range = require_range();
  }
});

// node_modules/semver/functions/satisfies.js
var require_satisfies = __commonJS({
  "node_modules/semver/functions/satisfies.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var satisfies = (version, range, options) => {
      try {
        range = new Range(range, options);
      } catch (er) {
        return false;
      }
      return range.test(version);
    };
    module2.exports = satisfies;
  }
});

// node_modules/semver/ranges/to-comparators.js
var require_to_comparators = __commonJS({
  "node_modules/semver/ranges/to-comparators.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var toComparators = (range, options) => new Range(range, options).set.map((comp) => comp.map((c) => c.value).join(" ").trim().split(" "));
    module2.exports = toComparators;
  }
});

// node_modules/semver/ranges/max-satisfying.js
var require_max_satisfying = __commonJS({
  "node_modules/semver/ranges/max-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var maxSatisfying = (versions, range, options) => {
      let max = null;
      let maxSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!max || maxSV.compare(v) === -1) {
            max = v;
            maxSV = new SemVer(max, options);
          }
        }
      });
      return max;
    };
    module2.exports = maxSatisfying;
  }
});

// node_modules/semver/ranges/min-satisfying.js
var require_min_satisfying = __commonJS({
  "node_modules/semver/ranges/min-satisfying.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var minSatisfying = (versions, range, options) => {
      let min = null;
      let minSV = null;
      let rangeObj = null;
      try {
        rangeObj = new Range(range, options);
      } catch (er) {
        return null;
      }
      versions.forEach((v) => {
        if (rangeObj.test(v)) {
          if (!min || minSV.compare(v) === 1) {
            min = v;
            minSV = new SemVer(min, options);
          }
        }
      });
      return min;
    };
    module2.exports = minSatisfying;
  }
});

// node_modules/semver/ranges/min-version.js
var require_min_version = __commonJS({
  "node_modules/semver/ranges/min-version.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Range = require_range();
    var gt = require_gt();
    var minVersion = (range, loose) => {
      range = new Range(range, loose);
      let minver = new SemVer("0.0.0");
      if (range.test(minver)) {
        return minver;
      }
      minver = new SemVer("0.0.0-0");
      if (range.test(minver)) {
        return minver;
      }
      minver = null;
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let setMin = null;
        comparators.forEach((comparator) => {
          const compver = new SemVer(comparator.semver.version);
          switch (comparator.operator) {
            case ">":
              if (compver.prerelease.length === 0) {
                compver.patch++;
              } else {
                compver.prerelease.push(0);
              }
              compver.raw = compver.format();
            /* fallthrough */
            case "":
            case ">=":
              if (!setMin || gt(compver, setMin)) {
                setMin = compver;
              }
              break;
            case "<":
            case "<=":
              break;
            /* istanbul ignore next */
            default:
              throw new Error(`Unexpected operation: ${comparator.operator}`);
          }
        });
        if (setMin && (!minver || gt(minver, setMin))) {
          minver = setMin;
        }
      }
      if (minver && range.test(minver)) {
        return minver;
      }
      return null;
    };
    module2.exports = minVersion;
  }
});

// node_modules/semver/ranges/valid.js
var require_valid2 = __commonJS({
  "node_modules/semver/ranges/valid.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var validRange = (range, options) => {
      try {
        return new Range(range, options).range || "*";
      } catch (er) {
        return null;
      }
    };
    module2.exports = validRange;
  }
});

// node_modules/semver/ranges/outside.js
var require_outside = __commonJS({
  "node_modules/semver/ranges/outside.js"(exports2, module2) {
    "use strict";
    var SemVer = require_semver();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var Range = require_range();
    var satisfies = require_satisfies();
    var gt = require_gt();
    var lt = require_lt();
    var lte = require_lte();
    var gte = require_gte();
    var outside = (version, range, hilo, options) => {
      version = new SemVer(version, options);
      range = new Range(range, options);
      let gtfn, ltefn, ltfn, comp, ecomp;
      switch (hilo) {
        case ">":
          gtfn = gt;
          ltefn = lte;
          ltfn = lt;
          comp = ">";
          ecomp = ">=";
          break;
        case "<":
          gtfn = lt;
          ltefn = gte;
          ltfn = gt;
          comp = "<";
          ecomp = "<=";
          break;
        default:
          throw new TypeError('Must provide a hilo val of "<" or ">"');
      }
      if (satisfies(version, range, options)) {
        return false;
      }
      for (let i = 0; i < range.set.length; ++i) {
        const comparators = range.set[i];
        let high = null;
        let low = null;
        comparators.forEach((comparator) => {
          if (comparator.semver === ANY) {
            comparator = new Comparator(">=0.0.0");
          }
          high = high || comparator;
          low = low || comparator;
          if (gtfn(comparator.semver, high.semver, options)) {
            high = comparator;
          } else if (ltfn(comparator.semver, low.semver, options)) {
            low = comparator;
          }
        });
        if (high.operator === comp || high.operator === ecomp) {
          return false;
        }
        if ((!low.operator || low.operator === comp) && ltefn(version, low.semver)) {
          return false;
        } else if (low.operator === ecomp && ltfn(version, low.semver)) {
          return false;
        }
      }
      return true;
    };
    module2.exports = outside;
  }
});

// node_modules/semver/ranges/gtr.js
var require_gtr = __commonJS({
  "node_modules/semver/ranges/gtr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var gtr = (version, range, options) => outside(version, range, ">", options);
    module2.exports = gtr;
  }
});

// node_modules/semver/ranges/ltr.js
var require_ltr = __commonJS({
  "node_modules/semver/ranges/ltr.js"(exports2, module2) {
    "use strict";
    var outside = require_outside();
    var ltr = (version, range, options) => outside(version, range, "<", options);
    module2.exports = ltr;
  }
});

// node_modules/semver/ranges/intersects.js
var require_intersects = __commonJS({
  "node_modules/semver/ranges/intersects.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var intersects = (r1, r2, options) => {
      r1 = new Range(r1, options);
      r2 = new Range(r2, options);
      return r1.intersects(r2, options);
    };
    module2.exports = intersects;
  }
});

// node_modules/semver/ranges/simplify.js
var require_simplify = __commonJS({
  "node_modules/semver/ranges/simplify.js"(exports2, module2) {
    "use strict";
    var satisfies = require_satisfies();
    var compare = require_compare();
    module2.exports = (versions, range, options) => {
      const set = [];
      let first = null;
      let prev = null;
      const v = versions.sort((a, b) => compare(a, b, options));
      for (const version of v) {
        const included = satisfies(version, range, options);
        if (included) {
          prev = version;
          if (!first) {
            first = version;
          }
        } else {
          if (prev) {
            set.push([first, prev]);
          }
          prev = null;
          first = null;
        }
      }
      if (first) {
        set.push([first, null]);
      }
      const ranges = [];
      for (const [min, max] of set) {
        if (min === max) {
          ranges.push(min);
        } else if (!max && min === v[0]) {
          ranges.push("*");
        } else if (!max) {
          ranges.push(`>=${min}`);
        } else if (min === v[0]) {
          ranges.push(`<=${max}`);
        } else {
          ranges.push(`${min} - ${max}`);
        }
      }
      const simplified = ranges.join(" || ");
      const original = typeof range.raw === "string" ? range.raw : String(range);
      return simplified.length < original.length ? simplified : range;
    };
  }
});

// node_modules/semver/ranges/subset.js
var require_subset = __commonJS({
  "node_modules/semver/ranges/subset.js"(exports2, module2) {
    "use strict";
    var Range = require_range();
    var Comparator = require_comparator();
    var { ANY } = Comparator;
    var satisfies = require_satisfies();
    var compare = require_compare();
    var subset = (sub, dom, options = {}) => {
      if (sub === dom) {
        return true;
      }
      sub = new Range(sub, options);
      dom = new Range(dom, options);
      let sawNonNull = false;
      OUTER: for (const simpleSub of sub.set) {
        for (const simpleDom of dom.set) {
          const isSub = simpleSubset(simpleSub, simpleDom, options);
          sawNonNull = sawNonNull || isSub !== null;
          if (isSub) {
            continue OUTER;
          }
        }
        if (sawNonNull) {
          return false;
        }
      }
      return true;
    };
    var minimumVersionWithPreRelease = [new Comparator(">=0.0.0-0")];
    var minimumVersion = [new Comparator(">=0.0.0")];
    var simpleSubset = (sub, dom, options) => {
      if (sub === dom) {
        return true;
      }
      if (sub.length === 1 && sub[0].semver === ANY) {
        if (dom.length === 1 && dom[0].semver === ANY) {
          return true;
        } else if (options.includePrerelease) {
          sub = minimumVersionWithPreRelease;
        } else {
          sub = minimumVersion;
        }
      }
      if (dom.length === 1 && dom[0].semver === ANY) {
        if (options.includePrerelease) {
          return true;
        } else {
          dom = minimumVersion;
        }
      }
      const eqSet = /* @__PURE__ */ new Set();
      let gt, lt;
      for (const c of sub) {
        if (c.operator === ">" || c.operator === ">=") {
          gt = higherGT(gt, c, options);
        } else if (c.operator === "<" || c.operator === "<=") {
          lt = lowerLT(lt, c, options);
        } else {
          eqSet.add(c.semver);
        }
      }
      if (eqSet.size > 1) {
        return null;
      }
      let gtltComp;
      if (gt && lt) {
        gtltComp = compare(gt.semver, lt.semver, options);
        if (gtltComp > 0) {
          return null;
        } else if (gtltComp === 0 && (gt.operator !== ">=" || lt.operator !== "<=")) {
          return null;
        }
      }
      for (const eq of eqSet) {
        if (gt && !satisfies(eq, String(gt), options)) {
          return null;
        }
        if (lt && !satisfies(eq, String(lt), options)) {
          return null;
        }
        for (const c of dom) {
          if (!satisfies(eq, String(c), options)) {
            return false;
          }
        }
        return true;
      }
      let higher, lower;
      let hasDomLT, hasDomGT;
      let needDomLTPre = lt && !options.includePrerelease && lt.semver.prerelease.length ? lt.semver : false;
      let needDomGTPre = gt && !options.includePrerelease && gt.semver.prerelease.length ? gt.semver : false;
      if (needDomLTPre && needDomLTPre.prerelease.length === 1 && lt.operator === "<" && needDomLTPre.prerelease[0] === 0) {
        needDomLTPre = false;
      }
      for (const c of dom) {
        hasDomGT = hasDomGT || c.operator === ">" || c.operator === ">=";
        hasDomLT = hasDomLT || c.operator === "<" || c.operator === "<=";
        if (gt) {
          if (needDomGTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomGTPre.major && c.semver.minor === needDomGTPre.minor && c.semver.patch === needDomGTPre.patch) {
              needDomGTPre = false;
            }
          }
          if (c.operator === ">" || c.operator === ">=") {
            higher = higherGT(gt, c, options);
            if (higher === c && higher !== gt) {
              return false;
            }
          } else if (gt.operator === ">=" && !satisfies(gt.semver, String(c), options)) {
            return false;
          }
        }
        if (lt) {
          if (needDomLTPre) {
            if (c.semver.prerelease && c.semver.prerelease.length && c.semver.major === needDomLTPre.major && c.semver.minor === needDomLTPre.minor && c.semver.patch === needDomLTPre.patch) {
              needDomLTPre = false;
            }
          }
          if (c.operator === "<" || c.operator === "<=") {
            lower = lowerLT(lt, c, options);
            if (lower === c && lower !== lt) {
              return false;
            }
          } else if (lt.operator === "<=" && !satisfies(lt.semver, String(c), options)) {
            return false;
          }
        }
        if (!c.operator && (lt || gt) && gtltComp !== 0) {
          return false;
        }
      }
      if (gt && hasDomLT && !lt && gtltComp !== 0) {
        return false;
      }
      if (lt && hasDomGT && !gt && gtltComp !== 0) {
        return false;
      }
      if (needDomGTPre || needDomLTPre) {
        return false;
      }
      return true;
    };
    var higherGT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp > 0 ? a : comp < 0 ? b : b.operator === ">" && a.operator === ">=" ? b : a;
    };
    var lowerLT = (a, b, options) => {
      if (!a) {
        return b;
      }
      const comp = compare(a.semver, b.semver, options);
      return comp < 0 ? a : comp > 0 ? b : b.operator === "<" && a.operator === "<=" ? b : a;
    };
    module2.exports = subset;
  }
});

// node_modules/semver/index.js
var require_semver2 = __commonJS({
  "node_modules/semver/index.js"(exports2, module2) {
    "use strict";
    var internalRe = require_re();
    var constants = require_constants();
    var SemVer = require_semver();
    var identifiers = require_identifiers();
    var parse = require_parse();
    var valid = require_valid();
    var clean = require_clean();
    var inc = require_inc();
    var diff = require_diff();
    var major = require_major();
    var minor = require_minor();
    var patch = require_patch();
    var prerelease = require_prerelease();
    var compare = require_compare();
    var rcompare = require_rcompare();
    var compareLoose = require_compare_loose();
    var compareBuild = require_compare_build();
    var sort = require_sort();
    var rsort = require_rsort();
    var gt = require_gt();
    var lt = require_lt();
    var eq = require_eq();
    var neq = require_neq();
    var gte = require_gte();
    var lte = require_lte();
    var cmp = require_cmp();
    var coerce = require_coerce();
    var Comparator = require_comparator();
    var Range = require_range();
    var satisfies = require_satisfies();
    var toComparators = require_to_comparators();
    var maxSatisfying = require_max_satisfying();
    var minSatisfying = require_min_satisfying();
    var minVersion = require_min_version();
    var validRange = require_valid2();
    var outside = require_outside();
    var gtr = require_gtr();
    var ltr = require_ltr();
    var intersects = require_intersects();
    var simplifyRange = require_simplify();
    var subset = require_subset();
    module2.exports = {
      parse,
      valid,
      clean,
      inc,
      diff,
      major,
      minor,
      patch,
      prerelease,
      compare,
      rcompare,
      compareLoose,
      compareBuild,
      sort,
      rsort,
      gt,
      lt,
      eq,
      neq,
      gte,
      lte,
      cmp,
      coerce,
      Comparator,
      Range,
      satisfies,
      toComparators,
      maxSatisfying,
      minSatisfying,
      minVersion,
      validRange,
      outside,
      gtr,
      ltr,
      intersects,
      simplifyRange,
      subset,
      SemVer,
      re: internalRe.re,
      src: internalRe.src,
      tokens: internalRe.t,
      SEMVER_SPEC_VERSION: constants.SEMVER_SPEC_VERSION,
      RELEASE_TYPES: constants.RELEASE_TYPES,
      compareIdentifiers: identifiers.compareIdentifiers,
      rcompareIdentifiers: identifiers.rcompareIdentifiers
    };
  }
});

// src/distributed-semaphore.ts
var distributed_semaphore_exports = {};
__export(distributed_semaphore_exports, {
  DistributedSemaphore: () => DistributedSemaphore,
  createDistributedSemaphoreIfEnabled: () => createDistributedSemaphoreIfEnabled
});
async function getDb2() {
  const db = globalThis.__claudeCli?.db;
  if (!db) throw new Error("[claude-cli] DB not initialized \u2014 call bootstrap() first");
  return db;
}
async function createDistributedSemaphoreIfEnabled(maxConcurrent) {
  if (process.env["CLAUDE_CLI_DISTRIBUTED_MODE"] !== "true") return null;
  try {
    const instanceId = (0, import_node_crypto2.randomUUID)();
    const sem = new DistributedSemaphore(instanceId, maxConcurrent);
    await sem.seed();
    return sem;
  } catch {
    return null;
  }
}
var import_node_crypto2, DistributedSemaphore;
var init_distributed_semaphore = __esm({
  "src/distributed-semaphore.ts"() {
    "use strict";
    import_node_crypto2 = require("node:crypto");
    DistributedSemaphore = class {
      instanceId;
      maxConcurrent;
      staleTimeoutMs = 6e5;
      staleCleanupInterval;
      constructor(instanceId, maxConcurrent) {
        this.instanceId = instanceId;
        this.maxConcurrent = maxConcurrent;
        this.staleCleanupInterval = setInterval(() => {
          void this._cleanStaleSlots();
        }, 6e4);
        this.staleCleanupInterval.unref?.();
      }
      destroy() {
        clearInterval(this.staleCleanupInterval);
      }
      async seed() {
        const db = await getDb2();
        await db.$executeRaw`
      INSERT INTO "plugin_claude_cli_semaphore_slot" (id)
      SELECT generate_series(1, ${this.maxConcurrent})
      ON CONFLICT (id) DO NOTHING
    `;
        await db.$executeRaw`
      DELETE FROM "plugin_claude_cli_semaphore_slot"
      WHERE id > ${this.maxConcurrent}
    `;
      }
      async acquire() {
        const db = await getDb2();
        for (let attempt = 0; ; attempt++) {
          const slotId = await this._tryAcquireOneSlot(db);
          if (slotId !== null) return slotId;
          const backoffMs = Math.min(100 * Math.pow(2, attempt), 2e3);
          const jitterMs = Math.floor(Math.random() * 50);
          await new Promise((r) => setTimeout(r, backoffMs + jitterMs));
        }
      }
      async _cleanStaleSlots() {
        try {
          const db = await getDb2();
          const staleThreshold = new Date(Date.now() - this.staleTimeoutMs);
          await db.$executeRaw`
        UPDATE "plugin_claude_cli_semaphore_slot"
        SET held_by = NULL, held_at = NULL
        WHERE held_by IS NOT NULL AND held_at < ${staleThreshold}
      `;
        } catch {
        }
      }
      async release(slotId) {
        if (typeof slotId !== "number") return;
        const db = await getDb2();
        await db.$executeRaw`
      UPDATE "plugin_claude_cli_semaphore_slot"
      SET held_by = NULL, held_at = NULL
      WHERE id = ${slotId} AND held_by = ${this.instanceId}
    `;
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      async _tryAcquireOneSlot(db) {
        return db.$transaction(async (tx) => {
          const rows = await tx.$queryRaw`
        SELECT id FROM "plugin_claude_cli_semaphore_slot"
        WHERE held_by IS NULL
        ORDER BY id ASC
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      `;
          if (!rows.length) return null;
          const slotId = rows[0].id;
          await tx.$executeRaw`
        UPDATE "plugin_claude_cli_semaphore_slot"
        SET held_by = ${this.instanceId}, held_at = ${/* @__PURE__ */ new Date()}
        WHERE id = ${slotId}
      `;
          return slotId;
        });
      }
    };
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AuthError: () => AuthError,
  RateLimitError: () => RateLimitError,
  buildArgs: () => buildArgs,
  buildEnv: () => buildEnv,
  createScratchDir: () => createScratchDir,
  getCliState: () => getCliState,
  initWithDb: () => initWithDb,
  loadCliConfig: () => loadCliConfig,
  parseStreamJson: () => parseStreamJson,
  pingAuth: () => pingAuth,
  register: () => register,
  removeScratchDir: () => removeScratchDir,
  setActiveSemaphore: () => setActiveSemaphore,
  spawnClaude: () => spawnClaude,
  validate: () => validate
});
module.exports = __toCommonJS(index_exports);
var import_node_child_process2 = require("node:child_process");
var import_node_crypto3 = require("node:crypto");
var import_semver = __toESM(require_semver2());

// src/cli-client.ts
var import_node_path = __toESM(require("node:path"));
var import_node_fs = require("node:fs");
var import_node_child_process = require("node:child_process");
var import_node_crypto = require("node:crypto");
var AuthError = class extends Error {
  constructor(message = "[claude-cli] Token expired \u2014 regenerate with: claude setup-token") {
    super(message);
    this.name = "AuthError";
  }
};
var RateLimitError = class extends Error {
  constructor(message, resetAt) {
    super(message);
    this.resetAt = resetAt;
    this.name = "RateLimitError";
  }
  resetAt;
};
if (!globalThis.__claudeCli) {
  globalThis.__claudeCli = {
    state: {
      sessionExhaustedUntil: null,
      weeklyNonOpusExhaustedUntil: null,
      weeklyOpusExhaustedUntil: null,
      sessionCallCount: 0,
      sessionTokensIn: 0,
      sessionTokensOut: 0,
      weeklyNonOpusCallCount: 0,
      weeklyNonOpusTokensIn: 0,
      weeklyNonOpusTokensOut: 0,
      weeklyOpusCallCount: 0,
      weeklyOpusTokensIn: 0,
      weeklyOpusTokensOut: 0,
      sessionWindowStart: null,
      weeklyWindowStart: null,
      weeklyOverageUsd: 0
    },
    pluginStatus: "not_configured",
    deadReason: void 0,
    semaphore: null,
    stateMutex: null,
    circuit: {
      circuitState: "closed",
      failureCount: 0,
      lastFailureAt: null,
      circuitOpenedAt: null
    },
    config: null,
    debugLog: [],
    debugSubs: /* @__PURE__ */ new Set(),
    db: null,
    persistSnapshotFn: void 0
  };
}
var _g = globalThis.__claudeCli;
function initWithDb(db) {
  _g.db = db;
  cliLog("info", "DB injected via initWithDb()");
}
async function getDb() {
  if (!_g.db) {
    throw new Error("[claude-cli] DB not initialized \u2014 call bootstrap() before making LLM calls");
  }
  return _g.db;
}
var SENSITIVE_PATTERN = /sk-ant-(?:oat\d{2}-|api0[23]-)[A-Za-z0-9\-_]{10,}/g;
function redactSensitive(msg) {
  return msg.replace(SENSITIVE_PATTERN, "[REDACTED]");
}
function cliLog(level, rawMsg, profile) {
  const msg = redactSensitive(rawMsg);
  const entry = { ts: (/* @__PURE__ */ new Date()).toISOString(), level, msg, profile };
  _g.debugLog.push(entry);
  if (_g.debugLog.length > 200) _g.debugLog.shift();
  for (const sub of _g.debugSubs) {
    try {
      sub(entry);
    } catch {
    }
  }
  const line = `[claude-cli${profile ? ":" + profile : ""}] ${msg}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
var _state = _g.state;
var Semaphore = class {
  permits;
  queue = [];
  constructor(maxPermits) {
    this.permits = maxPermits;
  }
  async acquire() {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise((resolve) => {
      this.queue.push(resolve);
    });
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  release(_token) {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next();
    } else {
      this.permits++;
    }
  }
};
async function resolveScratchBaseDir(configured) {
  if (configured !== "/tmp/harmoven-claude") return configured;
  try {
    await import_node_fs.promises.access(
      "/dev/shm",
      2
      /* W_OK */
    );
    return "/dev/shm/harmoven-claude";
  } catch {
    return configured;
  }
}
function setActiveSemaphore(sem) {
  _g.semaphore = sem;
  cliLog("info", `Active semaphore set: ${sem.constructor.name}`);
}
function setConfig(cfg) {
  _g.config = cfg;
  _g.semaphore = new Semaphore(cfg.maxConcurrent);
  resolveScratchBaseDir(cfg.scratchBaseDir).then((resolved) => {
    if (_g.config && resolved !== _g.config.scratchBaseDir) {
      cliLog("info", `scratchBaseDir resolved to ${resolved} (tmpfs)`);
      _g.config = { ..._g.config, scratchBaseDir: resolved };
    }
  }).catch(() => {
  });
  import_node_fs.promises.readdir(cfg.scratchBaseDir).then((entries) => Promise.all(
    entries.map((e) => import_node_fs.promises.rm(import_node_path.default.join(cfg.scratchBaseDir, e), { recursive: true, force: true }))
  )).catch(() => {
  });
}
function requireConfig() {
  if (!_g.config) throw new Error("[claude-cli] Plugin not initialized \u2014 call register() first");
  return _g.config;
}
function getCliState() {
  return {
    pluginStatus: _g.pluginStatus,
    deadReason: _g.deadReason,
    circuit: { ..._g.circuit },
    session: {
      windowStart: _state.sessionWindowStart?.toISOString() ?? null,
      exhaustedUntil: _state.sessionExhaustedUntil?.toISOString() ?? null,
      callCount: _state.sessionCallCount,
      tokensIn: _state.sessionTokensIn,
      tokensOut: _state.sessionTokensOut
    },
    weekly: {
      windowStart: _state.weeklyWindowStart?.toISOString() ?? null,
      overageUsd: _state.weeklyOverageUsd,
      nonOpus: {
        exhaustedUntil: _state.weeklyNonOpusExhaustedUntil?.toISOString() ?? null,
        callCount: _state.weeklyNonOpusCallCount,
        tokensIn: _state.weeklyNonOpusTokensIn,
        tokensOut: _state.weeklyNonOpusTokensOut
      },
      opus: {
        exhaustedUntil: _state.weeklyOpusExhaustedUntil?.toISOString() ?? null,
        callCount: _state.weeklyOpusCallCount,
        tokensIn: _state.weeklyOpusTokensIn,
        tokensOut: _state.weeklyOpusTokensOut
      }
    }
  };
}
function markPluginActive() {
  _g.pluginStatus = "active";
  _g.deadReason = void 0;
}
function markPluginDead(reason) {
  _g.pluginStatus = "dead";
  _g.deadReason = reason;
  persistSnapshotToDb().catch(
    (err) => cliLog("warn", `Failed to persist dead state to DB: ${err.message}`)
  );
}
function markPluginNotConfigured() {
  _g.pluginStatus = "not_configured";
  _g.deadReason = void 0;
}
async function persistSnapshotToDb() {
  try {
    const db = await getDb();
    await db.$executeRaw`
      INSERT INTO "plugin_claude_cli_rate_limit_snapshot" (
        id,
        session_exhausted_until,
        weekly_non_opus_exhausted_until,
        weekly_opus_exhausted_until,
        session_call_count,
        weekly_non_opus_call_count,
        weekly_opus_call_count,
        session_window_start,
        weekly_window_start,
        session_tokens_in,
        session_tokens_out,
        weekly_non_opus_tokens_in,
        weekly_non_opus_tokens_out,
        weekly_opus_tokens_in,
        weekly_opus_tokens_out,
        plugin_status,
        dead_reason,
        weekly_overage_usd,
        updated_at
      ) VALUES (
        1,
        ${_state.sessionExhaustedUntil},
        ${_state.weeklyNonOpusExhaustedUntil},
        ${_state.weeklyOpusExhaustedUntil},
        ${_state.sessionCallCount},
        ${_state.weeklyNonOpusCallCount},
        ${_state.weeklyOpusCallCount},
        ${_state.sessionWindowStart},
        ${_state.weeklyWindowStart},
        ${_state.sessionTokensIn},
        ${_state.sessionTokensOut},
        ${_state.weeklyNonOpusTokensIn},
        ${_state.weeklyNonOpusTokensOut},
        ${_state.weeklyOpusTokensIn},
        ${_state.weeklyOpusTokensOut},
        ${_g.pluginStatus},
        ${_g.deadReason ?? null},
        ${_state.weeklyOverageUsd},
        now()
      )
      ON CONFLICT (id) DO UPDATE SET
        session_exhausted_until         = EXCLUDED.session_exhausted_until,
        weekly_non_opus_exhausted_until = EXCLUDED.weekly_non_opus_exhausted_until,
        weekly_opus_exhausted_until     = EXCLUDED.weekly_opus_exhausted_until,
        session_call_count              = EXCLUDED.session_call_count,
        weekly_non_opus_call_count      = EXCLUDED.weekly_non_opus_call_count,
        weekly_opus_call_count          = EXCLUDED.weekly_opus_call_count,
        session_window_start            = EXCLUDED.session_window_start,
        weekly_window_start             = EXCLUDED.weekly_window_start,
        session_tokens_in               = EXCLUDED.session_tokens_in,
        session_tokens_out              = EXCLUDED.session_tokens_out,
        weekly_non_opus_tokens_in       = EXCLUDED.weekly_non_opus_tokens_in,
        weekly_non_opus_tokens_out      = EXCLUDED.weekly_non_opus_tokens_out,
        weekly_opus_tokens_in           = EXCLUDED.weekly_opus_tokens_in,
        weekly_opus_tokens_out          = EXCLUDED.weekly_opus_tokens_out,
        plugin_status                   = EXCLUDED.plugin_status,
        dead_reason                     = EXCLUDED.dead_reason,
        weekly_overage_usd              = EXCLUDED.weekly_overage_usd,
        updated_at                      = now()
    `;
  } catch {
  }
}
async function loadSnapshotFromDb() {
  try {
    const db = await getDb();
    const rows = await db.$queryRaw`
      SELECT * FROM "plugin_claude_cli_rate_limit_snapshot" WHERE id = 1
    `;
    const row = rows[0];
    if (!row) return;
    _state.sessionExhaustedUntil = row.session_exhausted_until;
    _state.weeklyNonOpusExhaustedUntil = row.weekly_non_opus_exhausted_until;
    _state.weeklyOpusExhaustedUntil = row.weekly_opus_exhausted_until;
    _state.sessionCallCount = row.session_call_count;
    _state.weeklyNonOpusCallCount = row.weekly_non_opus_call_count;
    _state.weeklyOpusCallCount = row.weekly_opus_call_count;
    _state.sessionWindowStart = row.session_window_start;
    _state.weeklyWindowStart = row.weekly_window_start;
    _state.sessionTokensIn = row.session_tokens_in;
    _state.sessionTokensOut = row.session_tokens_out;
    _state.weeklyNonOpusTokensIn = row.weekly_non_opus_tokens_in;
    _state.weeklyNonOpusTokensOut = row.weekly_non_opus_tokens_out;
    _state.weeklyOpusTokensIn = row.weekly_opus_tokens_in;
    _state.weeklyOpusTokensOut = row.weekly_opus_tokens_out;
    _state.weeklyOverageUsd = row.weekly_overage_usd;
    _g.pluginStatus = row.plugin_status;
    _g.deadReason = row.dead_reason ?? void 0;
    cliLog("info", `Rate-limit state restored from DB: pluginStatus=${_g.pluginStatus} sessionExhaustedUntil=${row.session_exhausted_until?.toISOString() ?? "none"}`);
  } catch {
  }
}
_g.persistSnapshotFn = persistSnapshotToDb;
var KNOWN_RATE_LIMIT_TYPES = {
  weekly_opus: "weekly_opus",
  weekly_non_opus: "weekly_non_opus",
  session: "session",
  daily: "session",
  request_limit: "session",
  token_limit: "transient",
  message_limit: "transient",
  five_hour: "session"
};
function classifyRateLimitType(type, resetHorizonMs, isOpusProfile) {
  if (isOpusProfile) return "weekly_opus";
  const knownCategory = KNOWN_RATE_LIMIT_TYPES[type.toLowerCase()];
  if (knownCategory !== void 0) return knownCategory;
  cliLog(
    "warn",
    `[claude-cli] Unknown rate_limit_event type "${type}" \u2014 defaulting to session category. If you see this, file an issue at github.com/harmoven/harmoven with the full CLI output.`
  );
  const TWO_HOURS_MS = 2 * 36e5;
  const ONE_MIN_MS = 6e4;
  if (resetHorizonMs > TWO_HOURS_MS) return "weekly_non_opus";
  if (resetHorizonMs > ONE_MIN_MS) return "session";
  return "transient";
}
var StateMutex = class {
  _locked = false;
  _queue = [];
  async acquire() {
    if (!this._locked) {
      this._locked = true;
      return;
    }
    return new Promise((resolve) => this._queue.push(resolve));
  }
  release() {
    if (this._queue.length > 0) {
      const next = this._queue.shift();
      next();
    } else {
      this._locked = false;
    }
  }
};
if (!globalThis.__claudeCli.stateMutex) {
  globalThis.__claudeCli.stateMutex = new StateMutex();
}
var _stateMutex = globalThis.__claudeCli.stateMutex;
function isOpus(profile) {
  return profile.id === "claude-cli-opus";
}
function checkRateLimitGuard(profile) {
  const now = /* @__PURE__ */ new Date();
  if (_state.sessionExhaustedUntil && _state.sessionExhaustedUntil > now) {
    const diffMs = _state.sessionExhaustedUntil.getTime() - now.getTime();
    const hours = Math.floor(diffMs / 36e5);
    const mins = Math.floor(diffMs % 36e5 / 6e4);
    throw new RateLimitError(
      `[claude-cli] Session quota exhausted \u2014 next window in ~${hours}h ${mins}m`,
      _state.sessionExhaustedUntil
    );
  }
  if (isOpus(profile)) {
    if (_state.weeklyOpusExhaustedUntil && _state.weeklyOpusExhaustedUntil > now) {
      throw new RateLimitError(
        "[claude-cli] Weekly Opus quota exhausted \u2014 resets within 7 days",
        _state.weeklyOpusExhaustedUntil
      );
    }
  } else {
    if (_state.weeklyNonOpusExhaustedUntil && _state.weeklyNonOpusExhaustedUntil > now) {
      throw new RateLimitError(
        "[claude-cli] Weekly non-Opus quota exhausted \u2014 resets within 7 days",
        _state.weeklyNonOpusExhaustedUntil
      );
    }
  }
}
function recordExhaustion(profile, resetAt, type) {
  if (type === "session") {
    _state.sessionExhaustedUntil = resetAt;
  } else if (type === "weekly_opus") {
    _state.weeklyOpusExhaustedUntil = resetAt;
  } else {
    _state.weeklyNonOpusExhaustedUntil = resetAt;
  }
  persistSnapshotToDb().catch(
    (err) => cliLog("warn", `Failed to persist rate-limit snapshot: ${err.message}`)
  );
}
function updateCounters(profile, tokensIn, tokensOut) {
  if (_state.sessionWindowStart === null) _state.sessionWindowStart = /* @__PURE__ */ new Date();
  if (_state.weeklyWindowStart === null) _state.weeklyWindowStart = /* @__PURE__ */ new Date();
  _state.sessionCallCount++;
  _state.sessionTokensIn += tokensIn;
  _state.sessionTokensOut += tokensOut;
  if (isOpus(profile)) {
    _state.weeklyOpusCallCount++;
    _state.weeklyOpusTokensIn += tokensIn;
    _state.weeklyOpusTokensOut += tokensOut;
  } else {
    _state.weeklyNonOpusCallCount++;
    _state.weeklyNonOpusTokensIn += tokensIn;
    _state.weeklyNonOpusTokensOut += tokensOut;
  }
}
function recordCircuitSuccess() {
  _g.circuit.failureCount = 0;
  _g.circuit.circuitState = "closed";
  _g.circuit.circuitOpenedAt = null;
}
function recordCircuitFailure() {
  const cfg = _g.config;
  if (!cfg) return;
  _g.circuit.failureCount++;
  _g.circuit.lastFailureAt = /* @__PURE__ */ new Date();
  const threshold = cfg.circuitFailureThreshold;
  if (_g.circuit.circuitState === "closed" && _g.circuit.failureCount >= threshold) {
    _g.circuit.circuitState = "open";
    _g.circuit.circuitOpenedAt = /* @__PURE__ */ new Date();
    cliLog(
      "error",
      `[claude-cli] Circuit breaker OPENED after ${_g.circuit.failureCount} consecutive failures. All calls rejected for ${cfg.circuitOpenDurationMs / 1e3}s.`
    );
  } else if (_g.circuit.circuitState === "half-open") {
    _g.circuit.circuitState = "open";
    _g.circuit.circuitOpenedAt = /* @__PURE__ */ new Date();
    cliLog("error", `[claude-cli] Circuit breaker probe FAILED \u2014 reopened for ${cfg.circuitOpenDurationMs / 1e3}s.`);
  }
}
function checkCircuitBreaker() {
  const cb = _g.circuit;
  const cfg = _g.config;
  if (!cfg || cb.circuitState === "closed") return;
  if (cb.circuitState === "open") {
    const elapsed = cb.circuitOpenedAt ? Date.now() - cb.circuitOpenedAt.getTime() : Infinity;
    if (elapsed >= cfg.circuitOpenDurationMs) {
      _g.circuit.circuitState = "half-open";
      cliLog("info", "[claude-cli] Circuit breaker entering HALF-OPEN \u2014 allowing probe call.");
      return;
    }
    const remainingS = Math.ceil((cfg.circuitOpenDurationMs - elapsed) / 1e3);
    throw new Error(
      `[claude-cli] Circuit breaker OPEN \u2014 calls rejected for ${remainingS}s more. Wait for it to recover or use Admin \u2192 Models \u2192 Reset quota to force-reset.`
    );
  }
}
function sanitizeDelimiters(content) {
  return content.replace(/<<HARMOVEN:USER>>/gi, "<<HRMVN\\:USER>>").replace(/<<HARMOVEN:ASSISTANT>>/gi, "<<HRMVN\\:ASSISTANT>>");
}
var PROXY_ENV_KEYS = [
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "http_proxy",
  "https_proxy",
  "NO_PROXY",
  "no_proxy",
  "SSL_CERT_FILE",
  "NODE_EXTRA_CA_CERTS"
];
function buildEnv(token, scratchDir, parentEnv) {
  const proxyEnv = {};
  for (const key of PROXY_ENV_KEYS) {
    const val = parentEnv[key];
    if (val !== void 0 && val !== "") proxyEnv[key] = val;
  }
  return {
    PATH: parentEnv["PATH"] ?? "",
    CLAUDE_CODE_OAUTH_TOKEN: token,
    HOME: scratchDir,
    CLAUDE_CONFIG_DIR: import_node_path.default.join(scratchDir, "config"),
    ...proxyEnv
  };
}
function buildArgs(profile, messages, streamJson) {
  const system = messages.find((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");
  let promptArg;
  if (nonSystem.length <= 1) {
    promptArg = nonSystem[nonSystem.length - 1]?.content ?? "";
  } else {
    promptArg = nonSystem.map(
      (m) => m.role === "assistant" ? `<<HARMOVEN:ASSISTANT>>
${sanitizeDelimiters(m.content)}` : `<<HARMOVEN:USER>>
${sanitizeDelimiters(m.content)}`
    ).join("\n");
  }
  const args = ["-p", promptArg];
  if (system?.content) {
    args.push("--system-prompt", system.content);
  }
  args.push(
    "--no-session-persistence",
    "--tools",
    "",
    "--permission-mode",
    "default",
    "--max-turns",
    "1",
    "--model",
    profile.model_string,
    "--strict-mcp-config",
    "--mcp-config",
    '{"mcpServers":{}}'
  );
  if (streamJson) {
    args.push(
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages"
    );
  } else {
    args.push("--output-format", "json");
  }
  return args;
}
function parsePlainJson(stdout) {
  const base = {
    content: "",
    tokensIn: 0,
    tokensOut: 0,
    totalCostUsd: 0,
    serviceTier: "standard",
    apiErrorStatus: null,
    rateLimitInfo: null
  };
  let obj = null;
  try {
    const parsed = JSON.parse(stdout.trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      obj = parsed;
    }
  } catch {
    return parseStreamJson(stdout);
  }
  if (!obj) return parseStreamJson(stdout);
  if (typeof obj["result"] === "string") base.content = obj["result"];
  const usage = obj["usage"];
  if (usage) {
    base.tokensIn = typeof usage["input_tokens"] === "number" ? usage["input_tokens"] : 0;
    base.tokensOut = typeof usage["output_tokens"] === "number" ? usage["output_tokens"] : 0;
    if (typeof usage["service_tier"] === "string") base.serviceTier = usage["service_tier"];
  }
  if (typeof obj["total_cost_usd"] === "number") base.totalCostUsd = obj["total_cost_usd"];
  if (typeof obj["api_error_status"] === "number") base.apiErrorStatus = obj["api_error_status"];
  return base;
}
function parseStreamJson(stdout, onChunk) {
  const result = {
    content: "",
    tokensIn: 0,
    tokensOut: 0,
    totalCostUsd: 0,
    serviceTier: "standard",
    apiErrorStatus: null,
    rateLimitInfo: null
  };
  for (const line of stdout.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    switch (obj["type"]) {
      case "stream_event": {
        const event = obj["event"];
        if (event?.["type"] === "content_block_delta") {
          const delta = event["delta"];
          const text = delta?.["text"];
          if (typeof text === "string" && text && onChunk) {
            onChunk(text);
          }
        }
        break;
      }
      case "result": {
        if (typeof obj["result"] === "string") {
          result.content = obj["result"];
        }
        const usage = obj["usage"];
        if (usage) {
          result.tokensIn = usage["input_tokens"] ?? 0;
          result.tokensOut = usage["output_tokens"] ?? 0;
          if (typeof usage["service_tier"] === "string") result.serviceTier = usage["service_tier"];
        }
        if (typeof obj["total_cost_usd"] === "number") {
          result.totalCostUsd = obj["total_cost_usd"];
        }
        const apiErr = obj["api_error_status"];
        if (typeof apiErr === "number") {
          result.apiErrorStatus = apiErr;
        }
        break;
      }
      case "rate_limit_event": {
        const info = obj["rate_limit_info"];
        if (info) {
          let resetsAtIso = null;
          const raw = info["resetsAt"];
          if (typeof raw === "string" && raw) {
            resetsAtIso = raw;
          } else if (typeof raw === "number" && raw > 0) {
            const YEAR_2000_MS = 9466848e5;
            const asMs = raw;
            const asSec = raw * 1e3;
            resetsAtIso = new Date(asMs >= YEAR_2000_MS ? asMs : asSec).toISOString();
          }
          result.rateLimitInfo = {
            type: typeof info["type"] === "string" ? info["type"] : "unknown",
            resetsAt: resetsAtIso
          };
          cliLog("debug", `rate_limit_event: type="${result.rateLimitInfo.type}" resetsAt="${resetsAtIso ?? "none"}"`);
        }
        break;
      }
      default:
        break;
    }
  }
  return result;
}
async function createScratchDir(spawnId, config) {
  const dir = import_node_path.default.join(config.scratchBaseDir, spawnId);
  await import_node_fs.promises.mkdir(import_node_path.default.join(dir, "config"), { recursive: true });
  await import_node_fs.promises.mkdir(import_node_path.default.join(dir, "work"), { recursive: true });
  return dir;
}
async function removeScratchDir(dir) {
  await import_node_fs.promises.rm(dir, { recursive: true, force: true });
}
function killProcess(child) {
  child.kill("SIGTERM");
  setTimeout(() => {
    child.kill("SIGKILL");
  }, 2e3);
}
function handleSpawnEnoent(context) {
  markPluginDead("[claude-cli] Binary not found \u2014 plugin marked dead");
  cliLog("error", `${context} \u2014 ENOENT: claude binary missing from PATH. Reinstall with: npm install -g @anthropic-ai/claude-code`);
}
function spawnClaude(args, env, scratchDir, config, signal) {
  return new Promise((resolve, reject) => {
    const child = (0, import_node_child_process.spawn)("claude", args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: import_node_path.default.join(scratchDir, "work"),
      env
    });
    let stdout = "";
    let stderr = "";
    let terminatedBy;
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const timeoutId = setTimeout(() => {
      terminatedBy = "timeout";
      killProcess(child);
    }, config.spawnTimeoutMs);
    const abortHandler = () => {
      clearTimeout(timeoutId);
      terminatedBy = "abort";
      killProcess(child);
    };
    signal?.addEventListener("abort", abortHandler);
    child.on("close", (code) => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortHandler);
      resolve({ rc: code ?? 1, stdout, stderr, terminatedBy });
    });
    child.on("error", (err) => {
      clearTimeout(timeoutId);
      signal?.removeEventListener("abort", abortHandler);
      if (err.code === "ENOENT") {
        handleSpawnEnoent("spawn[chat]");
      }
      reject(err);
    });
  });
}
function handleResult(parsed, rc, profile, stderr, terminatedBy) {
  if (rc !== 0) {
    if (rc === 143 || rc === 137) {
      if (terminatedBy === "timeout") {
        cliLog("warn", `Spawn timeout for ${profile.id} (rc=${rc})`, profile.id);
      } else {
        cliLog("info", `Request cancelled for ${profile.id} (rc=${rc})`, profile.id);
      }
      const err = new Error(
        terminatedBy === "timeout" ? "[claude-cli] Request timed out (spawn_timeout_ms exceeded)" : "[claude-cli] Request cancelled (client disconnected or server shutdown)"
      );
      err.name = "AbortError";
      throw err;
    }
    if (parsed.apiErrorStatus === 401) {
      const err = new AuthError();
      markPluginDead(err.message);
      throw err;
    }
    if (parsed.rateLimitInfo) {
      const type = parsed.rateLimitInfo.type;
      const hasExplicitReset = !!parsed.rateLimitInfo.resetsAt;
      const resetAt = hasExplicitReset ? new Date(parsed.rateLimitInfo.resetsAt) : new Date(Date.now() + 6e4);
      const resetHorizonMs = hasExplicitReset ? resetAt.getTime() - Date.now() : 0;
      const category = classifyRateLimitType(type, resetHorizonMs, isOpus(profile));
      if (category === "weekly_opus") {
        if (hasExplicitReset) recordExhaustion(profile, resetAt, "weekly_opus");
        throw new RateLimitError("[claude-cli] Weekly Opus quota exhausted \u2014 resets within 7 days", resetAt);
      } else if (category === "weekly_non_opus") {
        if (hasExplicitReset) recordExhaustion(profile, resetAt, "weekly_non_opus");
        throw new RateLimitError("[claude-cli] Weekly non-Opus quota exhausted \u2014 resets within 7 days", resetAt);
      } else if (category === "session") {
        const now = /* @__PURE__ */ new Date();
        const diffMs = resetAt.getTime() - now.getTime();
        const hours = Math.floor(diffMs / 36e5);
        const mins = Math.floor(diffMs % 36e5 / 6e4);
        if (hasExplicitReset) recordExhaustion(profile, resetAt, "session");
        throw new RateLimitError(`[claude-cli] Session quota exhausted \u2014 next window in ~${hours}h ${mins}m`, resetAt);
      } else {
        cliLog("warn", `Transient rate limit (type="${type}") \u2014 not locking plugin state`, profile.id);
        throw new RateLimitError(`[claude-cli] Temporary rate limit (type: ${type}) \u2014 retry shortly`, resetAt);
      }
    }
    if (stderr.includes("rate_limit") || stderr.includes("quota") || stderr.includes("exhausted") || parsed.content.includes("rate_limit")) {
      const resetAt = new Date(Date.now() + 6e4);
      throw new RateLimitError("[claude-cli] Rate limit detected from stderr", resetAt);
    }
    const msg = parsed.content || stderr || `Claude CLI exited with code ${rc}`;
    recordCircuitFailure();
    throw new Error(`[claude-cli] ${msg}`);
  }
  recordCircuitSuccess();
  if (parsed.content === "" && parsed.tokensOut === 0) {
    cliLog(
      "warn",
      "[claude-cli] rc=0 but empty content + 0 output tokens \u2014 possible CLI schema change. Check `claude --version` and whether the JSON output format has changed.",
      profile.id
    );
  }
  const isSubscriptionCovered = parsed.serviceTier === "standard" || parsed.serviceTier === "";
  const effectiveCostUsd = isSubscriptionCovered ? 0 : parsed.totalCostUsd;
  if (parsed.totalCostUsd > 0) {
    cliLog(
      isSubscriptionCovered ? "debug" : "warn",
      `total_cost_usd=${parsed.totalCostUsd} service_tier=${parsed.serviceTier} ` + (isSubscriptionCovered ? "(subscription \u2014 not billed)" : "(BILLED \u2014 overage tier)"),
      profile.id
    );
  }
  if (!isSubscriptionCovered && parsed.totalCostUsd > 0) {
    _state.weeklyOverageUsd += parsed.totalCostUsd;
    const threshold = _g.config?.overageAlertThresholdUsd ?? 1;
    if (_state.weeklyOverageUsd >= threshold) {
      cliLog(
        "warn",
        `[OVERAGE ALERT] Weekly overage has reached $${_state.weeklyOverageUsd.toFixed(4)} (threshold: $${threshold}). Calls are being billed to your Anthropic account.`,
        profile.id
      );
      persistSnapshotToDb().catch(() => {
      });
    }
  }
  return {
    content: parsed.content,
    tokensIn: parsed.tokensIn,
    tokensOut: parsed.tokensOut,
    costUsd: effectiveCostUsd,
    model: profile.id,
    billingMode: "subscription"
  };
}
function isTransientError(err) {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError") return false;
  if (err instanceof AuthError) return false;
  if (err instanceof RateLimitError) return false;
  return true;
}
var RETRY_DELAYS_MS = [2e3, 5e3];
async function chatCli(profile, messages, options) {
  const config = requireConfig();
  if (!_g.semaphore) _g.semaphore = new Semaphore(config.maxConcurrent);
  const token = process.env[config.oauthTokenEnv] ?? "";
  for (let attempt = 0; ; attempt++) {
    checkCircuitBreaker();
    const semToken = await _g.semaphore.acquire();
    let scratchDir = null;
    try {
      await _stateMutex.acquire();
      checkRateLimitGuard(profile);
      const spawnId = (0, import_node_crypto.randomUUID)();
      const corrTag = options.correlationId ? ` correlationId=${options.correlationId}` : "";
      cliLog("info", `spawn[chat] start spawnId=${spawnId} model=${profile.model_string}${attempt > 0 ? ` (retry ${attempt})` : ""}${corrTag}`, profile.id);
      scratchDir = await createScratchDir(spawnId, config);
      const env = buildEnv(token, scratchDir, process.env);
      const args = buildArgs(profile, messages, false);
      const { rc, stdout, stderr, terminatedBy } = await spawnClaude(
        args,
        env,
        scratchDir,
        config,
        options.signal
      );
      cliLog("info", `spawn[chat] done spawnId=${spawnId} rc=${rc}`, profile.id);
      const parsed = parsePlainJson(stdout);
      const result = handleResult(parsed, rc, profile, stderr, terminatedBy);
      updateCounters(profile, result.tokensIn, result.tokensOut);
      _stateMutex.release();
      return result;
    } catch (err) {
      _stateMutex.release();
      if (attempt < RETRY_DELAYS_MS.length && isTransientError(err)) {
        const delay = RETRY_DELAYS_MS[attempt];
        cliLog("warn", `spawn[chat] transient error (attempt ${attempt + 1}/${RETRY_DELAYS_MS.length + 1}), retrying in ${delay}ms: ${err.message}`, profile.id);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    } finally {
      await _g.semaphore.release(semToken);
      if (scratchDir) await removeScratchDir(scratchDir).catch(
        (e) => cliLog("warn", `Failed to remove scratch dir: ${e.message}`)
      );
    }
  }
}
async function streamCli(profile, messages, options, onChunk) {
  const config = requireConfig();
  if (!_g.semaphore) _g.semaphore = new Semaphore(config.maxConcurrent);
  const token = process.env[config.oauthTokenEnv] ?? "";
  for (let attempt = 0; ; attempt++) {
    checkCircuitBreaker();
    const semToken = await _g.semaphore.acquire();
    let scratchDir = null;
    try {
      await _stateMutex.acquire();
      checkRateLimitGuard(profile);
      const spawnId = (0, import_node_crypto.randomUUID)();
      const corrTag = options.correlationId ? ` correlationId=${options.correlationId}` : "";
      cliLog("info", `spawn[stream] start spawnId=${spawnId} model=${profile.model_string}${attempt > 0 ? ` (retry ${attempt})` : ""}${corrTag}`, profile.id);
      scratchDir = await createScratchDir(spawnId, config);
      const env = buildEnv(token, scratchDir, process.env);
      const args = buildArgs(profile, messages, true);
      const { rc, stdout, stderr, terminatedBy } = await spawnClaudeStreaming(
        args,
        env,
        scratchDir,
        config,
        onChunk,
        options.signal
      );
      cliLog("info", `spawn[stream] done spawnId=${spawnId} rc=${rc}`, profile.id);
      const parsed = parseStreamJson(stdout);
      const result = handleResult(parsed, rc, profile, stderr, terminatedBy);
      updateCounters(profile, result.tokensIn, result.tokensOut);
      _stateMutex.release();
      return result;
    } catch (err) {
      _stateMutex.release();
      if (attempt < RETRY_DELAYS_MS.length && isTransientError(err)) {
        const delay = RETRY_DELAYS_MS[attempt];
        cliLog("warn", `spawn[stream] transient error, retrying in ${delay}ms: ${err.message}`, profile.id);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw err;
    } finally {
      await _g.semaphore.release(semToken);
      if (scratchDir) await removeScratchDir(scratchDir).catch(
        (e) => cliLog("warn", `Failed to remove scratch dir: ${e.message}`)
      );
    }
  }
}
function spawnClaudeStreaming(args, env, scratchDir, config, onChunk, signal) {
  return new Promise((resolve, reject) => {
    const child = (0, import_node_child_process.spawn)("claude", args, {
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      cwd: import_node_path.default.join(scratchDir, "work"),
      env
    });
    cliLog("info", `spawn[stream] pid=${child.pid ?? "?"}`, void 0);
    let stdout = "";
    let stderr = "";
    let lineBuffer = "";
    let totalChunks = 0;
    let terminatedBy;
    const STREAM_INACTIVITY_MS = config.streamInactivityMs;
    const STREAM_HARD_CAP_MS = config.streamHardCapMs;
    let activeTimeoutId = setTimeout(() => {
      terminatedBy = "timeout";
      killProcess(child);
    }, config.spawnTimeoutMs);
    const hardCapId = setTimeout(() => {
      terminatedBy = "timeout";
      killProcess(child);
    }, STREAM_HARD_CAP_MS);
    const resetInactivityTimer = () => {
      clearTimeout(activeTimeoutId);
      activeTimeoutId = setTimeout(() => {
        terminatedBy = "timeout";
        killProcess(child);
      }, STREAM_INACTIVITY_MS);
    };
    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stdout += text;
      lineBuffer += text;
      const lines = lineBuffer.split("\n");
      lineBuffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        let obj;
        try {
          obj = JSON.parse(trimmed);
        } catch {
          continue;
        }
        resetInactivityTimer();
        if (obj["type"] === "stream_event") {
          const event = obj["event"];
          if (event?.["type"] === "content_block_delta") {
            const delta = event["delta"];
            const t = delta?.["text"];
            if (typeof t === "string" && t) {
              totalChunks++;
              onChunk(t);
            }
          }
        }
      }
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    const abortHandler = () => {
      clearTimeout(activeTimeoutId);
      clearTimeout(hardCapId);
      terminatedBy = "abort";
      killProcess(child);
    };
    signal?.addEventListener("abort", abortHandler);
    child.on("close", (code) => {
      clearTimeout(activeTimeoutId);
      clearTimeout(hardCapId);
      signal?.removeEventListener("abort", abortHandler);
      cliLog("info", `spawn[stream] closed chunks=${totalChunks}`, void 0);
      resolve({ rc: code ?? 1, stdout, stderr, terminatedBy });
    });
    child.on("error", (err) => {
      clearTimeout(activeTimeoutId);
      clearTimeout(hardCapId);
      signal?.removeEventListener("abort", abortHandler);
      if (err.code === "ENOENT") {
        handleSpawnEnoent("spawn[stream]");
      }
      reject(err);
    });
  });
}

// src/index.ts
function loadCliConfig() {
  return {
    oauthTokenEnv: process.env["CLAUDE_CLI_OAUTH_TOKEN_ENV"] ?? "CLAUDE_CODE_OAUTH_TOKEN",
    minCliVersion: process.env["CLAUDE_CLI_MIN_VERSION"] ?? "2.1.0",
    scratchBaseDir: process.env["CLAUDE_CLI_SCRATCH_DIR"] ?? "/tmp/harmoven-claude",
    maxConcurrent: Number(process.env["CLAUDE_CLI_MAX_CONCURRENT"] ?? "4"),
    enableOpus: process.env["CLAUDE_CLI_ENABLE_OPUS"] === "true",
    spawnTimeoutMs: Number(process.env["CLAUDE_CLI_SPAWN_TIMEOUT_MS"] ?? "300000"),
    streamInactivityMs: Number(process.env["CLAUDE_CLI_STREAM_INACTIVITY_MS"] ?? "60000"),
    streamHardCapMs: Number(process.env["CLAUDE_CLI_STREAM_HARD_CAP_MS"] ?? "1800000"),
    overageAlertThresholdUsd: Number(process.env["CLAUDE_CLI_OVERAGE_ALERT_USD"] ?? "1.0"),
    circuitOpenDurationMs: Number(process.env["CLAUDE_CLI_CIRCUIT_OPEN_MS"] ?? "300000"),
    circuitFailureThreshold: Number(process.env["CLAUDE_CLI_CIRCUIT_THRESHOLD"] ?? "5"),
    tokenValidationIntervalHours: Number(process.env["CLAUDE_CLI_TOKEN_VALIDATION_HOURS"] ?? "6")
  };
}
var BASE_PROFILES = [
  {
    id: "claude-cli-sonnet",
    provider: "claude-cli",
    model_string: "sonnet",
    tier: "balanced",
    context_window: 2e5,
    cost_per_1m_input_tokens: 0,
    cost_per_1m_output_tokens: 0,
    jurisdiction: "us",
    trust_tier: 1,
    task_type_affinity: ["document_analysis", "report_writing", "coding"]
  },
  {
    id: "claude-cli-haiku",
    provider: "claude-cli",
    model_string: "haiku",
    tier: "fast",
    context_window: 2e5,
    cost_per_1m_input_tokens: 0,
    cost_per_1m_output_tokens: 0,
    jurisdiction: "us",
    trust_tier: 1,
    task_type_affinity: ["intent_classification", "simple_coding_tasks"]
  }
];
var OPUS_PROFILE = {
  id: "claude-cli-opus",
  provider: "claude-cli",
  model_string: "opus",
  tier: "powerful",
  context_window: 2e5,
  cost_per_1m_input_tokens: 0,
  cost_per_1m_output_tokens: 0,
  jurisdiction: "us",
  trust_tier: 1,
  task_type_affinity: ["complex_reasoning", "document_analysis"]
};
var OAUTH_TOKEN_RE = /^sk-ant-oat\d{2}-[A-Za-z0-9\-_]{60,}$/;
function findBinary(name) {
  try {
    const result = (0, import_node_child_process2.execFileSync)(
      process.platform === "win32" ? "where" : "which",
      [name],
      { encoding: "utf8", timeout: 5e3 }
    ).trim();
    return result.split("\n")[0]?.trim() || null;
  } catch {
    return null;
  }
}
async function validate(config) {
  const claudePath = findBinary("claude");
  if (!claudePath) {
    return {
      ok: false,
      reason: "[claude-cli] `claude` binary not found on PATH. Install with: npm install -g @anthropic-ai/claude-code"
    };
  }
  let version;
  try {
    const out = (0, import_node_child_process2.execFileSync)(claudePath, ["--version"], { encoding: "utf8", timeout: 1e4 }).trim();
    const match = out.match(/(\d+\.\d+\.\d+)/);
    version = match?.[1];
  } catch {
    return { ok: false, reason: `[claude-cli] Failed to run \`claude --version\`.` };
  }
  if (!version) {
    return { ok: false, reason: `[claude-cli] Could not parse version from \`claude --version\` output.` };
  }
  if (!import_semver.default.satisfies(version, `>=${config.minCliVersion}`)) {
    return {
      ok: false,
      reason: `[claude-cli] Version ${version} is below minimum required ${config.minCliVersion}. Update with: npm install -g @anthropic-ai/claude-code`
    };
  }
  const token = process.env[config.oauthTokenEnv] ?? "";
  if (!token) {
    return { ok: false, reason: `[claude-cli] ${config.oauthTokenEnv} is not set. Run: claude setup-token` };
  }
  if (!OAUTH_TOKEN_RE.test(token)) {
    return {
      ok: false,
      reason: `[claude-cli] ${config.oauthTokenEnv} does not match expected format (sk-ant-oatNN-...). Regenerate with: claude setup-token`
    };
  }
  return { ok: true };
}
async function pingAuth(config) {
  const token = process.env[config.oauthTokenEnv] ?? "";
  let scratchDir = null;
  try {
    scratchDir = await createScratchDir(`ping-${(0, import_node_crypto3.randomUUID)()}`, config);
    const env = buildEnv(token, scratchDir, process.env);
    const pingArgs = buildArgs(
      {
        id: "ping",
        provider: "claude-cli",
        model_string: "haiku",
        tier: "fast",
        context_window: 2e5,
        cost_per_1m_input_tokens: 0,
        cost_per_1m_output_tokens: 0,
        jurisdiction: "us",
        trust_tier: 1,
        task_type_affinity: []
      },
      [{ role: "user", content: "ping" }],
      false
    );
    const { rc, stdout } = await spawnClaude(pingArgs, env, scratchDir, config);
    if (rc !== 0) {
      try {
        const parsed = parseStreamJson(stdout);
        if (parsed.apiErrorStatus === 401) {
          const reason = "[claude-cli] Auth ping: token expired or invalid (401). Regenerate with: claude setup-token";
          console.error(reason);
          markPluginDead(reason);
          return;
        }
      } catch {
      }
      console.warn(`[claude-cli] Auth ping failed (rc=${rc}) \u2014 plugin remains active.`);
    } else {
      console.info("[claude-cli] Auth ping OK.");
    }
  } catch (err) {
    console.warn(`[claude-cli] Auth ping threw: ${err instanceof Error ? err.message : String(err)} \u2014 plugin remains active.`);
  } finally {
    if (scratchDir) await removeScratchDir(scratchDir).catch(() => {
    });
  }
}
function register(ctx) {
  const config = loadCliConfig();
  setConfig(config);
  if (ctx?.dispatchNotification) {
    ;
    globalThis["__claudeCliDispatch"] = ctx.dispatchNotification;
  }
  if (process.env["CLAUDE_CLI_TOS_ACKNOWLEDGED"] !== "true") {
    const reason = "[claude-cli] Disabled \u2014 set CLAUDE_CLI_TOS_ACKNOWLEDGED=true to confirm that your use of the Claude Max/Team subscription for automated agent runs complies with Anthropic Terms of Service.";
    console.warn(reason);
    markPluginNotConfigured();
    const plugin2 = { providerId: "claude-cli", profiles: [], chat: chatCli, stream: streamCli };
    ctx?.registerLlmPlugin(plugin2);
    return plugin2;
  }
  const token = process.env[config.oauthTokenEnv] ?? "";
  if (!token) {
    console.info(`[claude-cli] ${config.oauthTokenEnv} not set \u2014 plugin registered with 0 profiles.`);
    markPluginNotConfigured();
    const plugin2 = { providerId: "claude-cli", profiles: [], chat: chatCli, stream: streamCli };
    ctx?.registerLlmPlugin(plugin2);
    return plugin2;
  }
  const profiles = [
    ...BASE_PROFILES,
    ...config.enableOpus ? [OPUS_PROFILE] : []
  ];
  const plugin = { providerId: "claude-cli", profiles, chat: chatCli, stream: streamCli };
  ctx?.registerLlmPlugin(plugin);
  void (async () => {
    await loadSnapshotFromDb().catch((err) => {
      console.warn("[claude-cli] loadSnapshotFromDb skipped (no DB in subprocess):", err instanceof Error ? err.message : String(err));
    });
    const validation = await validate(config);
    if (!validation.ok) {
      console.warn(`[claude-cli] Validation failed \u2014 plugin disabled: ${validation.reason}`);
      markPluginDead(validation.reason ?? "validation failed");
      return;
    }
    markPluginActive();
    console.info(`[claude-cli] Plugin active \u2014 ${profiles.length} profile(s): ${profiles.map((p) => p.id).join(", ")}`);
    void (async () => {
      try {
        const { createDistributedSemaphoreIfEnabled: createDistributedSemaphoreIfEnabled2 } = await Promise.resolve().then(() => (init_distributed_semaphore(), distributed_semaphore_exports));
        const distSem = await createDistributedSemaphoreIfEnabled2(config.maxConcurrent);
        if (distSem) {
          setActiveSemaphore(distSem);
          console.info("[claude-cli] Distributed semaphore active.");
        }
      } catch (err) {
        console.warn("[claude-cli] Failed to initialize distributed semaphore (in-memory fallback):", err instanceof Error ? err.message : err);
      }
    })();
    void pingAuth(config);
    const intervalHours = config.tokenValidationIntervalHours;
    if (intervalHours > 0) {
      const intervalMs = intervalHours * 36e5;
      const revalidate = async () => {
        try {
          const cfg = loadCliConfig();
          const result = await validate(cfg);
          if (!result.ok) {
            console.error(`[claude-cli] Periodic token re-validation FAILED: ${result.reason}`);
            markPluginDead(result.reason ?? "periodic validation failed");
            try {
              const dispatch = globalThis["__claudeCliDispatch"];
              await dispatch?.({
                type: "claude_cli.token_expired",
                title: "Claude CLI: token validation failed",
                body: result.reason ?? "Periodic token re-validation failed. Regenerate with: claude setup-token"
              });
            } catch {
            }
          } else {
            console.info("[claude-cli] Periodic token re-validation OK.");
          }
        } catch (err) {
          console.warn(`[claude-cli] Periodic re-validation threw: ${err instanceof Error ? err.message : String(err)}`);
        }
      };
      const intervalKey = "__claudeCliRevalidateInterval";
      if (globalThis[intervalKey]) {
        clearInterval(globalThis[intervalKey]);
      }
      ;
      globalThis[intervalKey] = setInterval(revalidate, intervalMs);
      console.info(`[claude-cli] Periodic re-validation scheduled every ${intervalHours}h.`);
    }
  })();
  return plugin;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AuthError,
  RateLimitError,
  buildArgs,
  buildEnv,
  createScratchDir,
  getCliState,
  initWithDb,
  loadCliConfig,
  parseStreamJson,
  pingAuth,
  register,
  removeScratchDir,
  setActiveSemaphore,
  spawnClaude,
  validate
});
