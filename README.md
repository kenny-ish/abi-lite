# abi-lite

An implementation of the Solidity ABI encoding for the common types, written to be read. It fits
scripts where a full web3 library would be too much, and it's a way to see how calldata is laid out.

```ts
import { encode, decode } from "./src/abi.ts";

encode(["address", "uint256"], ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", 10n ** 18n]);
decode(["string", "bool"], "0x...");
```

Supported types: `uint8..uint256`, `int8..int256` (two's complement), `address`, `bool`,
`bytes1..bytes32`, `string` and `bytes`.

Arrays and tuples are not supported. Function selectors need keccak256, which Node's crypto module
doesn't have, so compute the selector elsewhere and prepend the 4 bytes.

## Layout

Every value takes up 32-byte words. Static values are placed in the head in order. For a dynamic
value (`string`, `bytes`) the head holds an offset into the tail, and the tail holds the length
followed by the data, right-padded. The tests have byte-level examples of both.

```bash
npm test
```
