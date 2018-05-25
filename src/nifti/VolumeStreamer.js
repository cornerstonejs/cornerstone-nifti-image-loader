/* eslint class-methods-use-this: off */
/* eslint import/extensions: off */
import { external } from '../externalModules.js';
import Volume from './Volume.js';
import VolumeCache from './VolumeCache.js';
import FileStreamer from './FileStreamer.js';
import flattenNDarray from '../shared/flattenNDarray.js';
import { parseNiftiHeader } from './parseNiftiFile.js';
// import ImageId from './ImageId.js';
import pako from 'pako';
import Events from './events.js';
import ndarray from 'ndarray';

const niftiReader = external.niftiReader;

// private methods symbols
const handleChunk = Symbol('handleChunk');

export default class VolumeStreamer {

  constructor (httpHeaders = {}) {
    this.volumeAssemblerCache = new VolumeCache();
    this.volumePromises = {};
    this.fileStreamer = new FileStreamer({
      headers: httpHeaders
    });
  }

  static getInstance (httpHeaders) {
    if (!VolumeStreamer.instance) {
      VolumeStreamer.instance = new VolumeStreamer(httpHeaders);
    }

    return VolumeStreamer.instance;
  }

  stream (imageIdObject) {
    const volumeAssembler = new VolumeAssembler(imageIdObject);

    this.volumeAssemblerCache.add(imageIdObject, volumeAssembler);

    return new Promise((resolve, reject) => {
      volumeAssembler.resolveSlice = resolve;
      this.fileStreamer.stream(imageIdObject, this[handleChunk].bind(this)).
        catch(reject);
    });
  }

  [handleChunk] (chunk, imageIdObject) {
    const volumeAssembler = this.volumeAssemblerCache.get(imageIdObject);

    volumeAssembler.appendRawChunk(chunk);
  }
}

const dimensionMap = {
  x: 'i',
  y: 'j',
  z: 'k'
};

const appendImageChunk = Symbol('appendImageChunk');
const parseHeader = Symbol('parseHeader');
const createImageBuffer = Symbol('createImageBuffer');
const createSliceDataAvailablePromises = Symbol('createSliceDataAvailablePromises');
const growBuffer = Symbol('growBuffer');

class VolumeAssembler {
  constructor (imageIdObject) {
    this.imageIdObject = imageIdObject;
    this.hasReceivedHeader = false;
    this.header = null;
    this.isCompressed = null;
    this.inflator = new pako.Inflate();
    this.headerRawBuffer = null;
    this.remainderBuffer = null;
    this.HEADER_LENGTH = niftiReader.NIFTI1.STANDARD_HEADER_SIZE;

    Events(this);
  }

  appendRawChunk (chunk) {

    if (this.hasReceivedHeader) {
      this[appendImageChunk](chunk);
    } else {
      this.headerRawBuffer = this[growBuffer](this.headerRawBuffer, chunk);
      if (this.headerRawBuffer.byteLength >= this.HEADER_LENGTH) {
        this[parseHeader]();
        this[createImageBuffer]();

        const sliceDimension = dimensionMap[this.imageIdObject.slice.dimension];
        const sliceIndex = this.imageIdObject.slice.index;

        this.sliceDataAvailablePromises[sliceDimension][sliceIndex].
          then(() => this.resolveSlice(this.getSlice(this.imageIdObject))).
          then();
      }
    }
  }

  getSlice (imageIdObject) {
    let columns = null;
    let rows = null;
    let slicePick = [];

    switch (imageIdObject.slice.dimension) {
    case 'x':
      // falls through
    case 'i':
      columns = this.header.voxelLength[1];
      rows = this.header.voxelLength[2];
      slicePick = [imageIdObject.slice.index, null, null];
      break;
    case 'y':
      // falls through
    case 'j':
      columns = this.header.voxelLength[0];
      rows = this.header.voxelLength[2];
      slicePick = [null, imageIdObject.slice.index, null];
      break;
    case 'z':
      // falls through
    case 'k':
      columns = this.header.voxelLength[0];
      rows = this.header.voxelLength[1];
      slicePick = [null, null, imageIdObject.slice.index];
      break;
    }

    const values = this.dataMatrix.pick(...slicePick);

    return new Promise((resolve) => {
      resolve({
        columns,
        rows,
        values: flattenNDarray(values)
      });
    });
  }

  [appendImageChunk] (chunk) {
    if (this.isCompressed) {
      this.inflator.push(chunk, pako.Z_SYNC_FLUSH);
      chunk = this.inflator.result.buffer;
    }

    if (this.remainderBuffer && this.remainderBuffer.length > 0) {
      chunk = growBuffer(this.remainderBuffer, chunk);
      this.remainderBuffer = null;
    }

    // checks byte alignment of this chunk, considering how many bytes
    // are being used to represent each voxel in this volume
    const remainderBytes = chunk.byteLength % this.header.dataType.TypedArrayConstructor.BYTES_PER_ELEMENT;

    this.remainderBytes = chunk.slice(chunk.byteLength - remainderBytes);
    chunk = chunk.slice(0, chunk.byteLength - remainderBytes);
    chunk = new this.header.dataType.TypedArrayConstructor(chunk);

    this.imageDataBuffer.set(chunk, this.currentImageDataBufferSize);
    this.currentImageDataBufferSize += chunk.length;

    this.emit('imageDataReceived');
  }

  [parseHeader] () {
    this.hasReceivedHeader = true;
    this.isCompressed = niftiReader.isCompressed(this.headerRawBuffer);

    let headerBuffer = this.headerRawBuffer;

    if (this.isCompressed) {
      this.inflator.push(this.headerRawBuffer, pako.Z_SYNC_FLUSH);
      headerBuffer = this.inflator.result.buffer;
    }

    this.header = parseNiftiHeader(headerBuffer);
    this.remainderBuffer = headerBuffer.slice(this.header.header.vox_offset - this.HEADER_LENGTH);
  }

  [createImageBuffer] () {
    const numberOfVoxels = this.header.voxelLength.reduce((accum, dim) => accum * dim, 1);
    const strides = this.header.voxelLength.reduce((strides, _, i, dims) => {
      const previousDimension = dims[i - 1] || 1;
      const previousStride = strides[i - 1] || 1;

      strides.push(previousDimension * previousStride);

      return strides;
    }, []);


    this.currentImageDataBufferSize = 0;
    this.imageDataBuffer = new this.header.dataType.TypedArrayConstructor(numberOfVoxels);
    this.dataMatrix = ndarray(this.imageDataBuffer, this.header.voxelLength, strides);
    this.sliceDataAvailablePromises = this[createSliceDataAvailablePromises](this);
  }

  [createSliceDataAvailablePromises] () {
    const promises = {
      i: [],
      j: [],
      k: []
    };
    const dims = this.header.voxelLength;
    const checkIfKSliceResolved = (k) => (resolve) => {
      this.on('imageDataReceived', () => {
        if (this.currentImageDataBufferSize >= (k + 1) * dims[0] * dims[1]) {
          resolve();
        }
      });
    };

    for (let k = 0; k < dims[2]; k++) {
      promises.k[k] = new Promise(checkIfKSliceResolved(k));
    }

    const promiseForLastKSlice = promises.k[dims[2] - 1];

    for (let j = 0; j < dims[1]; j++) {
      promises.j[j] = promiseForLastKSlice;
    }

    for (let i = 0; i < dims[0]; i++) {
      promises.i[i] = promiseForLastKSlice;
    }

    return promises;
  }

  [growBuffer] (buffer, newChunk) {
    if (!buffer) {
      return newChunk.buffer;
    }

    const tempTypedArray = new Uint8Array(buffer.byteLength + newChunk.byteLength);

    tempTypedArray.set(new Uint8Array(buffer), 0);
    tempTypedArray.set(new Uint8Array(newChunk), buffer.byteLength);

    return tempTypedArray.buffer;
  }
}
