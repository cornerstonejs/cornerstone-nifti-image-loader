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

  get sizeInBytes () {
    const integerArraySize = this.imageDataNDarray ? this.imageDataNDarray.data.byteLength : 0;
    const floatArraySize = this.floatImageDataView ? this.floatImageDataView.data.byteLength : 0;

    return integerArraySize + floatArraySize;
  }
}
