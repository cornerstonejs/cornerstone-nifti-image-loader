
export default function parseNiftiFile (nifti, fileData) {
  // reads the header with the metadata and puts the
  // nifti-reader-js header inside '.header' prop,
  // as we're going to fill in the fileHeader itself
  // with higher level data
  const header = nifti.readHeader(fileData);

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
  const [, xLength, yLength, zLength] = header.dims;
  const dataType = {
    TypedArrayConstructor: niftiDatatypeCodeToTypedArray(nifti, header.datatypeCode),
    samplesPerPixel: getSamplesPerPixel(header.dims),
    isDataInFloat: isDataInFloat(nifti, header.datatypeCode),
    isDataInColors: isDataInColors(nifti, header.dims, header.datatypeCode)
  };
  const pixelSpacing = header.pixDims.slice(1, 4);
  const orientationMatrix = getOrientationMatrix(header);

  // reads the image data using nifti-reader-js and puts it in a typed array
  const imageData = new dataType.TypedArrayConstructor(nifti.readImage(header, fileData));

  // determines the meta data that depends on the image data
  return {
    metaData: {
      slope,
      intercept,
      windowMinimumValue,
      windowMaximumValue,
      isWindowInfoAbsent,
      xLength,
      yLength,
      zLength,
      dataType,
      pixelSpacing,
      orientationMatrix,
      header
    },
    imageData
  };
}

function getOrientationMatrix (header) {
  if (header.affine) {
    return header.affine;
  }

  return header.convertNiftiQFormToNiftiSForm(
    header.quatern_b, header.quatern_c, header.quatern_d,
    header.qoffset_x, header.qoffset_y, header.qoffset_z,
    header.pixDims[1], header.pixDims[2], header.pixDims[3],
    header.pixDims[0]);
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
