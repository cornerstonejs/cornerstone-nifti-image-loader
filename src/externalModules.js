/* eslint import/extensions:0 */
import * as niftiReader from 'nifti-reader-js';
import registerLoaders from './imageLoader/registerLoaders.js';

console.dir(niftiReader);

let cornerstone;

const external = {
  set cornerstone (cs) {
    cornerstone = cs;

    registerLoaders(cornerstone);
  },
  get cornerstone () {
    return cornerstone;
  }
};

export { niftiReader, external };
