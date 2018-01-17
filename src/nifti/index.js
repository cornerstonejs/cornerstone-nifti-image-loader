import { niftiReader, external } from '../externalModules.js';
// import Matrix from './matrix.js';
//
// function transformPixelDatum (method, niftiHeader, { i, j, k }, originalValue) {
//   let transformedValue = originalValue;
//
//   switch (method) {
//   case 'method1-simple-scaling':
//     transformedValue = niftiHeader.pixDims[1]
//     break;
//   case 'method2-rotation-scaling-translation':
//   case 'method3-affine-transformation':
//
//   }
//   return transformedValue;
// }
//
// function transformPixelData(method, niftiHeader, niftiImage) {
//   const iLength = niftiHeader.dims[1],
//     jLength = niftiHeader.dims[2],
//     kLength = niftiHeader.dims[3];
//
//   for (let k = 0; k < kLength; k++) {
//     for (let j = 0; j < jLength; j++) {
//       for (let i = 0; i < iLength; i++) {
//         const voxelIndex = i +
//           j * niftiHeader.dims[1] +
//           k * niftiHeader.dims[2] * niftiHeader.dims[1];
//
//         niftiImage[voxelIndex] = transformPixelDatum(
//           method,
//           niftiHeader,
//           {
//             i,
//             j,
//             k
//           }, niftiImage[voxelIndex]);
//       }
//     }
//   }
// }
//
// function getPixelData (niftiHeader, niftiImage) {
//   return function () {
//     const orientationMethods = [
//       'method1-simple-scaling',
//       'method2-rotation-scaling-translation',
//       'method3-affine-transformation'
//     ];
//
//     let orientationMethodUsed = null;
//
//     if (niftiHeader.sform_code > 0) {
//       // method3
//       orientationMethodUsed = orientationMethods[2];
//     } else if (niftiHeader.qform_code > 0) {
//       // method2
//       orientationMethodUsed = orientationMethods[1];
//     } else if (niftiHeader.qform_code === 0) {
//       // arbitraty coordinates, hence using method1 (as in the ANALYZE format)
//       orientationMethodUsed = orientationMethods[0];
//     }
//
//   };
// }

const nifti = {
  loadImage (imageId) {
    const imagePath = imageId.substr('nifti:'.length);
    const imageLoaded = new Promise((resolve, reject) => {
      console.log(`asked to load a nifti image ${imageId} with path ${imagePath}`);

      fetch(imagePath).then((data) => data.arrayBuffer()).then((data) => {
        let niftiHeader = null,
          niftiImage = null;

        if (niftiReader.isCompressed(data)) {
          data = niftiReader.decompress(data);
        }

        if (niftiReader.isNIFTI(data)) {
          niftiHeader = niftiReader.readHeader(data);
          console.log(niftiHeader.toFormattedString());
          console.dir(niftiHeader);
          niftiImage = niftiReader.readImage(niftiHeader, data);
          niftiImage = new Uint8Array(niftiImage);
          console.dir(niftiImage);

          // TODO should we load potential extensions on the nifti file?
          // if (niftiReader.hasExtension(niftiHeader)) {
          //   niftiExt = niftiReader.readExtensionData(niftiHeader, data);
          // }
        }

        // TODO need to check what to do for non-default orientations
        // (ie, when 'qform_code' is different than 0)
        // orientation information: https://brainder.org/2012/09/23/the-nifti-file-format/
        if (niftiHeader.qform_code !== 0) {
          throw new Error('Nifti image uses an unsupported orientation method');
        }

        const cornerstone = external.cornerstone;
        const imageWidth = niftiHeader.dims[1];
        const imageHeight = niftiHeader.dims[2];
        const [, columnPixelDimension, rowPixelDimension] = niftiHeader.pixDims;

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
          // slope: niftiHeader.scl_slope,
          slope: 1, // the file data/avg152T1_LR_nifti.nii has slope 0 and that makes the image not render (just a black canvas)
          width: imageWidth,
          windowCenter: Math.floor((niftiHeader.cal_max + niftiHeader.cal_min) / 2), // unsure about this...
          windowWidth: niftiHeader.cal_max + niftiHeader.cal_min, // unsure
          decodeTimeInMS: 400,
          floatPixelData: undefined,
          getPixelData: () => new Uint8Array(niftiImage),
          render: cornerstone.renderGrayscaleImage
        });
      });

    });


    return { promise: imageLoaded };
  },
  register (cornerstone) {
    cornerstone.registerImageLoader('nifti', this.loadImage);
  }
};

export default nifti;
