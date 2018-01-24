import metaDataManager from './metaDataManager.js';
import decimalToFraction from './decimalToFraction.js';
import { external } from '../../externalModules.js';

const niftiReader = external.niftiReader;

function metaDataProvider (type, imageId) {
  const metaData = metaDataManager.get(imageId);

  if (!metaData) {
    return undefined;
  }

  switch (type) {
  case 'imagePlaneModule': {
    return { };
  }
  case 'imagePixelModule': {
    return {
      samplesPerPixel: getSamplesPerPixel(metaData),
      photometricInterpretation: getPhotometricInterpretation(metaData),
      rows: metaData.dims[2], // TODO what if z is not the slice dim?
      columns: metaData.dims[1], // TODO what if z is not the slice dim?
      bitsAllocated: metaData.numBitsPerVoxel,
      bitsStored: metaData.numBitsPerVoxel,
      highBit: metaData.numBitsPerVoxel - 1,
      pixelRepresentation: getPixelRepresentation(metaData),
      planarConfiguration: getPlanarConfiguration(metaData),
      pixelAspectRatio: getPixelAspectRatio(metaData),
      smallestPixelValue: metaData.calculated.minPixelValue,
      largestPixelValue: metaData.calculated.maxPixelValue
    };
  }
  case 'voiLutModule':
    return {

    };
  case 'modalityLutModule':
    return {

    };
  default:
    return undefined;
  }
}

function getSamplesPerPixel (metaData) {
  // the fifth dimension (metaData.dims[5]), if present, represents the
  // samples per voxel
  const hasFifthDimensionSpecified = metaData[0] >= 5;
  const hasSamplesPerVoxelSpecified = hasFifthDimensionSpecified && (metaData[5] > 1);

  return hasSamplesPerVoxelSpecified ? metaData[5] : 1;
}

function getPhotometricInterpretation (metaData) {
  const dataTypeCode = metaData.datatypeCode;
  const samplesPerPixel = getSamplesPerPixel(metaData);
  const isRGB = dataTypeCode === niftiReader.NIFTI1.TYPE_RGB && samplesPerPixel === 3;
  const isRGBA = dataTypeCode === niftiReader.NIFTI1.TYPE_RGBA && samplesPerPixel === 4;

  // we assume 'RGB' if nifti file has RGB or RGBA types and samplesPerPixel matches
  if (isRGB || isRGBA) {
    return 'RGB';
  }

  // or 'MONOCHROME2' otherwise, as its the most typical photometric interpretation
  return 'MONOCHROME2';
}

function getPixelRepresentation (metaData) {
  const dataTypeCode = metaData.datatypeCode;

  switch (dataTypeCode) {
  case niftiReader.NIFTI1.TYPE_UINT8:
  case niftiReader.NIFTI1.TYPE_UINT16:
  case niftiReader.NIFTI1.TYPE_UINT32:
  case niftiReader.NIFTI1.TYPE_UINT64:
    // '0000H' means unsigned integer, by DICOM pixel representation value
    return '0000H';
  case niftiReader.NIFTI1.TYPE_INT8:
  case niftiReader.NIFTI1.TYPE_INT16:
  case niftiReader.NIFTI1.TYPE_INT32:
  case niftiReader.NIFTI1.TYPE_INT64:
    // '0001H' means signed integer, 2-complement
    return '0000H';
  case niftiReader.NIFTI1.TYPE_FLOAT32:
  case niftiReader.NIFTI1.TYPE_FLOAT64:
  case niftiReader.NIFTI1.TYPE_RGB:
  case niftiReader.NIFTI1.TYPE_RGBA:
    // as images using float or rgb(a) values are converted to Uint16, we
    // return the pixel representation as unsigned integer
    return '0000H';
  }
}

function getPlanarConfiguration (metaData) {
  // the planar configuration only applies if image has samplesPerPixel > 1
  // it determines how the samples are organized
  const samplesPerPixel = getSamplesPerPixel(metaData);

  // value '0': RGB RGB RGB (image with 3 px)
  // value '1': RRR GGG BBB
  // in a nifti file, if it has samplesPerPixel > 1, the config is always '0'
  return samplesPerPixel > 1 ? 0 : undefined;
}

function getPixelAspectRatio (metaData) {
  const horizontalSize = metaData.pixDims[1]; // TODO what if z is not the slice dim?
  const verticalSize = metaData.pixDims[2]; // TODO what if z is not the slice dim?
  const fraction = decimalToFraction(verticalSize / horizontalSize);

  return `${fraction.numerator}/${fraction.denominator}`;
}

export default metaDataProvider;
