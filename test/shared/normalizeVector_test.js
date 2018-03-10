/* eslint import/extensions: 0 */
import { expect } from 'chai';
import normalizeVector from '../../src/shared/normalizeVector.js';

describe('#normalizeVector', function () {

  it('should return the same vector if already normalized', function () {
    const result = normalizeVector([1, 0, 0]);

    expect(result).to.deep.equal([1, 0, 0]);
  });

  it('should return the normalized vector if its the zero vector', function () {
    expect(normalizeVector([0, 0, 0])).to.deep.equal([0, 0, 0]);
  });

  it('should return the normalized vector', function () {
    expect(normalizeVector([10, 0, 0])).to.deep.equal([1, 0, 0]);
    expect(normalizeVector([0, -2, 0])).to.deep.equal([0, -1, 0]);
  });

});
