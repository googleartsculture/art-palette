/*
Copyright 2018 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

/**
 * @fileoverview A small collection of vec3 utilities.
 */

const vec3Utils = {};

/**
 * Performs a component-wise addition of vec0 and vec1 together storing the
 * result into resultVec.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec0 The first addend.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec1 The second addend.
 * @param {!Float32Array|!Float64Array|!Array<number>} resultVec The vector to
 *     receive the result. May be vec0 or vec1.
 * @return {!Float32Array|!Float64Array|!Array<number>} Return resultVec
 * so that operations can be chained together.
 */
vec3Utils.add = function(vec0, vec1, resultVec) {
  resultVec[0] = vec0[0] + vec1[0];
  resultVec[1] = vec0[1] + vec1[1];
  resultVec[2] = vec0[2] + vec1[2];
  return resultVec;
};

/**
 * Multiplies each component of vec0 with scalar storing the product into
 * resultVec.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec0 The source vector.
 * @param {number} scalar The value to multiply with each component of vec0.
 * @param {!Float32Array|!Float64Array|!Array<number>} resultVec The vector to
 *     receive the result. May be vec0.
 * @return {!Float32Array|!Float64Array|!Array<number>} Return resultVec
 * so that operations can be chained together.
 */
vec3Utils.scale = function(vec0, scalar, resultVec) {
  resultVec[0] = vec0[0] * scalar;
  resultVec[1] = vec0[1] * scalar;
  resultVec[2] = vec0[2] * scalar;
  return resultVec;
};

/**
 * Returns the squared distance between two points.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec0 First point.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec1 Second point.
 * @return {number} The squared distance between the points.
 */
vec3Utils.distanceSquared = function(vec0, vec1) {
  var x = vec0[0] - vec1[0];
  var y = vec0[1] - vec1[1];
  var z = vec0[2] - vec1[2];
  return x * x + y * y + z * z;
};

/**
 * Initializes the vector with the given array of values.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec The vector
 * to receive the values.
 * @param {!Float32Array|!Float64Array|!Array<number>} values The array
 * of values.
 * @return {!Float32Array|!Float64Array|!Array<number>} Return vec
 * so that operations can be chained together.
 */
vec3Utils.setFromArray = function(vec, values) {
  vec[0] = values[0];
  vec[1] = values[1];
  vec[2] = values[2];
  return vec;
};

/**
 * Creates a new 3 element Float32 vector initialized with the value from the
 * given array.
 * @param {!Float32Array|!Float64Array|!Array<number>} vec The source 3 element
 * array.
 * @return {!Float32Array} The new 3 element array.
 */
vec3Utils.createFloat32FromArray = function(vec) {
  var newVec = new Float32Array(3);
  vec3Utils.setFromArray(newVec, vec);
  return newVec;
};

/**
 * Creates a clone of the given 3 element Float32 vector.
 * @param {!Float32Array} vec The source 3 element vector.
 * @return {!Float32Array} The new cloned vector.
 */
vec3Utils.cloneFloat32 = vec3Utils.createFloat32FromArray;
