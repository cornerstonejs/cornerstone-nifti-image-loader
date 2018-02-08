/* eslint import/extensions:0 */
/* eslint prefer-spread:0 */
import { external } from '../externalModules.js';
import metaDataManager from './metaData/metaDataManager.js';
import parseNiftiFile from './parseNiftiFile';
import getDataView from './getDataView.js';
import convertFloatDataToInteger from './convertFloatDataToInteger.js';
import flattenNDarray from '../shared/flattenNDarray.js';

/**
 * Creates a cornerstone Image object for the specified imageId.
 *
 * @param {String} imageId the imageId of the image being created
 * @param {ArrayBuffer} rawData the contents of the file being loaded
 * @param {Object} slice the dimension and index of the slice plane
 * @returns a promise that, when resolved, yields the Cornerstone Image Object
 */
export default function createImage (imageId, rawData, slice) {
  const nifti = external.niftiReader;

  const promise = new Promise(function (resolve, reject) {
    try {
      // uncompress and extract header into meta data and image data
      const niftiFile = parseNiftiFile(nifti, rawData);
      const { metaData } = niftiFile;
      const { imageData } = niftiFile;

      // prepare the desired view of the data
      const dataView = getDataView(metaData, imageData, slice);
      let imageDataView = dataView.imageDataView;

      // updates the metaData object with information from the chosen slice
      // and its pixel values
      Object.assign(metaData, dataView.metaData);

      // transform/adjust the data in case values are float
      if (metaData.dataType.isDataInFloat) {
        const conversion = convertFloatDataToInteger(imageDataView, metaData);

        imageDataView = conversion.convertedImageDataView;
        Object.assign(metaData, conversion.metaData, {
          floatPixelData: flattenNDarray(conversion.floatImageDataView, conversion.OriginalTypedArrayConstructor)
        });
      }

      if (metaData.isWindowInfoAbsent) {
        // if the window information (min and max values) are absent int the
        // file, we calculate sensible values considering the minimum and
        // maximum pixel values considering not just the frame being shown,
        // but all of them (hence, minGLOBALPixelValue and max...)
        Object.assign(metaData, determineWindowValues(metaData.slope, metaData.intercept, metaData.minGlobalPixelValue, metaData.maxGlobalPixelValue));
      } else {
        Object.assign(metaData, determineWindowValues(1, 0, metaData.windowMinimumValue, metaData.windowMaximumValue));
      }

      // transforms the multi-dimensional array back into 1D for cornerstone
      const pixelData = flattenNDarray(imageDataView, metaData.dataType.TypedArrayConstructor);

      // adds the meta data of this image to the meta data manager
      metaDataManager.add(imageId, metaData);

      // create image
      const image = createCornerstoneImage(imageId, metaData, pixelData);

      resolve(image);
    } catch (error) {
      reject(error);
    }
  });

  return promise;
}

function createCornerstoneImage (imageId, metaData, pixelData) {
  const cornerstone = external.cornerstone;
  const render = metaData.dataType.isDataInColors
    ? cornerstone.renderColorImage
    : cornerstone.renderGrayscaleImage;

  return {
    imageId,
    color: metaData.dataType.isDataInColors,
    columnPixelSpacing: metaData.columnPixelSpacing,
    columns: metaData.columns,
    height: metaData.rows,
    intercept: metaData.intercept,
    invert: false,
    minPixelValue: metaData.minPixelValue,
    maxPixelValue: metaData.maxPixelValue,
    rowPixelSpacing: metaData.rowPixelSpacing,
    rows: metaData.rows,
    sizeInBytes: pixelData.byteLength,
    slope: metaData.slope,
    width: metaData.columns,
    windowCenter: metaData.windowCenter,
    windowWidth: metaData.windowWidth,
    decodeTimeInMS: 0,
    floatPixelData: metaData.floatPixelData,
    getPixelData: () => pixelData,
    render
  };
}

function determineWindowValues (slope, intercept, minValue, maxValue) {
  const maxVoi = maxValue * slope + intercept;
  const minVoi = minValue * slope + intercept;

  return {
    windowCenter: (maxVoi + minVoi) / 2,
    windowWidth: (maxVoi - minVoi)
  };
}
