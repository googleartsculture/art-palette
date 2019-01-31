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
 * @fileoverview A small collection of array utilities.
 */

const arrayUtils = {};

/**
 * Does a shallow copy of an array.
 * @param {IArrayLike<T>|string} arr Array or array-like object to clone.
 * @return {!Array<T>} Clone of the input array.
 */
arrayUtils.clone = function(arr) {
  var length = arr.length;
  if (length > 0) {
    var rv = new Array(length);
    for (var i = 0; i < length; i++) {
      rv[i] = arr[i];
    }
    return rv;
  }
  return [];
};

/**
 * Returns an array consisting of the given value repeated N times.
 * @param {VALUE} value The value to repeat.
 * @param {number} n The repeat count.
 * @return {!Array<VALUE>} An array with the repeated value.
 */
arrayUtils.repeat = function(value, n) {
  var array = [];
  for (var i = 0; i < n; i++) {
    array[i] = value;
  }
  return array;
};
