import Slice from './Slice.js';

export default class Volume {
  constructor (metaData, imageDataNDarray, floatImageDataNDarray) {
    this.metaData = metaData;
    this.imageDataNDarray = imageDataNDarray;
    this.floatImageDataNDarray = floatImageDataNDarray;
  }

  slice (imageIdObject) {
    return new Slice(this, imageIdObject);
  }
}
