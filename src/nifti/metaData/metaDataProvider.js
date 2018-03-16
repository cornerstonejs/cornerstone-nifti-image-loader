import metaDataManager from './metaDataManager.js';
import { decimalToFraction } from './decimalToFraction.js';
import { external } from '../../externalModules.js';
import ImageId from '../ImageId.js';

const dependencies = {
  metaDataManager,
  decimalToFraction,
  niftiReader: external.niftiReader
};

export function metaDataProvider (type, imageId) {
  // fetches injected dependencies
  const niftiReader = dependencies.niftiReader;
  const metaDataManager = dependencies.metaDataManager;
  const metaData = metaDataManager.get(imageId);

  if (!metaData) {
    return;
  }

  const imageIdObject = ImageId.fromURL(imageId);

  switch (type) {
  case 'functional': {
    return {
      frameOfReferenceUID: imageIdObject.filePath,
      timeSlices: metaData.timeSlices
    };
  }
  case 'imagePlane':
  case 'imagePlaneModule': {
    const frameOfReferenceUID = imageIdObject.filePath;

    return {
      frameOfReferenceUID,
      columns: metaData.columns,
      rows: metaData.rows,
      imageOrientationPatient: metaData.imageOrientationPatient,
      columnCosines: metaData.columnCosines,
      rowCosines: metaData.rowCosines,
      imagePositionPatient: metaData.imagePositionPatient,
      // assuming slices contain no gaps between them (contiguous voxels),
      // as the nifti file does not hold thickness/gap separately
      sliceThickness: metaData.slicePixelSpacing,
      // sliceLocation,
      columnPixelSpacing: metaData.columnPixelSpacing,
      rowPixelSpacing: metaData.rowPixelSpacing
    };
  }

  case 'imagePixel':
  case 'imagePixelModule': {
    return {
      samplesPerPixel: getSamplesPerPixel(metaData),
      photometricInterpretation: getPhotometricInterpretation(metaData, niftiReader),
      rows: metaData.rows,
      columns: metaData.columns,
      bitsAllocated: metaData.header.numBitsPerVoxel,
      bitsStored: metaData.header.numBitsPerVoxel,
      highBit: metaData.header.numBitsPerVoxel - 1,
      pixelRepresentation: getPixelRepresentation(metaData, niftiReader),
      planarConfiguration: getPlanarConfiguration(metaData),
      pixelAspectRatio: getPixelAspectRatio(metaData),
      smallestPixelValue: metaData.minPixelValue,
      largestPixelValue: metaData.maxPixelValue
    };
  }

  case 'modalityLut':
  case 'modalityLutModule':
    return {
      rescaleIntercept: metaData.intercept,
      rescaleSlope: metaData.slope,
      rescaleType: 'US',
      modalityLutSequence: undefined
    };

  case 'voiLut':
  case 'voiLutModule':
    return {
      windowCenter: metaData.windowCenter,
      windowWidth: metaData.windowWidth,
      voiLutSequence: undefined
    };

  case 'multiFrame':
  case 'multiFrameModule':
    return {
      numberOfFrames: metaData.numberOfFrames,
      frameIncrementPointer: undefined,
      stereoPairsPresent: 'NO'
    };

  default:
    return;
  }
}

function getSamplesPerPixel (metaData) {
  // the fifth dimension (metaData.header.dims[5]), if present, represents the
  // samples per voxel
  const hasFifthDimensionSpecified = metaData.header.dims[0] >= 5;
  const hasSamplesPerVoxelSpecified = hasFifthDimensionSpecified && (metaData.header.dims[5] > 1);

  return hasSamplesPerVoxelSpecified ? metaData.header.dims[5] : 1;
}

function getPhotometricInterpretation (metaData, niftiReader) {
  const dataTypeCode = metaData.header.datatypeCode;
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

function getPixelRepresentation (metaData, niftiReader) {
  const dataTypeCode = metaData.header.datatypeCode;

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
    return '0001H';
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
  const decimalToFraction = dependencies.decimalToFraction;

  const horizontalSize = metaData.header.pixDims[1]; // TODO what if z is not the slice dim?
  const verticalSize = metaData.header.pixDims[2]; // TODO what if z is not the slice dim?
  const fraction = decimalToFraction(verticalSize / horizontalSize);

  return `${fraction.numerator}/${fraction.denominator}`;
}


export function metaDataProviderBuilder ({
  metaDataManager,
  decimalToFraction,
  niftiReader
}) {
  dependencies.metaDataManager = metaDataManager;
  dependencies.decimalToFraction = decimalToFraction;
  dependencies.niftiReader = niftiReader;

  return metaDataProvider;
}
