import parsedImageId from './parsedImageId.js';
import fileLoader from './fileLoader.js';
import createImage from './createImage.js';

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
    const { imagePath, sliceIndex } = parsedImageId(imageId);

    const promise = fileLoader.loadFile(imagePath, imageId).then(
      (data) => createImage(imageId, data, sliceIndex));

    return { promise };
  },
  register (cornerstone) {
    cornerstone.registerImageLoader('nifti', this.loadImage);
  }
};

export default nifti;
