export default class Vector3 {

  constructor (array) {
    this.x = array[0];
    this.y = array[1];
    this.z = array[2];
  }

  norm () {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalized () {
    return this.multiply(1 / this.norm());
  }

  add (other) {
    return new Vector3([this.x + other.x, this.y + other.y, this.z + other.z]);
  }

  multiply (scalar) {
    return new Vector3([this.x * scalar, this.y * scalar, this.z * scalar]);
  }

  asArray () {
    return [this.x, this.y, this.z];
  }
}
