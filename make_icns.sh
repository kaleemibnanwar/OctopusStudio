#!/bin/bash
set -e

SOURCE="$1"
TARGET="$2"

if [ -z "$SOURCE" ] || [ -z "$TARGET" ]; then
    echo "Usage: make_icns.sh <source.png> <target.icns>"
    exit 1
fi

TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT

# Generate the three PNG sizes required
convert "$SOURCE" -resize 256x256 -background none -alpha on -define png:color-type=6 "$TEMP_DIR/ic08.png"
convert "$SOURCE" -resize 512x512 -background none -alpha on -define png:color-type=6 "$TEMP_DIR/ic09.png"
convert "$SOURCE" -resize 1024x1024 -background none -alpha on -define png:color-type=6 "$TEMP_DIR/ic10.png"

# We will collect the blocks
> "$TEMP_DIR/blocks.bin"

for type in ic08 ic09 ic10; do
    PNG_FILE="$TEMP_DIR/${type}.png"
    PNG_SIZE=$(stat -c%s "$PNG_FILE")
    BLOCK_SIZE=$((PNG_SIZE + 8))
    
    # Write 4-byte type
    printf "%s" "$type" >> "$TEMP_DIR/blocks.bin"
    
    # Write 4-byte block size (Big Endian)
    printf "%08x" "$BLOCK_SIZE" | xxd -r -p >> "$TEMP_DIR/blocks.bin"
    
    # Write PNG data
    cat "$PNG_FILE" >> "$TEMP_DIR/blocks.bin"
done

BLOCKS_SIZE=$(stat -c%s "$TEMP_DIR/blocks.bin")
TOTAL_SIZE=$((BLOCKS_SIZE + 8))

# Write ICNS Header
printf "icns" > "$TARGET"
printf "%08x" "$TOTAL_SIZE" | xxd -r -p >> "$TARGET"
cat "$TEMP_DIR/blocks.bin" >> "$TARGET"

echo "Created $TARGET ($TOTAL_SIZE bytes)"
