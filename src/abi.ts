export type Value = bigint | number | boolean | string | Uint8Array;

const WORD = 64; // hex chars per 32-byte word

function isDynamic(type: string): boolean {
  return type === "string" || type === "bytes";
}

function bits(type: string, prefix: string): number {
  const n = type === prefix ? 256 : Number(type.slice(prefix.length));
  if (!Number.isInteger(n) || n < 8 || n > 256 || n % 8) throw new Error(`bad type ${type}`);
  return n;
}

function hexOf(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

function toBytes(v: Value): Uint8Array {
  if (v instanceof Uint8Array) return v;
  if (typeof v === "string" && v.startsWith("0x")) return Buffer.from(v.slice(2), "hex");
  throw new Error("expected Uint8Array or 0x-hex string");
}

function padRight(hex: string): string {
  const len = Math.ceil(hex.length / WORD) * WORD || WORD;
  return hex.padEnd(len, "0");
}

function encodeStatic(type: string, v: Value): string {
  if (type === "address") {
    const s = String(v);
    if (!/^0x[0-9a-fA-F]{40}$/.test(s)) throw new Error(`bad address ${s}`);
    return s.slice(2).toLowerCase().padStart(WORD, "0");
  }
  if (type === "bool") return (v ? "1" : "0").padStart(WORD, "0");
  if (type.startsWith("uint")) {
    const n = BigInt(v as bigint | number);
    if (n < 0n || n >= 1n << BigInt(bits(type, "uint"))) throw new Error(`${n} out of range for ${type}`);
    return n.toString(16).padStart(WORD, "0");
  }
  if (type.startsWith("int")) {
    const b = BigInt(bits(type, "int"));
    const n = BigInt(v as bigint | number);
    if (n < -(1n << (b - 1n)) || n >= 1n << (b - 1n)) throw new Error(`${n} out of range for ${type}`);
    return BigInt.asUintN(256, n).toString(16).padStart(WORD, "0");
  }
  if (/^bytes\d+$/.test(type)) {
    const size = Number(type.slice(5));
    const b = toBytes(v);
    if (size < 1 || size > 32 || b.length !== size) throw new Error(`${type} needs exactly ${size} bytes`);
    return hexOf(b).padEnd(WORD, "0");
  }
  throw new Error(`unsupported type ${type}`);
}

function encodeDynamic(type: string, v: Value): string {
  const data = type === "string" ? Buffer.from(String(v), "utf8") : toBytes(v);
  const body = data.length ? padRight(hexOf(data)) : "";
  return data.length.toString(16).padStart(WORD, "0") + body;
}

export function encode(types: string[], values: Value[]): string {
  if (types.length !== values.length) throw new Error("types/values length mismatch");
  let head = "";
  let tail = "";
  const headSize = types.length * 32;
  types.forEach((t, i) => {
    if (isDynamic(t)) {
      head += (headSize + tail.length / 2).toString(16).padStart(WORD, "0");
      tail += encodeDynamic(t, values[i]);
    } else {
      head += encodeStatic(t, values[i]);
    }
  });
  return "0x" + head + tail;
}

export function decode(types: string[], data: string): Value[] {
  const h = data.replace(/^0x/, "");
  const word = (i: number) => h.slice(i * WORD, (i + 1) * WORD);
  return types.map((t, i) => {
    const w = word(i);
    if (isDynamic(t)) {
      const off = Number(BigInt("0x" + w)) * 2;
      const len = Number(BigInt("0x" + h.slice(off, off + WORD)));
      const bytes = Buffer.from(h.slice(off + WORD, off + WORD + len * 2), "hex");
      return t === "string" ? bytes.toString("utf8") : new Uint8Array(bytes);
    }
    if (t === "address") return "0x" + w.slice(24);
    if (t === "bool") return BigInt("0x" + w) !== 0n;
    if (t.startsWith("uint")) return BigInt("0x" + w);
    if (t.startsWith("int")) return BigInt.asIntN(bits(t, "int"), BigInt("0x" + w));
    if (/^bytes\d+$/.test(t)) return new Uint8Array(Buffer.from(w.slice(0, Number(t.slice(5)) * 2), "hex"));
    throw new Error(`unsupported type ${t}`);
  });
}
