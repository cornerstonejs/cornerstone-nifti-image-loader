/* eslint import/extensions: 0 */
import { expect } from 'chai';
import { external } from '../src/externalModules.js';
import nifti from '../src/nifti/index.js';

external.cornerstone = window.cornerstone;

const url = 'nifti://localhost:9876/base/test/data/';

describe('loadImage', function () {
  //this.timeout(0);

  before(function () {
  });

  it(`should properly load ${name}`, function (done) {
    const filename = `avg152T1_LR_nifti.nii`;
    const imageId = `${url}${filename}`;

    let loadObject;

    try {
      loadObject = nifti.loadImage(imageId);
    } catch (error) {
      done(error);
    }

    loadObject.promise.then((image) => {
      console.log(image);
      // TODO: Compare against known correct pixel data
      expect(image).to.be.an('object');
      done();
    }, done);
  });
});
