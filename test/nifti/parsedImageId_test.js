/* eslint import/extensions: 0 */
import { expect } from 'chai';
import parsedImageId from '../../src/nifti/parsedImageId.js';

describe('#parsedImageId', () => {

  it('should throw an exception if the provided imageId is invalid', () => {
    expect(() => parsedImageId('not-in-the-format')).to.throw();
  });

  it('should accept nifti://filename format', () => {
    const result = parsedImageId('nifti://brain.nii');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      sliceDimension: 'z',
      sliceIndex: 0,
      wasSliceDimensionDefined: false,
      wasSliceIndexDefined: false
    });
  });

  it('should accept nifti://filename#slice format', () => {
    const result = parsedImageId('nifti://brain.nii#100');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      sliceDimension: 'z',
      sliceIndex: 100,
      wasSliceDimensionDefined: false,
      wasSliceIndexDefined: true
    });
  });

  it('should accept nifti://filename#dimension format', () => {
    const result = parsedImageId('nifti://brain.nii#x');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      sliceDimension: 'x',
      sliceIndex: 0,
      wasSliceDimensionDefined: true,
      wasSliceIndexDefined: false
    });
  });

  it('should accept nifti://filename#dimension-slice format', () => {
    const result = parsedImageId('nifti://brain.nii#y-25');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      sliceDimension: 'y',
      sliceIndex: 25,
      wasSliceDimensionDefined: true,
      wasSliceIndexDefined: true
    });
  });

  it('should not accept nifti://filename# format', () => {
    expect(() => parsedImageId('nifti://brain.nii#')).to.throw();
  });

  it('should not accept nifti://filename#-slice format', () => {
    expect(() => parsedImageId('nifti://brain.nii#-25')).to.throw();
  });

  it('should not accept nifti://filename#dimension- format', () => {
    expect(() => parsedImageId('nifti://brain.nii#x-')).to.throw();
  });
});
