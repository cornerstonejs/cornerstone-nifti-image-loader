/**
 * multiplyMatrixAndPoint - Returns the multiplication of a matrix with a point.
 *
 * @param  {Array} matrix The 4D matrix to multiply the point.
 * @param  {Array} point  The 4D point being multiplied.
 * @return {Array}        The resulting 4D point.
 */
export default function multiplyMatrixAndPoint (matrix, point) {
  // simple variable names to each part of the matrix, a column and row number
  const c0r0 = matrix[0][0],
    c1r0 = matrix[0][1],
    c2r0 = matrix[0][2],
    c3r0 = matrix[0][3];
  const c0r1 = matrix[1][0],
    c1r1 = matrix[1][1],
    c2r1 = matrix[1][2],
    c3r1 = matrix[1][3];
  const c0r2 = matrix[2][0],
    c1r2 = matrix[2][1],
    c2r2 = matrix[2][2],
    c3r2 = matrix[2][3];
  const c0r3 = matrix[3][0],
    c1r3 = matrix[3][1],
    c2r3 = matrix[3][2],
    c3r3 = matrix[3][3];

  // simple names for the point
  const x = point[0];
  const y = point[1];
  const z = point[2];
  const w = point[3] || 1;

  // multiply the point against each part of the 1st column, then add together
  const resultX = (x * c0r0) + (y * c1r0) + (z * c2r0) + (w * c3r0);

  // multiply the point against each part of the 2nd column, then add together
  const resultY = (x * c0r1) + (y * c1r1) + (z * c2r1) + (w * c3r1);

  // multiply the point against each part of the 3rd column, then add together
  const resultZ = (x * c0r2) + (y * c1r2) + (z * c2r2) + (w * c3r2);

  // multiply the point against each part of the 4th column, then add together
  const resultW = (x * c0r3) + (y * c1r3) + (z * c2r3) + (w * c3r3);

  return [resultX, resultY, resultZ, resultW];
}
