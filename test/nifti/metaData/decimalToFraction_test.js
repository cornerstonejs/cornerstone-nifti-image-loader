/* eslint import/extensions: 0 */
import { expect } from 'chai';
import {
  gcf,
  decimalToFraction
} from '../../../src/nifti/metaData/decimalToFraction.js';

describe('#gcf', () => {
  it('should throw an error if called without 2 arguments', () => {
    expect(gcf).to.throw();
  });

  it('should return 1 if numbers are mutually prime', () => {
    expect(gcf(2, 3)).to.be.equal(1);
  });

  it('should return the greatest common factor between two absolute integer numbers', () => {
    expect(gcf(10, 4)).to.be.equal(2);
  });
});

describe('#decimalToFraction', () => {
  it('should throw an error if the provided argument is not a number', () => {
    expect(() => decimalToFraction('not a number!')).to.throw();
  });

  it('should return 1/1 if the number is 1', () => {
    const result = decimalToFraction(1);

    expect(result.numerator).to.be.equal(1);
    expect(result.denominator).to.be.equal(1);
  });

  it('should return a multiple integer fraction of the number', () => {
    const result = decimalToFraction(0.75);

    expect(result.numerator).to.satisfy((n) => n % 3 === 0);
    expect(result.denominator).to.satisfy((n) => n % 4 === 0);
  });

  it('should return the most normalized integer fraction of the number', () => {
    const result = decimalToFraction(0.5);

    expect(result.numerator).to.be.equal(1);
    expect(result.denominator).to.be.equal(2);
  });
});
