// This utility was borrowed/adapted from Erik Garrison's 'fractional' lib
// https://github.com/ekg/fraction.js/blob/master/index.js


/**
 * Represents a fraction.
 * @typedef {Object} Fraction
 * @property {Number} numerator The numerator of a fraction
 * @property {Number} denominator The denominator of a fraction
 *
 */

class Fraction {
  constructor (numerator, denominator) {
    this.numerator = numerator;
    this.denominator = denominator;
  }
}


/**
 * decimalToFraction - Returns an object representing an integer fraction,
 * ie, with integer numerator and integer denominator. The fraction is
 * normalized to have the minimum numerator and denominator
 * (eg, 2/10 becomes 1/5).
 * @example
 * let fraction decimalToFraction(0.25);
 * fraction.numerator === 1;
 * fraction.denominator === 4;
 *
 * @param  {Number} number a number, which can be positive/negative, integer
 * or decimal.
 * @return {Fraction} the normalized integer fraction that represent the number
 */
function decimalToFraction (number) {
  if (typeof number !== 'number' || number instanceof Number) {
    throw new Error(`The provided argument (${number}) is not a number.`);
  }

  const result = new Fraction(number, 1);

  if (hasDecimalPoint(number)) {
    const rounded = roundToPlaces(number, 9);
    const scaleUp = Math.pow(10, rounded.toString().split('.')[1].length);

    result.numerator = Math.round(result.numerator * scaleUp);
    result.denominator *= scaleUp;
  }

  // now we find the smallest integer fraction by determining gcf and dividing
  // the numerator/denominator by it
  const greatestCommonFactor = gcf(result.numerator, result.denominator);

  result.numerator /= greatestCommonFactor;
  result.denominator /= greatestCommonFactor;

  return result;
}

function hasDecimalPoint (number) {
  const n = number;
  const hasPositiveDecimalRemainder = n % 1 > 0 && n % 1 < 1;
  const hasNegativeDecimalRemainder = n % -1 < 0 && n % -1 > -1;

  return ((n > 0 && hasPositiveDecimalRemainder) ||
          (n < 0 && hasNegativeDecimalRemainder));
}

function roundToPlaces (number, places) {
  const greatness = Math.pow(10, places);

  return Math.round(number * greatness) / greatness;
}


/**
 * gcf - Determines the greatest common factor between 2 numbers.
 * @example
 * gcf(4, 10) === 2;
 *
 * @param  {Number} a a number
 * @param  {Number} b another
 * @return {Number}   their greatest common factor
 */
function gcf (a, b) {
  if (!(typeof a === 'number' || a instanceof Number) || !(typeof b === 'number' || b instanceof Number)) {
    throw new Error(`Greatest common factor requires 2 numbers to compute. What was provided: ${a} and ${b}.`);
  }

  a = Math.abs(a);
  b = Math.abs(b);
  let c;

  while (b) {
    c = a % b;
    a = b;
    b = c;
  }

  return a;
}

export {
  decimalToFraction,
  hasDecimalPoint,
  roundToPlaces,
  gcf
};
