export default class ImageId {
  constructor (filePath, { dimension, index }) {
    this.filePath = filePath;
    this.slice = {
      dimension,
      index
    };
  }

  get url () {
    let url = `nifti:${this.filePath}`;

    if (isDefined(this.slice.dimension) || isDefined(this.slice.index)) {
      url += '#';
    }

    if (isDefined(this.slice.dimension)) {
      url += this.slice.dimension;
      if (isDefined(this.slice.index)) {
        url += '-';
      }
    }

    if (isDefined(this.slice.index)) {
      url += this.slice.index;
    }

    return url;
  }

  static fromURL (url) {
    // nifti:filePath(#(sliceDimension-)?sliceIndex?)?
    // - 'nifti://' is constant and should begin the string
    // - '([^#]+)' is the filePath and it should not contain the '#' symbol
    // - '(?:# ...)?' is the '#' symbol indicating the presence of the
    // slice dimension and/or index. The final ? means this is optional
    // - '([xyz])' is the sliceDimension
    // - '([\d]+)' is the sliceIndex

    const imageIdRegex = /^nifti:([^#]+)(?:#(?:(?=[xyz])(?:([xyz])(?:(?=-[\d]+)-([\d]+))?)|(?![xyz])([\d]+)))?$/;
    const regexResults = imageIdRegex.exec(url);

    if (!regexResults) {
      throw new Error(`Not in a valid imageId format: ${url}`);
    }
    const filePath = regexResults && regexResults[1];
    const dimension = regexResults && regexResults[2] || 'z';
    const index = regexResults && parseInt(regexResults[3] || regexResults[4], 0) || 0;

    return new ImageId(filePath, {
      dimension,
      index
    });
  }
}

function isDefined (value) {
  return typeof value !== 'undefined';
}
