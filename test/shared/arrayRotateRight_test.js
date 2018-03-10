/* eslint import/extensions: 0 */
import { expect } from 'chai';
import arrayRotateRight from '../../src/shared/arrayRotateRight.js';

describe('#arrayRotateRight', function () {

  it('should not change the array if position is 0', function () {
    const result = arrayRotateRight([1, 2, 3], 0);

    expect(result).to.deep.equal([1, 2, 3]);
  });

  it('should change the array ordering by desired amount', function () {
    const result = arrayRotateRight([1, 2, 3], 1);

    expect(result).to.deep.equal([3, 1, 2]);
  });

});
