/* eslint import/extensions: 0 */
import { expect } from 'chai';
import ImageId from '../../src/nifti/ImageId.js';

describe('#ImageId', () => {

  it('should throw an exception if the provided imageId is invalid', () => {
    expect(() => ImageId.fromURL('not-in-the-format')).to.throw();
  });

  it('should accept nifti:filename format', () => {
    const result = ImageId.fromURL('nifti:brain.nii');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      slice: {
        dimension: 'z',
        index: 0
      },
      timePoint: 0
    });
  });

  it('should accept nifti:filename#slice format', () => {
    const result = ImageId.fromURL('nifti:brain.nii#100');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      slice: {
        dimension: 'z',
        index: 100
      },
      timePoint: 0
    });
  });

  it('should accept nifti:filename#dimension format', () => {
    const result = ImageId.fromURL('nifti:brain.nii#x');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      slice: {
        dimension: 'x',
        index: 0
      },
      timePoint: 0
    });
  });

  it('should accept nifti:filename#dimension-slice format', () => {
    const result = ImageId.fromURL('nifti:brain.nii#y-25');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      slice: {
        dimension: 'y',
        index: 25
      },
      timePoint: 0
    });
  });

  it('should accept nifti:filename#dimension-slice,time-point format', () => {
    const result = ImageId.fromURL('nifti:brain.nii#y-25,t-11');

    expect(result).to.deep.equal({
      filePath: 'brain.nii',
      slice: {
        dimension: 'y',
        index: 25
      },
      timePoint: 11
    });
  });

  it('should not accept nifti:filename# format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#')).to.throw();
  });

  it('should not accept nifti:filename#-slice format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#-25')).to.throw();
  });

  it('should not accept nifti:filename#dimension- format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#x-')).to.throw();
  });

  it('should not accept nifti:filename#dimension-slice, format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#x-4,')).to.throw();
  });

  it('should not accept nifti:filename#dimension-slice,t format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#x-4,t')).to.throw();
  });

  it('should not accept nifti:filename#dimension-slice,t- format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#x-4,t-')).to.throw();
  });

  it('should not accept nifti:filename#,t-point format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#,t-10')).to.throw();
  });

  it('should not accept nifti:filename#t-point format', () => {
    expect(() => ImageId.fromURL('nifti:brain.nii#t-10')).to.throw();
  });
});
