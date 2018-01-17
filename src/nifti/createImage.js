import { external } from '../externalModules.js';

const canvas = document.createElement('canvas');
let lastImageIdDrawn;

/**
 * creates a cornerstone Image object for the specified Image and imageId
 *
 * @param image - An Image
 * @param imageId - the imageId for this image
 * @returns Cornerstone Image Object
 */
export default function (image, imageId) {
  // extract the attributes we need
  const rows = image.naturalHeight;
  const columns = image.naturalWidth;

  function getPixelData () {
    const imageData = getImageData();


    return imageData.data;
  }

  function getImageData () {
    let context;

    if (lastImageIdDrawn === imageId) {
      context = canvas.getContext('2d');
    } else {
      canvas.height = image.naturalHeight;
      canvas.width = image.naturalWidth;
      context = canvas.getContext('2d');
      context.drawImage(image, 0, 0);
      lastImageIdDrawn = imageId;
    }

    return context.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
  }

  function getCanvas () {
    if (lastImageIdDrawn === imageId) {
      return canvas;
    }

    canvas.height = image.naturalHeight;
    canvas.width = image.naturalWidth;
    const context = canvas.getContext('2d');

    context.drawImage(image, 0, 0);
    lastImageIdDrawn = imageId;

    return canvas;
  }

  // Extract the various attributes we need
  resolve({
    imageId,
    color: false,
    columnPixelSpacing: columnPixelDimension,
    columns: imageWidth,
    height: imageHeight,
    intercept: niftiHeader.scl_inter,
    invert: false,
    minPixelValue: 0,
    maxPixelValue: 255,
    rowPixelSpacing: rowPixelDimension,
    rows: imageHeight,
    sizeInBytes: niftiImage.byteLength,
    slope: niftiHeader.scl_slope,
    width: imageWidth,
    windowCenter: Math.floor((niftiHeader.cal_max + niftiHeader.cal_min) / 2), // unsure about this...
    windowWidth: niftiHeader.cal_max + niftiHeader.cal_min, // unsure
    decodeTimeInMS: 400,
    floatPixelData: undefined,
    getPixelData: () => niftiImage,
    render: cornerstone.renderGrayscaleImage
  });

  // return {
  //   imageId,
  //   minPixelValue: 0,
  //   maxPixelValue: 255,
  //   slope: 1,
  //   intercept: 0,
  //   windowCenter: 128,
  //   windowWidth: 255,
  //   render: external.cornerstone.renderWebImage,
  //   getPixelData,
  //   getCanvas,
  //   getImage: () => image,
  //   rows,
  //   columns,
  //   height: rows,
  //   width: columns,
  //   color: true,
  //   rgba: false,
  //   columnPixelSpacing: undefined,
  //   rowPixelSpacing: undefined,
  //   invert: false,
  //   sizeInBytes: rows * columns * 4
  // };
}
