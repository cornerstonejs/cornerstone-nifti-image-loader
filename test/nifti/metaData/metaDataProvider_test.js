/* eslint import/extensions: 0 */
/* eslint no-unused-expressions: 0 */
import { expect } from 'chai';
import sinon from 'sinon';
import { metaDataProviderBuilder } from '../../../src/nifti/metaData/metaDataProvider.js';
import * as metaDataManager_original from '../../../src/nifti/metaData/metaDataManager.js';
import { external } from '../../../src/externalModules.js';

describe('#metaDataProvider', () => {
  // hold references to the metaDataProvider being tested and its dependencies,
  // which may be mocked in some tests
  let metaDataProvider;
  let metaDataManager;
  let decimalToFraction;
  let niftiReader;

  beforeEach(() => {
    metaDataManager = metaDataManager_original.default;
    decimalToFraction = sinon.stub();
    niftiReader = external.niftiReader;

    // creates the metaDataProvider being tested, with the dependencies
    // provided for the test (so they can be mocked, if necessary)
    metaDataProvider = metaDataProviderBuilder({
      metaDataManager,
      decimalToFraction,
      niftiReader
    });
  });

  // cleans up the metaDataManager.get mock made by each test so it is ready
  // to be mocked again by the next one
  afterEach(() => {
    if ('restore' in metaDataManager.get) {
      metaDataManager.get.restore();
    }
  });


  it('should return undefined if there is nothing in the meta data cache', () => {
    // stubs the manager 'get(imageId)' method
    sinon.stub(metaDataManager, 'get').returns(undefined);
    // calls the provider method, being tested
    // actual test
    const result = metaDataProvider('anything', 'some image id');

    expect(result).to.be.undefined;
  });

  it('should return undefined if there is no entry for some imageId in the cache', () => {
    const someData = { information: 'info' };

    stubMetaDataManager('nifti:sample.nii', someData);

    // actual test
    const result = metaDataProvider('voiLutModule', 'nifti:not-in-the-cache.nii');

    expect(result).to.be.undefined;
  });

  it('should return undefined if asked for an unrecognized type of meta data', () => {
    const someData = { information: 'info' };

    stubMetaDataManager('nifti:sample.nii', someData);

    // actual test
    const result = metaDataProvider('inexistentModule', 'nifti:sample.nii');

    expect(result).to.be.undefined;
  });

  it('should return voiLutModule meta data if there is such information for an imageId', () => {
    const metaData = {
      cal_min: 50,
      cal_max: 100
    };

    stubMetaDataManager('nifti:sample.nii', metaData);

    // actual test
    const result = metaDataProvider('voiLutModule', 'nifti:sample.nii');

    expect(result).to.exist;
    expect(result.windowCenter).to.be.equal(75);
    expect(result.windowWidth).to.be.equal(50);
  });

  it('should return modalityLutModule meta data if there is such information for an imageId', () => {
    const metaData = {
      scl_inter: 0.5,
      scl_slope: 1.25
    };

    stubMetaDataManager('nifti:sample.nii', metaData);

    // actual test
    const result = metaDataProvider('modalityLutModule', 'nifti:sample.nii');

    expect(result).to.exist;
    expect(result.rescaleIntercept).to.be.equal(0.5);
    expect(result.rescaleSlope).to.be.equal(1.25);
  });

  it('should return imagePixelModule meta data for image with INTEGER MONOCHROME values', () => {
    const metaData = {
      dims: [3, 80, 90, 100, 1, 1, 1, 1, 1],
      pixDims: [1, 40, 10, 60],
      numBitsPerVoxel: 8,
      calculated: {
        minPixelValue: 50,
        maxPixelValue: 100
      },
      datatypeCode: niftiReader.NIFTI1.TYPE_UINT8
    };

    stubMetaDataManager('nifti:sample.nii', metaData);
    stubDecimalToFraction(0.25, 1, 4);

    const result = metaDataProvider('imagePixelModule', 'nifti:sample.nii');

    expect(result).to.exist;
    expect(result.samplesPerPixel).to.be.equal(1);
    expect(result.photometricInterpretation).to.be.equal('MONOCHROME2');
    expect(result.rows).to.be.equal(90);
    expect(result.columns).to.be.equal(80);
    expect(result.bitsAllocated).to.be.equal(8);
    expect(result.bitsStored).to.be.equal(8);
    expect(result.highBit).to.be.equal(7);
    expect(result.pixelRepresentation).to.be.equal('0000H');
    expect(result.planarConfiguration).to.be.undefined;
    expect(result.pixelAspectRatio).to.be.equal('1/4');
    expect(result.smallestPixelValue).to.be.equal(50);
    expect(result.largestPixelValue).to.be.equal(100);
  });

  it('should return imagePixelModule meta data for image with INTEGER RGB values', () => {
    const metaData = {
      dims: [5, 40, 45, 50, 1, 3, 1, 1, 1],
      pixDims: [1, 20, 10, 60],
      numBitsPerVoxel: 8,
      calculated: {
        minPixelValue: 10,
        maxPixelValue: 20
      },
      datatypeCode: niftiReader.NIFTI1.TYPE_RGB
    };

    stubMetaDataManager('nifti:sample.nii', metaData);
    stubDecimalToFraction(0.5, 1, 2);

    const result = metaDataProvider('imagePixelModule', 'nifti:sample.nii');

    expect(result).to.exist;
    expect(result.samplesPerPixel).to.be.equal(3);
    expect(result.photometricInterpretation).to.be.equal('RGB');
    expect(result.rows).to.be.equal(45);
    expect(result.columns).to.be.equal(40);
    expect(result.bitsAllocated).to.be.equal(8);
    expect(result.bitsStored).to.be.equal(8);
    expect(result.highBit).to.be.equal(7);
    expect(result.pixelRepresentation).to.be.equal('0000H');
    expect(result.planarConfiguration).to.be.equal(0);
    expect(result.pixelAspectRatio).to.be.equal('1/2');
    expect(result.smallestPixelValue).to.be.equal(10);
    expect(result.largestPixelValue).to.be.equal(20);
  });

  it('should return imagePixelModule meta data for image with FLOAT values', () => {
    const metaData = {
      dims: [3, 20, 25, 3, 1, 1, 1, 1, 1],
      pixDims: [1, 5, 5, 1],
      numBitsPerVoxel: 16,
      calculated: {
        minPixelValue: 0,
        maxPixelValue: 65536
      },
      datatypeCode: niftiReader.NIFTI1.TYPE_FLOAT32
    };

    stubMetaDataManager('nifti:sample.nii', metaData);
    stubDecimalToFraction(1, 1, 1);

    const result = metaDataProvider('imagePixelModule', 'nifti:sample.nii');

    expect(result).to.exist;
    expect(result.samplesPerPixel).to.be.equal(1);
    expect(result.photometricInterpretation).to.be.equal('MONOCHROME2');
    expect(result.rows).to.be.equal(25);
    expect(result.columns).to.be.equal(20);
    expect(result.bitsAllocated).to.be.equal(16);
    expect(result.bitsStored).to.be.equal(16);
    expect(result.highBit).to.be.equal(15);
    expect(result.pixelRepresentation).to.be.equal('0000H');
    expect(result.planarConfiguration).to.be.undefined;
    expect(result.pixelAspectRatio).to.be.equal('1/1');
    expect(result.smallestPixelValue).to.be.equal(0);
    expect(result.largestPixelValue).to.be.equal(65536);
  });

  it('should return multiFrameModule meta data', () => {
    const metaData = {
      dims: [3, 20, 25, 100, 1, 1, 1, 1, 1],
      pixDims: [1, 5, 5, 1],
      numBitsPerVoxel: 16
    };

    stubMetaDataManager('nifti:sample.nii', metaData);

    const result = metaDataProvider('multiFrameModule', 'nifti:sample.nii');

    expect(result).to.exist;
    expect(result.numberOfFrames).to.equal(100);
    expect(result.frameIncrementPointer).to.be.undefined;
    expect(result.stereoPairsPresent).to.equal('NO');
  });


  // stubs the metaDataManager.get method to return the provided metaData object
  function stubMetaDataManager (imageId, metaData) {
    sinon.stub(metaDataManager, 'get').
      withArgs(imageId).
      returns(metaData);
  }

  // stubs the decimalToFraction
  function stubDecimalToFraction (input, numerator, denominator) {
    decimalToFraction.withArgs(input).returns({
      numerator,
      denominator
    });
  }

});
