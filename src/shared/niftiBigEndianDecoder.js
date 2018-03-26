import { external } from '../externalModules.js';

export default function decodeNiFTIBigEndian (datatypeCode, imageData) {
  const nifti = external.niftiReader;

  switch (datatypeCode) {

  case nifti.NIFTI1.TYPE_INT16:
  case nifti.NIFTI1.TYPE_UINT16:
    imageData = swap16BitStream(imageData);
    break;

  case nifti.NIFTI1.TYPE_RGB24:
    imageData = swap24BitStream(imageData);
    break;

  case nifti.NIFTI1.TYPE_INT32:
  case nifti.NIFTI1.TYPE_FLOAT32:
  case nifti.NIFTI1.TYPE_UINT32:
    imageData = swap32BitStream(imageData);
    break;

  case nifti.NIFTI1.TYPE_COMPLEX64:
  case nifti.NIFTI1.TYPE_FLOAT64:
  case nifti.NIFTI1.TYPE_INT64:
  case nifti.NIFTI1.TYPE_UINT64:
    imageData = swap64BitStream(imageData);
    break;

  case nifti.NIFTI1.TYPE_FLOAT128:
  case nifti.NIFTI1.TYPE_COMPLEX128:
    imageData = swap128BitStream(imageData);
    break;

  case nifti.NIFTI1.TYPE_COMPLEX256:
    imageData = swap256BitStream(imageData);
    break;
  }

  return imageData;
}

/* eslint no-bitwise: off */
/* eslint no-unused-expressions: off */
function swap16BitStream (typedArray16) {
  for (let i = 0; i < typedArray16.length; i++) {
    typedArray16[i] = swap2Bytes(typedArray16[i]);
  }

  return typedArray16;
}

function swap24BitStream (typedArray24) {
  return typedArray24; // TODO:
}

function swap32BitStream (typedArray32) {
  for (let i = 0; i < typedArray32.length; i++) {
    typedArray32[i] = swap4Bytes(typedArray32[i]);
  }

  return typedArray32;
}

function swap64BitStream (typedArray64) {
  for (let i = 0; i < typedArray64.length; i++) {
    typedArray64[i] = swap8Bytes(typedArray64[i]);
  }

  return typedArray64;
}

function swap128BitStream (typedArray128) {
  return typedArray128; // TODO
}

function swap256BitStream (typedArray256) {
  return typedArray256; // TODO
}

// http://www.yolinux.com/TUTORIALS/Endian-Byte-Order.html
/**
 * // Swap 2 byte, 16 bit values:
 * @param {number} val the value to be swapped
 */
function swap2Bytes (val) {
  return ((((val) >> 8) & 0x00FF) | (((val) << 8) & 0xFF00));
}

// Swap 4 byte, 32 bit values:
function swap4Bytes (val) {
  return (
    (((val) >> 24) & 0x000000FF) | (((val) >> 8) & 0x0000FF00) |
    (((val) << 8) & 0x00FF0000) | (((val) << 24) & 0xFF000000)
  );
}

// Swap 8 byte, 64 bit values:
function swap8Bytes (val) {
  return (
    (((val) >> 56) & 0x00000000000000FF) | (((val) >> 40) & 0x000000000000FF00) |
    (((val) >> 24) & 0x0000000000FF0000) | (((val) >> 8) & 0x00000000FF000000) |
    (((val) << 8) & 0x000000FF00000000) | (((val) << 24) & 0x0000FF0000000000) |
    (((val) << 40) & 0x00FF000000000000) | (((val) << 56) & 0xFF00000000000000)
  );
}
