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
 * @fileoverview Provides an api to get a palette from image pixel data
 * The implementation is largely based on Palette-Based Photo Recoloring [Chang
 * et al. 2015], section 3.2.
 *
 * Here are the main steps to generate a palette from RGB data:
 * 1. Accumulate RGB data (from an image for instance) in a 16x16x16 RGB
 * histogram.
 * 2. Keep track of the average Lab color of every histogram bin.
 * 3. Run K-means on these 4096 Lab colors to create clusters.
 * 4. Create a color palette using the mean colors defined by each cluster.
 */

class PaletteExtractor {
  constructor() {
    /**
     * Histogram bins containing lab values.
     * @private {!Array<!Float32Array>}
     */
    this.labs_ = [];

    /**
     * Weights values for each lab.
     * @private {!Array<!number>}
     */
    this.weights_ = [];

    /**
     * Seeds selected from the histogram.
     * @private {!Array<!Float32Array>}
     */
    this.seeds_ = [];

    /**
     * Weights values for each seed.
     * @private {!Array<!number>}
     */
    this.seedWeights_ = [];
  }

  /**
   * Starts the process to generate a palette from RGB data.
   * @param {!Array<!number>} data pixels colors - extracted from images using
   * canvasContext.getImageData
   * @param {number=} paletteSize (Optional) max number of color to get in
   * palette (5 if not set)
   * @return {!Array<string>} hexadecimal colors
   * @package
   */
  processImageData(data, paletteSize = 5) {
    this.computeHistogramFromImageData_(data);
    this.selectSeeds_(paletteSize);
    this.clusterColors_();
    return this.exportPalette_();
  }

  /**
   * Computes histogram from image data (step 1).
   * @param {!Array<!number>} data
   * @private
   */
  computeHistogramFromImageData_(data) {
    const l = data.length;
    // reset histogram
    this.labs_ = [];
    this.weights_ = arrayUtils.repeat(0, PaletteExtractor.HISTOGRAM_SIZE_);

    for (let i = 0; i < l; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Convert RGB color to Lab.
      const lab = vec3Utils.createFloat32FromArray(this.rgbToLab(r, g, b));
      // Get the index of the corresponding histogram bin.
      const index = (Math.floor(r / 16) * 16 + Math.floor(g / 16)) * 16 +
          Math.floor(b / 16);
      // Add the Lab color to the associated bin.
      if (!(index in this.labs_)) {
        this.labs_[index] = lab;
      } else {
        vec3Utils.add(this.labs_[index], lab, this.labs_[index]);
      }
      // Keep track of the number of colors added to every bin.
      this.weights_[index]++;
    }
  }

  /**
   * Selects seeds in current histogram (step 2).
   * @param {number} nbSeeds
   * @private
   */
  selectSeeds_(nbSeeds) {
    // Reset histogram
    this.seeds_ = [];
    // Local copy of the weight bins to edit during seed selection.
    const mutableWeights = arrayUtils.clone(this.weights_);

    // Iteratively selects seeds as the heaviest bins in mutableWeights.
    // After selecting a seed, attenuates neighboring bin weights to increase
    // color variance.
    let seedColor;
    let maxIndex = 0;
    for (let i = 0; i < nbSeeds; ++i) {
      // Get the index of the heaviest bin.
      maxIndex = this.getHeaviestIndex_(mutableWeights);

      // Check that the selected bin is not empty.
      // Otherwise, it means that the previous seeds already cover all
      // non-empty bins.
      if (mutableWeights[maxIndex] == 0) {
        break;
      }

      // Set the new seed as the heaviest bin.
      seedColor = this.addSeedByIndex_(maxIndex);

      // Force the next seed to be different (unless all bin weights are 0).
      mutableWeights[maxIndex] = 0;

      // Attenuate weights close to the seed to maximize distance between seeds.
      this.attenuateWeightsAroundSeed_(mutableWeights, seedColor);
    }
  }

  /**
   * Runs K-means on histogram from seeds to create clusters (step 3).
   * @private
   */
  clusterColors_() {
    if (!this.seeds_.length) {
      throw Error('Please select seeds before clustering');
    }

    const clusterIndices = arrayUtils.repeat(0, PaletteExtractor.HISTOGRAM_SIZE_);
    let newSeeds = [];
    this.seedWeights_ = [];
    let optimumReached = false;
    let i = 0;
    while (!optimumReached) {
      optimumReached = true;
      newSeeds = [];
      this.seedWeights_ = arrayUtils.repeat(0, this.seeds_.length);
      // Assign every bin of the color histogram to the closest seed.
      for (i = 0; i < PaletteExtractor.HISTOGRAM_SIZE_; i++) {
        if (this.weights_[i] == 0) continue;

        // Compute the index of the seed that is closest to the bin's color.
        const clusterIndex = this.getClosestSeedIndex_(i);
        // Optimum is reached when no cluster assignment changes.
        if (optimumReached && clusterIndex != clusterIndices[i]) {
          optimumReached = false;
        }
        // Assign bin to closest seed.
        clusterIndices[i] = clusterIndex;
        // Accumulate colors and weights per cluster.
        this.addColorToSeed_(newSeeds, clusterIndex, i);
      }
      // Average accumulated colors to get new seeds.
      this.updateSeedsWithNewSeeds_(newSeeds);
    }
  }

  /**
   * Exports palette as hexadecimal colors array from current seeds list (step
   * 4).
   * @return {!Array<string>} hexadecimal colors
   * @private
   */
  exportPalette_() {
    if (!this.seeds_.length) {
      throw Error(
          'Please select seeds and get clusters ' +
          'before exporting a new palette');
    }

    const results = [];

    for (let i = 0; i < this.seeds_.length; i++) {
      const rgb = this.labToRgb(
          this.seeds_[i][0], this.seeds_[i][1], this.seeds_[i][2]);
      results.push(this.rgbToHex(rgb[0], rgb[1], rgb[2]));
    }

    return results;
  }

  /**
   * Attenuates weights close to the seed to maximize distance between seeds.
   * @param {!Array<!number>} mutableWeights
   * @param {!Float32Array} seedColor
   * @private
   */
  attenuateWeightsAroundSeed_(mutableWeights, seedColor) {
    // For photos, we can use a higher coefficient, from 900 to 6400
    const squaredSeparationCoefficient = 3650;

    for (let i = 0; i < PaletteExtractor.HISTOGRAM_SIZE_; i++) {
      if (this.weights_[i] > 0) {
        const targetColor = vec3Utils.createFloat32FromArray([0, 0, 0]);
        vec3Utils.scale(this.labs_[i], 1 / this.weights_[i], targetColor);
        mutableWeights[i] *= 1 -
            Math.exp(
                -vec3Utils.distanceSquared(seedColor, targetColor) /
                squaredSeparationCoefficient);
      }
    }
  }

  /**
   * Pushes a color from the histogram to the seeds list.
   * @param {number} index
   * @return {!Float32Array} seedColor
   * @private
   */
  addSeedByIndex_(index) {
    const seedColor = vec3Utils.createFloat32FromArray([0, 0, 0]);
    vec3Utils.scale(this.labs_[index], 1 / this.weights_[index], seedColor);
    this.seeds_.push(seedColor);
    return seedColor;
  }

  /**
   * Gets heaviest index.
   * @param {!Array<!number>} weights
   * @return {number} index
   * @private
   */
  getHeaviestIndex_(weights) {
    let heaviest = 0;
    let index = 0;
    for (let m = 0; m < PaletteExtractor.HISTOGRAM_SIZE_; m++) {
      if (weights[m] > heaviest) {
        heaviest = weights[m];
        index = m;
      }
    }
    return index;
  }

  /**
   * Accumulates colors and weights per cluster.
   * @param {!Array<!Float32Array>} seeds
   * @param {number} clusterIndex
   * @param {number} histogramIndex
   * @private
   */
  addColorToSeed_(seeds, clusterIndex, histogramIndex) {
    if (!(clusterIndex in seeds)) {
      seeds[clusterIndex] = vec3Utils.createFloat32FromArray([0, 0, 0]);
    }
    vec3Utils.add(
        seeds[clusterIndex], this.labs_[histogramIndex], seeds[clusterIndex]);
    this.seedWeights_[clusterIndex] += this.weights_[histogramIndex];
  }

  /**
   * Updates seeds with average colors using new seed values and seed weights.
   * @param {!Array<!Float32Array>} newSeeds
   * @private
   */
  updateSeedsWithNewSeeds_(newSeeds) {
    for (let i = 0; i < this.seeds_.length; i++) {
      if (!(i in newSeeds)) {
        newSeeds[i] = vec3Utils.createFloat32FromArray([0, 0, 0]);
      }

      if (this.seedWeights_[i] == 0) {
        newSeeds[i] = vec3Utils.createFloat32FromArray([0, 0, 0]);
      } else {
        vec3Utils.scale(newSeeds[i], 1 / this.seedWeights_[i], newSeeds[i]);
      }

      // Update seeds.
      this.seeds_[i] = vec3Utils.cloneFloat32(newSeeds[i]);
    }
  }

  /**
   * Gets the closest seed index for a color in the histogram.
   * @param {number} index in histogram
   * @return {number} seed index
   * @private
   */
  getClosestSeedIndex_(index) {
    const color = vec3Utils.cloneFloat32(this.labs_[index]);
    vec3Utils.scale(color, 1 / this.weights_[index], color);
    let seedDistMin = Number.MAX_SAFE_INTEGER;
    let seedIndex = 0;
    for (let i = 0; i < this.seeds_.length; i++) {
      const dist = vec3Utils.distanceSquared(this.seeds_[i], color);
      if (dist < seedDistMin) {
        seedDistMin = dist;
        seedIndex = i;
      }
    }
    return seedIndex;
  };

  /**
   * Converts color component to hexaminal part.
   * @param {number} c Component color value (r,g or b)
   * @return {string} The hexadecimal converted part
   * @package
   */
  componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? '0' + hex : hex;
  };

  /**
   * Converts a color from RGB to hex representation.
   * @param {number} r Amount of red, int between 0 and 255.
   * @param {number} g Amount of green, int between 0 and 255.
   * @param {number} b Amount of blue, int between 0 and 255.
   * @return {string} hex representation of the color.
   */
  rgbToHex(r, g, b) {
    r = Number(r);
    g = Number(g);
    b = Number(b);
    if (r != (r & 255) || g != (g & 255) || b != (b & 255)) {
      throw Error('"(' + r + ',' + g + ',' + b + '") is not a valid RGB color');
    }
    const hexR = this.componentToHex(r);
    const hexG = this.componentToHex(g);
    const hexB = this.componentToHex(b);
    return '#' + hexR + hexG + hexB;
  };

  /**
   * Converts RGB color values to LAB.
   * @param {!number} r The R value of the color.
   * @param {!number} g The G value of the color.
   * @param {!number} b The B value of the color.
   * @return {!Array<!number>} An array of LAB values in that order.
   */
  rgbToLab(r, g, b) {
    r = r / 255.0;
    g = g / 255.0;
    b = b / 255.0;
    const xyz = this.rgbToXyz(r, g, b);
    return this.xyzToLab(xyz[0], xyz[1], xyz[2]);
  }

  /**
   * Converts LAB color values to RGB.
   * @param {!number} lValue The L value of the color.
   * @param {!number} a The A value of the color.
   * @param {!number} b The B value of the color.
   * @return {!Array<!number>} An array of RGB values in that order.
   */
  labToRgb(lValue, a, b) {
    const xyz = this.labToXyz(lValue, a, b);
    const rgb = this.xyzToRgb(xyz[0], xyz[1], xyz[2]);
    return [
      Math.min(255, Math.max(0, Math.round(rgb[0] * 255))),
      Math.min(255, Math.max(0, Math.round(rgb[1] * 255))),
      Math.min(255, Math.max(0, Math.round(rgb[2] * 255)))
    ];
  }

  /**
   * Converts XYZ color values to RGB.
   * Formula for conversion found at:
   * http://www.easyrgb.com/index.php?X=MATH&H=01#text1
   * @param {!number} x The X value of the color.
   * @param {!number} y The Y value of the color.
   * @param {!number} z The Z value of the color.
   * @return {!Array<!number>} An array of RGB values in that order.
   */
  xyzToRgb(x, y, z) {
    x = x / 100.0;
    y = y / 100.0;
    z = z / 100.0;
    let r = x * 3.2406 + y * -1.5372 + z * -0.4986;
    let g = x * -0.9689 + y * 1.8758 + z * 0.0415;
    let b = x * 0.0557 + y * -0.2040 + z * 1.0570;
    if (r > 0.0031308) {
      r = 1.055 * Math.pow(r, 1 / 2.4) - .055;
    } else {
      r = 12.92 * r;
    }
    if (g > 0.0031308) {
      g = 1.055 * Math.pow(g, 1 / 2.4) - .055;
    } else {
      g = 12.92 * g;
    }
    if (b > 0.0031308) {
      b = 1.055 * Math.pow(b, 1 / 2.4) - .055;
    } else {
      b = 12.92 * b;
    }
    return [r, g, b];
  }

  /**
   * Converts LAB color values to XYZ.
   * Formula for conversion found at:
   * http://www.easyrgb.com/index.php?X=MATH&H=08#text8
   * @param {!number} lValue The L value of the color.
   * @param {!number} a The A value of the color.
   * @param {!number} b The B value of the color.
   * @return {!Array<!number>} An array of XYZ values in that order.
   */
  labToXyz(lValue, a, b) {
    const p = (lValue + 16) / 116;
    return [
      PaletteExtractor.REF_X * Math.pow(p + a / 500, 3),
      PaletteExtractor.REF_Y * Math.pow(p, 3),
      PaletteExtractor.REF_Z * Math.pow(p - b / 200, 3)
    ];
  }

  /**
   * Converts XYZ color values to LAB.
   * Formula for conversion found at:
   * http://www.easyrgb.com/index.php?X=MATH&H=07#text7
   * @param {!number} x The X value of the color.
   * @param {!number} y The Y value of the color.
   * @param {!number} z The Z value of the color.
   * @return {!Array<!number>} An array of LAB values in that order.
   */
  xyzToLab(x, y, z) {
    const xRatio = x / PaletteExtractor.REF_X;
    const yRatio = y / PaletteExtractor.REF_Y;
    const zRatio = z / PaletteExtractor.REF_Z;
    return [
      yRatio > 0.008856 ? 116 * Math.pow(yRatio, 1.0 / 3) - 16 : 903.3 * yRatio,
      500 * (this.transformation(xRatio) - this.transformation(yRatio)),
      200 * (this.transformation(yRatio) - this.transformation(zRatio))
    ];
  }

  /**
   * Converts RGB color values to XYZ.
   * Formula for conversion found at:
   * http://www.easyrgb.com/index.php?X=MATH&H=02#text2
   * @param {!number} r The R value of the color.
   * @param {!number} g The G value of the color.
   * @param {!number} b The B value of the color.
   * @return {!Array<!number>} An array of XYZ values in that order.
   */
  rgbToXyz(r, g, b) {
    if (r > 0.04045) {
      r = Math.pow((r + .055) / 1.055, 2.4);
    } else {
      r = r / 12.92;
    }
    if (g > 0.04045) {
      g = Math.pow((g + .055) / 1.055, 2.4);
    } else {
      g = g / 12.92;
    }
    if (b > 0.04045) {
      b = Math.pow((b + .055) / 1.055, 2.4);
    } else {
      b = b / 12.92;
    }
    r = r * 100;
    g = g * 100;
    b = b * 100;
    return [
      r * 0.4124 + g * 0.3576 + b * 0.1805,
      r * 0.2126 + g * 0.7152 + b * 0.0722, r * 0.0193 + g * 0.1192 + b * 0.9505
    ];
  }

  /**
   * Transformation function for CIELAB-CIEXYZ conversion. For more info, please
   * see http://en.wikipedia.org/wiki/Lab_color_space#CIELAB-CIEXYZ_conversions
   * @param {!number} t An input to the transformation function.
   * @return {!number} The transformed value.
   */
  transformation(t) {
    if (t > 0.008856) {
      return Math.pow(t, 1.0 / 3);
    }
    return 7.787 * t + 16.0 / 116;
  }
}

/**
 * Total number of cells in the histogram.
 * @private @const @type {number}
 */
PaletteExtractor.HISTOGRAM_SIZE_ = 4096;

/**
 * Reference values for Illuminant D65, a reference for color conversion.
 * @const @type {!number}
 */
PaletteExtractor.REF_X = 95.047;

/**
 * @const @type {!number}
 */
PaletteExtractor.REF_Y = 100;

/**
 * @const @type {!number}
 */
PaletteExtractor.REF_Z = 108.883;


exports = PaletteExtractor;
