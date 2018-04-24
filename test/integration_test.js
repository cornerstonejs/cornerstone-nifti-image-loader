/* eslint import/extensions: 0 */
import { expect } from 'chai';
import niftiImageLoader from '../src/nifti/index.js';
import { external } from '../src/externalModules.js';

external.cornerstone = window.cornerstone;

const url = 'nifti:base/test/data/';

describe('loadImage', function () {
  it('should properly load an uncompressed file (.nii)', function (done) {
    const filename = 'avg152T1_LR_nifti.nii';
    const imageId = `${url}${filename}`;

    let loadObject;

    try {
      loadObject = niftiImageLoader.loadImage(imageId);
    } catch (error) {
      done(error);
    }

    loadObject.promise.then((image) => {
      // TODO: Compare against known correct pixel data
      expect(image).to.be.an('object');
      done();
    }, done);
  });

  it('should properly load a compressed nifti file (.nii.gz)', function (done) {
    const filename = 'avg152T1_LR_nifti.nii.gz';
    const imageId = `${url}${filename}`;

    let loadObject;

    try {
      loadObject = niftiImageLoader.loadImage(imageId);
    } catch (error) {
      done(error);
    }

    loadObject.promise.then((image) => {
      // TODO: Compare against known correct pixel data
      expect(image).to.be.an('object');
      done();
    }, done);
  });

  it('should fail to load a fake nifti file', function (done) {
    const filename = 'not-nifti.nii';
    const imageId = `${url}${filename}`;

    let loadObject;

    try {
      loadObject = niftiImageLoader.loadImage(imageId);
    } catch (error) {
      done(error);
    }

    loadObject.promise.then((image) => {
      done(image);
    }, error => {
      expect(error).to.exist;
      console.warn(error);
      done();
    });
  });
});
