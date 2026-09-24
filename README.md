# abi-lite

A readable implementation of the Solidity contract ABI encoding for the common types.
Good for learning how calldata is laid out, or for scripts where pulling in a full web3
library is overkill.

```ts
import { encode, decode } from "./src/abi.ts";

encode(["address", "uint256"], ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", 10n ** 18n]);
decode(["string", "bool"], "0x...");
```

Supported: `uint8..uint256`, `int8..int256` (two's complement), `address`, `bool`,
`bytes1..bytes32`, `string`, `bytes`.

Not supported: arrays and tuples. Function selectors need keccak256, which isn't in Node's
crypto module; compute them elsewhere and prepend the 4 bytes yourself.

## Layout refresher

Every value occupies 32-byte words. Static values sit in the head in order. Dynamic values
(`string`, `bytes`) put an **offset** in the head pointing into the tail, where the length and
the right-padded data live. `encode` builds exactly that; the tests show byte-level examples.

```bash
npm test
```
