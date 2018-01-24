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

    const [, columnPixelDimension, rowPixelDimension] = niftiHeader.pixDims;

    let minPixelValue;
    let maxPixelValue;
    let slope;
    let intercept;
    let floatPixelData;

    // determines the min, max pixel values and the slope and intercept
    // if the pixel data is represented by floating point, we need to convert
    if (isFloat) {
      const conversionResult = convertToUInt8PixelData(niftiImage);

      minPixelValue = conversionResult.min;
      maxPixelValue = conversionResult.max;
      slope = conversionResult.slope;
      intercept = conversionResult.intercept;

      floatPixelData = new ArrayConstructor(niftiImage);
      niftiImage = conversionResult.intPixelData;
    } else {
      const minMax = getMinMax(niftiImage, false);

      minPixelValue = minMax.min;
      maxPixelValue = minMax.max;
      // if scl_slope is 0, the nifti specs say it's not defined (then, we default to 1)
      slope = niftiHeader.scl_slope === 0 ? 1 : niftiHeader.scl_slope;
      intercept = niftiHeader.scl_inter;
    }


    // determines the display window configuration either from the nifti file,
    // or from the minimum/maximum pixel data values + slope/intercept
    let windowConfig;
    const isWindowInfoAbsent = niftiHeader.cal_max - niftiHeader.cal_min === 0;

    if (isWindowInfoAbsent) {
      // the nifti file did not provide the initial window min/max values
      // then we determine sensible values using min/max pixel data, slope and intercept
      windowConfig = determineWindowValues(minPixelValue, maxPixelValue, slope, intercept);
    } else {
      windowConfig = determineWindowValues(niftiHeader.cal_min, niftiHeader.cal_max, 1, 0);
    }
    const { windowWidth, windowCenter } = windowConfig;


    // adds the header of this nifti file to the metadata cache
    niftiHeader.calculated = {
      minPixelValue,
      maxPixelValue,
      windowWidth,
      windowCenter
    };
    metaDataManager.add(imageId, niftiHeader);


    // determines which cornerstone renderer to use
    const cornerstone = external.cornerstone;
    const render = isColored ? cornerstone.renderColorImage : cornerstone.renderGrayscaleImage;

    resolve({
      imageId,
      color: isColored,
      columnPixelSpacing: columnPixelDimension,
      columns: imageWidth,
      height: imageHeight,
      intercept,
      invert: false,
      minPixelValue,
      maxPixelValue,
      rowPixelSpacing: rowPixelDimension,
      rows: imageHeight,
      sizeInBytes: niftiImage.byteLength,
      slope,
      width: imageWidth,
      windowCenter,
      windowWidth,
      decodeTimeInMS: 0,
      floatPixelData,
      getPixelData: () => niftiImage,
      render
    });
  });

  return promise;
}

function determineWindowValues (minPixelValue, maxPixelValue, slope, intercept) {
  const maxVoi = maxPixelValue * slope + intercept;
  const minVoi = minPixelValue * slope + intercept;

  return {
    windowWidth: maxVoi - minVoi,
    windowCenter: (maxVoi + minVoi) / 2
  };
}

function convertToUInt8PixelData (floatPixelData) {
  const floatMinMax = getMinMax(floatPixelData);
  const floatRange = Math.abs(floatMinMax.max - floatMinMax.min);
  const intRange = 65535;
  const slope = floatRange / intRange;
  const intercept = floatMinMax.min;
  const numPixels = floatPixelData.length;
  const intPixelData = new Uint16Array(numPixels);
  let min = 65535;
  let max = 0;

  for (let i = 0; i < numPixels; i++) {
    const rescaledPixel = Math.floor((floatPixelData[i] - intercept) / slope);

    intPixelData[i] = rescaledPixel;
    min = Math.min(min, rescaledPixel);
    max = Math.max(max, rescaledPixel);
  }

  return {
    min,
    max,
    intPixelData,
    slope,
    intercept
  };
}

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
