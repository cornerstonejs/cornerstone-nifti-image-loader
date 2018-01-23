import { external } from '../externalModules.js';
import metaDataManager from './metaData/metaDataManager.js';
import getMinMax from '../shared/getMinMax.js';

/**
 * creates a cornerstone Image object for the specified Image and imageId
 *
 * @param imageId the imageId of the image being created
 * @param data the contents of the file being loaded
 * @param sliceIndex the slice index to be shown
 * @returns Cornerstone Image Object
 */
export default function (imageId, data, sliceIndex) {
  const niftiReader = external.niftiReader;

  const promise = new Promise(function (resolve, reject) {
    let niftiHeader = null;
    let niftiImage = null;

    if (niftiReader.isCompressed(data)) {
      data = niftiReader.decompress(data);
    }

    if (!niftiReader.isNIFTI(data)) {
      reject(new Error('The file being loaded is not in valid NIFTI format.'));

      return;
    }

    // reads the header with the metadata
    niftiHeader = niftiReader.readHeader(data);
    console.log(niftiHeader.toFormattedString());
    console.dir(niftiHeader);

    // adds the header of this nifti file to the metadata cache
    metaDataManager.add(imageId, niftiHeader);

    // TODO do we need to differentiate among the several intent codes?
    // console.log(niftiHeader.intent_name);

    // reads the image data
    niftiImage = niftiReader.readImage(niftiHeader, data);

    // converts the image data into a proper typed array
    const { isColored, isFloat, bitDepth, ArrayConstructor } = getMemoryStorageRequirements(niftiHeader);

    // determines the number of columns and rows of the image
    const imageWidth = niftiHeader.dims[1];
    const imageHeight = niftiHeader.dims[2];

    // determines the length and beginning of the slice in bytes (not in 'typedArray indices')
    const sliceLength = imageWidth * imageHeight * (bitDepth / 8);
    const sliceByteIndex = sliceIndex * sliceLength;

    niftiImage = new ArrayConstructor(niftiImage.slice(sliceByteIndex, sliceByteIndex + sliceLength));
    console.dir(niftiImage);

    // TODO should we load potential extensions on the nifti file? is this necessary?
    // if (niftiReader.hasExtension(niftiHeader)) {
    //   niftiExt = niftiReader.readExtensionData(niftiHeader, data);
    // }

    // TODO need to check what to do for non-default orientations
    // (ie, when 'qform_code' is different than 0)
    // orientation information: https://brainder.org/2012/09/23/the-nifti-file-format/
    // if (niftiHeader.qform_code !== 0) {
    //   throw new Error('Nifti image uses an unsupported orientation method');
    // }

    const cornerstone = external.cornerstone;
    const [, columnPixelDimension, rowPixelDimension] = niftiHeader.pixDims;
    const { min: minimumValue, max: maximumValue } = getMinMax(niftiImage, false);
    // if scl_slope is 0, the nifti specs say it's not defined (then, we default to 1)
    const scaleSlope = niftiHeader.scl_slope === 0 ? 1 : niftiHeader.scl_slope;

    console.log({
      minimumValue,
      maximumValue
    });

    resolve({
      imageId,
      color: isColored,
      columnPixelSpacing: columnPixelDimension,
      columns: imageWidth,
      height: imageHeight,
      intercept: niftiHeader.scl_inter,
      invert: false,
      minPixelValue: minimumValue,
      maxPixelValue: maximumValue,
      rowPixelSpacing: rowPixelDimension,
      rows: imageHeight,
      sizeInBytes: niftiImage.byteLength,
      slope: scaleSlope,
      width: imageWidth,
      // windowCenter: 127,
      // windowWidth: 255,
      windowCenter: Math.floor((niftiHeader.cal_max + niftiHeader.cal_min) / 2), // unsure about this...
      windowWidth: niftiHeader.cal_max + niftiHeader.cal_min, // unsure
      decodeTimeInMS: 400,
      floatPixelData: isFloat ? niftiImage : undefined,
      getPixelData: () => niftiImage, // TODO convert float to int values, if necessary
      render: isColored ? cornerstone.renderColorImage : cornerstone.renderGrayscaleImage
    });
  });

  return promise;
}


// const niftiDataType = ['integer unsigned', 'integer signed', 'real', 'rgb'];
function getMemoryStorageRequirements (niftiHeader) {
  const niftiReader = external.niftiReader;
  const dataTypeCode = niftiHeader.datatypeCode;
  const bitDepth = niftiHeader.numBitsPerVoxel;
  let isColored = false;
  let isFloat = false;
  let ArrayConstructor;

  switch (dataTypeCode) {
  case niftiReader.NIFTI1.TYPE_UINT8:
    ArrayConstructor = Uint8Array;
    break;
  case niftiReader.NIFTI1.TYPE_UINT16:
    ArrayConstructor = Uint16Array;
    break;
  case niftiReader.NIFTI1.TYPE_UINT32:
    ArrayConstructor = Uint32Array;
    break;
  // case niftiReader.NIFTI1.TYPE_UINT64:
  //   ArrayConstructor = Uint64Array;
  //   break;
  case niftiReader.NIFTI1.TYPE_INT8:
    ArrayConstructor = Int8Array;
    break;
  case niftiReader.NIFTI1.TYPE_INT16:
    ArrayConstructor = Int16Array;
    break;
  case niftiReader.NIFTI1.TYPE_INT32:
    ArrayConstructor = Int32Array;
    break;
  // case niftiReader.NIFTI1.TYPE_INT64:
  //   ArrayConstructor = Int64Array;
  //   break;
  case niftiReader.NIFTI1.TYPE_FLOAT32:
    ArrayConstructor = Float32Array;
    isFloat = true;
    break;
  case niftiReader.NIFTI1.TYPE_FLOAT64:
    ArrayConstructor = Float64Array;
    isFloat = true;
    break;
  case niftiReader.NIFTI1.TYPE_RGB:
  case niftiReader.NIFTI1.TYPE_RGBA:
    ArrayConstructor = Uint8Array;
    isColored = true;
    break;
  default:
    throw new Error(`NIfTI file has an unsupported data type: ${niftiReader.getDatatypeCodeString(dataTypeCode)}`);
  }

  return {
    isColored,
    isFloat,
    bitDepth,
    ArrayConstructor
  };
}
