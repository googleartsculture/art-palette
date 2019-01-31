# Palette Extractor

![Palette Extractor](palette_demo_example.jpg?raw=true)

### See the [demo](http://htmlpreview.github.io/?https://github.com/googleartsculture/art-palette/blob/master/palette-extraction/index.html)

The javascript palette extractor returns the palette calculated for an [ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData).

The implementation is largely based on [Palette-Based Photo Recoloring (Chang and al. 2015)](http://gfx.cs.princeton.edu/pubs/Chang_2015_PPR/chang2015-palette_small.pdf), section 3.2.

## Using the library

Draw your image in a canvas and get the `ImageData.data` [Uint8ClampedArray](https://developer.mozilla.org/en-US/docs/Web/API/ImageData) that represents a one-dimensional array containing the data in the RGBA order, with integer values between 0 and 255 (included), using *getImageData*.
Use that data to get the hexadecimal colors palette by simply calling *processImageData* with the expected palette colors count:
```
const data = canvasContext.getImageData(0, 0, canvas.width, canvas.height).data;
const hexPalette = paletteExtractor.processImageData(data, 5);
```
