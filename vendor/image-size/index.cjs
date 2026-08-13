"use strict";

const MAX_INPUT_BYTES = 64 * 1024 * 1024;
const MAX_DIMENSION = 100_000;
const MAX_JPEG_SEGMENTS = 4_096;
const disabledTypes = new Set();

function asBytes(input) {
  let bytes;
  if (input instanceof Uint8Array) bytes = input;
  else if (input instanceof ArrayBuffer) bytes = new Uint8Array(input);
  else throw new TypeError("Expected an ArrayBuffer or Uint8Array.");
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_INPUT_BYTES) {
    throw new RangeError(`Image input must contain 1-${MAX_INPUT_BYTES} bytes.`);
  }
  return bytes;
}

function validDimension(value) {
  return Number.isInteger(value) && value > 0 && value <= MAX_DIMENSION;
}

function dimensions(width, height, type) {
  if (!validDimension(width) || !validDimension(height)) {
    throw new RangeError("Image dimensions are missing or outside the supported range.");
  }
  return { width, height, type };
}

function readUInt16BE(bytes, offset) {
  if (offset < 0 || offset + 2 > bytes.length) throw new RangeError("Truncated image header.");
  return bytes[offset] * 256 + bytes[offset + 1];
}

function readUInt16LE(bytes, offset) {
  if (offset < 0 || offset + 2 > bytes.length) throw new RangeError("Truncated image header.");
  return bytes[offset] + bytes[offset + 1] * 256;
}

function readUInt32BE(bytes, offset) {
  if (offset < 0 || offset + 4 > bytes.length) throw new RangeError("Truncated image header.");
  return (
    bytes[offset] * 0x1000000 +
    bytes[offset + 1] * 0x10000 +
    bytes[offset + 2] * 0x100 +
    bytes[offset + 3]
  );
}

function matches(bytes, expected, offset = 0) {
  return expected.every((value, index) => bytes[offset + index] === value);
}

function pngSize(bytes) {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!matches(bytes, signature) || bytes.length < 24) return undefined;
  if (!matches(bytes, [0x49, 0x48, 0x44, 0x52], 12)) {
    throw new TypeError("PNG is missing its leading IHDR chunk.");
  }
  return dimensions(readUInt32BE(bytes, 16), readUInt32BE(bytes, 20), "png");
}

function gifSize(bytes) {
  if (bytes.length < 10) return undefined;
  const header = String.fromCharCode(...bytes.subarray(0, 6));
  if (header !== "GIF87a" && header !== "GIF89a") return undefined;
  return dimensions(readUInt16LE(bytes, 6), readUInt16LE(bytes, 8), "gif");
}

const JPEG_START_OF_FRAME = new Set([
  0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
  0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
]);

function jpegSize(bytes) {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return undefined;
  let cursor = 2;
  for (let step = 0; step < MAX_JPEG_SEGMENTS && cursor < bytes.length; step += 1) {
    while (cursor < bytes.length && bytes[cursor] === 0xff) cursor += 1;
    if (cursor >= bytes.length) break;
    const marker = bytes[cursor];
    cursor += 1;
    if (marker === 0xd9 || marker === 0xda) break;
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    const segmentLength = readUInt16BE(bytes, cursor);
    if (segmentLength < 2 || cursor + segmentLength > bytes.length) {
      throw new RangeError("Invalid JPEG segment length.");
    }
    if (JPEG_START_OF_FRAME.has(marker)) {
      if (segmentLength < 7) throw new RangeError("Truncated JPEG frame header.");
      return dimensions(
        readUInt16BE(bytes, cursor + 5),
        readUInt16BE(bytes, cursor + 3),
        "jpg",
      );
    }
    cursor += segmentLength;
  }
  throw new TypeError("JPEG dimensions were not found within the bounded scan.");
}

function imageSize(input) {
  const bytes = asBytes(input);
  const readers = [
    ["png", pngSize],
    ["gif", gifSize],
    ["jpg", jpegSize],
  ];
  for (const [type, reader] of readers) {
    if (disabledTypes.has(type)) continue;
    const result = reader(bytes);
    if (result) return result;
  }
  throw new TypeError("Unsupported image type. Only PNG, JPEG, and GIF build assets are allowed.");
}

function disableTypes(typesToDisable) {
  if (!Array.isArray(typesToDisable)) throw new TypeError("Expected an array of image types.");
  for (const type of typesToDisable) disabledTypes.add(type);
}

const types = Object.freeze(["png", "gif", "jpg"]);

module.exports = { default: imageSize, disableTypes, imageSize, types };
