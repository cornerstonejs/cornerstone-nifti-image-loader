/* eslint-disable no-unused-expressions */
/* eslint import/extensions: 0 */
import { expect } from 'chai';
import * as cornerstoneNIFTIImageLoader from '../src/imageLoader/index.js';

describe('A test that pulls in all modules', function () {
  it('pulls in all modules', function () {
    expect(cornerstoneNIFTIImageLoader).to.exist;
  });
});
