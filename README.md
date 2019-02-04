# Art Palette

[Art Palette](https://artsexperiments.withgoogle.com/artpalette/) is part of [Arts & Culture experiments](https://experiments.withgoogle.com/arts-culture), which explore innovative
ways for users to interact with art collections. With [Art Palette](https://artsexperiments.withgoogle.com/artpalette/), you can
search for artworks that match a color combination of your choice.

[![Art Palette](palette_example.jpg?raw=true)](https://artsexperiments.withgoogle.com/artpalette/)

# Develop

Some elements of the site are not in the repository but it gives you the base code and concepts to build your own efficient search by palette tool.

The source code is separate in two parts :

1. The frontend Javascript code used to extract the color palette from an image.
2. The backend Python code used to find the nearest palettes matching a given one with the palette embedding TensorFlow model.

## Palette Extraction (frontend)

Javascript palette extractor that returns the palette calculated for an [ImageData](https://developer.mozilla.org/en-US/docs/Web/API/ImageData).

## Palette Embedding (backend)

Machine learning model that returns an embedding of color palettes in an Euclidean space that preserves perceptual distance. This embedding enables efficient nearest-neighbor search.

## Contributors

[Etienne Ferrier](https://github.com/EtienneFerrier) and [Simon Doury](https://github.com/voglervoice) with friends at the Google Art & Culture Lab.

## License

Copyright 2018 Google Inc.

Licensed under the Apache License, Version 2.0 (the “License”); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an “AS IS” BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

## Final Thoughts

We encourage open sourcing projects as a way of learning from each other. Please respect our and other creators’ rights, including copyright and trademark rights when present, when sharing these works and creating derivative work. If you want more info on Google's policy, you can find that [here](https://www.google.com/permissions/).

N.B.: *This is not an official Google product.*
