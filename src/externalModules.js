/* eslint import/extensions:0 */
import nifti from 'nifti-reader-js';
import registerLoaders from './imageLoader/registerLoaders.js';

let cornerstone = window.cornerstone;
let niftiReaderJs = nifti;

const external = {
  set cornerstone (cs) {
    cornerstone = cs;

    registerLoaders(cornerstone);
  },
  get cornerstone () {
    return cornerstone;
  },
  set niftiReader (nr) {
    niftiReaderJs = nr;
  },
  get niftiReader () {
    return niftiReaderJs;
  }
};

export { external };
