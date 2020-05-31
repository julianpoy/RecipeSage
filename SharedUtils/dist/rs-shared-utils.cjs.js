'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function unwrapExports (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var fraction = createCommonjsModule(function (module, exports) {
  /**
   * @license Fraction.js v4.0.12 09/09/2015
   * http://www.xarg.org/2014/03/rational-numbers-in-javascript/
   *
   * Copyright (c) 2015, Robert Eisele (robert@xarg.org)
   * Dual licensed under the MIT or GPL Version 2 licenses.
   **/

  /**
   *
   * This class offers the possibility to calculate fractions.
   * You can pass a fraction in different formats. Either as array, as double, as string or as an integer.
   *
   * Array/Object form
   * [ 0 => <nominator>, 1 => <denominator> ]
   * [ n => <nominator>, d => <denominator> ]
   *
   * Integer form
   * - Single integer value
   *
   * Double form
   * - Single double value
   *
   * String form
   * 123.456 - a simple double
   * 123/456 - a string fraction
   * 123.'456' - a double with repeating decimal places
   * 123.(456) - synonym
   * 123.45'6' - a double with repeating last place
   * 123.45(6) - synonym
   *
   * Example:
   *
   * var f = new Fraction("9.4'31'");
   * f.mul([-4, 3]).div(4.9);
   *
   */
  (function (root) {
    // Example: 1/7 = 0.(142857) has 6 repeating decimal places.
    // If MAX_CYCLE_LEN gets reduced, long cycles will not be detected and toString() only gets the first 10 digits

    var MAX_CYCLE_LEN = 2000; // Parsed data to avoid calling "new" all the time

    var P = {
      "s": 1,
      "n": 0,
      "d": 1
    };

    function createError(name) {
      function errorConstructor() {
        var temp = Error.apply(this, arguments);
        temp['name'] = this['name'] = name;
        this['stack'] = temp['stack'];
        this['message'] = temp['message'];
      }
      /**
       * Error constructor
       *
       * @constructor
       */


      function IntermediateInheritor() {}

      IntermediateInheritor.prototype = Error.prototype;
      errorConstructor.prototype = new IntermediateInheritor();
      return errorConstructor;
    }

    var DivisionByZero = Fraction['DivisionByZero'] = createError('DivisionByZero');
    var InvalidParameter = Fraction['InvalidParameter'] = createError('InvalidParameter');

    function assign(n, s) {
      if (isNaN(n = parseInt(n, 10))) {
        throwInvalidParam();
      }

      return n * s;
    }

    function throwInvalidParam() {
      throw new InvalidParameter();
    }

    var parse = function (p1, p2) {
      var n = 0,
          d = 1,
          s = 1;
      var v = 0,
          w = 0,
          x = 0,
          y = 1,
          z = 1;
      var A = 0,
          B = 1;
      var C = 1,
          D = 1;
      var N = 10000000;
      var M;

      if (p1 === undefined || p1 === null) ; else if (p2 !== undefined) {
        n = p1;
        d = p2;
        s = n * d;
      } else switch (typeof p1) {
        case "object":
          {
            if ("d" in p1 && "n" in p1) {
              n = p1["n"];
              d = p1["d"];
              if ("s" in p1) n *= p1["s"];
            } else if (0 in p1) {
              n = p1[0];
              if (1 in p1) d = p1[1];
            } else {
              throwInvalidParam();
            }

            s = n * d;
            break;
          }

        case "number":
          {
            if (p1 < 0) {
              s = p1;
              p1 = -p1;
            }

            if (p1 % 1 === 0) {
              n = p1;
            } else if (p1 > 0) {
              // check for != 0, scale would become NaN (log(0)), which converges really slow
              if (p1 >= 1) {
                z = Math.pow(10, Math.floor(1 + Math.log(p1) / Math.LN10));
                p1 /= z;
              } // Using Farey Sequences
              // http://www.johndcook.com/blog/2010/10/20/best-rational-approximation/


              while (B <= N && D <= N) {
                M = (A + C) / (B + D);

                if (p1 === M) {
                  if (B + D <= N) {
                    n = A + C;
                    d = B + D;
                  } else if (D > B) {
                    n = C;
                    d = D;
                  } else {
                    n = A;
                    d = B;
                  }

                  break;
                } else {
                  if (p1 > M) {
                    A += C;
                    B += D;
                  } else {
                    C += A;
                    D += B;
                  }

                  if (B > N) {
                    n = C;
                    d = D;
                  } else {
                    n = A;
                    d = B;
                  }
                }
              }

              n *= z;
            } else if (isNaN(p1) || isNaN(p2)) {
              d = n = NaN;
            }

            break;
          }

        case "string":
          {
            B = p1.match(/\d+|./g);
            if (B === null) throwInvalidParam();

            if (B[A] === '-') {
              // Check for minus sign at the beginning
              s = -1;
              A++;
            } else if (B[A] === '+') {
              // Check for plus sign at the beginning
              A++;
            }

            if (B.length === A + 1) {
              // Check if it's just a simple number "1234"
              w = assign(B[A++], s);
            } else if (B[A + 1] === '.' || B[A] === '.') {
              // Check if it's a decimal number
              if (B[A] !== '.') {
                // Handle 0.5 and .5
                v = assign(B[A++], s);
              }

              A++; // Check for decimal places

              if (A + 1 === B.length || B[A + 1] === '(' && B[A + 3] === ')' || B[A + 1] === "'" && B[A + 3] === "'") {
                w = assign(B[A], s);
                y = Math.pow(10, B[A].length);
                A++;
              } // Check for repeating places


              if (B[A] === '(' && B[A + 2] === ')' || B[A] === "'" && B[A + 2] === "'") {
                x = assign(B[A + 1], s);
                z = Math.pow(10, B[A + 1].length) - 1;
                A += 3;
              }
            } else if (B[A + 1] === '/' || B[A + 1] === ':') {
              // Check for a simple fraction "123/456" or "123:456"
              w = assign(B[A], s);
              y = assign(B[A + 2], 1);
              A += 3;
            } else if (B[A + 3] === '/' && B[A + 1] === ' ') {
              // Check for a complex fraction "123 1/2"
              v = assign(B[A], s);
              w = assign(B[A + 2], s);
              y = assign(B[A + 4], 1);
              A += 5;
            }

            if (B.length <= A) {
              // Check for more tokens on the stack
              d = y * z;
              s =
              /* void */
              n = x + d * v + z * w;
              break;
            }
            /* Fall through on error */

          }

        default:
          throwInvalidParam();
      }

      if (d === 0) {
        throw new DivisionByZero();
      }

      P["s"] = s < 0 ? -1 : 1;
      P["n"] = Math.abs(n);
      P["d"] = Math.abs(d);
    };

    function modpow(b, e, m) {
      var r = 1;

      for (; e > 0; b = b * b % m, e >>= 1) {
        if (e & 1) {
          r = r * b % m;
        }
      }

      return r;
    }

    function cycleLen(n, d) {
      for (; d % 2 === 0; d /= 2) {}

      for (; d % 5 === 0; d /= 5) {}

      if (d === 1) // Catch non-cyclic numbers
        return 0; // If we would like to compute really large numbers quicker, we could make use of Fermat's little theorem:
      // 10^(d-1) % d == 1
      // However, we don't need such large numbers and MAX_CYCLE_LEN should be the capstone,
      // as we want to translate the numbers to strings.

      var rem = 10 % d;
      var t = 1;

      for (; rem !== 1; t++) {
        rem = rem * 10 % d;
        if (t > MAX_CYCLE_LEN) return 0; // Returning 0 here means that we don't print it as a cyclic number. It's likely that the answer is `d-1`
      }

      return t;
    }

    function cycleStart(n, d, len) {
      var rem1 = 1;
      var rem2 = modpow(10, len, d);

      for (var t = 0; t < 300; t++) {
        // s < ~log10(Number.MAX_VALUE)
        // Solve 10^s == 10^(s+t) (mod d)
        if (rem1 === rem2) return t;
        rem1 = rem1 * 10 % d;
        rem2 = rem2 * 10 % d;
      }

      return 0;
    }

    function gcd(a, b) {
      if (!a) return b;
      if (!b) return a;

      while (1) {
        a %= b;
        if (!a) return b;
        b %= a;
        if (!b) return a;
      }
    }
    /**
     * Module constructor
     *
     * @constructor
     * @param {number|Fraction=} a
     * @param {number=} b
     */

    function Fraction(a, b) {
      if (!(this instanceof Fraction)) {
        return new Fraction(a, b);
      }

      parse(a, b);

      if (Fraction['REDUCE']) {
        a = gcd(P["d"], P["n"]); // Abuse a
      } else {
        a = 1;
      }

      this["s"] = P["s"];
      this["n"] = P["n"] / a;
      this["d"] = P["d"] / a;
    }
    /**
     * Boolean global variable to be able to disable automatic reduction of the fraction
     *
     */


    Fraction['REDUCE'] = 1;
    Fraction.prototype = {
      "s": 1,
      "n": 0,
      "d": 1,

      /**
       * Calculates the absolute value
       *
       * Ex: new Fraction(-4).abs() => 4
       **/
      "abs": function () {
        return new Fraction(this["n"], this["d"]);
      },

      /**
       * Inverts the sign of the current fraction
       *
       * Ex: new Fraction(-4).neg() => 4
       **/
      "neg": function () {
        return new Fraction(-this["s"] * this["n"], this["d"]);
      },

      /**
       * Adds two rational numbers
       *
       * Ex: new Fraction({n: 2, d: 3}).add("14.9") => 467 / 30
       **/
      "add": function (a, b) {
        parse(a, b);
        return new Fraction(this["s"] * this["n"] * P["d"] + P["s"] * this["d"] * P["n"], this["d"] * P["d"]);
      },

      /**
       * Subtracts two rational numbers
       *
       * Ex: new Fraction({n: 2, d: 3}).add("14.9") => -427 / 30
       **/
      "sub": function (a, b) {
        parse(a, b);
        return new Fraction(this["s"] * this["n"] * P["d"] - P["s"] * this["d"] * P["n"], this["d"] * P["d"]);
      },

      /**
       * Multiplies two rational numbers
       *
       * Ex: new Fraction("-17.(345)").mul(3) => 5776 / 111
       **/
      "mul": function (a, b) {
        parse(a, b);
        return new Fraction(this["s"] * P["s"] * this["n"] * P["n"], this["d"] * P["d"]);
      },

      /**
       * Divides two rational numbers
       *
       * Ex: new Fraction("-17.(345)").inverse().div(3)
       **/
      "div": function (a, b) {
        parse(a, b);
        return new Fraction(this["s"] * P["s"] * this["n"] * P["d"], this["d"] * P["n"]);
      },

      /**
       * Clones the actual object
       *
       * Ex: new Fraction("-17.(345)").clone()
       **/
      "clone": function () {
        return new Fraction(this);
      },

      /**
       * Calculates the modulo of two rational numbers - a more precise fmod
       *
       * Ex: new Fraction('4.(3)').mod([7, 8]) => (13/3) % (7/8) = (5/6)
       **/
      "mod": function (a, b) {
        if (isNaN(this['n']) || isNaN(this['d'])) {
          return new Fraction(NaN);
        }

        if (a === undefined) {
          return new Fraction(this["s"] * this["n"] % this["d"], 1);
        }

        parse(a, b);

        if (0 === P["n"] && 0 === this["d"]) {
          Fraction(0, 0); // Throw DivisionByZero
        }
        /*
         * First silly attempt, kinda slow
         *
         return that["sub"]({
         "n": num["n"] * Math.floor((this.n / this.d) / (num.n / num.d)),
         "d": num["d"],
         "s": this["s"]
         });*/

        /*
         * New attempt: a1 / b1 = a2 / b2 * q + r
         * => b2 * a1 = a2 * b1 * q + b1 * b2 * r
         * => (b2 * a1 % a2 * b1) / (b1 * b2)
         */


        return new Fraction(this["s"] * (P["d"] * this["n"]) % (P["n"] * this["d"]), P["d"] * this["d"]);
      },

      /**
       * Calculates the fractional gcd of two rational numbers
       *
       * Ex: new Fraction(5,8).gcd(3,7) => 1/56
       */
      "gcd": function (a, b) {
        parse(a, b); // gcd(a / b, c / d) = gcd(a, c) / lcm(b, d)

        return new Fraction(gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]), P["d"] * this["d"]);
      },

      /**
       * Calculates the fractional lcm of two rational numbers
       *
       * Ex: new Fraction(5,8).lcm(3,7) => 15
       */
      "lcm": function (a, b) {
        parse(a, b); // lcm(a / b, c / d) = lcm(a, c) / gcd(b, d)

        if (P["n"] === 0 && this["n"] === 0) {
          return new Fraction();
        }

        return new Fraction(P["n"] * this["n"], gcd(P["n"], this["n"]) * gcd(P["d"], this["d"]));
      },

      /**
       * Calculates the ceil of a rational number
       *
       * Ex: new Fraction('4.(3)').ceil() => (5 / 1)
       **/
      "ceil": function (places) {
        places = Math.pow(10, places || 0);

        if (isNaN(this["n"]) || isNaN(this["d"])) {
          return new Fraction(NaN);
        }

        return new Fraction(Math.ceil(places * this["s"] * this["n"] / this["d"]), places);
      },

      /**
       * Calculates the floor of a rational number
       *
       * Ex: new Fraction('4.(3)').floor() => (4 / 1)
       **/
      "floor": function (places) {
        places = Math.pow(10, places || 0);

        if (isNaN(this["n"]) || isNaN(this["d"])) {
          return new Fraction(NaN);
        }

        return new Fraction(Math.floor(places * this["s"] * this["n"] / this["d"]), places);
      },

      /**
       * Rounds a rational numbers
       *
       * Ex: new Fraction('4.(3)').round() => (4 / 1)
       **/
      "round": function (places) {
        places = Math.pow(10, places || 0);

        if (isNaN(this["n"]) || isNaN(this["d"])) {
          return new Fraction(NaN);
        }

        return new Fraction(Math.round(places * this["s"] * this["n"] / this["d"]), places);
      },

      /**
       * Gets the inverse of the fraction, means numerator and denumerator are exchanged
       *
       * Ex: new Fraction([-3, 4]).inverse() => -4 / 3
       **/
      "inverse": function () {
        return new Fraction(this["s"] * this["d"], this["n"]);
      },

      /**
       * Calculates the fraction to some integer exponent
       *
       * Ex: new Fraction(-1,2).pow(-3) => -8
       */
      "pow": function (m) {
        if (m < 0) {
          return new Fraction(Math.pow(this['s'] * this["d"], -m), Math.pow(this["n"], -m));
        } else {
          return new Fraction(Math.pow(this['s'] * this["n"], m), Math.pow(this["d"], m));
        }
      },

      /**
       * Check if two rational numbers are the same
       *
       * Ex: new Fraction(19.6).equals([98, 5]);
       **/
      "equals": function (a, b) {
        parse(a, b);
        return this["s"] * this["n"] * P["d"] === P["s"] * P["n"] * this["d"]; // Same as compare() === 0
      },

      /**
       * Check if two rational numbers are the same
       *
       * Ex: new Fraction(19.6).equals([98, 5]);
       **/
      "compare": function (a, b) {
        parse(a, b);
        var t = this["s"] * this["n"] * P["d"] - P["s"] * P["n"] * this["d"];
        return (0 < t) - (t < 0);
      },
      "simplify": function (eps) {
        // First naive implementation, needs improvement
        if (isNaN(this['n']) || isNaN(this['d'])) {
          return this;
        }

        var cont = this['abs']()['toContinued']();
        eps = eps || 0.001;

        function rec(a) {
          if (a.length === 1) return new Fraction(a[0]);
          return rec(a.slice(1))['inverse']()['add'](a[0]);
        }

        for (var i = 0; i < cont.length; i++) {
          var tmp = rec(cont.slice(0, i + 1));

          if (tmp['sub'](this['abs']())['abs']().valueOf() < eps) {
            return tmp['mul'](this['s']);
          }
        }

        return this;
      },

      /**
       * Check if two rational numbers are divisible
       *
       * Ex: new Fraction(19.6).divisible(1.5);
       */
      "divisible": function (a, b) {
        parse(a, b);
        return !(!(P["n"] * this["d"]) || this["n"] * P["d"] % (P["n"] * this["d"]));
      },

      /**
       * Returns a decimal representation of the fraction
       *
       * Ex: new Fraction("100.'91823'").valueOf() => 100.91823918239183
       **/
      'valueOf': function () {
        return this["s"] * this["n"] / this["d"];
      },

      /**
       * Returns a string-fraction representation of a Fraction object
       *
       * Ex: new Fraction("1.'3'").toFraction() => "4 1/3"
       **/
      'toFraction': function (excludeWhole) {
        var whole,
            str = "";
        var n = this["n"];
        var d = this["d"];

        if (this["s"] < 0) {
          str += '-';
        }

        if (d === 1) {
          str += n;
        } else {
          if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
            str += whole;
            str += " ";
            n %= d;
          }

          str += n;
          str += '/';
          str += d;
        }

        return str;
      },

      /**
       * Returns a latex representation of a Fraction object
       *
       * Ex: new Fraction("1.'3'").toLatex() => "\frac{4}{3}"
       **/
      'toLatex': function (excludeWhole) {
        var whole,
            str = "";
        var n = this["n"];
        var d = this["d"];

        if (this["s"] < 0) {
          str += '-';
        }

        if (d === 1) {
          str += n;
        } else {
          if (excludeWhole && (whole = Math.floor(n / d)) > 0) {
            str += whole;
            n %= d;
          }

          str += "\\frac{";
          str += n;
          str += '}{';
          str += d;
          str += '}';
        }

        return str;
      },

      /**
       * Returns an array of continued fraction elements
       *
       * Ex: new Fraction("7/8").toContinued() => [0,1,7]
       */
      'toContinued': function () {
        var t;
        var a = this['n'];
        var b = this['d'];
        var res = [];

        if (isNaN(this['n']) || isNaN(this['d'])) {
          return res;
        }

        do {
          res.push(Math.floor(a / b));
          t = a % b;
          a = b;
          b = t;
        } while (a !== 1);

        return res;
      },

      /**
       * Creates a string representation of a fraction with all digits
       *
       * Ex: new Fraction("100.'91823'").toString() => "100.(91823)"
       **/
      'toString': function (dec) {
        var g;
        var N = this["n"];
        var D = this["d"];

        if (isNaN(N) || isNaN(D)) {
          return "NaN";
        }

        if (!Fraction['REDUCE']) {
          g = gcd(N, D);
          N /= g;
          D /= g;
        }

        dec = dec || 15; // 15 = decimal places when no repitation

        var cycLen = cycleLen(N, D); // Cycle length

        var cycOff = cycleStart(N, D, cycLen); // Cycle start

        var str = this['s'] === -1 ? "-" : "";
        str += N / D | 0;
        N %= D;
        N *= 10;
        if (N) str += ".";

        if (cycLen) {
          for (var i = cycOff; i--;) {
            str += N / D | 0;
            N %= D;
            N *= 10;
          }

          str += "(";

          for (var i = cycLen; i--;) {
            str += N / D | 0;
            N %= D;
            N *= 10;
          }

          str += ")";
        } else {
          for (var i = dec; N && i--;) {
            str += N / D | 0;
            N %= D;
            N *= 10;
          }
        }

        return str;
      }
    };

    {
      Object.defineProperty(exports, "__esModule", {
        'value': true
      });
      Fraction['default'] = Fraction;
      Fraction['Fraction'] = Fraction;
      module['exports'] = Fraction;
    }
  })();
});
unwrapExports(fraction);

/**
 * An enumeration which specifies whether a unit represents a singular value (1),
 * a plural value, or might represent either.
 */

var Plurality;

(function (Plurality) {
  /**
   * The unit is only a singular representation.
   */
  Plurality[Plurality["SINGULAR"] = 0] = "SINGULAR";
  /**
   * The unit is only a plural representation.
   */

  Plurality[Plurality["PLURAL"] = 1] = "PLURAL";
  /**
   * The unit can be used as singular and plural.
   */

  Plurality[Plurality["EITHER"] = 2] = "EITHER";
})(Plurality = Plurality || (Plurality = {}));

/**
 * An enumeration which specifies what system of measurement a unit belongs to
 * or specifies which system a user desires for output or conversions.
 *
 * @see [[Group]]
 * @see [[Transform]]
 */

var System;

(function (System) {
  /**
   * The Metrix System of Measurement.
   */
  System[System["METRIC"] = 0] = "METRIC";
  /**
   * The US "traditional systems of weights and measures". Also known as
   * "Standard", "Customary", or, erroneously: "Imperial", or "English".
   */

  System[System["US"] = 1] = "US";
  /**
   * A value for groups when the unit does not belong to a system.
   */

  System[System["NONE"] = 2] = "NONE";
  /**
   * A value for transforms which specify that the user or developer are looking
   * to get results in any system.
   */

  System[System["ANY"] = 3] = "ANY";
  /**
   * A value for transforms which specify that the user or developer are looking
   * to get results in the same system that is already being used for a range.
   * If a current system cannot be determined then any system is returned.
   */

  System[System["GIVEN"] = 4] = "GIVEN";
})(System = System || (System = {}));

/**
 * The class which contains commonly used functions by the library. These
 * functions and variables exist in a class so they may be overridden if
 * desired.
 */

var Functions = function () {
  function Functions() {}
  /**
   * Determines if the given number is zero.
   *
   * @param x The number to test.
   * @return True if the number is zero, otherwise false.
   * @see [[Functions.EPSILON]]
   */


  Functions.isZero = function (x) {
    return this.abs(x) < this.EPSILON;
  };
  /**
   * Determines if the given number is equal to another.
   *
   * @param a The first number to compare.
   * @param b The second number to compare.
   * @return True if the two numbers are equal.
   * @see [[Functions.EPSILON]]
   */


  Functions.isEqual = function (a, b) {
    return this.abs(a - b) < this.EPSILON;
  };
  /**
   * Determines if the given number is a whole number (integer).
   *
   * @param x The number to test.
   * @return True if the number is whole, otherwise false.
   * @see [[Functions.EPSILON]]
   */


  Functions.isWhole = function (x) {
    return this.abs(Math.floor(x) - x) < this.EPSILON;
  };
  /**
   * Determines if the given number is singular. A singular number is 1 or -1.
   *
   * @param x The number to test.
   * @return True if the number is singular, otherwise false.
   * @see [[Functions.EPSILON]]
   */


  Functions.isSingular = function (x) {
    return this.isNumber(x) && this.abs(this.abs(x) - 1) < this.EPSILON;
  };
  /**
   * Determines if the given number is valid. A valid number is finite and not
   * NaN or Infinity.
   *
   * @param x The number to test.
   * @return True if the input is finite number.
   */


  Functions.isNumber = function (x) {
    return isFinite(x);
  };
  /**
   * Trims the given input if its a string.
   *
   * @param x The string to remove space from the beginning and end.
   * @return A trimmed string.
   */


  Functions.trim = function (x) {
    return x ? x.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '') : x;
  };
  /**
   * Calculates the greatest common denominator between the two numbers. If
   * either of the numbers are not whole (integers) then 1 is immediately
   * returned.
   *
   * @param a The first number.
   * @param b The second number.
   * @return The greatest common denominator between the two numbers.
   */


  Functions.gcd = function (a, b) {
    if (!this.isWhole(a) || !this.isWhole(b)) {
      return 1;
    }

    var x = a < b ? a : b;
    var y = a < b ? b : a;
    x = this.abs(x);
    y = this.abs(y);

    while (y) {
      var t = y;
      y = x % y;
      x = t;
    }

    return x;
  };
  /**
   * Determines the absolute value of the given number.
   *
   * @param x The number to return the positive version of.
   * @return The absolute value of x.
   */


  Functions.abs = function (x) {
    return x < 0 ? -x : x;
  };
  /**
   * Determines the sign of the given number. One of three values will be
   * returned: 1, 0, or -1.
   *
   * @param x The number to determine the sign of.
   * @return The sign of the given number.
   */


  Functions.sign = function (x) {
    return x < 0 ? -1 : x > 0 ? 1 : 0;
  };
  /**
   * Appends an element or array of elements to the end of the given array.
   *
   * @param array The array to append values to the end of.
   * @param input The element or array of elements to append to the end.
   * @return The reference to the `array` given.
   */


  Functions.appendTo = function (array, input) {
    if (input instanceof Array) {
      array.push.apply(array, input);
    } else if (input) {
      array.push(input);
    }

    return array;
  };
  /**
   * Determines whether the given input looks like a [[GroupDefinition]].
   *
   * @param input The variable to inspect.
   * @return True if the variable appears to be a [[GroupDefinition]].
   */


  Functions.isGroupDefinition = function (input) {
    return !!(input && input.system && input.unit && input.denominators && input.units);
  };
  /**
   * Determines whether the given input looks like a [[ValueDefinition]].
   *
   * @param input The variable to inspect.
   * @return True if the variable appears to be a [[ValueDefinition]].
   */


  Functions.isValueDefinition = function (input) {
    return !!(input && (input.value || input.unit || input.num || input.den));
  };
  /**
   * Determines whether the given input looks like a [[RangeDefinition]].
   *
   * @param input The variable to inspect.
   * @return True if the variable appears to be a [[RangeDefinition]].
   */


  Functions.isRangeDefinition = function (input) {
    return !!(input && input.min && input.max);
  };
  /**
   * Determines whether the given input is an array.
   *
   * @param input The variable to test.
   * @return True if the variable is an array, otherwise false.
   */


  Functions.isArray = function (input) {
    return input instanceof Array;
  };
  /**
   * Determines whether the given input is a string.
   *
   * @param input The variable to test.
   * @return True if the variable is a string, otherwise false.
   */


  Functions.isString = function (input) {
    return typeof input === 'string';
  };
  /**
   * Determines whether the given input is defined.
   *
   * @param input The variable to test.
   * @return True if the variable is defined, otherwise false.
   */


  Functions.isDefined = function (input) {
    return typeof input !== 'undefined';
  };
  /**
   * Returns the first argument which is defined.
   *
   * @param a The first argument to look at.
   * @param b The second argument to look at.
   * @return The first defined argument.
   * @see [[Functions.isDefined]]
   */


  Functions.coalesce = function (a, b) {
    return this.isDefined(a) ? a : b;
  };
  /**
   * The maximum distance a number can be from another to be considered
   * equivalent. This is to compensate for floating point precision issues.
   */


  Functions.EPSILON = 0.00001;
  return Functions;
}();

/**
 * A unit and its aliases as well as their plurality.
 *
 * A group is relative to a base group or is a base group itself. As unit
 * aliases are added to the group it determines the appropriate plural and
 * singular long and short versions given the unit aliases in this group.
 */

var Group = function () {
  /**
   * Creates a new instance of Group given a definition and the parent class.
   *
   * @param definition The definition of the group.
   * @param parent The class which contains this group.
   */
  function Group(definition, parent) {
    /**
     * The scale of this group relative to the base group. This is used for
     * conversions of values with the same base group.
     */
    this.baseScale = 1;
    /**
     * The scale of this group relative to the first base group added to the
     * class. This is used to compare numbers of the same class across all bases.
     */

    this.classScale = 0;
    /**
     * Whether this group was dynamically created by user input having units
     * not mapped to groups by the developer.
     */

    this.dynamic = false;
    this.system = definition.system;
    this.common = !!definition.common;
    this.unit = definition.unit;
    this.baseUnit = definition.baseUnit;
    this.preferredUnit = definition.preferredUnit || definition.unit;
    this.relativeUnit = definition.relativeUnit;
    this.relativeScale = definition.relativeScale || 1;
    this.units = definition.units;
    this.denominators = definition.denominators;
    this.parent = parent;
    this.updateUnits();
  }

  Object.defineProperty(Group.prototype, "isBase", {
    /**
     * True if this group is a base group, otherwise false.
     */
    get: function () {
      return this.unit === this.baseUnit;
    },
    enumerable: true,
    configurable: true
  });
  /**
   * Sets the dynamic flag of this group.
   *
   * @param dynamic Whether this group is dynamic or not.
   * @return The reference to this instance.
   */

  Group.prototype.setDynamic = function (dynamic) {
    if (dynamic === void 0) {
      dynamic = true;
    }

    this.dynamic = dynamic;
    return this;
  };
  /**
   * Adds a denominator or array of denominators to this group.
   *
   * @param denominators A denominator or an array of denominators to add.
   * @return The reference to this instance.
   */


  Group.prototype.addDenominator = function (denominators) {
    Functions.appendTo(this.denominators, denominators);
    return this;
  };
  /**
   * Sets the denominators of this group.
   *
   * @param denominators The new denominators for this group.
   * @return The reference to this instance.
   * @see [[Group.denominators]]
   */


  Group.prototype.setDenominators = function (denominators) {
    this.denominators = denominators;
    return this;
  };
  /**
   * Sets the common flag of this group.
   *
   * @param common Whether this group is common or not.
   * @return The reference to this instance.
   * @see [[Group.common]]
   */


  Group.prototype.setCommon = function (common) {
    if (common === void 0) {
      common = true;
    }

    this.common = common;
    return this;
  };
  /**
   * Sets the preferred unit of this group.
   *
   * @param unit The preferred unit of this group.
   * @return The reference to this instance.
   * @see [[Group.preferredUnit]]
   */


  Group.prototype.setPreferred = function (unit) {
    this.preferredUnit = unit;
    return this;
  };
  /**
   * Adds the given unit aliases to this group and the parent class.
   *
   * @param units The units to add to the group and class.
   * @return The reference to this instance.
   * @see [[Class.addGroupUnit]]
   */


  Group.prototype.addUnits = function (units) {
    var parent = this.parent;

    for (var unit in units) {
      this.units[unit] = units[unit];
      parent.addGroupUnit(unit, this);
    }

    this.updateUnits();
    return this;
  };
  /**
   * Removes the given unit aliases from this group and the parent class.
   *
   * @param units The array of unit aliases to remove.
   * @return The reference to this instance.
   * @see [[Class.removeGroupUnit]]
   */


  Group.prototype.removeUnits = function (units) {
    var parent = this.parent;
    var existing = this.units;

    for (var i = 0; i < units.length; i++) {
      var unit = units[i];

      if (unit in existing) {
        delete existing[unit];
        parent.removeGroupUnit(unit, this);
      }
    }

    return this;
  };
  /**
   * Updates the singular and plural long and short form units for this group.
   *
   * @return The reference to this instance.
   */


  Group.prototype.updateUnits = function () {
    this.singularShort = null;
    this.singularLong = null;
    this.pluralShort = null;
    this.pluralLong = null;

    for (var unit in this.units) {
      var plurality = this.units[unit];

      if (plurality !== Plurality.PLURAL) {
        if (!this.singularShort || unit.length < this.singularShort.length) {
          this.singularShort = unit;
        }

        if (!this.singularLong || unit.length > this.singularLong.length) {
          this.singularLong = unit;
        }
      }

      if (plurality !== Plurality.SINGULAR) {
        if (!this.pluralShort || unit.length < this.pluralShort.length) {
          this.pluralShort = unit;
        }

        if (!this.pluralLong || unit.length > this.pluralLong.length) {
          this.pluralLong = unit;
        }
      }
    }

    return this;
  };
  /**
   * Invokes a callback for each group in the parent class that are visible
   * based on the given transform relative to this group.
   *
   * @param transform The transform which decides what groups are visible.
   * @param reverse If the groups of the class should be iterated in reverse.
   * @param callback A function to invoke with all visible groups found and the
   *  index of that group in the set of visible groups. If `false` is returned
   *  by the function iteration of visible groups ceases.
   * @param callback.group The current visible group.
   * @param callback.index The index of the current visible group.
   * @see [[Transform.isVisibleGroup]]
   */


  Group.prototype.matches = function (transform, reverse, callback) {
    if (this.parent) {
      this.parent.getVisibleGroups(transform, reverse, this, callback);
    }
  };

  return Group;
}();

/**
 * A collection of groups and their units with the logic on how to convert
 * between groups with differing base units.
 *
 * A class is essentially something like "Length" where base units are "inches"
 * and "millimeters" and there are various other groups based off of these
 * base groups like "feet", "centimeters", and "meters".
 *
 * A class is responsible for being the sole place where conversion is done
 * between different groups in the same class.
 *
 * @see [[Class.convert]]
 */

var Class = function () {
  /**
   * Creates a new instance of Class given the name of the class and optionally
   * the groups of the class.
   *
   * @param name The unique name of the class.
   * @param groups The optional list of groups to populate the class with.
   */
  function Class(name, groups) {
    this.name = name;
    this.groupMap = {};
    this.groups = [];
    this.converters = {};

    if (groups) {
      this.addGroups(groups);
    }
  }
  /**
   * Adds the group definitions to this class.
   *
   * @param definitions The array of group definitions.
   * @return The reference to this instance.
   * @see [[Class.addGroup]]
   */


  Class.prototype.addGroups = function (definitions) {
    for (var i = 0; i < definitions.length; i++) {
      this.addGroup(definitions[i]);
    }

    return this;
  };
  /**
   * Adds a group definition to this class. If the group is relative to another
   * group the [[Group.baseScale]] and [[Group.baseUnit]] are set to appropriate
   * values.
   *
   * @param definition The group definition.
   * @return The instance of the group created from the definition.
   * @see [[Class.addGroupUnit]]
   */


  Class.prototype.addGroup = function (definition) {
    var group = new Group(definition, this);
    var relativeUnit = group.relativeUnit,
        relativeScale = group.relativeScale,
        units = group.units;

    if (relativeUnit) {
      var relative = this.groupMap[relativeUnit];
      group.baseScale = relativeScale * relative.baseScale;
      group.baseUnit = relative.baseUnit;
    }

    for (var alias in units) {
      this.addGroupUnit(alias, group);
    }

    this.groups.push(group);
    return group;
  };
  /**
   * Adds the unit to this class for the given group. If the lowercase version
   * of the unit has not been mapped yet it will be mapped to the given group.
   *
   * @param unit The unit to map to the group.
   * @param group The group which has the unit.
   * @return The reference to this instance.
   */


  Class.prototype.addGroupUnit = function (unit, group) {
    var lower = unit.toLowerCase();
    this.groupMap[unit] = group;

    if (!this.groupMap[lower]) {
      this.groupMap[lower] = group;
    }

    return this;
  };
  /**
   * Removes the given unit associated to the given group from the class. If the
   * group is not mapped to this unit then this has no effect.
   *
   * @param unit The unit to remove from this class.
   * @param group The group which has the unit.
   * @return The reference to this instance.
   */


  Class.prototype.removeGroupUnit = function (unit, group) {
    var lower = unit.toLowerCase();

    if (this.groupMap[unit] === group) {
      delete this.groupMap[unit];
    }

    if (this.groupMap[lower] === group) {
      delete this.groupMap[lower];
    }

    return this;
  };
  /**
   * Determines the first group in this class which is a base group.
   *
   * @see [[Group.isBase]]
   */


  Class.prototype.getFirstBase = function () {
    var groups = this.groups;

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i];

      if (group.isBase) {
        return group;
      }
    }

    return null;
  };
  /**
   * Updates the [[Group.classScale]] value in each group in this class so that
   * there is a baseline for comparing one group to another no matter the base
   * unit. For comparing in the same base, you can use [[Group.baseScale]].
   *
   * @return The reference to this instance.
   */


  Class.prototype.setClassScales = function () {
    var groups = this.groups;
    var first = this.getFirstBase();

    if (first) {
      for (var i = 0; i < groups.length; i++) {
        var group = groups[i];

        if (group.baseUnit === first.baseUnit) {
          group.classScale = group.baseScale;
        } else if (group.baseUnit in this.converters) {
          group.classScale = this.converters[group.baseUnit][first.baseUnit](group.baseScale);
        }
      }
    }

    return this;
  };
  /**
   * Sets the conversion function between the two base units.
   *
   * @param fromUnit The base unit to convert from.
   * @param toUnit The base unit to convert to.
   * @param converter The function to pass the value to convert.
   * @return The reference to this instance.
   */


  Class.prototype.setBaseConversion = function (fromUnit, toUnit, converter) {
    var converters = this.converters;
    converters[fromUnit] = converters[fromUnit] || {};
    converters[fromUnit][toUnit] = converter;
    return this;
  };
  /**
   * Determines which groups in this class are visible according to the given
   * transform. The groups can be iterated in reverse and can optionally take
   * a related group into consideration (when the system is GIVEN, we want to
   * return the groups with the same system).
   *
   * @param transform The transform which decides what groups are visible.
   * @param reverse If the groups of this class should be iterated in reverse.
   * @param relatedGroup A related group which may be used for visibility if the
   *  [[Transform.system]] is [[System.GIVEN]].
   * @param callback A function to invoke with all visible groups found and the
   *  index of that group in the set of visible groups. If `false` is returned
   *  by the function iteration of visible groups ceases.
   * @param callback.group The current visible group.
   * @param callback.index The index of the current visible group.
   * @see [[Transform.isVisibleGroup]]
   */


  Class.prototype.getVisibleGroups = function (transform, reverse, relatedGroup, callback) {
    var groups = this.groups;
    var matched = 0;
    var start = reverse ? groups.length - 1 : 0;
    var stop = reverse ? -1 : groups.length;
    var increment = reverse ? -1 : 1;

    for (var i = start; i !== stop; i += increment) {
      var group = groups[i];

      if (transform.isVisibleGroup(group, relatedGroup)) {
        var result = callback(group, matched++);

        if (result === false) {
          break;
        }
      }
    }
  };
  /**
   * Converts the given number from a given group to a given group. If the two
   * groups are the same or one or both of the groups are not provided then the
   * `value` provided is returned. If the two groups have differing base units
   * the [[Class.converters]] map is used to convert the `value` over to the
   * proper base. If the [[Class.converters]] map is missing a base conversion
   * zero is returned. This might happen if a group is passed to this function
   * which does not belong to this class OR if the user has impromperly setup
   * their own classes.
   *
   * @param value The number to convert.
   * @param from The group of the number to convert from.
   * @param to The group to convert to.
   * @param invalid The value to return if a conversion between the two groups
   *  could not be made.
   * @return The converted number or zero if a base conversion could not be found.
   */


  Class.prototype.convert = function (value, from, to, invalid) {
    if (invalid === void 0) {
      invalid = 0;
    }

    if (from === to || !from || !to) {
      return value;
    }

    var converted = value * from.baseScale;

    if (from.baseUnit !== to.baseUnit) {
      var map = this.converters[from.baseUnit];

      if (!map || !map[to.baseUnit]) {
        return invalid;
      }

      var converter = map[to.baseUnit];
      converted = converter(converted);
    }

    return converted / to.baseScale;
  };

  return Class;
}();

/**
 * The enumeration which decides what unit to use when converting to a string.
 */

var OutputUnit;

(function (OutputUnit) {
  /**
   * This value will keep units from being displayed.
   */
  OutputUnit[OutputUnit["NONE"] = 0] = "NONE";
  /**
   * This value will ensure the unit exactly as the user entered it is used in
   * the output no matter whether the value's plurality matches the given
   * unit's plurality.
   *
   * @see [[Value.unit]]
   */

  OutputUnit[OutputUnit["GIVEN"] = 1] = "GIVEN";
  /**
   * This value will force the short versions of the unit to be used.
   *
   * @see [[Group.singularShort]]
   * @see [[Group.pluralShort]]
   */

  OutputUnit[OutputUnit["SHORT"] = 2] = "SHORT";
  /**
   * This value will force the long versions of the unit to be used.
   *
   * @see [[Group.singularLong]]
   * @see [[Group.pluralLong]]
   */

  OutputUnit[OutputUnit["LONG"] = 3] = "LONG";
})(OutputUnit = OutputUnit || (OutputUnit = {}));
/**
 * The enumeration which decides how a value will be converted to a string.
 */


var OutputFormat;

(function (OutputFormat) {
  /**
   * The format of the user input will be used if possible.
   */
  OutputFormat[OutputFormat["GIVEN"] = 0] = "GIVEN";
  /**
   * All values will be displayed using their decimal representation.
   */

  OutputFormat[OutputFormat["NUMBER"] = 1] = "NUMBER";
  /**
   * All values will be displayed as a mixed fraction if the value is a fraction.
   * A mixed fraction has a whole number followed by a fraction where the
   * numerator is smaller than the denominator.
   *
   * @see [[Value.isFraction]]
   */

  OutputFormat[OutputFormat["MIXED"] = 2] = "MIXED";
  /**
   * All values will be displayed as an improper fraction if the value is a
   * fraction and the numerator is larger than the denoninator.
   *
   * @see [[Value.isFraction]]
   */

  OutputFormat[OutputFormat["IMPROPER"] = 3] = "IMPROPER";
})(OutputFormat = OutputFormat || (OutputFormat = {}));
/**
 * The class which converts Unitz objects to strings.
 */


var Output = function () {
  /**
   * Creates a new instance of Output with an optional set of options to
   * override the default values.
   *
   * @param input The options to apply to the new instance.
   */
  function Output(input) {
    /**
     * The option that specifies which units are chosen.
     */
    this.unit = OutputUnit.GIVEN;
    /**
     * The option that specifies how values are displayed.
     */

    this.format = OutputFormat.GIVEN;
    /**
     * Whether or not a unit should be displayed for the minimum and maximum of a
     * range when they have the same group.
     */

    this.repeatUnit = false;
    /**
     * The spacing used between the value and the unit.
     */

    this.unitSpacer = '';
    /**
     * The spacing used between the minimum and maximum values in a range.
     */

    this.rangeSpacer = ' - ';
    /**
     * The spacing used to separate the numerator and denominator of a fraction.
     */

    this.fractionSpacer = '/';
    /**
     * The spacing used to seperate a mixed number from the fraction.
     */

    this.mixedSpacer = ' ';
    /**
     * The spacing used to separate a unit and the rate unit.
     */

    this.rateSpacer = '/';
    /**
     * The delimiter used to separate ranges.
     */

    this.delimiter = ', ';
    /**
     * An option used to restrict numbers from displaying large decimal numbers.
     * When this value is set to -1 numbers are displayed fully. If the value is
     * set to zero all numbers will be truncated to the whole version.
     */

    this.significant = -1;

    if (Functions.isDefined(input)) {
      this.set(input);
    }
  }
  /**
   * Overrides values in this instance with ones specified in input.
   *
   * @param input The values to override.
   * @return The reference to this instance.
   */


  Output.prototype.set = function (input) {
    this.unit = Functions.coalesce(input.unit, this.unit);
    this.format = Functions.coalesce(input.format, this.format);
    this.repeatUnit = Functions.coalesce(input.repeatUnit, this.repeatUnit);
    this.unitSpacer = Functions.coalesce(input.unitSpacer, this.unitSpacer);
    this.rangeSpacer = Functions.coalesce(input.rangeSpacer, this.rangeSpacer);
    this.fractionSpacer = Functions.coalesce(input.fractionSpacer, this.fractionSpacer);
    this.mixedSpacer = Functions.coalesce(input.mixedSpacer, this.mixedSpacer);
    this.rateSpacer = Functions.coalesce(input.rateSpacer, this.rateSpacer);
    this.delimiter = Functions.coalesce(input.delimiter, this.delimiter);
    this.significant = Functions.coalesce(input.significant, this.significant);
    return this;
  };
  /**
   * Returns an Output instance which matches the desired options. If no options
   * are specified the reference to this instance is returned. If the options
   * are already an instance of Output its returned. If options are specified
   * a new instance is created with the options of this instance, and the given
   * options applied with [[Output.set]].
   *
   * @param input The options desired.
   * @return An instance of this class which matches the desired options.
   */


  Output.prototype.extend = function (input) {
    var extended = this;

    if (Functions.isDefined(input)) {
      if (input instanceof Output) {
        extended = input;
      } else {
        extended = new Output(this);
        extended.set(input);
      }
    }

    return extended;
  };
  /**
   * Converts the list of ranges to a string. If a range is not valid it is
   * skipped.
   *
   * @param ranges The list of ranges to convert.
   * @return The string representation of the input.
   */


  Output.prototype.ranges = function (ranges) {
    var out = '';

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];

      if (range.isValid) {
        if (out.length) {
          out += this.delimiter;
        }

        out += this.range(range);
      }
    }

    return out;
  };
  /**
   * Converts the range to a string.
   *
   * @param ranges The range to convert.
   * @return The string representation of the input.
   */


  Output.prototype.range = function (range) {
    var out = '';

    if (!range.isValid) ; else if (range.isFixed) {
      out += this.value(range.min);
    } else {
      var minUnit = this.repeatUnit || range.min.unit !== range.max.unit;
      out += this.value(range.min, minUnit);
      out += this.rangeSpacer;
      out += this.value(range.max);
    }

    return out;
  };
  /**
   * Converts the value to the string optionally showing or hiding the unit.
   *
   * @param value The value to convert.
   * @param showUnit Whether or not the unit should be added to the string.
   * @return The string representation of the input.
   */


  Output.prototype.value = function (value, showUnit) {
    if (showUnit === void 0) {
      showUnit = true;
    }

    var out = '';

    if (!value.isValid) ; else if (this.isFraction(value)) {
      if (this.isMixed(value)) {
        out += value.mixedWhole;
        out += this.mixedSpacer;
        out += value.mixedNum;
        out += this.fractionSpacer;
        out += value.den;
      } else {
        out += value.num;
        out += this.fractionSpacer;
        out += value.den;
      }
    } else {
      out += this.number(value.value);
    }

    if (showUnit && this.unit !== OutputUnit.NONE && value.isValid) {
      out += this.unitSpacer;
      out += this.units(value);
    }

    return out;
  };
  /**
   * Generates a full unit string including the rate unit if it exists.
   *
   * @param value The value to generate a unit for.
   * @return The units string representation.
   */


  Output.prototype.units = function (value) {
    var out = '';
    out += this.group(value.value, value.unit, value.group);

    if (value.rateGroup) {
      out += this.rateSpacer;
      out += this.group(value.value, value.rate, value.rateGroup);
    }

    return out;
  };
  /**
   * Generates a unit string given the value, the current unit, and its group.
   *
   * @param value The value to generate a unit for.
   * @param unit The unit to potentially use.
   * @param group The group of the unit.
   * @return The unit determined based on the options.
   */


  Output.prototype.group = function (value, unit, group) {
    if (this.isLongUnit(group)) {
      return Functions.isSingular(value) ? group.singularLong : group.pluralLong;
    } else if (this.isShortUnit(group) || group && group.dynamic) {
      return Functions.isSingular(value) ? group.singularShort : group.pluralShort;
    }

    return unit;
  };
  /**
   * Converts the number to a string.
   *
   * @param x The number to convert.
   * @return The string representation of the input.
   */


  Output.prototype.number = function (x) {
    var valueString = x + '';

    if (this.significant >= 0 && valueString !== '0') {
      var valueSignificant = x.toFixed(this.significant).replace(/0*$/, '').replace(/\.$/, '');
      return valueSignificant.length < valueString.length ? valueSignificant : valueString;
    }

    return valueString;
  };
  /**
   * Determines whether the value should be displayed as a fraction.
   *
   * @param value The value to look at.
   * @return True if the value should be displayed as a fraction, otherwise false.
   */


  Output.prototype.isFraction = function (value) {
    return value.isFraction && this.format !== OutputFormat.NUMBER;
  };
  /**
   * Determines whether the value should be displayed as a number.
   *
   * @param value The value to look at.
   * @return True if the value should be displayed as a number, otherwise false.
   */


  Output.prototype.isNumber = function (value) {
    return value.isValid && !this.isFraction(value);
  };
  /**
   * Determines whether the value should be displayed as a mixed fraction. This
   * assumes [[Output.isFraction]] was already checked and returned true.
   *
   * @param value The value to look at.
   * @return True if the value should be displayed as a mixed fraction, otherwise false.
   */


  Output.prototype.isMixed = function (value) {
    return value.mixedWhole !== 0 && this.format !== OutputFormat.IMPROPER;
  };
  /**
   * Determines whether the short unit should be displayed.
   *
   * @param group The group of the unit.
   * @return True if the short unit should be displayed, otherwise false.
   */


  Output.prototype.isShortUnit = function (group) {
    return group && this.unit === OutputUnit.SHORT;
  };
  /**
   * Determines whether the long unit should be displayed.
   *
   * @param group The group of the unit.
   * @return True if the short unit should be displayed, otherwise false.
   */


  Output.prototype.isLongUnit = function (group) {
    return group && this.unit === OutputUnit.LONG;
  };

  return Output;
}();

/**
 * THe class which controls which units and values are acceptable when
 * transforming a set of ranges.
 *
 * @see [[Base.normalize]]
 * @see [[Base.compact]]
 * @see [[Base.expand]]
 * @see [[Base.conversions]]
 * @see [[Base.filter]]
 */

var Transform = function () {
  /**
   * Creates a new instance of Transform with an optional set of options to
   * override the default values.
   *
   * @param input The options to apply to the new instance.
   */
  function Transform(input) {
    /**
     * The option which determines whether only common or any group are valid.
     * To only include common units this value must be `true` and to include
     * common and uncommon this value must be `false`.
     */
    this.common = true;
    /**
     * The desired system for the transformation.
     */

    this.system = System.GIVEN;
    /**
     * The mimimum allowed value for the transformation.
     */

    this.min = -Number.MAX_VALUE;
    /**
     * The maximum allowed value for the transformation.
     */

    this.max = Number.MAX_VALUE;
    /**
     * Whether the minimum or maximum value of a range is used when producing
     * conversions.
     */

    this.convertWithMax = true;
    /**
     * Whether conversions should convert the main unit.
     */

    this.convertUnit = true;
    /**
     * Whether conversions should convert the rate unit.
     */

    this.convertRate = false;
    /**
     * Whether ranges without units are considered valid for the transformation.
     */

    this.groupless = true;

    if (Functions.isDefined(input)) {
      this.set(input);
    }
  }
  /**
   * Overrides values in this instance with ones specified in input.
   *
   * @param input The values to override.
   * @return The reference to this instance.
   */


  Transform.prototype.set = function (input) {
    this.common = Functions.coalesce(input.common, this.common);
    this.system = Functions.coalesce(input.system, this.system);
    this.min = Functions.coalesce(input.min, this.min);
    this.max = Functions.coalesce(input.max, this.max);
    this.groupless = Functions.coalesce(input.groupless, this.groupless);
    this.convertWithMax = Functions.coalesce(input.convertWithMax, this.convertWithMax);
    this.convertUnit = Functions.coalesce(input.convertUnit, this.convertUnit);
    this.convertRate = Functions.coalesce(input.convertRate, this.convertRate);
    this.onlyUnits = Functions.coalesce(input.onlyUnits, this.onlyUnits);
    this.notUnits = Functions.coalesce(input.notUnits, this.notUnits);
    this.onlyClasses = Functions.coalesce(input.onlyClasses, this.onlyClasses);
    this.notClasses = Functions.coalesce(input.notClasses, this.notClasses);
    return this;
  };
  /**
   * Returns a Transform instance which matches the desired options. If no
   * options are specified the reference to this instance is returned. If the
   * options are already an instance of Transform its returned. If options are
   * specified a new instance is created with the options of this instance, and
   * the given options applied with [[Transform.set]].
   *
   * @param input The options desired.
   * @return An instance of this class which matches the desired options.
   */


  Transform.prototype.extend = function (input) {
    var extended = this;

    if (Functions.isDefined(input)) {
      if (input instanceof Transform) {
        extended = input;
      } else {
        extended = new Transform(this);
        extended.set(input);
      }
    }

    return extended;
  };
  /**
   * Determines whether the given range is valid according to this instance.
   *
   * @param range The range to test.
   * @return True if the range matches this transform, otherwise false.
   */


  Transform.prototype.isValidRange = function (range) {
    if (range.max.value < this.min) {
      return false;
    }

    if (range.min.value > this.max) {
      return false;
    }

    var group = this.convertWithMax ? range.max.group : range.min.group;
    return this.isVisibleGroup(group);
  };
  /**
   * Determines whether the given group (and optionally a current group) is
   * valid or visible according to this instance.
   *
   * @param group The group to test.
   * @param givenGroup The current group if available.
   * @return True if the group matches this transform, otherwise false.
   */


  Transform.prototype.isVisibleGroup = function (group, givenGroup) {
    if (!group) {
      return this.groupless;
    }

    return this.isCommonMatch(group) && this.isSystemMatch(group, givenGroup) && this.isUnitMatch(group) && this.isClassMatch(group.parent);
  };
  /**
   * Determines whether the given group matches the common option on this
   * instance.
   *
   * @param group The group to test.
   * @return True if the group matches the common option, otherwise false.
   */


  Transform.prototype.isCommonMatch = function (group) {
    return !this.common || group.common;
  };
  /**
   * Determines whether the given group (and optionally a current group)
   * matches the system option on this instance.
   *
   * @param group The group to test.
   * @param givenGroup The current group if available.
   * @return True if the group matches ths system option, otherwise false.
   */


  Transform.prototype.isSystemMatch = function (group, givenGroup) {
    switch (this.system) {
      case System.METRIC:
        return group.system === System.METRIC || group.system === System.ANY;

      case System.US:
        return group.system === System.US || group.system === System.ANY;

      case System.NONE:
        return false;

      case System.ANY:
        return true;

      case System.GIVEN:
        return !givenGroup || group.baseUnit === givenGroup.baseUnit;
    }

    return false;
  };
  /**
   * Determines whether the given class matches the classes options on this
   * instance.
   *
   * @param parent The class to test.
   * @return True if the class matches the classes options, otherwise false.
   */


  Transform.prototype.isClassMatch = function (parent) {
    if (this.onlyClasses) {
      return this.onlyClasses.indexOf(parent.name) !== -1;
    }

    if (this.notClasses) {
      return this.notClasses.indexOf(parent.name) === -1;
    }

    return true;
  };
  /**
   * Determines whether the given group matches the unit options on this
   * instance.
   *
   * @param group The group to test.
   * @return True if the group matches the unit options, otherwise false.
   */


  Transform.prototype.isUnitMatch = function (group) {
    if (this.onlyUnits) {
      return this.onlyUnits.indexOf(group.unit) !== -1;
    }

    if (this.notUnits) {
      return this.notUnits.indexOf(group.unit) === -1;
    }

    return true;
  };

  return Transform;
}();

/**
 * The enumeration which decides what value in a range should be used when
 * sorting between ranges with differing minimum and maximum values.
 */

var SortType;

(function (SortType) {
  /**
   * This value will use the minimum of the ranges to sort by.
   */
  SortType[SortType["MIN"] = 0] = "MIN";
  /**
   * This value will use the maximum of the ranges to sort by.
   */

  SortType[SortType["MAX"] = 1] = "MAX";
  /**
   * This value will use the average of the ranges to sort by.
   */

  SortType[SortType["AVERAGE"] = 2] = "AVERAGE";
})(SortType = SortType || (SortType = {}));
/**
 * The class which determines how to sort ranges.
 */


var Sort = function () {
  /**
   * Creates a new instance of Sort with an optional set of options to override
   * the default values.
   *
   * @param input The options to apply to the new instance.
   */
  function Sort(input) {
    /**
     * If the ranges should be in ascending order (small values followed by large
     * values). The default value is in descending order.
     */
    this.ascending = false;
    /**
     * How ranges should be compared when the minimum and maximum values differ.
     */

    this.type = SortType.MAX;
    /**
     * This object describes how ranges of different classes should be sorted by
     * given each class a priority. If a class is not defined here the priority
     * assumed is zero.
     */

    this.classes = {};

    if (Functions.isDefined(input)) {
      this.set(input);
    }
  }
  /**
   * Overrides values in this instance ith ones specified in the input. If class
   * sorting options are specified they are merged into this instance as opposed
   * to a complete overwrite.
   *
   * @param input The values to override.
   * @return The reference to this instance.
   */


  Sort.prototype.set = function (input) {
    this.ascending = Functions.coalesce(input.ascending, this.ascending);
    this.type = Functions.coalesce(input.type, this.type);

    if (Functions.isDefined(input.classes)) {
      for (var className in input.classes) {
        this.classes[className] = input.classes[className];
      }
    }

    return this;
  };
  /**
   * Returns a Sort instance which matches the desired options. If no options
   * are specified the reference to this instance is returned. If the options
   * are already an instance of Sort its returned. If options are specified
   * a new instance is created with the options of this instance, and the given
   * options applied with [[Sort.set]].
   *
   * @param input The options desired.
   * @return An instance of this class which matches the desired options.
   */


  Sort.prototype.extend = function (input) {
    var extended = this;

    if (Functions.isDefined(input)) {
      if (input instanceof Sort) {
        extended = input;
      } else {
        extended = new Sort(this);
        extended.set(input);
      }
    }

    return extended;
  };
  /**
   * Returns a function which can sort ranges based on the options in this
   * instance. Comparison is first done by class, and followed by type.
   */


  Sort.prototype.getSorter = function () {
    var _this = this;

    return function (a, b) {
      var d = _this.getClassComparison(a, b);

      if (d === 0) {
        switch (_this.type) {
          case SortType.MIN:
            d = _this.getMinComparison(a, b);
            break;

          case SortType.MAX:
            d = _this.getMaxComparison(a, b);
            break;

          case SortType.AVERAGE:
            d = _this.getAverageComparison(a, b);
            break;
        }
      }

      return _this.ascending ? d : -d;
    };
  };
  /**
   * A sort function between two ranges which look at the range minimums.
   *
   * @param a The first range.
   * @param b The second range.
   * @see [[Sorter]]
   */


  Sort.prototype.getMinComparison = function (a, b) {
    return Functions.sign(a.min.classScaled - b.min.classScaled);
  };
  /**
   * A sort function between two ranges which look at the range maximums.
   *
   * @param a The first range.
   * @param b The second range.
   * @see [[Sorter]]
   */


  Sort.prototype.getMaxComparison = function (a, b) {
    return Functions.sign(a.max.classScaled - b.max.classScaled);
  };
  /**
   * A sort function between two ranges which look at the range averages.
   *
   * @param a The first range.
   * @param b The second range.
   * @see [[Sorter]]
   */


  Sort.prototype.getAverageComparison = function (a, b) {
    var avg = (a.min.classScaled + a.max.classScaled) * 0.5;
    var bvg = (b.min.classScaled + b.max.classScaled) * 0.5;
    return Functions.sign(avg - bvg);
  };
  /**
   * A sort function between two ranges which look at the range classes.
   *
   * @param a The first range.
   * @param b The second range.
   * @see [[Sorter]]
   */


  Sort.prototype.getClassComparison = function (a, b) {
    var ag = a.min.group ? 1 : -1;
    var bg = b.min.group ? 1 : -1;

    if (ag !== bg) {
      return ag - bg;
    }

    var ac = this.classes[a.min.group.parent.name] || 0;
    var bc = this.classes[b.min.group.parent.name] || 0;
    return ac - bc;
  };

  return Sort;
}();

/**
 * The global class which keeps track of all unit mappings and global options.
 *
 * This class is also responsible for creating dynamic classes and groups based
 * on approximation when a desired unit is not defined by the developer.
 */

var Core = function () {
  function Core() {}
  /**
   * Returns a [[Group]] instance mapped by the given unit. If no unit is given
   * `null` is returned. If the unit isn't mapped to a group a dynamic group
   * match is looked at and if none are found and `createDynamic` is true a new
   * dynamic group is created.
   *
   * @param unit The unit of the group to get.
   * @param createDynamic If creating a dynamic group should be created if an
   *  existing group could not be found.
   * @return The group matched to the unit or null if none was found.
   * @see [[Core.getDynamicMatch]]
   * @see [[Core.addDynamicUnit]]
   * @see [[Core.newDynamicGroup]]
   */


  Core.getGroup = function (unit, createDynamic) {
    if (createDynamic === void 0) {
      createDynamic = true;
    }

    if (!unit) {
      return null;
    }

    var exactGroup = Core.unitToGroup[unit];

    if (exactGroup) {
      return exactGroup;
    }

    var normalizedUnit = unit.toLowerCase();
    var normalizedGroup = Core.unitToGroup[normalizedUnit];

    if (normalizedGroup) {
      return normalizedGroup;
    }

    if (!createDynamic) {
      return null;
    }

    var dynamicUnit = Core.getDynamicMatch(unit);
    var dynamicGroup = Core.dynamicMatches[dynamicUnit];

    if (dynamicGroup) {
      return Core.addDynamicUnit(unit, dynamicGroup);
    }

    return Core.newDynamicGroup(unit);
  };
  /**
   * Sets the given unit as the preferred unit for the group it belongs to. If a
   * group is not found then this has no affect.
   *
   * @param unit The unit to mark as the preferred unit.
   * @see [[Core.getGroup]]
   */


  Core.setPreferred = function (unit) {
    var group = this.getGroup(unit, false);

    if (group) {
      group.setPreferred(unit);
    }
  };
  /**
   * Sets whether the group associated with the given unit is common. A common
   * group is one a user is familiar with and would be okay seeing values
   * represented in. If a group is not found then this has no affect.
   *
   * @param unit The unit of a group to set the common flag.
   * @param common Whether the associated group should be common.
   * @see [[Core.getGroup]]
   */


  Core.setCommon = function (unit, common) {
    if (common === void 0) {
      common = true;
    }

    var group = this.getGroup(unit, false);

    if (group) {
      group.setCommon(common);
    }
  };
  /**
   * Sets the denominators for the group associated to the given unit.
   * Denominators are useful for calculating a fraction from a value.
   *
   * @param unit The unit of a group to set the denominators of.
   * @param denominators The new denominators for the group.
   * @see [[Core.getGroup]]
   */


  Core.setDenominators = function (unit, denominators) {
    var group = this.getGroup(unit, false);

    if (group) {
      group.setDenominators(denominators);
    }
  };
  /**
   * Adds the given class and all groups and units to the global state. If there
   * are units mapped to other groups they are overwritten by the units in the
   * given class.
   *
   * @param parent The class to add to the global state.
   */


  Core.addClass = function (parent) {
    this.classMap[parent.name] = parent;
    this.classes.push(parent);
    var groups = parent.groupMap;

    for (var unit in groups) {
      this.unitToGroup[unit] = groups[unit];
    }
  };
  /**
   * Adds an array of classes to the global state.
   *
   * @see [[Core.addClass]]
   */


  Core.addClasses = function () {
    var classes = [];

    for (var _i = 0; _i < arguments.length; _i++) {
      classes[_i] = arguments[_i];
    }

    for (var i = 0; i < classes.length; i++) {
      this.addClass(classes[i]);
    }
  };
  /**
   * Adds the unit to the given dynamic group. This function also updates the
   * plurality of all the units currently in the group.
   *
   * @param unit The unit to add to the given group.
   * @param group The dynamically created group.
   * @return The instance of the given group.
   */


  Core.addDynamicUnit = function (unit, group) {
    group.units[unit] = Plurality.EITHER;
    var unitCount = 0;

    for (var groupUnit in group.units) {
      if (groupUnit) {
        unitCount++;
      }
    }

    if (unitCount > 1) {
      var longest = void 0;

      for (var groupUnit in group.units) {
        group.units[groupUnit] = Plurality.SINGULAR;

        if (!longest || groupUnit.length > longest.length) {
          longest = groupUnit;
        }
      }

      if (longest) {
        group.units[longest] = Plurality.PLURAL;
      }
    }

    group.updateUnits();
    this.unitToGroup[unit] = group;
    this.unitToGroup[unit.toLowerCase()] = group;
    this.dynamicMatches[this.getDynamicMatch(unit)] = group;
    return group;
  };
  /**
   * Creates a dynamic class & group based on the given unit and adds it to the
   * global state. By default the group is marked with [[System.ANY]], is
   * common, and has the valid denominators 2, 3, 4, 5, 6, 8, 10.
   *
   * @param unit The initial unit of the group to use as the name of the class
   *  and the base unit of the group.
   * @return An instance of a new Group with a new parent Class.
   */


  Core.newDynamicGroup = function (unit) {
    var parent = new Class(unit);
    var group = parent.addGroup({
      system: System.ANY,
      unit: unit,
      common: true,
      baseUnit: unit,
      denominators: [2, 3, 4, 5, 6, 8, 10],
      units: {}
    });
    group.setDynamic();
    this.addDynamicUnit(unit, group);
    this.dynamicGroups.push(group);
    return group;
  };
  /**
   * The function which takes a unit and generates a string which should be used
   * to mark similarly spelled units under the same dynamic group.
   *
   * @param unit The unit to build a key from.
   * @return The key which identifies the dynamic group.
   */


  Core.getDynamicMatch = function (unit) {
    return unit.substring(0, this.dynamicMatchLength).toLowerCase();
  };
  /**
   * The function which takes to values and determines which one is more
   * "normal" or "human friendly".
   *
   * @param fromValue The most normal value found so far.
   * @param toValue The value to compare to.
   * @param transform The transformation rules to guide the function to choose
   *  the more normal value.
   * @param forOutput The output options to guide the function to choose the
   *  more normal value.
   * @return True if `toValue` appears more normal than `fromValue`.
   */
  // @ts-ignore


  Core.isMoreNormal = function (fromValue, toValue, transform, forOutput) {
    var fromString = forOutput.value(fromValue);
    var toString = forOutput.value(toValue);
    return toString.length <= fromString.length;
  };
  /**
   * The map of defined classes by their name.
   */


  Core.classMap = {};
  /**
   * An array of the defined classes.
   */

  Core.classes = [];
  /**
   * A map of groups by their acceptable units.
   */

  Core.unitToGroup = {};
  /**
   * A list of dynamically created groups based on units specified by a user
   * which are not defined by the developer.
   */

  Core.dynamicGroups = [];
  /**
   * A map of the dynamically created groups by a key determined by
   * [[Core.getDynamicMatch]].
   */

  Core.dynamicMatches = {};
  /**
   * Dynamic groups are mapped together (by default) by looking at the first few
   * characters.
   *
   * @see [[Core.getDynamicMatch]]
   */

  Core.dynamicMatchLength = 3;
  /**
   * The global options used for outputting [[Base]], [[Range]], and [[Value]]s
   * which may be overridden by specifying any number of options.
   *
   * @see [[Base.output]]
   * @see [[Range.output]]
   * @see [[Value.output]]
   */

  Core.globalOutput = new Output();
  /**
   * The global transform options used for transforming a [[Base]] instance
   * by specifying what sort of units/groups are visible to the user.
   *
   * @see [[Base.normalize]]
   * @see [[Base.compact]]
   * @see [[Base.expand]]
   * @see [[Base.conversions]]
   * @see [[Base.filter]]
   */

  Core.globalTransform = new Transform();
  /**
   * The global sort options used for ordering ranges in a [[Base]] instance.
   *
   * @see [[Base.sort]]
   */

  Core.globalSort = new Sort();
  return Core;
}();

/**
 * A class which contains a parsed number or fraction.
 */

var Value = function () {
  /**
   * Creates a new instance of Value given the value, possible numerator and
   * denominator, and the unit and it's group.
   *
   * @param value [[Value.value]]
   * @param num [[Value.num]]
   * @param den [[Value.den]]
   * @param unit [[Value.unit]]
   * @param group [[Value.group]]
   */
  function Value(value, num, den, unit, group, rate, rateGroup) {
    var divisor = Functions.gcd(num, den);
    this.value = value;
    this.num = num / divisor;
    this.den = den / divisor;
    this.unit = unit;
    this.group = group;
    this.rate = rate;
    this.rateGroup = rateGroup;
  }

  Object.defineProperty(Value.prototype, "isValid", {
    /**
     * Returns true if this value was successfully parsed from some input.
     */
    get: function () {
      return isFinite(this.value);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "isFraction", {
    /**
     * Returns true if this value is a fraction with a numerator and denoninator.
     */
    get: function () {
      return this.den !== 1;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "isDecimal", {
    /**
     * Returns true if this value is a number and not a fraction.
     */
    get: function () {
      return this.den === 1;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "isZero", {
    /**
     * Returns true if this value is zero.
     */
    get: function () {
      return Functions.isZero(this.value);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "isSingular", {
    /**
     * Returns true if this value is singular.
     *
     * @see [[Functions.isSingular]]
     */
    get: function () {
      return Functions.isSingular(this.value);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "isRate", {
    /**
     * Returns true if this value is a rate.
     */
    get: function () {
      return !!this.rate;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "scaled", {
    /**
     * Returns the number of this value relative to the base unit.
     */
    get: function () {
      return this.group ? this.value * this.group.baseScale : this.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "classScaled", {
    /**
     * Returns the number of this value relative to the first base unit of it's
     * class.
     */
    get: function () {
      return this.group ? this.value * this.group.classScale : this.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "calculated", {
    /**
     * Returns the number which represents the fraction in the value. There may
     * be a difference between this value and the number when the fraction is
     * calculated from the denominators of the group.
     */
    get: function () {
      return this.num / this.den;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "mixedWhole", {
    /**
     * Returns the whole number for the mixed fraction of this value. If this
     * value is not a fraction 0 is returned.
     */
    get: function () {
      return this.den !== 1 ? Math.floor(this.num / this.den) : 0;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "mixedNum", {
    /**
     * Returns the numerator for the mixed fraction of this value. If this value
     * is not a fraction then the numerator is returned.
     */
    get: function () {
      return this.den !== 1 ? this.num % this.den : this.num;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "floor", {
    /**
     * Returns the floor of the number in this value.
     */
    get: function () {
      return Math.floor(this.value);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "ceil", {
    /**
     * Returns the ceiling of the number in this value.
     */
    get: function () {
      return Math.ceil(this.value);
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "truncate", {
    /**
     * Returns the truncated number in this value taking into account it's sign.
     */
    get: function () {
      return this.value < 0 ? this.ceil : this.floor;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "remainder", {
    /**
     * Returns the fractional part of the number in this value.
     */
    get: function () {
      return this.value - this.floor;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "error", {
    /**
     * Returns the signed distance the number of this value is from the fraction
     * numerator and denominator determined. If this value is not a fraction then
     * this should return zero.
     */
    get: function () {
      return this.calculated - this.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Value.prototype, "distance", {
    /**
     * Returns the absolute distance the number of this value is from the fraction
     * numerator and denominator determined. If this value is not a fraction then
     * this should return zero.
     */
    get: function () {
      return Functions.abs(this.error);
    },
    enumerable: true,
    configurable: true
  });
  /**
   * Calculates the scale necessary to switch this value from the current rate
   * to the provided rate.
   *
   * @param rate The rate group.
   * @return The calculated scale.
   */

  Value.prototype.getRateScale = function (rate) {
    return rate ? rate.parent.convert(1, rate, this.rateGroup, 1) : 1;
  };
  /**
   * Determines whether the given value is compatible with this value to perform
   * operations with.
   *
   * @param other The value to test against.
   * @return True if the given value has compatible unit and rate groups.
   */


  Value.prototype.isMatch = function (other) {
    var group = this.group;
    var groupOther = other.group;
    var groupMatch = groupOther === group || groupOther && group && groupOther.parent === group.parent;

    if (!groupMatch) {
      return false;
    }

    var rate = this.rateGroup;
    var rateOther = other.rateGroup;
    var rateMatch = rateOther === rate || rateOther && rate && rateOther.parent === rate.parent;
    return rateMatch;
  };
  /**
   * Returns a version of this value with the preferred unit.
   *
   * @return A new value or the reference to this instance if it's groupless.
   * @see [[Group.preferredUnit]]
   */


  Value.prototype.preferred = function () {
    return this.group ? new Value(this.value, this.num, this.den, this.group.preferredUnit, this.group, this.rateGroup ? this.rateGroup.preferredUnit : this.rate, this.rateGroup) : this;
  };
  /**
   * Returns a copy of this value.
   *
   * @return A new value.
   */


  Value.prototype.copy = function () {
    return new Value(this.value, this.num, this.den, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Returns a value equivalent to zero with the unt and group of this instance.
   *
   * @return A new value.
   */


  Value.prototype.zero = function () {
    return new Value(0, 0, 1, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Returns the truncated version of this value. That's a value where the
   * number is a whole number.
   *
   * @return A new value.
   */


  Value.prototype.truncated = function () {
    return new Value(this.truncate, this.truncate, 1, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Returns a version of this value as a fraction.
   *
   * @return A new value or the reference to this instance if it's a fraction.
   */


  Value.prototype.fractioned = function () {
    if (this.isFraction) {
      return this;
    }

    if (this.group) {
      return Value.fromNumberWithDenominators(this.value, this.group.denominators, this.unit, this.group, this.rate, this.rateGroup);
    }

    return this;
  };
  /**
   * Returns a version of this value as a number.
   *
   * @return A new value or the reference to this instance if it's a number.
   */


  Value.prototype.numbered = function () {
    if (this.isFraction) {
      return new Value(this.value, this.value, 1, this.unit, this.group, this.rate, this.rateGroup);
    }

    return this;
  };
  /**
   * Converts this value to the given group and returns the result.
   *
   * @param to The group to convert to.
   * @param rate The group for the rate.
   * @return The converted value or the number of this value if there's no group.
   */


  Value.prototype.convertTo = function (to, rate) {
    if (rate === void 0) {
      rate = null;
    }

    var group = this.group;
    var rateScale = this.getRateScale(rate);
    var value = this.value * rateScale;
    return group ? group.parent.convert(value, group, to) : value;
  };
  /**
   * Converts this value to the given group and returns a new value. The new
   * value will attempted to be converted to a fraction.
   *
   * @param group The group to convert to.
   * @param rate The group for the rate.
   * @return A new value.
   */


  Value.prototype.convertToValue = function (group, rate) {
    if (rate === void 0) {
      rate = null;
    }

    return Value.fromNumberForGroup(this.convertTo(group, rate), group, rate || this.rateGroup);
  };
  /**
   * Determines the available conversions of this value for all groups
   * that are valid for the given transform.
   *
   * @param transform Transform which controls the units and values acceptable.
   * @param reverse Whether to iterate from largest units to smallest units
   *  (`true`), or from smallest to largest (`false`).
   * @param callback The function to invoke for each valid conversion.
   * @param callback.transformed The conversion calculated.
   * @param callback.index The index of the conversion during iteration.
   * @see [[Group.matches]]
   */


  Value.prototype.conversions = function (transform, reverse, callback) {
    var _this = this;

    var unitGroup = this.group;
    var rateGroup = this.rateGroup;
    var convertUnit = unitGroup && transform.convertUnit;
    var convertRate = rateGroup && transform.convertRate;
    var index = 0;

    if (convertUnit && convertRate) {
      rateGroup.matches(transform, reverse, function (rate) {
        unitGroup.matches(transform, reverse, function (group) {
          callback(_this.convertToValue(group, rate), index++);
        });
      });
    } else if (convertUnit) {
      unitGroup.matches(transform, reverse, function (group) {
        callback(_this.convertToValue(group), index++);
      });
    } else if (convertRate) {
      rateGroup.matches(transform, reverse, function (rate) {
        callback(_this.convertToValue(unitGroup, rate), index++);
      });
    }
  };
  /**
   * Returns a value based on this value with the unit that best represents the
   * value. What is best is typically related to the magnitude of the value.
   * Really small and really large values are harder for people to comprehend so
   * the unit which results in the most normal looking value is determined.
   *
   * @param transform Transform which controls the units and values acceptable.
   * @param forOutput The output that may be used so the most normal looking
   *  value can be determined.
   * @return The most normal value found.
   * @see [[Value.conversions]]
   * @see [[Core.isMoreNormal]]
   */


  Value.prototype.normalize = function (transform, forOutput) {
    var closest;
    this.conversions(transform, false, function (convert) {
      var acceptable = !forOutput.isNumber(convert);

      if (!acceptable) {
        var number = forOutput.number(convert.value);
        acceptable = number !== '0';
      }

      if (acceptable) {
        if (!closest || Core.isMoreNormal(closest, convert, transform, forOutput)) {
          closest = convert;
        }
      }
    });
    return closest || this;
  };
  /**
   * Calculates the sum of this value and the given addend scaled by some
   * factor. This is equivalent to `result = this + (addend * scale)`.
   *
   * @param addend The value to add to this.
   * @param scale The factor to scale the addend by before adding it to this.
   * @return A new instance.
   */


  Value.prototype.add = function (addend, scale) {
    if (scale === void 0) {
      scale = 1;
    }

    var rateScale = this.getRateScale(addend.rateGroup);
    var totalScale = rateScale * scale;
    var num = this.num * addend.den + addend.num * this.den * totalScale;
    var den = this.den * addend.den;
    var result = this.value + addend.value * totalScale;
    return new Value(result, num, den, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Calculates the difference between this value and the subtrahend scaled by
   * some factor. This is equivalent to `result = this - (subtrahend * scale)`.
   *
   * @param subtrahend The value to subtract from this.
   * @param scale The factor to scale the subtrahend by before subtraction.
   * @return A new instance.
   */


  Value.prototype.sub = function (subtrahend, scale) {
    if (scale === void 0) {
      scale = 1;
    }

    var rateScale = this.getRateScale(subtrahend.rateGroup);
    var totalScale = rateScale * scale;
    var num = this.num * subtrahend.den - subtrahend.num * this.den * totalScale;
    var den = this.den * subtrahend.den;
    var result = this.value - subtrahend.value * totalScale;
    return new Value(result, num, den, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Calculates a new value by multiplying this by a given factor. This is
   * equivalent to `result = this * scale`.
   *
   * @param scale The factor to scale this instance by.
   * @return A new instance.
   */


  Value.prototype.scale = function (scale) {
    return new Value(this.value * scale, this.num * scale, this.den, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Calculates a new value by multiplying this by a given value. This is
   * equivalent to `result = this * scale`.
   *
   * @param scale The value to scale this instance by.
   * @return A new instance.
   */


  Value.prototype.mul = function (scale) {
    var rateScale = this.getRateScale(scale.rateGroup);
    var num = this.num * scale.num * rateScale;
    var den = this.den * scale.den;
    var result = this.value * scale.value * rateScale;
    return new Value(result, num, den, this.unit, this.group, this.rate, this.rateGroup);
  };
  /**
   * Converts this value to a string with the given output options taking into
   * account the global options.
   *
   * @param options The options to override the global output options.
   * @return The string representation of this instance.
   * @see [[Output]]
   */


  Value.prototype.output = function (options) {
    var output = Core.globalOutput.extend(options);
    return output.value(this);
  };
  /**
   * Returns the units of this value as a string based on the global output
   * options.
   *
   * @param options The options to override the global output options.
   * @return The string representation of the units of this value.
   * @see [[Output]]
   */


  Value.prototype.units = function (options) {
    var output = Core.globalOutput.extend(options);
    return output.units(this);
  };
  /**
   * Returns a Value instance which is a number with the optional unit and group.
   *
   * @param value The number.
   * @param unit The unit, if any, of the number.
   * @param group The group which matches the unit.
   * @return A new instance.
   */


  Value.fromNumber = function (value, unit, group, rate, rateGroup) {
    if (unit === void 0) {
      unit = '';
    }

    if (group === void 0) {
      group = null;
    }

    if (rate === void 0) {
      rate = '';
    }

    if (rateGroup === void 0) {
      rateGroup = null;
    }

    return new Value(value, value, 1, unit, group, rate, rateGroup);
  };
  /**
   * Returns a Value instance which tries to be a fraction given a range of
   * denominators. If the number is already whole or a fraction close
   * enough to the number cannot be found a value which is a number is returned.
   *
   * @param value The number to try to find a fraction for.
   * @param unit The unit, if any, of the number.
   * @param group The group which matches the unit.
   * @param minDen The starting denominator to inclusively try.
   * @param maxDen The last denominator to inclusively try.
   * @return A new instance.
   */


  Value.fromNumberWithRange = function (value, unit, group, minDen, maxDen, rate, rateGroup) {
    if (unit === void 0) {
      unit = '';
    }

    if (group === void 0) {
      group = null;
    }

    if (minDen === void 0) {
      minDen = 1;
    }

    if (maxDen === void 0) {
      maxDen = 100;
    }

    if (rate === void 0) {
      rate = '';
    }

    if (rateGroup === void 0) {
      rateGroup = null;
    }

    var closestDenominator = 0;
    var closestDistance = -1;

    for (var i = minDen; i <= maxDen; i++) {
      var den = i;
      var num = Math.floor(den * value);
      var actual = num / den;
      var distance = Functions.abs(value - actual);

      if (closestDistance === -1 || distance < closestDistance) {
        closestDistance = distance;
        closestDenominator = den;
      }
    }

    if (closestDistance > Functions.EPSILON) {
      return new Value(value, value, 1, unit, group, rate, rateGroup);
    }

    if (closestDenominator === 0) {
      closestDenominator = 1;
    }

    return new Value(value, Math.floor(value * closestDenominator), closestDenominator, unit, group, rate, rateGroup);
  };
  /**
   * Returns a Value instance which tries to be a fraction based on the
   * denominators of the group. If a valid fraction could not be found then the
   * instance returned will be a number value. Since a unit is not passed here,
   * the preferred unit of the group is used as the unit of the value.
   *
   * @param value The number to try to find a fraction for.
   * @param group The group for the unit and also the denominators to try.
   * @param rateGroup The group for the rate.
   * @return A new instance.
   */


  Value.fromNumberForGroup = function (value, group, rateGroup) {
    return this.fromNumberWithDenominators(value, group.denominators, group.preferredUnit, group, rateGroup ? rateGroup.preferredUnit : '', rateGroup);
  };
  /**
   * Returns a Value instance which tries to be a fraction based on the
   * denominators of the group. If a valid fraction could not be found then the
   * instance returned will be a number value.
   *
   * @param value The number to try to find a fraction for.
   * @param denominators The array of denominators to try.
   * @param unit The unit, if any, of the number.
   * @param group The group which matches the unit.
   * @return A new instance.
   */


  Value.fromNumberWithDenominators = function (value, denominators, unit, group, rate, rateGroup) {
    if (unit === void 0) {
      unit = '';
    }

    if (group === void 0) {
      group = null;
    }

    if (rate === void 0) {
      rate = '';
    }

    if (rateGroup === void 0) {
      rateGroup = null;
    }

    var closestDenominator = 0;
    var closestDistance = -1;

    for (var i = 0; i < denominators.length; i++) {
      var den = denominators[i];
      var num = Math.floor(den * value);
      var actual = num / den;
      var distance = Functions.abs(value - actual);

      if (closestDistance === -1 || distance < closestDistance) {
        closestDistance = distance;
        closestDenominator = den;
      }
    }

    if (closestDistance > Functions.EPSILON) {
      return new Value(value, value, 1, unit, group, rate, rateGroup);
    }

    if (closestDenominator === 0) {
      closestDenominator = 1;
    }

    return new Value(value, Math.floor(value * closestDenominator), closestDenominator, unit, group, rate, rateGroup);
  };
  /**
   * Returns a Value instance for a given fraction specified by a numerator and
   * denominator.
   *
   * @param num The numerator of the fraction.
   * @param den The denominator of the fraction.
   * @param unit The unit, if any, of the fraction.
   * @param group The group which matches the unit.
   * @return A new instance.
   */


  Value.fromFraction = function (num, den, unit, group, rate, rateGroup) {
    if (unit === void 0) {
      unit = '';
    }

    if (group === void 0) {
      group = null;
    }

    if (rate === void 0) {
      rate = '';
    }

    if (rateGroup === void 0) {
      rateGroup = null;
    }

    return new Value(num / den, num, den, unit, group, rate, rateGroup);
  };
  /**
   * A value instance which contains invalid numbers.
   */


  Value.INVALID = new Value(Number.NaN, Number.NaN, 1, '', null, '', null);
  return Value;
}();

/**
 * A pair of minimum and maximum values. A range can be fixed which means the
 * minimum and maximum are equivalent - in which case the range behaves like
 * a [[Value]].
 */

var Range = function () {
  /**
   * Creates a new instance of Range given the minimum and maximum values.
   *
   * @param min The minimum value for the range.
   * @param max The maximum value for the range.
   */
  function Range(min, max) {
    this.min = min.value < max.value ? min : max;
    this.max = max.value > min.value ? max : min;
  }

  Object.defineProperty(Range.prototype, "isValid", {
    /**
     * True if the min and max are both valid.
     */
    get: function () {
      return this.min.isValid && this.max.isValid;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isFraction", {
    /**
     * True if the min or max are a fraction.
     */
    get: function () {
      return this.min.isFraction || this.max.isFraction;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isDecimal", {
    /**
     * True if the min and max are decimal.
     */
    get: function () {
      return this.min.isDecimal && this.max.isDecimal;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isRange", {
    /**
     * True if the min and max are not the same value.
     */
    get: function () {
      return this.min.value !== this.max.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isFixed", {
    /**
     * True if the min and max are the same value.
     */
    get: function () {
      return this.min.value === this.max.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isZero", {
    /**
     * True if the min and max are both equal to zero.
     */
    get: function () {
      return this.min.isZero && this.max.isZero;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isSingular", {
    /**
     * True if the min and max are both singular (1 or -1).
     */
    get: function () {
      return this.min.isSingular && this.max.isSingular;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "isRate", {
    /**
     * True if one of min and max are rates.
     */
    get: function () {
      return this.min.isRate && this.max.isRate;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "average", {
    /**
     * The average number between the min and max.
     */
    get: function () {
      return (this.min.value + this.max.value) * 0.5;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "value", {
    /**
     * The minimum value of this range.
     */
    get: function () {
      return this.min.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "minimum", {
    /**
     * The minimum value of this range.
     */
    get: function () {
      return this.min.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "maximum", {
    /**
     * The maximum value of this range.
     */
    get: function () {
      return this.max.value;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Range.prototype, "unit", {
    /**
     * The unit which identifies the group of the minimum value or `null` if the
     * minimum value does not have a group.
     */
    get: function () {
      return this.min.group ? this.min.group.unit : null;
    },
    enumerable: true,
    configurable: true
  });
  /**
   * Determines if the given range matches this range enough to allow a
   * simple mathematical operation between the two ranges.
   *
   * @param range The range to test.
   * @return True if the groups of the given range match this range.
   */

  Range.prototype.isExactMatch = function (range) {
    return this.min.group === range.min.group && this.max.group === range.max.group && this.min.rateGroup === range.min.rateGroup && this.max.rateGroup === range.max.rateGroup;
  };
  /**
   * Determines if the given range matches this range enough to allow a
   * complex mathematical operation between the two ranges.
   *
   * @param min The minimum of the range to test.
   * @param max The maximum of the range to test.
   * @return True if the min and max have compatible values.
   */


  Range.prototype.isMatch = function (min, max) {
    return this.min.isMatch(min) && this.max.isMatch(max);
  };
  /**
   * @return A range which has the min and max converted to their preferred units.
   * @see [[Value.preferred]]
   */


  Range.prototype.preferred = function () {
    var min = this.min.preferred();
    var max = this.max.preferred();
    return new Range(min, max);
  };
  /**
   * @return A range which has only positive values. If the range is entirely
   *  negative then `null` is returned.
   */


  Range.prototype.positive = function () {
    var minNegative = this.min.value < 0;
    var maxNegative = this.max.value < 0;

    if (maxNegative) {
      return null;
    }

    var min = minNegative ? this.min.zero() : this.min.copy();
    var max = this.max.copy();
    return new Range(min, max);
  };
  /**
   * @return A range which has only negative values. If the range is entirely
   *  positive then `null` is returned.
   */


  Range.prototype.negative = function () {
    var minPositive = this.min.value >= 0;
    var maxPositive = this.max.value >= 0;

    if (minPositive) {
      return null;
    }

    var min = this.min.copy();
    var max = maxPositive ? this.max.zero() : this.max.copy();
    return new Range(min, max);
  };
  /**
   * @return A range which has a non-zero min and max. If both are equial to
   *  zero then `null` is returned.
   */


  Range.prototype.nonzero = function () {
    var minZero = Functions.isZero(this.min.value);
    var maxZero = Functions.isZero(this.max.value);

    if (minZero && maxZero) {
      return null;
    }

    var min = this.min.copy();
    var max = this.max.copy();
    return new Range(min, max);
  };
  /**
   * @return A range with only the maximum value from this range.
   */


  Range.prototype.maxd = function () {
    var fixed = this.max.copy();
    return new Range(fixed, fixed);
  };
  /**
   * @return A range with only the minimum value from this range.
   */


  Range.prototype.mind = function () {
    var fixed = this.min.copy();
    return new Range(fixed, fixed);
  };
  /**
   * Creates a range with with units that best represent the values. This may
   * cause the minimum and maximum values to have different units.
   *
   * @param transform Options to control which units and values are acceptable.
   * @param forOutput The output options that should be used to determine which
   *  value & unit is best.
   * @return A new range.
   * @see [[Value.normalize]]
   */


  Range.prototype.normalize = function (transform, forOutput) {
    var min = this.min.normalize(transform, forOutput);
    var max = this.max.normalize(transform, forOutput);
    return new Range(min, max);
  };
  /**
   * Adds this range and a given range (optionally scaled by a factor) together.
   *
   * @param addend The range to add to this instance.
   * @param scale The factor to multiply the addend by when added it to this
   *  instance.
   * @return a new range.
   * @see [[Value.add]]
   */


  Range.prototype.add = function (addend, scale) {
    if (scale === void 0) {
      scale = 1;
    }

    var min = this.min.add(addend.min, scale);
    var max = this.max.add(addend.max, scale);
    return new Range(min, max);
  };
  /**
   * Subtracts a given range (optionally scaled by a factor) from this range.
   *
   * @param subtrahend The range to remove from this instance.
   * @param scale The factor to multiply the subtrahend by when subtracting it
   *  from this instance.
   * @return A new range.
   * @see [[Value.sub]]
   */


  Range.prototype.sub = function (subtrahend, scale) {
    if (scale === void 0) {
      scale = 1;
    }

    var min = this.min.sub(subtrahend.min, scale);
    var max = this.max.sub(subtrahend.max, scale);
    return new Range(min, max);
  };
  /**
   * Multiplies this range by a scalar factor.
   *
   * @param scale The amount to multiply the range by.
   * @return A new range.
   * @see [[Value.scale]]
   */


  Range.prototype.scale = function (scale) {
    var min = this.min.scale(scale);
    var max = this.max.scale(scale);
    return new Range(min, max);
  };
  /**
   * Multiplies this range by a scale value.
   *
   * @param scale The amount to multiply the range by.
   * @return A new range.
   * @see [[Value.mul]]
   */


  Range.prototype.mul = function (scale) {
    var min = this.min.mul(scale);
    var max = this.max.mul(scale);
    return new Range(min, max);
  };
  /**
   * Returns a range which is coerced into being represented by fractions if a
   * valid fraction can be determined from the units valid denominators.
   *
   * @return A new range if the minimum and maximum are not fractions, otherwise
   *  the reference to this range is returned.
   * @see [[Value.fractioned]]
   */


  Range.prototype.fractioned = function () {
    if (this.min.isFraction && this.max.isFraction) {
      return this;
    }

    var min = this.min.fractioned();
    var max = this.max.fractioned();
    return new Range(min, max);
  };
  /**
   * Returns a range which has any fraction values converted to numbers.
   *
   * @return A new range if the mimimum or maximum are fractions, otherwise the
   *  the reference to this range is returned.
   * @see [[Value.numbered]]
   */


  Range.prototype.numbered = function () {
    if (!this.min.isFraction && !this.max.isFraction) {
      return this;
    }

    var min = this.min.numbered();
    var max = this.max.numbered();
    return new Range(min, max);
  };
  /**
   * Converts this range to a string with the given output options taking into
   * account the global options.
   *
   * @param options The options to override the global output options.
   * @return The string representation of this instance.
   * @see [[Output]]
   */


  Range.prototype.output = function (options) {
    var output = Core.globalOutput.extend(options);
    return output.range(this);
  };
  /**
   * Creates a fixed range from a given value. A fixed range behaves essentially
   * as a value since the minimum and maximum are equivalent.
   *
   * @param fixed The value to be used as the min and max of the range.
   * @return A new fixed range.
   */


  Range.fromFixed = function (fixed) {
    return new Range(fixed, fixed);
  };
  /**
   * A range instance which contains invalid values.
   */


  Range.INVALID = new Range(Value.INVALID, Value.INVALID);
  return Range;
}();

/**
 * Takes user input and returns a new instance of [Base].
 */

function uz(input) {
  return new Base(input);
}
/**
 * The main class which contains a list of ranges and the user input.
 */

var Base = function () {
  /**
   * Creates a new instance of Base given some user input to parse or an
   * existing list of ranges to use instead.
   *
   * @param input The input to parse if ranges is not provided.
   * @param ranges The already parsed ranges to use for this instance.
   */
  function Base(input, ranges) {
    this.input = input;
    this.ranges = ranges || Parse.ranges(input);
  }
  /**
   * Scales the ranges in this instance by the given factor and returns a
   * new instance.
   *
   * *For example:*
   * ```javascript
   * uz('1c, 2.3m').scale(2); // '2c, 4.6m'
   * ```
   *
   * @param amount The factor to scale the ranges in this instance by.
   * @return A new instance.
   * @see [[Range.scale]]
   * @see [[Base.mutate]]
   */


  Base.prototype.scale = function (amount) {
    return this.mutate(function (r) {
      return r.scale(amount);
    });
  };
  /**
   * Scales the ranges in this instance by the given value and returns a
   * new instance.
   *
   * *For example:*
   * ```javascript
   * uz('1c, 3/5m').scale(Value.fromFraction(2, 3)); // '2/3c, 6/15m'
   * ```
   *
   * @param amount The value to scale the ranges in this instance by.
   * @return A new instance.
   * @see [[Range.mul]]
   * @see [[Base.mutate]]
   */


  Base.prototype.mul = function (amount) {
    return this.mutate(function (r) {
      return r.mul(amount);
    });
  }; // 1c, 3m SCALE TO 1/2c = 1/2c, 1.5m

  /**
   * Scales the ranges in this instance up to some value with a unit and returns
   * a new instance. Because this instance might contain ranges, a rangeDelta
   * can be specified to instruct on which value (min or max) to use when
   * calculating how much to scale by.
   *
   * *For example:*
   * ```javascript
   * uz('1m, 2 - 3c').scaleTo('6c'); // '2m, 4 - 6c'
   * uz('1m, 2 - 3c').scaleTo('6c', 0); // '3m, 6 - 9c'
   * uz('1m, 2 - 3c').scaleTo('6c', 0.5); // '2.4m, 4.8 - 6c'
   * ```
   *
   * @param unitValue A value & unit pair to scale the ranges in this instance to.
   * @param rangeDelta When this instance contains ranges this value instructs
   *  how the scale factor is calculated. A value of 0 means it looks at the
   *  minimum, 1 is the maximum, and 0.5 is the average.
   * @return A new instance.
   * @see [[Base.getScaleTo]]
   * @see [[Base.scale]]
   */


  Base.prototype.scaleTo = function (unitValue, rangeDelta) {
    if (rangeDelta === void 0) {
      rangeDelta = 1.0;
    }

    return this.scale(this.getScaleTo(unitValue, rangeDelta));
  };
  /**
   * Changes the units used on each of the ranges in this instance to the
   * preferred unit for each group.
   *
   * *For example:*
   * ```javascript
   * uz('5 kilos').preferred(); // '5 kg'
   * ```
   *
   * @return A new instance.
   * @see [[Core.setPreferred]]
   * @see [[Range.preferred]]
   * @see [[Base.mutate]]
   */


  Base.prototype.preferred = function () {
    return this.mutate(function (r) {
      return r.preferred();
    });
  };
  /**
   * Drops negative ranges and modifies partially negative ranges so that all
   * values are greater than or equal to zero.
   *
   * *For example:*
   * ```javascript
   * uz('0c, 2tbsp, -4tbsp').positive(); // '0c, 2tbsp'
   * uz('-2 - 3 in').positive(); // '0 - 3in'
   * ```
   *
   * @return A new instance.
   * @see [[Range.positive]]
   * @see [[Base.mutate]]
   */


  Base.prototype.positive = function () {
    return this.mutate(function (r) {
      return r.positive();
    });
  };
  /**
   * Drops positive ranges and modifies partially positive ranges so that all
   * values are less than zero.
   *
   * *For example:*
   * ```javascript
   * uz('0c, 2tbsp, -4tbsp').negative(); // '-4tbsp'
   * uz('-2 - 3 in').negative(); // '-2 - 0in'
   * ```
   *
   * @return A new instance.
   * @see [[Range.negative]]
   * @see [[Base.mutate]]
   */


  Base.prototype.negative = function () {
    return this.mutate(function (r) {
      return r.negative();
    });
  };
  /**
   * Drops ranges that are equal to zero.
   *
   * *For example:*
   * ```javascript
   * uz('0c, 2tbsp').negative(); // '2tbsp'
   * ```
   *
   * @return A new instance.
   * @see [[Range.nonzero]]
   * @see [[Base.mutate]]
   */


  Base.prototype.nonzero = function () {
    return this.mutate(function (r) {
      return r.nonzero();
    });
  };
  /**
   * Converts each range to fractions if a denominator for the specified units
   * yields a fraction close enough to the original value.
   *
   * *For example:*
   * ```javascript
   * uz('1/2 cup').fractions(); // '1/2 cup'
   * uz('0.3cm').fractions(); // '3/10 cm'
   * uz('0.33 decades').fractions(); // '0.33 decades' closest is 3/10 but that's not close enough
   * ```
   *
   * @return A new instance.
   * @see [[Range.fractioned]]
   * @see [[Base.mutate]]
   */


  Base.prototype.fractions = function () {
    return this.mutate(function (r) {
      return r.fractioned();
    });
  };
  /**
   * Converts each range to numbers if they are fractions.
   *
   * *For example:*
   * ```javascript
   * uz('1/2 cup').fractions(); // '0.5 cup'
   * uz('0.3cm').fractions(); // '0.3 cm'
   * ```
   *
   * @return A new instance.
   * @see [[Range.numbered]]
   * @see [[Base.mutate]]
   */


  Base.prototype.numbers = function () {
    return this.mutate(function (r) {
      return r.numbered();
    });
  };
  /**
   * Flattens any ranges to their maximum values.
   *
   * *For example:*
   * ```javascript
   * uz('1 - 3c, 5m').max(); // '3c, 5m'
   * ```
   *
   * @return A new instance or this if this instance has no ranges.
   * @see [[Range.maxd]]
   * @see [[Base.mutate]]
   */


  Base.prototype.max = function () {
    return this.hasRanges ? this.mutate(function (r) {
      return r.maxd();
    }) : this;
  };
  /**
   * Flattens any ranges to their minimum values.
   *
   * *For example:*
   * ```javascript
   * uz('1 - 3c, 5m').max(); // '1c, 5m'
   * ```
   *
   * @return A new instance or this if this instance has no ranges.
   * @see [[Range.mind]]
   * @see [[Base.mutate]]
   */


  Base.prototype.min = function () {
    return this.hasRanges ? this.mutate(function (r) {
      return r.mind();
    }) : this;
  };
  /**
   * Converts each range to units that best represent the value.
   *
   * *For example:*
   * ```javascript
   * uz('1.5pt, 12in, 3.14159rad').normalize(); // '3c, 1ft, 180deg'
   * ```
   *
   * @param options Options to control which units and values are acceptable.
   * @param forOutput The output options that should be used to determine which
   *  value & unit is best.
   * @return A new instance.
   * @see [[Transform]]
   * @see [[Output]]
   * @see [[Core.isMoreNormal]]
   * @see [[Core.globalTransform]]
   * @see [[Core.globalOutput]]
   * @see [[Range.normalize]]
   * @see [[Base.mutate]]
   */


  Base.prototype.normalize = function (options, forOutput) {
    var output = Core.globalOutput.extend(forOutput);
    var transform = Core.globalTransform.extend(options);
    return this.mutate(function (r) {
      return r.normalize(transform, output);
    });
  };
  /**
   * Joins all ranges of the same classes together and uses the largest unit
   * to represent the sum for the class.
   *
   * *For example:*
   * ```javascript
   * uz('1c, 1pt').compact(); // '1.5pt'
   * ```
   *
   * @param options Options to control which units and values are acceptable.
   * @return A new instance.
   * @see [[Transform]]
   * @see [[Core.globalTransform]]
   */


  Base.prototype.compact = function (options) {
    var ranges = this.ranges.slice();
    var compacted = [];
    var transform = Core.globalTransform.extend(options); // Largest ranges first

    ranges.sort(function (a, b) {
      return b.max.classScaled - a.max.classScaled;
    });

    for (var i = 0; i < ranges.length; i++) {
      var a = ranges[i];
      var min = a.min;
      var max = a.max;

      for (var k = ranges.length - 1; k > i; k--) {
        var b = ranges[k];

        if (a.isMatch(b.min, b.max)) {
          min = min.add(b.min.convertToValue(min.group, min.rateGroup));
          max = max.add(b.max.convertToValue(max.group, max.rateGroup));
          ranges.splice(k, 1);
        }
      }

      var sum = new Range(min, max);

      if (transform.isValidRange(sum)) {
        compacted.push(sum);
      }
    }

    return new Base(this.input, compacted);
  };
  /**
   * Joins all ranges of the same classes together and then separates them
   * into whole number ranges for better readability.
   *
   * *For example:*
   * ```javascript
   * uz('1.5pt').expand(); // '1pt, 1c'
   * uz('53in').expand(); // '4ft, 5in'
   * uz('2ft, 29in').expand(); // '4ft, 5in'
   * uz('6543mm').expand(); // '6 m, 54 cm, 3 mm'
   * ```
   *
   * @param options Options to control which units and values are acceptable.
   * @return A new instance.
   * @see [[Transform]]
   * @see [[Core.globalTransform]]
   */


  Base.prototype.expand = function (options) {
    var transform = Core.globalTransform.extend(options);
    var compacted = this.compact(transform);
    var ranges = compacted.ranges;
    var expanded = [];

    var _loop_1 = function (i) {
      var range = ranges[i];
      var value = transform.convertWithMax ? range.max : range.min;
      var valueGroup = value.group;
      var valueSign = Functions.sign(value.value);
      var valueRate = value.rateGroup;

      if (valueGroup) {
        valueGroup.matches(transform, true, function (group) {
          if (!Functions.isZero(value.value)) {
            var transformed = value.convertToValue(group, valueRate);

            if (group.isBase) {
              value = value.zero();
              expanded.push(Range.fromFixed(transformed));
            } else if (Functions.abs(transformed.value) >= 1 && Functions.sign(transformed.value) === valueSign) {
              var truncated = transformed.truncated();
              value = value.sub(truncated.convertToValue(valueGroup, valueRate));
              expanded.push(Range.fromFixed(truncated));
            }
          }
        });
      } else {
        expanded.push(range);
      }
    };

    for (var i = 0; i < ranges.length; i++) {
      _loop_1(i);
    }

    return new Base(this.input, expanded);
  };
  /**
   * Adds the ranges of this instance and the given input together. When the
   * ranges use the same units they are added together, otherwise they are
   * added to the end of the range list.
   *
   * *For example:*
   * ```javascript
   * uz('1pt').add('2pt, 1c'); // '3pt, 1c'
   * uz('1pt').add('2pt, 1c', 2); // '5pt, 2c'
   * ```
   *
   * @param input An instance or input which can be parsed into an instance.
   * @param scale A number to multiple the input by when adding it to this instance.
   * @return A new instance.
   * @see [[Base.operate]]
   * @see [[Range.add]]
   * @see [[Range.scale]]
   */


  Base.prototype.add = function (input, scale) {
    if (scale === void 0) {
      scale = 1;
    }

    return this.operate(input, function (a, b) {
      return a.add(b, scale);
    }, function (a) {
      return a.scale(scale);
    });
  };
  /**
   * Subtracts the given input from the ranges of this instance. When the ranges
   * use the same units they are subtracted, otherwise they are added to the
   * end of the range list and negated.
   *
   * *For example:*
   * ```javascript
   * uz('3pt').sub('2pt, 1c'); // '1pt, -1c'
   * uz('1pt').add('2pt, 1c', 2); // '-3pt, -2c'
   * ```
   *
   * @param input An instance or input which can be parsed into an instance.
   * @param scale A number to multiple the input by when subtracting it from this instance.
   * @return A new instance.
   * @see [[Base.operate]]
   * @see [[Range.sub]]
   * @see [[Range.scale]]
   */


  Base.prototype.sub = function (input, scale) {
    if (scale === void 0) {
      scale = 1;
    }

    return this.operate(input, function (a, b) {
      return a.sub(b, scale);
    }, function (a) {
      return a.scale(-scale);
    });
  };
  /**
   * Subtracts the given input from the ranges of this instance. When the ranges
   * use the same units they are subtracted, otherwise they are added to the
   * end of the range list and negated.
   *
   * *For example:*
   * ```javascript
   * uz('3pt').sub('2pt, 1c'); // '1pt, -1c'
   * uz('1pt').add('2pt, 1c', 2); // '-3pt, -2c'
   * ```
   *
   * @param input An instance or input which can be parsed into an instance.
   * @param operate A function to call when matching ranges are found and an
   *  operation should be performed between them. The range returned by this
   *  function ends up in the result.
   * @param operate.a The first range to operate on.
   * @param operate.b The second range to operate on.
   * @param remainder A function to call on a range that did not have a match
   *  in this instance where the range returned is added to the result.
   * @param remainder.a The remaining range to operate on.
   * @return A new instance.
   * @see [[Range.isExactMatch]]
   */


  Base.prototype.operate = function (input, operate, remainder) {
    var ranges = this.ranges;
    var output = [];
    var other = Parse.base(input);
    var otherRanges = other.ranges;
    var otherUsed = [];

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];

      for (var k = 0; k < otherRanges.length; k++) {
        if (!otherUsed[k]) {
          var otherRange = otherRanges[k];

          if (range.isExactMatch(otherRange)) {
            range = operate(range, otherRange);
            otherUsed[k] = true;
          }
        }
      }

      output.push(range);
    }

    for (var k = 0; k < otherRanges.length; k++) {
      if (!otherUsed[k]) {
        output.push(remainder(otherRanges[k]));
      }
    }

    return new Base(this.input, output);
  };
  /**
   * Joins all ranges of the same classes together and then calculates all
   * equivalent ranges for each range for each valid group according to the
   * given options.
   *
   * *For example:*
   * ```javascript
   * uz('1.5pt').conversions(); // '3/16gal, 3/4qt, 1 1/2pt, 3c, 24floz, 48tbsp, 144tsp'
   * uz('20celsius, 45deg'); // '68F, 20celsius, 45deg, 0.785rad'
   * ```
   *
   * @param options Options to control which units and values are acceptable.
   * @return A new instance.
   * @see [[Transform]]
   * @see [[Core.globalTransform]]
   * @see [[Value.conversions]]
   */


  Base.prototype.conversions = function (options) {
    var transform = Core.globalTransform.extend(options);
    var compacted = this.compact(options);
    var ranges = compacted.ranges;
    var output = [];

    var _loop_2 = function (i) {
      var range = ranges[i];
      var convert = transform.convertWithMax ? range.max : range.min;
      convert.conversions(transform, false, function (transformed) {
        var min = transform.convertWithMax ? range.min.convertToValue(transformed.group, transformed.rateGroup) : transformed;
        var max = transform.convertWithMax ? transformed : range.max.convertToValue(transformed.group, transformed.rateGroup);

        if (min.value <= transform.max && max.value >= transform.min) {
          output.push(new Range(min, max));
        }
      });
    };

    for (var i = 0; i < ranges.length; i++) {
      _loop_2(i);
    }

    return new Base(this.input, output);
  };
  /**
   * Executes the given function on each range in this instance and if the
   * function returns a valid range its added to the result.
   *
   * *For example:*
   * ```javascript
   * uz('1.5pt').mutate(r => r.scale(2)); // '3pt'
   * ```
   *
   * @param mutator The function which may return a range.
   * @return A new instance.
   */


  Base.prototype.mutate = function (mutator) {
    var ranges = [];
    var source = this.ranges;

    for (var i = 0; i < source.length; i++) {
      var mutated = mutator(source[i]);

      if (mutated && mutated.isValid) {
        ranges.push(mutated);
      }
    }

    return new Base(this.input, ranges);
  };
  /**
   * Removes the ranges from this instance that aren't valid according to the
   * transform options provided taking into account the global options.
   *
   * *For example:*
   * ```javascript
   * uz('1in, 2m').filter({system: Unitz.System.METRIC}); // '2m'
   * ```
   *
   * @param options Options to control which units and values are acceptable.
   * @return A new instance.
   * @see [[Transform]]
   * @see [[Core.globalTransform]]
   * @see [[Transform.isValidRange]]
   */


  Base.prototype.filter = function (options) {
    var transform = Core.globalTransform.extend(options);
    var ranges = this.ranges;
    var filtered = [];

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];

      if (transform.isValidRange(range)) {
        filtered.push(range);
      }
    }

    return new Base(this.input, filtered);
  };
  /**
   * Sorts the ranges in this instance based on the options provided taking into
   * account the global options.
   *
   * *For example:*
   * ```javascript
   * uz('1in, 3ft, 1.3yd, 1m').sort(); // 1.3yd, 1m, 3ft, 1in
   * uz('1in, 3ft, 1.3yd, 1m').sort({ascending: true}); // 1in, 3ft, 1m, 1.3yd
   * uz('1-3cups, 2-2.5cups, 4in').sort({
   *  type: Unitz.SortType.MIN,
   *  classes: {
   *   Volume: 1,
   *   Length: 2
   *  }
   * }); // 4in, 2 - 2.5cups, 1 - 3cups
   * ```
   *
   * @param options Options to control how sorting is done.
   * @return A new instance.
   * @see [[Sort]]
   * @see [[Core.globalSort]]
   */


  Base.prototype.sort = function (options) {
    var sort = Core.globalSort.extend(options);
    var ranges = this.ranges.slice();
    ranges.sort(sort.getSorter());
    return new Base(this.input, ranges);
  };
  /**
   * Calculates what this instance would need to be scaled by so that the given
   * value & unit pair is equal to the sum of ranges in this instance of the
   * same class. If there are no ranges with the same class then zero is
   * returned. If the sum of ranges with the same class results in an actual
   * range (where min != max) then you can specify how to pick a value from the
   * range with rangeDetla. A value of 0 uses the min, 1 uses the max, and 0.5
   * uses the average between them.
   *
   * *For example:*
   * ```javascript
   * uz('1m, 2 - 3c').getScaleTo('6c'); // 2
   * uz('1m, 2 - 3c').getScaleTo('6c', 0); // 3
   * uz('1m, 2 - 3c').getScaleTo('6c', 0.5); // 2.4
   * uz('1m, 2 - 3c').getScaleTo('45deg'); // 0
   * ```
      * @param unitValue A value & unit pair to scale the ranges in this instance to.
   * @param rangeDelta When this instance contains ranges this value instructs
   *  how the scale factor is calculated. A value of 0 means it looks at the
   *  minimum, 1 is the maximum, and 0.5 is the average.
   * @return A value to scale by or zero if this instance cannot match the input.
   * @see [[Base.convert]]
   * @see [[Parse.value]]
   */


  Base.prototype.getScaleTo = function (unitValue, rangeDelta) {
    if (rangeDelta === void 0) {
      rangeDelta = 1.0;
    }

    var to = Parse.value(unitValue);

    if (!to.isValid) {
      return 0;
    }

    var converted = this.convert(to.units());

    if (!converted || !converted.isValid) {
      return 0;
    }

    var convertedValue = (converted.maximum - converted.minimum) * rangeDelta + converted.minimum;
    var scale = to.value / convertedValue;
    return scale;
  };
  /**
   * Converts the ranges in this instance to a string with the given output
   * options taking into account the global options.
   *
   * @param options The options to override the global output options.
   * @return The string representation of this instance.
   * @see [[Output]]
   */


  Base.prototype.output = function (options) {
    var output = Core.globalOutput.extend(options);
    return output.ranges(this.ranges);
  };
  /**
   * Converts the appropriate ranges in this instance into the desired unit
   * and returns their converted sum. If the given unit does not map to a group
   * then null is returned. If there are no ranges in this instance in the same
   * class then the range returned is equivalent to zero.
   *
   * *For example:*
   * ```javascript
   * uz('1in, 1m, 1ft').convert('cm'); // '133.02 cm'
   * uz('60 mph').convert('miles per minute'); // '1 miles/minute'
   * ```
   *
   * @param unit The unit to calculate the sum of.
   * @return A new range which is the sum of ranges in the same class converted
   *  to the desired unit.
   * @see [[Core.getGroup]]
   * @see [[Range.isZero]]
   */


  Base.prototype.convert = function (unit) {
    var unitParsed = Parse.unit(unit);
    var group = Core.getGroup(unitParsed.unit);
    var rateGroup = Core.getGroup(unitParsed.rate);

    if (!group) {
      return null;
    }

    var ranges = this.ranges;
    var min = new Value(0, 0, 1, unit, group, unitParsed.rate, rateGroup);
    var max = new Value(0, 0, 1, unit, group, unitParsed.rate, rateGroup);

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];

      if (range.isMatch(min, max)) {
        min = min.add(range.min.convertToValue(group, rateGroup));
        max = max.add(range.max.convertToValue(group, rateGroup));
      }
    }

    return new Range(min, max);
  };
  /**
   * Alias for [[Base.convert]].
   */


  Base.prototype.to = function (unit) {
    return this.convert(unit);
  };
  /**
   * Iterates over each range in this instance in order or reversed and passes
   * each one to the given iterate function. If the iterate function returns
   * false the iteration will stop.
   *
   * @param iterate The function to invoke with each range and it's index.
   * @param iterate.range The current range being iterated.
   * @param iterate.index The index of the current range in this instance.
   * @param reverse Whether the iteration should be done forward or backward.
   * @return The reference to this instance.
   */


  Base.prototype.each = function (iterate, reverse) {
    if (reverse === void 0) {
      reverse = false;
    }

    var ranges = this.ranges;
    var start = reverse ? ranges.length - 1 : 0;
    var end = reverse ? -1 : ranges.length;
    var move = reverse ? -1 : 1;

    for (var i = start; i !== end; i += move) {
      if (iterate(ranges[i], i) === false) {
        break;
      }
    }

    return this;
  };
  /**
   * Returns an array of the classes represented in this instance. If there are
   * no classes in this instance then an empty array is returned.
   *
   * @return An array of the classes in this instance.
   */


  Base.prototype.classes = function () {
    var ranges = this.ranges;
    var classMap = {};
    var classes = [];

    for (var i = 0; i < ranges.length; i++) {
      var range = ranges[i];
      var group = range.min.group;

      if (group) {
        classMap[group.parent.name] = group.parent;
      }
    }

    for (var className in classMap) {
      classes.push(classMap[className]);
    }

    return classes;
  };

  Object.defineProperty(Base.prototype, "hasRanges", {
    /**
     * Returns whether this instance has actual ranges. An actual range is where
     * the minimum and maximum values differ.
     *
     * @see [[Range.isRange]]
     */
    get: function () {
      return this.test(false, false, function (r) {
        return r.isRange;
      });
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Base.prototype, "hasRates", {
    /**
     * Returns whether this instance has values or ranges that are rates.
     *
     * @see [[Range.isRate]]
     */
    get: function () {
      return this.test(false, false, function (r) {
        return r.isRate;
      });
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Base.prototype, "isValid", {
    /**
     * Returns whether this instance only has valid ranges. If any of the ranges
     * in this instance are not valid false is returned, otherwise true.
     *
     * @see [[Range.isValid]]
     */
    get: function () {
      return this.test(true, true, function (r) {
        return r.isValid;
      });
    },
    enumerable: true,
    configurable: true
  });
  /**
   * Performs a test on the ranges in this instance and returns whether the
   * ranges passed the test. If the `tester` function returns something
   * different than `expected` then the function ends early with `!passed`.
   * If all tests pass then `passed` is returned.
   *
   * @param expected The expected result of the tester.
   * @param passed The value to return if all ranges pass the test.
   * @param tester The function to test a range.
   * @return Return `passed` if all ranges return `expected` from `tester`.
   */

  Base.prototype.test = function (expected, passed, tester) {
    var ranges = this.ranges;

    for (var i = 0; i < ranges.length; i++) {
      if (tester(ranges[i]) != expected) {
        return !passed;
      }
    }

    return passed;
  };

  Object.defineProperty(Base.prototype, "length", {
    /**
     * Returns the number of ranges in this instance.
     */
    get: function () {
      return this.ranges.length;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Base.prototype, "isFixed", {
    /**
     * Returns true if this instance has a single fixed value.
     *
     * @see [[Range.isFixed]]
     */
    get: function () {
      return this.ranges.length === 1 && this.ranges[0].isFixed;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Base.prototype, "isRange", {
    /**
     * Returns true if this instance has a single range.
     *
     * @see [[Range.isRange]]
     */
    get: function () {
      return this.ranges.length === 1 && this.ranges[0].isRange;
    },
    enumerable: true,
    configurable: true
  });
  Object.defineProperty(Base.prototype, "isRate", {
    /**
     * Returns true if this instance has a single rate.
     *
     * @see [[Range.isRate]]
     */
    get: function () {
      return this.ranges.length === 1 && this.ranges[0].isRate;
    },
    enumerable: true,
    configurable: true
  });
  return Base;
}();

/**
 * Creates a [[Translator]] which matches against a regular expression and when
 * the user input matches the regular expression another handler function is
 * called to translate the input. Optionally a constant value can be passed
 * to this function and down to the translator.
 *
 * @param regex The regular expression to match against user input.
 * @param handler The function to call if the input matched the expression.
 * @param vars The constant value to pass to the [[RegexTranslator]].
 * @return A [[Translator]] function.
 */

function newRegexTranslator(regex, handler, vars) {
  return function (x) {
    var matches = x.match(regex);

    if (matches) {
      x = handler(matches, vars);
    }

    return x;
  };
}
/**
 * The class which holds [[Translator]]s to manipulate user input into something
 * more understandable to the [[Parse]] class.
 */

var Translations = function () {
  function Translations() {}
  /**
   * Adds all translators in the library to be available when parsing.
   */


  Translations.addDefaults = function () {
    this.add(this.Quantity);
    this.add(this.NumberWords);
    this.add(this.FractionOfNumber);
    this.add(this.AndFraction);
    this.add(this.QuantityValue);
  };
  /**
   * Adds the given translator to the list of registered translators. This
   * translator will be called last.
   *
   * @param translator The function which translates user input.
      */


  Translations.add = function (translator) {
    this.registered.push(translator);
  };
  /**
   * Translates the user input based on the registered translators and returns
   * the final string ready to be parsed.
   *
   * @param input The input to translate.
   * @return The translated string.
   */


  Translations.translate = function (input) {
    var registered = this.registered;

    for (var i = 0; i < registered.length; i++) {
      input = registered[i](input);
    }

    return input;
  };
  /**
   * An array of translators that have been registered.
   *
   * @see [[Translations.add]]
   */


  Translations.registered = [];
  /**
   * A translator which takes a word which represents a number and converts it
   * the respective number.
   *
   * *Examples:*
   * - one [unit]
   * - dozen [unit]
   * - an eleven [unit]
   */

  Translations.NumberWords = newRegexTranslator(/^(an?\s+|)(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|dozen|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|fourty|fifty|sixty|seventy|eighty|ninety)\s+(.*)/i, function (matches, vars) {
    var wordName = matches[2];
    var remaining = matches[3];
    return vars[wordName] + ' ' + remaining;
  }, {
    one: '1',
    two: '2',
    three: '3',
    four: '4',
    five: '5',
    six: '6',
    seven: '7',
    eight: '8',
    nine: '9',
    ten: '10',
    eleven: '11',
    twelve: '12',
    dozen: '12',
    thirteen: '13',
    fouteen: '14',
    fifteen: '15',
    sixteen: '16',
    seventeen: '17',
    eighteen: '18',
    nineteen: '19',
    twenty: '20',
    thirty: '30',
    fourty: '40',
    fifty: '50',
    sixty: '60',
    seventy: '70',
    eighty: '80',
    ninety: '90'
  });
  /**
   * A translator which takes a word which represents a fraction and multiplies
   * it by the following value.
   *
   * *Examples:*
   * - a third of an acre
   * - half a dozen eggs
   * - a seventh of a mile
   */

  Translations.FractionOfNumber = newRegexTranslator(/^(an?\s+|one|)(half|third|fourth|fifth|sixth|seventh|eighth|nineth|tenth)\s+(a\s+|an\s+|of\s+an?\s+|of\s+)(.*)/i, function (matches, vars) {
    var remaining = matches[4];
    var parsed = Parse.valueFromString(remaining);
    var fractionName = matches[2].toLowerCase();
    var fraction = vars[fractionName];
    return parsed.mul(fraction).output(Core.globalOutput);
  }, {
    half: Value.fromFraction(1, 2),
    third: Value.fromFraction(1, 3),
    fourth: Value.fromFraction(1, 4),
    fifth: Value.fromFraction(1, 5),
    sixth: Value.fromFraction(1, 6),
    seventh: Value.fromFraction(1, 7),
    eighth: Value.fromFraction(1, 8),
    nineth: Value.fromFraction(1, 9),
    tenth: Value.fromFraction(1, 10)
  });
  /**
   * A translator which takes a word which represents a fraction and multiplies
   * it by the following value.
   *
   * *Examples:*
   * - 23 and a half eggs
   * - one and a half acres
   * - 23 and a third
   * - 12 and one fourth
   */

  Translations.AndFraction = newRegexTranslator(/^(.*)\s+and\s+(an?|one)\s+(half|third|fourth|fifth|sixth|seventh|eighth|nineth|tenth)\s*(.*)/i, function (matches, vars) {
    var prefix = matches[1];
    var units = matches[4];
    var value = Parse.valueFromString(prefix + units);
    var fractionName = matches[3].toLowerCase();
    var fraction = vars[fractionName];
    return value.add(fraction).output(Core.globalOutput);
  }, {
    half: Value.fromFraction(1, 2),
    third: Value.fromFraction(1, 3),
    fourth: Value.fromFraction(1, 4),
    fifth: Value.fromFraction(1, 5),
    sixth: Value.fromFraction(1, 6),
    seventh: Value.fromFraction(1, 7),
    eighth: Value.fromFraction(1, 8),
    nineth: Value.fromFraction(1, 9),
    tenth: Value.fromFraction(1, 10)
  });
  /**
   * A translator which takes the amount in parenthesis and moves it out.
   *
   * *Examples:*
   * - (one and a half) acre
   * - (12) tacos
   */

  Translations.Quantity = newRegexTranslator(/^\((.*)\)(.*)$/, function (matches) {
    var quantity = matches[1];
    var unit = matches[2];
    return quantity + unit;
  });
  /**
   * A translator which takes the amount in parenthesis and moves it out.
   *
   * *Examples:*
   * - 1 (6 ounce)
   * - 5 (3 liter)
   */

  Translations.QuantityValue = newRegexTranslator(/^\s*((-?\d*)(\s+(\d+))?(\s*\/\s*(\d+)|\.(\d+)|))\s*\(\s*((-?\d*)(\s+(\d+))?(\s*\/\s*(\d+)|\.(\d+)|)\s*(.*))\s*\)\s*$/i, function (matches) {
    var quantityInput = matches[1];
    var quantity = Parse.valueFromString(quantityInput);
    var alternativeInput = matches[8];
    var alternative = Parse.valueFromString(alternativeInput);
    return alternative.mul(quantity).output(Core.globalOutput);
  });
  return Translations;
}();

/**
 * The class which holds [[Rate]]s mapped by their abbreviations.
 */

var Rates = function () {
  function Rates() {}
  /**
   * Adds all rates in the library to be available when parsing.
   */


  Rates.addDefaults = function () {
    this.add('miles', 'hour', ['mph']);
    this.add('nautical miles', 'hour', ['knot', 'knots']);
    this.add('kilometers', 'hour', ['kph', 'kmph', 'km. hr.', 'k.p.h.', 'k.m.p.h.', 'km:h']);
  };
  /**
   * Adds one or many rates given the unit, rate, and all abbreviations.
   *
   * @param unit The unit.
   * @param rate The rate unit.
   * @param names The list of abbreviations for this rate.
   */


  Rates.add = function (unit, rate, names) {
    for (var i = 0; i < names.length; i++) {
      this.registered[names[i].toLowerCase()] = {
        unit: unit,
        rate: rate
      };
    }
  };
  /**
   * Gets the rate for the given input or `undefined` if none exists.
   *
   * @param input The input to find a rate for.
   * @return The rate mapped by the input, otherwise `undefined`.
   */


  Rates.get = function (input) {
    return this.registered[input.toLowerCase()];
  };
  /**
   * An object of rates mapped by their abbreviation.
   *
   * @see [[Rates.add]]
   */


  Rates.registered = {};
  return Rates;
}();

/**
 * The class which takes user input and parses it to specific structures.
 */

var Parse = function () {
  function Parse() {}
  /**
   * Parses user input into a [[Base]] instance.
   *
   * @param input The input to parse into a Base.
   * @return The instance parsed from the input.
   */


  Parse.base = function (input) {
    if (input instanceof Base) {
      return input;
    }

    return new Base(input);
  };
  /**
   * Parses user input into a an array of [[Range]]s.
   *
   * @param input The input to parse.
   * @return The instances parsed from the input.
   */


  Parse.ranges = function (input) {
    if (Functions.isArray(input)) {
      return this.rangesFromArray(input);
    } else if (Functions.isString(input)) {
      return this.rangesFromString(input);
    } else if (Functions.isRangeDefinition(input)) {
      return this.rangesFromArray([input]);
    } else if (Functions.isValueDefinition(input)) {
      return this.rangesFromArray([input]);
    }

    return [];
  };
  /**
   * Parses user input into a an array of [[Range]]s.
   *
   * @param input The input to parse.
   * @return The instances parsed from the input.
   */


  Parse.rangesFromArray = function (input) {
    var ranges = [];

    for (var i = 0; i < input.length; i++) {
      var range = this.range(input[i]);
      ranges.push(range);
    }

    return ranges;
  };
  /**
   * Parses user input into a an array of [[Range]]s.
   *
   * @param input The input to parse.
   * @return The instances parsed from the input.
   */


  Parse.rangesFromString = function (input) {
    var ranges = input.split(this.REGEX_LIST);
    return this.rangesFromArray(ranges);
  };
  /**
   * Parses user input into a [[Range]].
   *
   * @param input The input to parse.
   * @return The instance parsed from the input.
   */


  Parse.range = function (input) {
    if (Functions.isString(input)) {
      return this.rangeFromString(input);
    } else if (Functions.isRangeDefinition(input)) {
      var min = this.value(input.min);
      var max = this.value(input.max);
      return new Range(min, max);
    } else if (Functions.isValueDefinition(input)) {
      var value = this.valueFromValue(input);
      return new Range(value, value);
    }

    return Range.INVALID;
  };
  /**
   * Parses user input into a [[Range]].
   *
   * @param input The input to parse.
   * @return The instance parsed from the input.
   */


  Parse.rangeFromString = function (input) {
    var matches = this.REGEX_RANGE.exec(input);

    if (!matches) {
      var fixed = this.valueFromString(input);
      return new Range(fixed, fixed);
    }

    var minInput = matches[1];
    var maxInput = matches[2];
    var minParsed = this.input(minInput);
    var maxParsed = this.input(maxInput);

    if (!minParsed || !maxParsed) {
      return Range.INVALID;
    }

    var minUnit = minParsed.unit || maxParsed.unit;
    var maxUnit = maxParsed.unit || minParsed.unit;
    var minRate = minParsed.rate || maxParsed.rate;
    var maxRate = maxParsed.rate || minParsed.rate;
    var min = this.valueFromResult(minParsed, minUnit, minRate);
    var max = this.valueFromResult(maxParsed, maxUnit, maxRate);
    return new Range(min, max);
  };
  /**
   * Parses user input into a [[Value]].
   *
   * @param input The input to parse.
   * @return The instance parsed from the input.
   */


  Parse.value = function (input) {
    if (Functions.isString(input)) {
      return this.valueFromString(input);
    } else if (Functions.isValueDefinition(input)) {
      return this.valueFromValue(input);
    }

    return Value.INVALID;
  };
  /**
   * Parses user input into a [[Value]].
   *
   * @param input The input to parse.
   * @return The instance parsed from the input.
   */


  Parse.valueFromValue = function (input) {
    var givenValue = Functions.isDefined(input.value) ? input.value : 1;
    var num = Functions.isDefined(input.num) ? input.num : givenValue;
    var den = Functions.isDefined(input.den) ? input.den : 1;
    var parsedValue = Functions.isDefined(input.value) ? input.value : num / den;
    var unit = input.unit || '';
    var rate = input.rate || '';
    var group = Core.getGroup(unit);
    var rateGroup = Core.getGroup(rate);
    return new Value(parsedValue, num, den, unit, group, rate, rateGroup);
  };
  /**
   * Parses user input into a [[Value]].
   *
   * @param input The input to parse.
   * @return The instance parsed from the input.
   */


  Parse.valueFromString = function (input) {
    var translated = Translations.translate(input);
    var parsed = this.input(translated);
    return parsed ? this.valueFromResult(parsed, parsed.unit, parsed.rate) : Value.INVALID;
  };
  /**
   * Parses user input into a [[Value]].
   *
   * @param result The already parsed input.
   * @param unit The unit parsed from the input.
   * @return The instance parsed from the input.
   */


  Parse.valueFromResult = function (result, unit, rateUnit) {
    var group = Core.getGroup(unit);
    var rateGroup = Core.getGroup(rateUnit);
    return new Value(result.value, result.valueNum, result.valueDen, unit, group, rateUnit, rateGroup);
  };
  /**
   * Parses user input into a [[ParseResult]]. If the input is not valid null
   * is returned.
   *
   * *Examples:*
   * - 1tsp
   * - 1 tsp
   * - 1/2 tsp
   * - 1 1/2 tsp
   * - -2 cups
   * - 2.35"
   *
   * @param input The string to parse a value and unit from.
   * @return The result of the parsing.
   */


  Parse.input = function (input) {
    var matches = this.REGEX_PARSE.exec(input);
    var whole = parseInt(matches[1]);
    var hasWhole = isFinite(whole);
    var sign = matches[1].charAt(0) === '-' ? -1 : 1;
    var num = parseInt(matches[3]);
    var den = parseInt(matches[5]);
    var decimal = matches[6];
    var hasDecimal = isFinite(parseFloat(decimal));

    var _a = this.unit(Functions.trim(matches[7])),
        unit = _a.unit,
        rate = _a.rate;

    if (!hasWhole && hasDecimal) {
      whole = 0;
      hasWhole = true;
    }

    if (!hasWhole && !unit) {
      return null;
    }

    var value = 1;
    var valueDen = 1;
    var valueNum = 1;

    if (hasWhole) {
      value = whole;
      valueNum = whole;

      if (isFinite(den)) {
        valueDen = den;

        if (isFinite(num)) {
          value += num / den * sign;
          valueNum *= den;
          valueNum += num;
        } else {
          value /= den;
        }
      } else if (hasDecimal) {
        var remainder = parseFloat('0.' + decimal);
        value += remainder * sign;
        valueNum += remainder;
      }

      valueNum *= sign;
    }

    return {
      value: value,
      valueNum: valueNum,
      valueDen: valueDen,
      num: num,
      den: den,
      unit: unit,
      rate: rate
    };
  };
  /**
   * Parses unit input into a [[Rate]].
   *
   * *Examples:*
   * - m/s
   * - miles per hour
   * - mph
   *
   * @param input The string to parse a unit from.
   * @return The result of the parsing.
   */


  Parse.unit = function (input) {
    var rate = Rates.get(input);

    if (!rate) {
      var units = input.split(this.REGEX_UNIT);
      rate = {
        unit: units[0] ? Functions.trim(units[0]).replace(/\.$/, '') : '',
        rate: units[2] ? Functions.trim(units[2]).replace(/\.$/, '') : ''
      };
    }

    return rate;
  };
  /**
   * The regular expression used to split up a string into multiple ranges.
   */


  Parse.REGEX_LIST = /\s*,\s*/;
  /**
   * The regular expression used to split up a range string to determine the min
   * and maximum values.
   */

  Parse.REGEX_RANGE = /\s*(-?[^-]+)-(.+)/;
  /**
   * The regular expression used to parse a value number or fraction and
   * possible unit from a string.
   */

  Parse.REGEX_PARSE = /^\s*(-?\d*)(\s+(\d+))?(\s*\/\s*(\d+)|\.(\d+)|)\s*(.*)\s*$/i;
  /**
   * The regular expression used to split up a unit from a rateUnit.
   */

  Parse.REGEX_UNIT = /\s*(\/|\s+per\s+)\s*/i;
  return Parse;
}();

var RAD2DEG = 180 / Math.PI;
var DEG2RAD = Math.PI / 180;
/**
 * @hidden
 */

var Angle = new Class('Angle').setBaseConversion('deg', 'rad', function (x) {
  return x * DEG2RAD;
}).setBaseConversion('rad', 'deg', function (x) {
  return x * RAD2DEG;
}).addGroups([{
  system: System.ANY,
  common: true,
  unit: 'deg',
  baseUnit: 'deg',
  denominators: [],
  units: {
    'deg': Plurality.EITHER,
    '\xb0': Plurality.EITHER,
    'degrees': Plurality.PLURAL,
    'degree': Plurality.SINGULAR
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'rad',
  baseUnit: 'rad',
  denominators: [],
  units: {
    'rad': Plurality.EITHER,
    'radians': Plurality.PLURAL,
    'radian': Plurality.SINGULAR
  }
}]).setClassScales();

/**
 * @hidden
 */

var Area = new Class('Area').setBaseConversion('sqin', 'sqmm', function (x) {
  return x * 645.16;
}).setBaseConversion('sqmm', 'sqin', function (x) {
  return x * 0.00155;
}).addGroups([{
  system: System.US,
  common: true,
  unit: 'sqin',
  baseUnit: 'sqin',
  denominators: [2, 4, 8, 16],
  units: {
    'sqin': Plurality.EITHER,
    'sq. in': Plurality.EITHER,
    'sq in': Plurality.EITHER,
    'in2': Plurality.EITHER,
    'in^2': Plurality.EITHER,
    'in\xb2': Plurality.EITHER,
    'inch2': Plurality.SINGULAR,
    'inch^2': Plurality.SINGULAR,
    'inch\xb2': Plurality.SINGULAR,
    'inches2': Plurality.PLURAL,
    'inches^2': Plurality.PLURAL,
    'inches\xb2': Plurality.PLURAL,
    'square in': Plurality.EITHER,
    'square inch': Plurality.SINGULAR,
    'square inches': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'sqft',
  relativeUnit: 'sqin',
  relativeScale: 12 * 12,
  denominators: [2, 4, 8, 16],
  units: {
    'sqft': Plurality.EITHER,
    'sq. ft': Plurality.EITHER,
    'sq ft': Plurality.EITHER,
    'ft2': Plurality.EITHER,
    'ft^2': Plurality.EITHER,
    'ft\xb2': Plurality.EITHER,
    'foot2': Plurality.SINGULAR,
    'foot^2': Plurality.SINGULAR,
    'foot\xb2': Plurality.SINGULAR,
    'feet2': Plurality.PLURAL,
    'feet^2': Plurality.PLURAL,
    'feet\xb2': Plurality.PLURAL,
    'square ft': Plurality.EITHER,
    'square foot': Plurality.SINGULAR,
    'square feet': Plurality.PLURAL
  }
}, {
  system: System.US,
  unit: 'sqyd',
  relativeUnit: 'sqft',
  relativeScale: 3 * 3,
  denominators: [2, 3, 4, 8, 9, 16],
  units: {
    'sqyd': Plurality.EITHER,
    'sq. yd': Plurality.EITHER,
    'sq yd': Plurality.EITHER,
    'yd2': Plurality.EITHER,
    'yd^2': Plurality.EITHER,
    'yd\xb2': Plurality.EITHER,
    'yard2': Plurality.SINGULAR,
    'yard^2': Plurality.SINGULAR,
    'yard\xb2': Plurality.SINGULAR,
    'yards2': Plurality.PLURAL,
    'yards^2': Plurality.PLURAL,
    'yards\xb2': Plurality.PLURAL,
    'square yd': Plurality.EITHER,
    'square yard': Plurality.SINGULAR,
    'square yards': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'acre',
  relativeUnit: 'sqyd',
  relativeScale: 4840,
  denominators: [2, 3, 4, 8, 10],
  units: {
    'acre': Plurality.EITHER,
    'acres': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'sqmi',
  relativeUnit: 'acre',
  relativeScale: 640,
  denominators: [2, 3, 4, 8, 10],
  units: {
    'sqmi': Plurality.EITHER,
    'sq. mi': Plurality.EITHER,
    'sq mi': Plurality.EITHER,
    'mi2': Plurality.EITHER,
    'mi^2': Plurality.EITHER,
    'mi\xb2': Plurality.EITHER,
    'mile2': Plurality.SINGULAR,
    'mile^2': Plurality.SINGULAR,
    'mile\xb2': Plurality.SINGULAR,
    'miles2': Plurality.PLURAL,
    'miles^2': Plurality.PLURAL,
    'miles\xb2': Plurality.PLURAL,
    'square mi': Plurality.EITHER,
    'square mile': Plurality.SINGULAR,
    'square miles': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'sqmm',
  baseUnit: 'sqmm',
  denominators: [2, 4, 8, 16],
  units: {
    'sqmm': Plurality.EITHER,
    'sq. mm': Plurality.EITHER,
    'sq mm': Plurality.EITHER,
    'mm2': Plurality.EITHER,
    'mm^2': Plurality.EITHER,
    'mm\xb2': Plurality.EITHER,
    'millimeter2': Plurality.SINGULAR,
    'millimeter^2': Plurality.SINGULAR,
    'millimeter\xb2': Plurality.SINGULAR,
    'millimeters2': Plurality.PLURAL,
    'millimeters^2': Plurality.PLURAL,
    'millimeters\xb2': Plurality.PLURAL,
    'square mm': Plurality.EITHER,
    'square millimeter': Plurality.SINGULAR,
    'square millimeters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'sqcm',
  relativeUnit: 'sqmm',
  relativeScale: 100,
  denominators: [2, 4, 8, 16],
  units: {
    'sqcm': Plurality.EITHER,
    'sq. cm': Plurality.EITHER,
    'sq cm': Plurality.EITHER,
    'cm2': Plurality.EITHER,
    'cm^2': Plurality.EITHER,
    'cm\xb2': Plurality.EITHER,
    'centimeter2': Plurality.SINGULAR,
    'centimeter^2': Plurality.SINGULAR,
    'centimeter\xb2': Plurality.SINGULAR,
    'centimeters2': Plurality.PLURAL,
    'centimeters^2': Plurality.PLURAL,
    'centimeters\xb2': Plurality.PLURAL,
    'square cm': Plurality.EITHER,
    'square centimeter': Plurality.SINGULAR,
    'square centimeters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'sqm',
  relativeUnit: 'sqcm',
  relativeScale: 10000,
  denominators: [2, 4, 8, 16],
  units: {
    'sqm': Plurality.EITHER,
    'sq. m': Plurality.EITHER,
    'sq m': Plurality.EITHER,
    'm2': Plurality.EITHER,
    'm^2': Plurality.EITHER,
    'm\xb2': Plurality.EITHER,
    'meter2': Plurality.SINGULAR,
    'meter^2': Plurality.SINGULAR,
    'meter\xb2': Plurality.SINGULAR,
    'meters2': Plurality.PLURAL,
    'meters^2': Plurality.PLURAL,
    'meters\xb2': Plurality.PLURAL,
    'square m': Plurality.EITHER,
    'square meter': Plurality.SINGULAR,
    'square meters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'sqkm',
  relativeUnit: 'sqm',
  relativeScale: 1000000,
  denominators: [2, 4, 8, 16],
  units: {
    'sqkm': Plurality.EITHER,
    'sq. km': Plurality.EITHER,
    'sq km': Plurality.EITHER,
    'km2': Plurality.EITHER,
    'km^2': Plurality.EITHER,
    'km\xb2': Plurality.EITHER,
    'kilometer2': Plurality.SINGULAR,
    'kilometer^2': Plurality.SINGULAR,
    'kilometer\xb2': Plurality.SINGULAR,
    'kilometers2': Plurality.PLURAL,
    'kilometers^2': Plurality.PLURAL,
    'kilometers\xb2': Plurality.PLURAL,
    'square km': Plurality.EITHER,
    'square kilometer': Plurality.SINGULAR,
    'square kilometers': Plurality.PLURAL
  }
}]).setClassScales();

/**
 * @hidden
 */

var Digital = new Class('Digital').addGroups([{
  system: System.ANY,
  common: true,
  unit: 'b',
  baseUnit: 'b',
  denominators: [],
  units: {
    'b': Plurality.EITHER,
    'bit': Plurality.SINGULAR,
    'bits': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  unit: 'nibble',
  relativeUnit: 'b',
  relativeScale: 4,
  denominators: [],
  units: {
    'nibble': Plurality.EITHER,
    'nibbles': Plurality.PLURAL,
    'nybble': Plurality.EITHER,
    'nyble': Plurality.EITHER,
    'half-byte': Plurality.EITHER,
    'half byte': Plurality.EITHER,
    'tetrade': Plurality.EITHER,
    'semi-octet': Plurality.EITHER,
    'quadbit': Plurality.EITHER,
    'quartet': Plurality.EITHER
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'B',
  relativeUnit: 'b',
  relativeScale: 8,
  denominators: [2, 8],
  units: {
    'B': Plurality.EITHER,
    'byte': Plurality.SINGULAR,
    'bytes': Plurality.PLURAL
  }
}]);
addDigitalUnits(Digital, 'B', 1000, [2, 4, 5, 10], 'byte', 'bytes', [['kB', 'kilo'], ['mB', 'mega'], ['gB', 'giga'], ['tB', 'tera'], ['pB', 'peta'], ['eB', 'exa'], ['zB', 'zetta'], ['yB', 'yotta']]);
addDigitalUnits(Digital, 'B', 1024, [2, 4, 8, 16], 'byte', 'bytes', [['KB', 'kibi'], ['MB', 'mebi'], ['GB', 'gibi'], ['TB', 'tebi'], ['PB', 'pebi'], ['EB', 'exbi'], ['ZB', 'zebi'], ['YB', 'yobi']]);
addDigitalUnits(Digital, 'b', 1000, [2, 4, 5, 10], 'bit', 'bits', [['kb', 'kilo', 'kbit'], ['mb', 'mega', 'mbit'], ['gb', 'giga', 'gbit'], ['tb', 'tera', 'tbit'], ['pb', 'peta', 'pbit'], ['eb', 'exa', 'ebit'], ['zb', 'zetta', 'zbit'], ['yb', 'yotta', 'ybit']]);
addDigitalUnits(Digital, 'b', 1024, [2, 4, 8, 16], 'bit', 'bits', [['kibit', 'kibi'], ['mibit', 'mebi'], ['gibit', 'gibi'], ['tibit', 'tebi'], ['pibit', 'pebi'], ['eibit', 'exbi'], ['zibit', 'zebi'], ['yibit', 'yobi']]);
Digital.setClassScales();

function addDigitalUnits(parent, relativeTo, relativeScales, denominators, suffixSingular, suffixPlural, unitAndPrefixes) {
  for (var i = 0; i < unitAndPrefixes.length; i++) {
    var _a = unitAndPrefixes[i],
        unit = _a[0],
        prefix = _a[1],
        extra = _a[2];
    var units = {};
    units[unit] = Plurality.EITHER;
    units[prefix + suffixSingular] = Plurality.SINGULAR;
    units[prefix + suffixPlural] = Plurality.PLURAL;

    if (extra) {
      units[extra] = Plurality.EITHER;
    }

    parent.addGroup({
      system: System.ANY,
      common: true,
      unit: unit,
      relativeUnit: relativeTo,
      relativeScale: relativeScales,
      denominators: denominators,
      units: units
    });
    relativeTo = unit;
  }
}

/**
 * @hidden
 */

var Length = new Class('Length').setBaseConversion('in', 'mm', function (x) {
  return x * 25.4;
}).setBaseConversion('mm', 'in', function (x) {
  return x * 0.039370;
}).addGroups([{
  system: System.US,
  common: true,
  unit: 'in',
  baseUnit: 'in',
  denominators: [2, 4, 8, 16, 32],
  units: {
    'in': Plurality.EITHER,
    'inch': Plurality.SINGULAR,
    'inches': Plurality.PLURAL,
    '"': Plurality.EITHER
  }
}, {
  system: System.US,
  common: true,
  unit: 'ft',
  relativeUnit: 'in',
  relativeScale: 12,
  denominators: [2],
  units: {
    'ft': Plurality.EITHER,
    'foot': Plurality.SINGULAR,
    'feet': Plurality.PLURAL,
    '\'': Plurality.EITHER
  }
}, {
  system: System.US,
  unit: 'yd',
  relativeUnit: 'ft',
  relativeScale: 3,
  denominators: [],
  units: {
    'yd': Plurality.EITHER,
    'yard': Plurality.SINGULAR,
    'yards': Plurality.PLURAL,
    'yds': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'mi',
  relativeUnit: 'ft',
  relativeScale: 5280,
  denominators: [2, 3, 4, 10],
  units: {
    'mi': Plurality.EITHER,
    'mile': Plurality.SINGULAR,
    'miles': Plurality.PLURAL
  }
}, {
  system: System.US,
  unit: 'league',
  relativeUnit: 'mi',
  relativeScale: 3,
  denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  units: {
    'league': Plurality.EITHER,
    'leagues': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'mm',
  baseUnit: 'mm',
  denominators: [10],
  units: {
    'mm': Plurality.EITHER,
    'millimeter': Plurality.SINGULAR,
    'millimeters': Plurality.PLURAL,
    'millimetre': Plurality.SINGULAR,
    'millimetres': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'cm',
  relativeUnit: 'mm',
  relativeScale: 10,
  denominators: [2, 4, 10],
  units: {
    'cm': Plurality.EITHER,
    'centimeter': Plurality.SINGULAR,
    'centimeters': Plurality.PLURAL,
    'centimetre': Plurality.SINGULAR,
    'centimetres': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'dc',
  relativeUnit: 'cm',
  relativeScale: 10,
  denominators: [10],
  units: {
    'dc': Plurality.EITHER,
    'decimeter': Plurality.SINGULAR,
    'decimeters': Plurality.PLURAL,
    'decimetre': Plurality.SINGULAR,
    'decimetres': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'm',
  relativeUnit: 'cm',
  relativeScale: 100,
  denominators: [2, 3, 4, 5, 10],
  units: {
    'm': Plurality.EITHER,
    'meter': Plurality.SINGULAR,
    'meters': Plurality.PLURAL,
    'metre': Plurality.SINGULAR,
    'metres': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'km',
  relativeUnit: 'm',
  relativeScale: 1000,
  denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  units: {
    'km': Plurality.EITHER,
    'kms': Plurality.PLURAL,
    'kilometer': Plurality.SINGULAR,
    'kilometers': Plurality.PLURAL,
    'kilometre': Plurality.SINGULAR,
    'kilometres': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'nm',
  relativeUnit: 'm',
  relativeScale: 1852,
  denominators: [2, 3, 4, 5, 10],
  units: {
    'nm': Plurality.EITHER,
    'nmi': Plurality.EITHER,
    'nautical mi': Plurality.EITHER,
    'nautical mile': Plurality.SINGULAR,
    'nautical miles': Plurality.PLURAL
  }
}]).setClassScales();

var _C_ = '\xb0C';
/**
 * @hidden
 */

var Temperature = new Class('Temperature').setBaseConversion('F', _C_, function (x) {
  return (x - 32) * 5 / 9;
}).setBaseConversion('F', 'K', function (x) {
  return (x + 459.67) * 5 / 9;
}).setBaseConversion(_C_, 'F', function (x) {
  return x * 9 / 5 + 32;
}).setBaseConversion(_C_, 'K', function (x) {
  return x + 273.15;
}).setBaseConversion('K', _C_, function (x) {
  return x - 273.15;
}).setBaseConversion('K', 'F', function (x) {
  return x * 9 / 5 - 459.67;
}).addGroups([{
  system: System.US,
  common: true,
  unit: 'F',
  baseUnit: 'F',
  denominators: [],
  units: {
    'F': Plurality.EITHER,
    '\xb0F': Plurality.EITHER,
    'Fahrenheit': Plurality.EITHER
  }
}, {
  system: System.METRIC,
  common: true,
  unit: _C_,
  baseUnit: _C_,
  denominators: [],
  units: {
    '\xb0C': Plurality.EITHER,
    'Celsius': Plurality.EITHER
  }
}, {
  system: System.METRIC,
  unit: 'K',
  baseUnit: 'K',
  denominators: [],
  units: {
    'K': Plurality.EITHER,
    'kelvin': Plurality.SINGULAR,
    'kelvins': Plurality.PLURAL
  }
}]).setClassScales();

/**
 * @hidden
 */

var Time = new Class('Time').addGroups([{
  system: System.ANY,
  unit: 'ns',
  baseUnit: 'ns',
  denominators: [10, 100],
  units: {
    'ns': Plurality.EITHER,
    'nanosecond': Plurality.SINGULAR,
    'nanoseconds': Plurality.PLURAL,
    'nano': Plurality.SINGULAR,
    'nanos': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  unit: 'us',
  relativeUnit: 'ns',
  relativeScale: 1000,
  denominators: [10, 100, 1000],
  units: {
    'us': Plurality.EITHER,
    'microsecond': Plurality.SINGULAR,
    'microseconds': Plurality.PLURAL,
    'micro': Plurality.SINGULAR,
    'micros': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'ms',
  relativeUnit: 'us',
  relativeScale: 1000,
  denominators: [10, 100, 1000],
  units: {
    'ms': Plurality.EITHER,
    'millisecond': Plurality.SINGULAR,
    'milliseconds': Plurality.PLURAL,
    'milli': Plurality.SINGULAR,
    'millis': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 's',
  relativeUnit: 'ms',
  relativeScale: 1000,
  denominators: [10, 100, 1000],
  units: {
    's': Plurality.EITHER,
    'second': Plurality.SINGULAR,
    'seconds': Plurality.PLURAL,
    'sec': Plurality.SINGULAR,
    'secs': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'min',
  relativeUnit: 's',
  relativeScale: 60,
  denominators: [2, 3, 4, 60],
  units: {
    'min': Plurality.EITHER,
    'minute': Plurality.SINGULAR,
    'minutes': Plurality.PLURAL,
    'mins': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'hr',
  relativeUnit: 'min',
  relativeScale: 60,
  denominators: [2, 3, 4, 60],
  units: {
    'hr': Plurality.EITHER,
    'hour': Plurality.SINGULAR,
    'hours': Plurality.PLURAL,
    'hrs': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'day',
  relativeUnit: 'hr',
  relativeScale: 24,
  denominators: [2, 3, 4, 6, 24],
  units: {
    'day': Plurality.EITHER,
    'days': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'wk',
  relativeUnit: 'day',
  relativeScale: 7,
  denominators: [7],
  units: {
    'wk': Plurality.EITHER,
    'week': Plurality.SINGULAR,
    'weeks': Plurality.PLURAL,
    'wks': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'yr',
  relativeUnit: 'day',
  relativeScale: 365.2425,
  denominators: [2, 3, 4, 6, 12, 52],
  units: {
    'yr': Plurality.EITHER,
    'year': Plurality.SINGULAR,
    'years': Plurality.PLURAL,
    'yrs': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'score',
  relativeUnit: 'yr',
  relativeScale: 20,
  denominators: [20],
  units: {
    'score': Plurality.EITHER
  }
}, {
  system: System.ANY,
  unit: 'biennium',
  relativeUnit: 'yr',
  relativeScale: 2,
  denominators: [],
  units: {
    'biennium': Plurality.EITHER,
    'bienniums': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  unit: 'triennium',
  relativeUnit: 'yr',
  relativeScale: 3,
  denominators: [],
  units: {
    'triennium': Plurality.EITHER,
    'trienniums': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  unit: 'quadrennium',
  relativeUnit: 'yr',
  relativeScale: 4,
  denominators: [],
  units: {
    'quadrennium': Plurality.EITHER,
    'quadrenniums': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  unit: 'lustrum',
  relativeUnit: 'yr',
  relativeScale: 5,
  denominators: [],
  units: {
    'lustrum': Plurality.EITHER,
    'lustrums': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'decade',
  relativeUnit: 'yr',
  relativeScale: 10,
  denominators: [2, 10],
  units: {
    'decade': Plurality.EITHER,
    'decades': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'century',
  relativeUnit: 'yr',
  relativeScale: 100,
  denominators: [2, 10],
  units: {
    'century': Plurality.EITHER,
    'centurys': Plurality.PLURAL,
    'centuries': Plurality.PLURAL
  }
}, {
  system: System.ANY,
  common: true,
  unit: 'millennium',
  relativeUnit: 'yr',
  relativeScale: 1000,
  denominators: [2, 3, 4],
  units: {
    'millennium': Plurality.EITHER,
    'millenniums': Plurality.PLURAL,
    'millennia': Plurality.PLURAL,
    'millennias': Plurality.PLURAL
  }
}]).setClassScales();

/**
 * @hidden
 */

var Volume = new Class('Volume').setBaseConversion('tsp', 'ml', function (x) {
  return x * 4.92892;
}).setBaseConversion('tsp', 'mm3', function (x) {
  return x * 4928.92;
}).setBaseConversion('tsp', 'in3', function (x) {
  return x * 0.300781;
}).setBaseConversion('ml', 'tsp', function (x) {
  return x * 0.202884;
}).setBaseConversion('ml', 'mm3', function (x) {
  return x * 1000;
}).setBaseConversion('ml', 'in3', function (x) {
  return x * 0.0610237;
}).setBaseConversion('mm3', 'tsp', function (x) {
  return x * 0.000202884;
}).setBaseConversion('mm3', 'ml', function (x) {
  return x * 0.001;
}).setBaseConversion('mm3', 'in3', function (x) {
  return x * 0.0000610237;
}).setBaseConversion('in3', 'tsp', function (x) {
  return x * 3.32468;
}).setBaseConversion('in3', 'ml', function (x) {
  return x * 16.3871;
}).setBaseConversion('in3', 'mm3', function (x) {
  return x * 16387.1;
}).addGroups([{
  system: System.US,
  common: true,
  unit: 'tsp',
  baseUnit: 'tsp',
  denominators: [2, 3, 4],
  units: {
    'tsp': Plurality.EITHER,
    'ts': Plurality.EITHER,
    'tsps': Plurality.PLURAL,
    'teaspoon': Plurality.SINGULAR,
    'teaspoons': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'tbsp',
  relativeUnit: 'tsp',
  relativeScale: 3,
  denominators: [2, 3, 4],
  units: {
    'tbsp': Plurality.EITHER,
    'tbsps': Plurality.PLURAL,
    'tablespoon': Plurality.SINGULAR,
    'tablespoons': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'floz',
  relativeUnit: 'tsp',
  relativeScale: 6,
  denominators: [2, 3, 6],
  units: {
    // 'oz': Plurality.EITHER,
    // 'ounce': Plurality.SINGULAR,
    // 'ounces': Plurality.PLURAL,
    'floz': Plurality.EITHER,
    'fl-oz': Plurality.EITHER,
    'fl oz': Plurality.EITHER,
    'fluid ounce': Plurality.SINGULAR,
    'fluid ounces': Plurality.PLURAL,
    'fl. oz': Plurality.EITHER,
    'oz. fl': Plurality.EITHER,
    'oz fl': Plurality.EITHER
  }
}, {
  system: System.US,
  common: true,
  unit: 'c',
  relativeUnit: 'floz',
  relativeScale: 8,
  denominators: [2, 3, 4],
  units: {
    'c': Plurality.EITHER,
    'cup': Plurality.SINGULAR,
    'cups': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'pt',
  relativeUnit: 'c',
  relativeScale: 2,
  denominators: [2, 4, 8],
  units: {
    'pt': Plurality.EITHER,
    'pint': Plurality.SINGULAR,
    'pints': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'qt',
  relativeUnit: 'c',
  relativeScale: 4,
  denominators: [2, 4, 8],
  units: {
    'qt': Plurality.EITHER,
    'quart': Plurality.SINGULAR,
    'quarts': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'gal',
  relativeUnit: 'qt',
  relativeScale: 4,
  denominators: [2, 4, 8, 16],
  units: {
    'gal': Plurality.EITHER,
    'gallon': Plurality.SINGULAR,
    'gallons': Plurality.PLURAL,
    'gals': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'ml',
  baseUnit: 'ml',
  denominators: [2, 10],
  units: {
    'ml': Plurality.EITHER,
    'millilitre': Plurality.SINGULAR,
    'millilitres': Plurality.PLURAL,
    'milliliter': Plurality.SINGULAR,
    'milliliters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'cl',
  relativeUnit: 'ml',
  relativeScale: 10,
  denominators: [10],
  units: {
    'cl': Plurality.EITHER,
    'centilitre': Plurality.SINGULAR,
    'centilitres': Plurality.PLURAL,
    'centiliter': Plurality.SINGULAR,
    'centiliters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'l',
  relativeUnit: 'ml',
  relativeScale: 1000,
  denominators: [2, 3, 4, 10],
  units: {
    'l': Plurality.EITHER,
    'litre': Plurality.SINGULAR,
    'litres': Plurality.PLURAL,
    'liter': Plurality.SINGULAR,
    'liters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'dl',
  relativeUnit: 'l',
  relativeScale: 10,
  denominators: [10, 100],
  units: {
    'dl': Plurality.EITHER,
    'decalitre': Plurality.SINGULAR,
    'decalitres': Plurality.PLURAL,
    'decaliter': Plurality.SINGULAR,
    'decaliters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'kl',
  relativeUnit: 'l',
  relativeScale: 1000,
  denominators: [10, 100],
  units: {
    'kl': Plurality.EITHER,
    'kilolitre': Plurality.SINGULAR,
    'kilolitres': Plurality.PLURAL,
    'kiloliter': Plurality.SINGULAR,
    'kiloliters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'mm3',
  baseUnit: 'mm3',
  denominators: [2, 4, 8],
  units: {
    'mm3': Plurality.EITHER,
    'mm^3': Plurality.EITHER,
    'mm\xb3': Plurality.EITHER,
    'millimeter3': Plurality.SINGULAR,
    'millimeter^3': Plurality.SINGULAR,
    'millimeter\xb3': Plurality.SINGULAR,
    'millimeters3': Plurality.PLURAL,
    'millimeters^3': Plurality.PLURAL,
    'millimeters\xb3': Plurality.PLURAL,
    'cubic mm': Plurality.EITHER,
    'cubic millimeter': Plurality.SINGULAR,
    'cubic millimeters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'cm3',
  relativeUnit: 'mm3',
  relativeScale: 1000,
  denominators: [2, 4, 8],
  units: {
    'cm3': Plurality.EITHER,
    'cm^3': Plurality.EITHER,
    'cm\xb3': Plurality.EITHER,
    'centimeter3': Plurality.SINGULAR,
    'centimeter^3': Plurality.SINGULAR,
    'centimeter\xb3': Plurality.SINGULAR,
    'centimeters3': Plurality.PLURAL,
    'centimeters^3': Plurality.PLURAL,
    'centimeters\xb3': Plurality.PLURAL,
    'cubic cm': Plurality.EITHER,
    'cubic centimeter': Plurality.SINGULAR,
    'cubic centimeters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'm3',
  relativeUnit: 'cm3',
  relativeScale: 1000000,
  denominators: [2, 4, 8],
  units: {
    'm3': Plurality.EITHER,
    'm^3': Plurality.EITHER,
    'm\xb3': Plurality.EITHER,
    'meter3': Plurality.SINGULAR,
    'meter^3': Plurality.SINGULAR,
    'meter\xb3': Plurality.SINGULAR,
    'meters3': Plurality.PLURAL,
    'meters^3': Plurality.PLURAL,
    'meters\xb3': Plurality.PLURAL,
    'cubic m': Plurality.EITHER,
    'cubic meter': Plurality.SINGULAR,
    'cubic meters': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'km3',
  relativeUnit: 'm3',
  relativeScale: 1000000000,
  denominators: [2, 4, 8],
  units: {
    'km3': Plurality.EITHER,
    'km^3': Plurality.EITHER,
    'km\xb3': Plurality.EITHER,
    'kilometer3': Plurality.SINGULAR,
    'kilometer^3': Plurality.SINGULAR,
    'kilometer\xb3': Plurality.SINGULAR,
    'kilometers3': Plurality.PLURAL,
    'kilometers^3': Plurality.PLURAL,
    'kilometers\xb3': Plurality.PLURAL,
    'cubic km': Plurality.EITHER,
    'cubic kilometer': Plurality.SINGULAR,
    'cubic kilometers': Plurality.PLURAL
  }
}, {
  system: System.US,
  unit: 'in3',
  baseUnit: 'in3',
  denominators: [2, 4, 8],
  units: {
    'in3': Plurality.EITHER,
    'in^3': Plurality.EITHER,
    'in\xb3': Plurality.EITHER,
    'inch3': Plurality.SINGULAR,
    'inch^3': Plurality.SINGULAR,
    'inch\xb3': Plurality.SINGULAR,
    'inches3': Plurality.PLURAL,
    'inches^3': Plurality.PLURAL,
    'inches\xb3': Plurality.PLURAL,
    'cubic in': Plurality.EITHER,
    'cubic inch': Plurality.SINGULAR,
    'cubic inches': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'ft3',
  relativeUnit: 'in3',
  relativeScale: 1728,
  denominators: [2, 4, 8],
  units: {
    'ft3': Plurality.EITHER,
    'ft^3': Plurality.EITHER,
    'ft\xb3': Plurality.EITHER,
    'foot3': Plurality.SINGULAR,
    'foot^3': Plurality.SINGULAR,
    'foot\xb3': Plurality.SINGULAR,
    'feet3': Plurality.PLURAL,
    'feet^3': Plurality.PLURAL,
    'feet\xb3': Plurality.PLURAL,
    'cubic ft': Plurality.EITHER,
    'cubic foot': Plurality.SINGULAR,
    'cubic feet': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  unit: 'yd3',
  relativeUnit: 'ft3',
  relativeScale: 27,
  denominators: [2, 4, 8],
  units: {
    'yd3': Plurality.EITHER,
    'yd^3': Plurality.EITHER,
    'yd\xb3': Plurality.EITHER,
    'yard3': Plurality.SINGULAR,
    'yard^3': Plurality.SINGULAR,
    'yard\xb3': Plurality.SINGULAR,
    'yards3': Plurality.PLURAL,
    'yards^3': Plurality.PLURAL,
    'yards\xb3': Plurality.PLURAL,
    'cubic yd': Plurality.EITHER,
    'cubic yard': Plurality.SINGULAR,
    'cubic yards': Plurality.PLURAL
  }
}]).setClassScales();

/**
 * @hidden
 */

var Weight = new Class('Weight').setBaseConversion('mg', 'oz', function (x) {
  return x * 0.000035274;
}).setBaseConversion('oz', 'mg', function (x) {
  return x * 28349.5;
}).addGroups([{
  system: System.METRIC,
  common: true,
  unit: 'mg',
  baseUnit: 'mg',
  denominators: [2, 10],
  units: {
    'mg': Plurality.EITHER,
    'milligram': Plurality.SINGULAR,
    'milligrams': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'g',
  relativeUnit: 'mg',
  relativeScale: 1000,
  denominators: [2, 10, 1000],
  units: {
    'g': Plurality.EITHER,
    'gram': Plurality.SINGULAR,
    'grams': Plurality.PLURAL
  }
}, {
  system: System.METRIC,
  common: true,
  unit: 'kg',
  relativeUnit: 'g',
  relativeScale: 1000,
  denominators: [2, 10, 1000],
  units: {
    'kg': Plurality.EITHER,
    'kilo': Plurality.SINGULAR,
    'kilos': Plurality.PLURAL,
    'kilogram': Plurality.SINGULAR,
    'kilograms': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'oz',
  baseUnit: 'oz',
  denominators: [2, 3, 4, 16],
  units: {
    'oz': Plurality.EITHER,
    'ounce': Plurality.SINGULAR,
    'ounces': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'lb',
  relativeUnit: 'oz',
  relativeScale: 16,
  denominators: [2, 3, 4, 16],
  units: {
    'lb': Plurality.EITHER,
    'lbs': Plurality.PLURAL,
    'pound': Plurality.SINGULAR,
    'pounds': Plurality.PLURAL
  }
}, {
  system: System.US,
  common: true,
  unit: 'ton',
  relativeUnit: 'lb',
  relativeScale: 2000,
  denominators: [2, 3, 4, 10],
  units: {
    'ton': Plurality.EITHER,
    'tonne': Plurality.SINGULAR,
    'tons': Plurality.PLURAL,
    'tonnes': Plurality.PLURAL
  }
}]).setClassScales();

/**
 * The class which keeps a reference to the [[Class]] instances available in
 * this library.
 */

var Classes = function () {
  function Classes() {}
  /**
   * Adds all classes in the library to be available when parsing units.
   */


  Classes.addDefaults = function () {
    Core.addClasses(Classes.Weight, Classes.Area, Classes.Time, Classes.Digital, Classes.Temperature, Classes.Angle, Classes.Volume, Classes.Length);
  };
  /**
   * The Angle class which contains the following groups.
   *
   * - degree
   * - radian
   */


  Classes.Angle = Angle;
  /**
   * The Area class which contains the following groups:
   *
   * - square inch
   * - square foot
   * - square yard
   * - acre
   * - square mile
   * - square millimeter
   * - square centimeter
   * - square meter
   * - square kilometer
   */

  Classes.Area = Area;
  /**
   * The Digital class which contains the following groups:
   *
   * - bit
   * - nibble
   * - byte
   * - kilo/mego/giga/tera/peta/exa/zetta/yotta byte
   * - kibi/mebi/gibi/tebi/pebi/exbi/zebi/yobi byte
   * - kilo/mego/giga/tera/peta/exa/zetta/yotta bit
   * - ki/mi/gi/ti/pi/ez/zi/yi bit
   */

  Classes.Digital = Digital;
  /**
   * The Length class which contains the following groups.
   *
   * - inch
   * - foot
   * - yard
   * - mile
   * - league
   * - millimeter
   * - centimeter
   * - decimeter
   * - meter
   * - kilometer
   */

  Classes.Length = Length;
  /**
   * The Temperature class which contains the following groups.
   *
   * - celsius
   * - kelvin
   * - fahrenheit
   */

  Classes.Temperature = Temperature;
  /**
   * The Time class which contains the following groups.
   *
   * - nanosecond
   * - microsecond
   * - millisecond
   * - second
   * - hour
   * - day
   * - week
   * - year
   * - score
   * - biennium
   * - triennium
   * - quadrennium
   * - lustrum
   * - decade
   * - centry
   * - millennium
   */

  Classes.Time = Time;
  /**
   * The Volume clas which contains the following groups.
   *
   * - teaspoon
   * - tablespoon
   * - fluid ounce
   * - cup
   * - pint
   * - quart
   * - gallon
   * - milliliter
   * - centiliter
   * - decaliter
   * - kiloliter
   * - cubic millimeter
   * - cubic centimeter
   * - cubic meter
   * - cubic kilometer
   * - cubic inch
   * - cubic foot
   * - cubic yard
   */

  Classes.Volume = Volume;
  /**
   * The Weight clas which contains the following groups.
   *
   * - milligram
   * - gram
   * - kilogram
   * - ounce
   * - pound
   * - ton
   */

  Classes.Weight = Weight;
  return Classes;
}();

var lib = /*#__PURE__*/Object.freeze({
	__proto__: null,
	get Plurality () { return Plurality; },
	get System () { return System; },
	Functions: Functions,
	Parse: Parse,
	get OutputUnit () { return OutputUnit; },
	get OutputFormat () { return OutputFormat; },
	Output: Output,
	Transform: Transform,
	get SortType () { return SortType; },
	Sort: Sort,
	Core: Core,
	Group: Group,
	Class: Class,
	Value: Value,
	Range: Range,
	uz: uz,
	Base: Base,
	Classes: Classes,
	newRegexTranslator: newRegexTranslator,
	Translations: Translations,
	Rates: Rates
});

lib.Classes.addDefaults();
lib.Core.addClass(new lib.Class('Can', [{
  system: lib.System.ANY,
  common: true,
  unit: 'can',
  baseUnit: 'can',
  denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  units: {
    'can': lib.Plurality.SINGULAR,
    'cans': lib.Plurality.PLURAL
  }
}]));
lib.Core.addClass(new lib.Class('Package', [{
  system: lib.System.ANY,
  common: true,
  unit: 'package',
  baseUnit: 'package',
  denominators: [2, 3, 4, 5, 6, 7, 8, 9, 10],
  units: {
    'package': lib.Plurality.SINGULAR,
    'packages': lib.Plurality.PLURAL
  }
}]));
lib.Core.getGroup('tablespoon').addUnits({
  'tbs': lib.Plurality.SINGULAR
});
const unitNames = [].concat.apply([], Object.keys(lib.Core.classMap).map(className => Object.keys(lib.Core.classMap[className].groupMap)));
var units = {
  Unitz: lib,
  unitNames
};

const fractionMatchers = {
  // Regex & replacement value by charcode
  189: [/ ?\u00BD/g, ' 1/2'],
  // ½  \u00BD;
  8531: [/ ?\u2153/g, ' 1/3'],
  // ⅓  \u2153;
  8532: [/ ?\u2154/g, ' 2/3'],
  // ⅔  \u2154;
  188: [/ ?\u00BC/g, ' 1/4'],
  // ¼  \u00BC;
  190: [/ ?\u00BE/g, ' 3/4'],
  // ¾  \u00BE;
  8533: [/ ?\u2155/g, ' 1/5'],
  // ⅕  \u2155;
  8534: [/ ?\u2156/g, ' 2/5'],
  // ⅖  \u2156;
  8535: [/ ?\u2157/g, ' 3/5'],
  // ⅗  \u2157;
  8536: [/ ?\u2158/g, ' 4/5'],
  // ⅘  \u2158;
  8537: [/ ?\u2159/g, ' 1/6'],
  // ⅙  \u2159;
  8538: [/ ?\u215A/g, ' 5/6'],
  // ⅚  \u215A;
  8528: [/ ?\u2150/g, ' 1/7'],
  // ⅐  \u2150;
  8539: [/ ?\u215B/g, ' 1/8'],
  // ⅛  \u215B;
  8540: [/ ?\u215C/g, ' 3/8'],
  // ⅜  \u215C;
  8541: [/ ?\u215D/g, ' 5/8'],
  // ⅝  \u215D;
  8542: [/ ?\u215E/g, ' 7/8'],
  // ⅞  \u215E;
  8529: [/ ?\u2151/g, ' 1/9'],
  // ⅑  \u2151;
  8530: [/ ?\u2152/g, ' 1/10'] // ⅒ \u2152;

};
const fractionMatchRegexp = new RegExp(Object.keys(fractionMatchers).map(e => fractionMatchers[e]).map(matcher => matcher[0].source).join('|'), 'g');

const replaceFractionsInText = rawText => {
  return rawText.replace(fractionMatchRegexp, match => {
    const matcher = fractionMatchers[match.trim().charCodeAt(0)];
    return matcher ? matcher[1] : match; // Fallback on original value if not found
  });
}; // Starts with [, anything inbetween, ends with ]


var headerRegexp = /^\[.*\]$/;
const multipartQuantifierRegexp = / \+ | plus /;
const measurementRegexp = /((\d+ )?\d+([\/\.]\d+)?((-)|( to )|( - ))(\d+ )?\d+([\/\.]\d+)?)|((\d+ )?\d+[\/\.]\d+)|\d+/; // TODO: Replace measurementRegexp with this:
// var measurementRegexp = /(( ?\d+([\/\.]\d+)?){1,2})(((-)|( to )|( - ))(( ?\d+([\/\.]\d+)?){1,2}))?/; // Simpler version of above, but has a bug where it removes some spacing

const quantityRegexp = new RegExp(`(${units.unitNames.join("|").replace(/[.*+?^${}()[\]\\]/g, '\\$&')})s?(\.)?( |$)`);
const measurementQuantityRegExp = new RegExp(`^(${measurementRegexp.source}) *(${quantityRegexp.source})?`); // Should always be used with 'i' flag

const fillerWordsRegexp = /(cubed|peeled|minced|grated|heaped|chopped|about|(slice(s)?)) /;
const notesRegexp = /\(.*?\)/;

function stripNotes(ingredient) {
  return ingredient.replace(new RegExp(notesRegexp, 'g'), '').trim();
}

function getMeasurementsForIngredient(ingredient) {
  const strippedIngredient = replaceFractionsInText(ingredient);
  return strippedIngredient.split(multipartQuantifierRegexp).map(ingredientPart => {
    const measurementMatch = stripNotes(ingredientPart).match(new RegExp(measurementQuantityRegExp.source, 'i'));
    if (measurementMatch) return measurementMatch[0].trim();
    return null;
  }).filter(measurement => measurement);
}

function getTitleForIngredient(ingredient) {
  const strippedIngredient = replaceFractionsInText(ingredient);
  const ingredientPartDelimiters = strippedIngredient.match(new RegExp(multipartQuantifierRegexp, 'ig'));
  return strippedIngredient.split(multipartQuantifierRegexp).map(ingredientPart => {
    return stripNotes(ingredientPart).replace(new RegExp(measurementQuantityRegExp, 'i'), "");
  }).reduce((acc, ingredientPart, idx) => acc + ingredientPart + (ingredientPartDelimiters ? ingredientPartDelimiters[idx] || '' : ''), "").trim();
}

function stripIngredient(ingredient) {
  const trimmed = replaceFractionsInText(ingredient).trim().replace(new RegExp(`^(${measurementRegexp.source})`), '').trim().replace(new RegExp(`^(${quantityRegexp.source})`, 'i'), '').trim().replace(new RegExp(`^(${fillerWordsRegexp.source})`, 'i'), '').trim();

  if (trimmed !== ingredient) {
    return stripIngredient(trimmed);
  } else {
    return trimmed;
  }
}

function parseIngredients(ingredients, scale, boldify) {
  if (!ingredients) return [];
  ingredients = replaceFractionsInText(ingredients);
  let lines = ingredients.match(/[^\r\n]+/g).map(match => ({
    content: match,
    originalContent: match,
    complete: false,
    isHeader: false
  }));

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i].content.trim(); // Trim only spaces (no newlines)

    var headerMatches = line.match(headerRegexp);
    const ingredientPartDelimiters = line.match(new RegExp(multipartQuantifierRegexp, 'g')); // Multipart measurements (1 cup + 1 tablespoon)

    const ingredientParts = line.split(multipartQuantifierRegexp); // Multipart measurements (1 cup + 1 tablespoon)

    var measurementMatches = ingredientParts.map(linePart => linePart.match(measurementRegexp));

    if (headerMatches && headerMatches.length > 0) {
      var header = headerMatches[0];
      var headerContent = header.substring(1, header.length - 1); // Chop off brackets

      if (boldify) headerContent = `<b class="sectionHeader">${headerContent}</b>`;
      lines[i].content = headerContent;
      lines[i].isHeader = true;
    } else if (measurementMatches.find(el => el && el.length > 0)) {
      const updatedIngredientParts = measurementMatches.map((el, idx) => {
        if (!el) return ingredientParts[idx];

        try {
          var measurement = el[0];
          const measurementPartDelimiters = measurement.match(/(-)|( to )|( - )/g);
          const measurementParts = measurement.split(/-|to/);

          for (var j = 0; j < measurementParts.length; j++) {
            // console.log(measurementParts[j].trim())
            var scaledMeasurement = fraction(measurementParts[j].trim()).mul(scale); // Preserve original fraction format if entered

            if (measurementParts[j].indexOf('/') > -1) {
              scaledMeasurement = scaledMeasurement.toFraction(true);
            }

            if (boldify) measurementParts[j] = '<b class="ingredientMeasurement">' + scaledMeasurement + '</b>';else measurementParts[j] = scaledMeasurement;
          }

          let updatedMeasurement;

          if (measurementPartDelimiters) {
            updatedMeasurement = measurementParts.reduce((acc, measurementPart, idx) => acc + measurementPart + (measurementPartDelimiters[idx] || ""), "");
          } else {
            updatedMeasurement = measurementParts.join(' to ');
          }

          return ingredientParts[idx].replace(measurementRegexp, updatedMeasurement);
        } catch (e) {
          console.error("failed to parse", e);
          return ingredientParts[idx];
        }
      });

      if (ingredientPartDelimiters) {
        lines[i].content = updatedIngredientParts.reduce((acc, ingredientPart, idx) => acc + ingredientPart + (ingredientPartDelimiters[idx] || ""), "");
      } else {
        lines[i].content = updatedIngredientParts.join(" + ");
      }

      lines[i].isHeader = false;
    }
  }

  return lines;
}

function parseInstructions(instructions) {
  instructions = replaceFractionsInText(instructions); // Starts with [, anything inbetween, ends with ]

  var headerRegexp = /^\[.*\]$/;
  let stepCount = 1;
  return instructions.split(/\r?\n/).map(instruction => {
    let line = instruction.trim();
    var headerMatches = line.match(headerRegexp);

    if (headerMatches && headerMatches.length > 0) {
      var header = headerMatches[0];
      var headerContent = header.substring(1, header.length - 1); // Chop off brackets

      stepCount = 1;
      return {
        content: headerContent,
        isHeader: true,
        count: 0,
        complete: false
      };
    } else {
      return {
        content: line,
        isHeader: false,
        count: stepCount++,
        complete: false
      };
    }
  });
}

var src = {
  parseIngredients,
  parseInstructions,
  stripIngredient,
  getMeasurementsForIngredient,
  getTitleForIngredient,
  unitUtils: units
};
var src_1 = src.parseIngredients;
var src_2 = src.parseInstructions;
var src_3 = src.stripIngredient;
var src_4 = src.getMeasurementsForIngredient;
var src_5 = src.getTitleForIngredient;
var src_6 = src.unitUtils;

exports.default = src;
exports.getMeasurementsForIngredient = src_4;
exports.getTitleForIngredient = src_5;
exports.parseIngredients = src_1;
exports.parseInstructions = src_2;
exports.stripIngredient = src_3;
exports.unitUtils = src_6;
//# sourceMappingURL=rs-shared-utils.cjs.js.map
