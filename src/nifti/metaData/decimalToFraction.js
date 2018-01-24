// This utility was borrowed/adapted from Erik Garrison's fraction.js
// https://github.com/ekg/fraction.js/blob/master/index.js

class Fraction {
  constructor (numerator, denominator) {
    this.numerator = numerator;
    this.denominator = denominator;
  }
}

function decimalToFraction (number) {
  if (typeof number !== 'number' || number instanceof Number) {
    throw new Error(`The provided argument (${number}) is not a number.`);
  }

  const result = new Fraction(1, 1);

  if (hasDecimalPoint(number)) {
    const rounded = roundToPlaces(number, 9);
    const scaleUp = Math.pow(10, rounded.toString().split('.')[1].length);

    result.numerator = Math.round(this.denominator * scaleUp);
    result.denominator *= scaleUp;
  }

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

export default decimalToFraction;
