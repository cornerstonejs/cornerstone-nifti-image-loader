import { external } from '../externalModules.js';
import decodeNiFTIBigEndian from '../shared/niftiBigEndianDecoder.js';

export function parseNiftiHeader (fileData) {
  const nifti = external.niftiReader;
  // reads the header with the metadata and puts the
  // nifti-reader-js header inside '.header' prop,
  // as we're going to fill in the fileHeader itself
  // with higher level data
  const header = nifti.readHeader(fileData);

  // ensures the sizes are represented using millimeters, if they are not
  ensureUnitInMillimeters(nifti, header);

  // meta data related to value scaling
  const intercept = header.scl_inter;
  // if scl_slope is 0, the nifti specs say it's not defined
  // (then, we default to 1)
  const slope = header.scl_slope === 0 ? 1 : header.scl_slope;

  // meta data related to display window value
  // const windowCenter = (header.cal_max + header.cal_min) / 2;
  const windowWidth = (header.cal_max - header.cal_min);
  const isWindowInfoAbsent = windowWidth === 0;
  const windowMinimumValue = isWindowInfoAbsent ? undefined : header.cal_min;
  const windowMaximumValue = isWindowInfoAbsent ? undefined : header.cal_max;

  // meta data related to the image itself
  const voxelLength = header.dims.slice(1, 4);
  const timeSlices = header.dims[0] > 3 ? header.dims[4] : 1;
  const dataType = {
    TypedArrayConstructor: niftiDatatypeCodeToTypedArray(nifti, header.datatypeCode),
    samplesPerPixel: getSamplesPerPixel(header.dims),
    isDataInFloat: isDataInFloat(nifti, header.datatypeCode),
    isDataInColors: isDataInColors(nifti, header.dims, header.datatypeCode)
  };
  const pixelSpacing = header.pixDims.slice(1, 4);
  const orientationMatrix = getOrientationMatrix(header);
  const orientationString = header.convertNiftiSFormToNEMA(orientationMatrix);

  return {
    slope,
    intercept,
    windowMinimumValue,
    windowMaximumValue,
    isWindowInfoAbsent,
    voxelLength,
    timeSlices,
    dataType,
    pixelSpacing,
    orientationMatrix,
    orientationString,
    header
  };
}

export function parseNiftiFile (fileData, metaData) {
  const nifti = external.niftiReader;

  if (!metaData) {
    metaData = parseNiftiHeader(fileData);
  }

  const TypedArrayConstructor = metaData.dataType.TypedArrayConstructor;
  const arraybuffer = nifti.readImage(metaData.header, fileData);

  // reads the image data using nifti-reader-js and puts it in a typed array
  let imageData = new TypedArrayConstructor(arraybuffer);

  if (!metaData.header.littleEndian) {
    imageData = decodeNiFTIBigEndian(metaData.header.datatypeCode, imageData);
  }

  // determines the meta data that depends on the image data
  return {
    metaData,
    imageData
  };
}

function ensureUnitInMillimeters (nifti, header) {
  /* eslint no-bitwise: off */
  const spatialUnitMask = 0b111;
  let multiplier;

  switch (header.xyzt_units & spatialUnitMask) {
  case nifti.NIFTI1.UNITS_METER:
    multiplier = 1000;
    break;

  case nifti.NIFTI1.UNITS_MICRON:
    multiplier = 1 / 1000;
    break;

  case nifti.NIFTI1.UNITS_MM:
  default:
    // shouldn't do anything... we want units in millimeters
    multiplier = 1;
    break;
  }

  header.pixDims = header.pixDims.map((pixDim, i) => {
    if (i > 0 && i <= header.dims[0]) {
      return pixDim * multiplier;
    }

    return pixDim;
  });

  if (header.affine) {
    header.affine = header.affine.map((row) => row.map((value) => value * multiplier));
  }

  if (header.quatern_b || header.quatern_c || header.quatern_d) {
    header.quatern_b *= multiplier;
    header.quatern_c *= multiplier;
    header.quatern_d *= multiplier;
  }

  if (header.qoffset_x || header.qoffset_y || header.qoffset_z) {
    header.qoffset_x *= multiplier;
    header.qoffset_y *= multiplier;
    header.qoffset_z *= multiplier;
  }
}

function getOrientationMatrix (header) {
  if (header.affine && header.sform_code > 0) {
    return header.affine;
  }

  if (header.qform_code > 0) {
    return header.convertNiftiQFormToNiftiSForm(
      header.quatern_b, header.quatern_c, header.quatern_d,
      header.qoffset_x, header.qoffset_y, header.qoffset_z,
      header.pixDims[1], header.pixDims[2], header.pixDims[3],
      header.pixDims[0]);
  }

  // if there is no orientation in the file, assemble a matrix with the pixDims
  // values on the main diagonal (for compatibility with the Analyze format)
  // and an origin in the center of the image
  const scale = {
    x: header.pixDims[1],
    y: header.pixDims[2],
    z: header.pixDims[3]
  };

  const origin = {
    x: -(scale.x * header.dims[1]) / 2,
    y: -(scale.y * header.dims[2]) / 2,
    z: -(scale.z * header.dims[3]) / 2
  };

  return [
    [scale.x, 0, 0, origin.x],
    [0, scale.y, 0, origin.y],
    [0, 0, scale.z, origin.z],
    [0, 0, 0, 1]
  ];
}

function niftiDatatypeCodeToTypedArray (nifti, datatypeCode) {
  const typedArrayConstructorMap = {
    [nifti.NIFTI1.TYPE_UINT8]: Uint8Array,
    [nifti.NIFTI1.TYPE_UINT16]: Uint16Array,
    [nifti.NIFTI1.TYPE_UINT32]: Uint32Array,
    [nifti.NIFTI1.TYPE_INT8]: Int8Array,
    [nifti.NIFTI1.TYPE_INT16]: Int16Array,
    [nifti.NIFTI1.TYPE_INT32]: Int32Array,
    [nifti.NIFTI1.TYPE_FLOAT32]: Float32Array,
    [nifti.NIFTI1.TYPE_FLOAT64]: Float64Array,
    [nifti.NIFTI1.TYPE_RGB]: Uint8Array,
    [nifti.NIFTI1.TYPE_RGBA]: Uint8Array
  };

  return typedArrayConstructorMap[datatypeCode];
}

function isDataInFloat (nifti, datatypeCode) {
  const isFloatTypeMap = {
    [nifti.NIFTI1.TYPE_UINT8]: false,
    [nifti.NIFTI1.TYPE_UINT16]: false,
    [nifti.NIFTI1.TYPE_UINT32]: false,
    [nifti.NIFTI1.TYPE_INT8]: false,
    [nifti.NIFTI1.TYPE_INT16]: false,
    [nifti.NIFTI1.TYPE_INT32]: false,
    [nifti.NIFTI1.TYPE_FLOAT32]: true,
    [nifti.NIFTI1.TYPE_FLOAT64]: true,
    [nifti.NIFTI1.TYPE_RGB]: false,
    [nifti.NIFTI1.TYPE_RGBA]: false
  };

  return isFloatTypeMap[datatypeCode];
}

function isDataInColors (nifti, dims, datatypeCode) {
  const samplesPerPixel = getSamplesPerPixel(dims);
  const hasColorsMap = {
    [nifti.NIFTI1.TYPE_UINT8]: false,
    [nifti.NIFTI1.TYPE_UINT16]: false,
    [nifti.NIFTI1.TYPE_UINT32]: false,
    [nifti.NIFTI1.TYPE_INT8]: false,
    [nifti.NIFTI1.TYPE_INT16]: false,
    [nifti.NIFTI1.TYPE_INT32]: false,
    [nifti.NIFTI1.TYPE_FLOAT32]: false,
    [nifti.NIFTI1.TYPE_FLOAT64]: false,
    [nifti.NIFTI1.TYPE_RGB]: samplesPerPixel === 3,
    [nifti.NIFTI1.TYPE_RGBA]: samplesPerPixel === 4
  };

  return hasColorsMap[datatypeCode];
}

function getSamplesPerPixel (dims) {
  return dims[0] >= 5 ? dims[5] : 1;
}
