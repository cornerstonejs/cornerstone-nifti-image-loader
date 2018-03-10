/* eslint import/extensions: 0 */
import { expect } from 'chai';
import multiplyMatrixAndPoint from '../../src/shared/multiplyMatrixAndPoint.js';

describe('#multiplyMatrixAndPoint', function () {

  it('should return the same point if identity matrix', function () {
    const identity = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1]
    ];
    const result = multiplyMatrixAndPoint(identity, [4, 4, 4, 1]);

    expect(result).to.deep.equal([4, 4, 4, 1]);
  });

  it('should return the resulting point', function () {
    const matrix = [
      [2, 0, 0, 0],
      [0, -2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 1]
    ];
    const result = multiplyMatrixAndPoint(matrix, [4, 4, 4, 1]);

    expect(result).to.deep.equal([8, -8, 0, 1]);
  });

});
