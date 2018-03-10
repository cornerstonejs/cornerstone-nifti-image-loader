/* eslint import/extensions: 0 */
import { expect } from 'chai';
import ndarray from 'ndarray';
import flattenNDarray from '../../src/shared/flattenNDarray.js';

describe('#flattenNDarray', function () {
  const oneDarray = [7, 3, 10, 6, -8, 1, 4, 5, 2];
  const array = ndarray(oneDarray, [3, 3], [1, 3]);

  it('should return a 1d array with the proper length', function () {
    const result = flattenNDarray(array, Array);

    expect(result.length).to.be.equal(9);
    expect(typeof result[0]).to.be.equal('number');
  });

  it('should return a 1d array with properly positioned elements', function () {
    const result = flattenNDarray(array, Array);

    expect(result).to.deep.equal(oneDarray);
  });
});
