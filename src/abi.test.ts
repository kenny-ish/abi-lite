import { test } from "node:test";
import assert from "node:assert/strict";
import { decode, encode } from "./abi.ts";

const w = (hex: string) => hex.padStart(64, "0");

test("uint256 and int256", () => {
  assert.equal(encode(["uint256"], [1n]), "0x" + w("1"));
  assert.equal(encode(["int256"], [-1n]), "0x" + "f".repeat(64));
  assert.deepEqual(decode(["int8"], "0x" + "f".repeat(64)), [-1n]);
});

test("range checks", () => {
  assert.throws(() => encode(["uint8"], [256n]));
  assert.throws(() => encode(["int8"], [128n]));
  assert.throws(() => encode(["uint256"], [-1n]));
});

test("string uses offset + length + padded data", () => {
  const out = encode(["string"], ["hello"]);
  assert.equal(out, "0x" + w("20") + w("5") + "68656c6c6f".padEnd(64, "0"));
});

test("mixed static and dynamic round trip", () => {
  const types = ["address", "string", "bool", "bytes", "uint64", "bytes4"];
  const addr = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";
  const values = [addr, "gm", true, "0xdeadbeef", 42n, "0xcafebabe"];
  const out = decode(types, encode(types, values));
  assert.equal(out[0], addr);
  assert.equal(out[1], "gm");
  assert.equal(out[2], true);
  assert.deepEqual(out[3], new Uint8Array([0xde, 0xad, 0xbe, 0xef]));
  assert.equal(out[4], 42n);
  assert.deepEqual(out[5], new Uint8Array([0xca, 0xfe, 0xba, 0xbe]));
});

test("empty string encodes as zero length", () => {
  assert.equal(encode(["string"], [""]), "0x" + w("20") + w("0"));
});
