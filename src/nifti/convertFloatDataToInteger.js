/* eslint import/extensions:0 */
import ndarray from 'ndarray';
import cwise from 'cwise';

function linearTransformation (value, slope, intercept) {
  return (value - intercept) / slope;
}

// a function that does a linear transformation, rounded down (.floor) on
// an ndarray, given a destination array, an origin array, an intercept value
// and a slope
const linearTransformationCwise = cwise({
  args: ['array', 'array', 'scalar', 'scalar'],
  body: (valueDest, valueOrig, intercept, slope) => {
    valueDest = Math.floor((valueOrig - intercept) / slope);
  }
});

export default function convertFloatDataToInteger (imageDataView, metaData) {
  const intRange = Math.pow(2, 16); // 65536
  const floatMin = metaData.minPixelValue;
  const floatMax = metaData.maxPixelValue;
  const floatRange = floatMax - floatMin;
  const slope = floatRange === 0 ? 1 : (floatRange / intRange);
  const intercept = floatMin;

  // creates a Uint16Array ndarray to hold the converted pixel data
  const convertedImageDataView = ndarray(
    new Uint16Array(imageDataView.data.length),
    imageDataView.shape,
    imageDataView.stride
  );

  // converts from float to int, scaling each with a linear linearTransformation
  linearTransformationCwise(convertedImageDataView, imageDataView, intercept, slope);

  return {
    convertedImageDataView,
    floatImageDataView: imageDataView,
    OriginalTypedArrayConstructor: metaData.dataType.TypedArrayConstructor,
    metaData: {
      slope,
      intercept,
      minPixelValue: Math.floor(linearTransformation(metaData.minPixelValue, slope, intercept)),
      maxPixelValue: Math.floor(linearTransformation(metaData.maxPixelValue, slope, intercept)),
      minGlobalPixelValue: Math.floor(linearTransformation(metaData.minPixelValue, slope, intercept)),
      maxGlobalPixelValue: Math.floor(linearTransformation(metaData.maxPixelValue, slope, intercept)),
      dataType: {
        TypedArrayConstructor: Uint16Array,
        isDataInFloat: true,
        isDataInColors: metaData.dataType.isDataInColors
      }
    }
  };
}
