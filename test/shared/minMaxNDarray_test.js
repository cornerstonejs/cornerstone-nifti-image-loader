/* eslint import/extensions: 0 */
import { expect } from 'chai';
import ndarray from 'ndarray';
import minMaxNDarray from '../../src/shared/minMaxNDarray.js';

describe('#minMaxNDarray', function () {
  it('should return the right min and max values', function () {
    const result = minMaxNDarray(ndarray([7, 3, 10, 6, -8, 1, 4, 5], [2, 2, 2, 1]));

    expect(result.min).to.be.equal(-8);
    expect(result.max).to.be.equal(10);
  });
});
