#!/bin/bash

# Convert SVG to different PNG sizes
convert -background none -size 16x16 icons/icon.svg icons/icon16.png
convert -background none -size 48x48 icons/icon.svg icons/icon48.png
convert -background none -size 128x128 icons/icon.svg icons/icon128.png
