/**
 * A cache that holds volumes.
 */
export default class VolumeCache {
  constructor () {
    this.volumeEntries = {};
    this.cacheUses = 0;
  }

  add (imageIdObject, volume) {
    const filePath = imageIdObject.filePath;

    // TODO check if the cache is "full", considering some max value
    // if it is, we should discard the VolumeEntry with the smallest
    // lastUseIndex (ie, this is a LRU cache - Least Recently Used)
    this.volumeEntries[filePath] = new VolumeEntry(volume);
  }

  addTimepoint (imageIdObject, timepoint, volume) {
    const filePath = `${imageIdObject.filePath}-t${timepoint}`;

    // TODO check if the cache is "full", considering some max value
    // if it is, we should discard the VolumeEntry with the smallest
    // lastUseIndex (ie, this is a LRU cache - Least Recently Used)
    this.volumeEntries[filePath] = new VolumeEntry(volume);
  }

  get (imageIdObject) {
    const filePath = imageIdObject.filePath;
    const volumeEntry = this.volumeEntries[filePath];

    if (volumeEntry) {
      volumeEntry.lastUseIndex = this.cacheUses++;

      return volumeEntry.volume;
    }
  }

  getTimepoint (imageIdObject, timepoint) {
    const filePath = `${imageIdObject.filePath}-t${timepoint}`;
    const volumeEntry = this.volumeEntries[filePath];

    if (volumeEntry) {
      volumeEntry.lastUseIndex = this.cacheUses++;

      return volumeEntry.volume;
    }
  }
}


/**
 * An entry in the cache.
 */
class VolumeEntry {
  constructor (volume) {
    this.volume = volume;
    this.sizeInBytes = volume.sizeInBytes;
    this.lastUseIndex = -1;
  }
}
