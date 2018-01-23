import { external } from '../externalModules.js';
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

    if (niftiReader.isNIFTI(data)) {
      // reads the header with the metadata
      niftiHeader = niftiReader.readHeader(data);
      console.log(niftiHeader.toFormattedString());
      console.dir(niftiHeader);

      // TODO do we need to differentiate among the several intent codes?
      // console.log(niftiHeader.intent_name);

      // reads the image data
      niftiImage = niftiReader.readImage(niftiHeader, data);
      const sliceLength = niftiHeader.dims[1] * niftiHeader.dims[2];
      const sliceByteIndex = sliceIndex * sliceLength;

      // converts the image data into a proper typed array
      // TODO detect which type array should we create here (8bit? 16bit? etc)
      niftiImage = new Uint8Array(niftiImage.slice(sliceByteIndex, sliceByteIndex + sliceLength));
      console.dir(niftiImage);

      // TODO should we load potential extensions on the nifti file? is this necessary?
      // if (niftiReader.hasExtension(niftiHeader)) {
      //   niftiExt = niftiReader.readExtensionData(niftiHeader, data);
      // }
    } else {
      reject(new Error('File is not a nifti?'));
    }

    // TODO need to check what to do for non-default orientations
    // (ie, when 'qform_code' is different than 0)
    // orientation information: https://brainder.org/2012/09/23/the-nifti-file-format/
    // if (niftiHeader.qform_code !== 0) {
    //   throw new Error('Nifti image uses an unsupported orientation method');
    // }

    const cornerstone = external.cornerstone;
    const imageWidth = niftiHeader.dims[1];
    const imageHeight = niftiHeader.dims[2];
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
      color: false,
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
      windowCenter: Math.floor((niftiHeader.cal_max + niftiHeader.cal_min) / 2), // unsure about this...
      windowWidth: niftiHeader.cal_max + niftiHeader.cal_min, // unsure
      decodeTimeInMS: 400,
      floatPixelData: undefined,
      getPixelData: () => new Uint8Array(niftiImage),
      render: cornerstone.renderGrayscaleImage
    });
  });

  return promise;
}
