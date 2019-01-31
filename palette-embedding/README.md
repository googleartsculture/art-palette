# Palette Embedding

The palette embedding model is a neural network that projects 5-color palettes into a 15-dimensional space. In this new space, the euclidean distance between embeddings is a perceptual distance between the original color palettes. For instance, mostly red palettes will be close to one another and far from mostly green palettes.

This euclidean space enables efficient nearest-neighbor search in a set of palettes.

## Using the library

The library contains the following classes and a demo showcases how to use these classes.

* The `PaletteEmbeddingModel` class enables embedding color palettes.

* The `PaletteSearchIndex` is a data structure that uses the embedding model for efficient nearest-neighbor search.

