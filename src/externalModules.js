/* eslint import/extensions:0 */
import { enhancedNiftiReader } from './niftiReader';
import registerLoaders from './imageLoader/registerLoaders.js';

let cornerstone = null;
let niftiReaderJs = enhancedNiftiReader;

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
