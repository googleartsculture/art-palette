# Copyright 2018 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
"""Demo of the palette embedding model.

Tested with Tensorflow version 1.3.0.

Usage example:
$ cd art-palette/palette-embedding/python
$ python palette_embedding.py
"""

import annoy
import numpy as np
from skimage import color
import tensorflow as tf

# Parameters of the embedding model.
MODEL_DIR = '../model'
TAG = tf.saved_model.tag_constants.SERVING
SIGNATURE_KEY = (
    tf.saved_model.signature_constants.DEFAULT_SERVING_SIGNATURE_DEF_KEY)
IN_TENSOR_KEY = tf.saved_model.signature_constants.PREDICT_INPUTS
OUT_TENSOR_KEY = tf.saved_model.signature_constants.PREDICT_OUTPUTS

# Parameters of the palette search index.
EMBEDDING_DIMENSION = 15
NUM_ANNOY_TREES = 10

# Some beautiful 5-color palettes. Each palette string contains 5 RGB colors
# encoded as hexadecimal strings. View the palettes at
# https://artsexperiments.withgoogle.com/artpalette/colors/<encoded_palette>
# where <encoded_palette> is a palette string.
SAMPLE_PALETTES = (
    '85837c-d2d1d0-9b7360-e4e3e2-b5ab98',
    '91928f-204034-a3a7a5-799b7c-3b6b58',
    '989b92-5a5a35-484826-495a42-957253',
    '6e7b54-ededab-484826-495a42-5e4127',
    '747e55-97a377-2c3933-516753-724639',
    'ffffff-d3cac1-ded5cb-171512-100d0a',
    '0f1211-a1b0b3-505c5d-2e3739-6b7e86',
    '17171b-edd97a-58585e-3f3e47-696768',
    '221e22-c9b5a0-28374c-324258-9c836f',
    '1a1e20-5b6457-978758-333e39-a4937c',
    '774d3d-5b6065-8d7357-a59289-4d423b',
    '818788-78371b-3a2c2b-9b8574-565959',
    '171511-2e3117-a2947f-653c22-3c4911',
    'a8a28e-282313-53482b-8a6d45-787f7a',
    '21181a-8e5d35-9e371f-5c3629-c3a07e',
    '9e724f-33473f-a44328-28335a-453033',
    '28292d-39504a-a09268-69473c-2d383c',
    '314435-b27817-455266-9a3c34-bb9e82',
    '283130-a05b3b-33745e-52382f-988d7a',
    '213b41-5d4538-477e92-c0b69e-163a60',
    '9fb6bb-809daa-5b6c90-bbc5c4-4f777b',
    '474961-cab65e-a16f42-5a4b3f-a49885',
    '4b5b7a-c7a614-a03023-464f72-695319',
    '8c7344-9e841e-919c93-3c4438-7f4815',
    '644c2c-edddc6-992c2e-4b3b2d-8a693e',
    'efece5-8aa9af-d7cfbc-5c828c-b9a47e',
    'daae2f-b3a886-b45b1e-745136-c3b05c',
    '342b29-b6996f-5e5743-214440-82462b',
    '947c3c-6f6747-4c3f27-b79f55-879e88',
    'e8e1c8-b79173-bbb69d-f6f3e8-84866d',
    'c1cebd-f9e37c-fbf3dd-f8e8aa-e4e2cf',
    'bea67a-3c5143-d4d2bd-ad7f42-858e81',
    '9c9a95-555864-c2c2bf-b59e70-7e6844',
)


def RgbFromHex(color_hex):
  """Returns a RGB color from a color hex.

  Args:
    color_hex: A string encoding a single color. Example: '8f7358'.

  Returns:
    A RGB color i.e. a 3-int tuple. Example: (143, 115, 88).
  """
  return tuple(int(color_hex[i:i + 2], 16) for i in (0, 2, 4))


def GetPaletteFromString(palette_string):
  """Converts a string to a RGB color palette.

  Args:
    palette_string: A string encoding a color palette with color hexes. The
      expected format is 'color1-color2-color3-color4-color5' with colors
      encoded as hex strings. Example: '8f7358-8e463d-d4d1cc-26211f-f2f0f3'.

  Returns:
    A RGB color palette i.e. a list of RGB colors.
  """
  return [RgbFromHex(color_hex) for color_hex in palette_string.split('-')]


def ConvertPalettesToLab(rgb_palettes):
  """Converts a list of RGB color palettes to the Lab color space.

  Args:
    rgb_palettes: A list of RGB palettes.

  Returns:
    A list of Lab palettes. Lab palettes are a list of Lab colors i.e. a list of
    3-int tuples
  """
  scaled_palettes = np.array(rgb_palettes) / 255.0
  return color.rgb2lab(scaled_palettes)


class PaletteEmbeddingModel(object):
  """Runs a palette embedding model.

  The Euclidean distance between two palette embeddings is a perceptual distance
  between the original palettes. Supports only 5-color palettes. Will produce
  15-dimensional dense embeddings.

  Attributes:
    _sess: A Tensorflow session running the embedding model.
    _in_tensor: The input tensor of the model. Should be fed a Lab color
    palette.
    _out_tensor: The output tensor of the model. Will contain the palette
    embedding.
  """

  def __init__(self):
    """Inits PaletteEmbeddingModel with the demo saved model."""
    self._sess = tf.Session(graph=tf.Graph())
    meta_graph_def = tf.saved_model.loader.load(self._sess, [TAG], MODEL_DIR)
    signature = meta_graph_def.signature_def
    in_tensor_name = signature[SIGNATURE_KEY].inputs[IN_TENSOR_KEY].name
    out_tensor_name = signature[SIGNATURE_KEY].outputs[OUT_TENSOR_KEY].name
    self._in_tensor = self._sess.graph.get_tensor_by_name(in_tensor_name)
    self._out_tensor = self._sess.graph.get_tensor_by_name(out_tensor_name)

  def BatchEmbed(self, palettes):
    """Returns the embedding of a list of color palettes.

    Args:
      palettes: A list of strings each representing a 5-color palette.

    Returns:
      A list of 15-D numpy arrays. The size of the list is equal to the size of
      the input palette list.
    """
    rgb_palettes = [GetPaletteFromString(palette) for palette in palettes]
    lab_palettes = ConvertPalettesToLab(rgb_palettes)
    in_tensors = [lab_palette.flatten() for lab_palette in lab_palettes]
    return self._sess.run(self._out_tensor, {self._in_tensor: in_tensors})

  def Embed(self, palette):
    """Returns the embedding of a single color palette.

    Args:
      palette: A string representing a 5-color palette.

    Returns:
      A 15-D numpy array.
    """
    return self.BatchEmbed([palette])[0]

  def ComputeDistance(self, a, b):
    """Returns a perceptual distance between two palettes.

    Args:
      a: A palette (string).
      b: Another palette (string).

    Returns:
      The distance between the palettes as a float.
    """
    embeddings = self.BatchEmbed([a, b])
    return np.linalg.norm(embeddings[0] - embeddings[1])


class PaletteSearchIndex(object):
  """Data structure for nearest-neighbor search in color palette space.

  Attributes:
    _embedding_model: PaletteEmbeddingModel.
    _index: annoy.AnnoyIndex.
  """

  def __init__(self, embedding_model, palettes):
    """Inits PaletteSearchIndex with a list of color palettes.

    The palette index will compute the nearest neighbors in the input palette
    list.

    Args:
      embedding_model: PaletteEmbeddingModel. The embedding model to use.
      palettes: A list of strings each representing a 5-color palette.
    """
    self._embedding_model = embedding_model
    embeddings = self._embedding_model.BatchEmbed(palettes)
    self._index = annoy.AnnoyIndex(EMBEDDING_DIMENSION, metric='euclidean')
    for i, embedding in enumerate(embeddings):
      self._index.add_item(i, embedding)
    self._index.build(NUM_ANNOY_TREES)

  def GetNearestNeighbors(self, palette, num_neighbors):
    """Return the nearest neighbors of the input palette.

    Will return the index of the nearest palettes in the palette list that was
    used to initialize the PaletteSearchIndex.

    Args:
      palette: A string representing a color palette.
      num_neighbors: The number of neighbors to return.

    Returns:
      A pair of lists. The first list contains the indices of the neighbors. The
      second one contains the distances to the neighbors. Both list are sorted
      by neighbor distance.
    """
    embedding = self._embedding_model.Embed(palette)
    return self._index.get_nns_by_vector(
        embedding, num_neighbors, include_distances=True)


def main():
  print '======================'
  print 'Palette embedding demo'
  print '======================'
  print

  # Load the embedding model
  model = PaletteEmbeddingModel()

  # Compute an abstract embedding of some sample palettes.
  embeddings = model.BatchEmbed(SAMPLE_PALETTES)
  print "Embedding of palette '{}' is {}\n".format(SAMPLE_PALETTES[0],
                                                   embeddings[0])

  # The embedding provides a perceptual distance between palettes.
  sample_distance = model.ComputeDistance(SAMPLE_PALETTES[0],
                                          SAMPLE_PALETTES[1])
  print "Distance between palette '{}' and '{}' is {}\n".format(
      SAMPLE_PALETTES[0], SAMPLE_PALETTES[1], sample_distance)

  # Create an palette search index.
  palette_index = PaletteSearchIndex(model, SAMPLE_PALETTES)

  # Search for the nearest neighbors of a palette.
  palette_query = 'aaaa8f-282313-53482b-8a6d45-787f7a'
  num_neighbors = 10
  indices, distances = palette_index.GetNearestNeighbors(
      palette_query, num_neighbors)
  print "The {} nearest neighbor(s) of palette '{}' are:".format(
      num_neighbors, palette_query)
  for index, distance in zip(indices, distances):
    print "'{0}': {1:.2f}".format(SAMPLE_PALETTES[index], distance)


if __name__ == '__main__':
  main()

