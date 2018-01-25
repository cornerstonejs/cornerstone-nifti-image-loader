import parsedImageId from './parsedImageId.js';

const cache = {};


/**
 * add - Adds a file (id'd by its imageId) and its contents to the cache.
 *
 * @param  {String} imageId                     imageId of the file
 * @param  {ArrayBuffer} fileContents           the file contents
 * @param  {Boolean} shouldParseImageId = false whether the imageId parameter
 * should be parsed for the file path to be extracted
 */
function add (imageId, fileContents, shouldParseImageId = false) {
  const { filePath } = shouldParseImageId ? parsedImageId(imageId) : { filePath: imageId };

  cache[filePath] = fileContents;
}


/**
 * get - Gets the contents of a file (id'd by its imageId).
 *
 * @param  {String} imageId                     imageId of the file
 * @param  {Boolean} shouldParseImageId = false whether the imageId parameter
 * should be parsed for the file path to be extracted
 * @return {ArrayBuffer}                        an array buffer with the
 * file contents
 */
function get (imageId, shouldParseImageId = false) {
  const { filePath } = shouldParseImageId ? parsedImageId(imageId) : { filePath: imageId };

  return cache[filePath];
}


function remove (imageId, shouldParseImageId = false) {
  const { filePath } = shouldParseImageId ? parsedImageId(imageId) : { filePath: imageId };

  delete cache[filePath];
}


function purge () {
  Object.keys(cache).forEach((filePath) => delete cache[filePath]);
}

export default {
  add,
  get,
  remove,
  purge
};
