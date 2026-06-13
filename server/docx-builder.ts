/**
 * Minimal DOCX (OOXML zip) — Word-compatible, no Node Buffer required.
 */

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1;
  }
  return ~c >>> 0;
}

function u16(n: number): number {
  return n & 0xffff;
}

function writeU32LE(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function writeU16LE(view: DataView, offset: number, value: number) {
  view.setUint16(offset, u16(value), true);
}

function concatBytes(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function utf8Bytes(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const f of files) {
    const name = utf8Bytes(f.name);
    const data = f.data;
    const c = crc32(data);
    const local = new Uint8Array(30 + name.length);
    const lv = new DataView(local.buffer);
    writeU32LE(lv, 0, 0x04034b50);
    writeU16LE(lv, 4, 20);
    writeU16LE(lv, 6, 0);
    writeU16LE(lv, 8, 0);
    writeU16LE(lv, 10, 0);
    writeU32LE(lv, 14, c);
    writeU32LE(lv, 18, data.length);
    writeU32LE(lv, 22, data.length);
    writeU16LE(lv, 26, name.length);
    writeU16LE(lv, 28, 0);
    local.set(name, 30);
    parts.push(local, data);

    const cen = new Uint8Array(46 + name.length);
    const cv = new DataView(cen.buffer);
    writeU32LE(cv, 0, 0x02014b50);
    writeU16LE(cv, 4, 20);
    writeU16LE(cv, 6, 20);
    writeU16LE(cv, 8, 0);
    writeU16LE(cv, 10, 0);
    writeU16LE(cv, 12, 0);
    writeU32LE(cv, 16, c);
    writeU32LE(cv, 20, data.length);
    writeU32LE(cv, 24, data.length);
    writeU16LE(cv, 28, name.length);
    writeU16LE(cv, 30, 0);
    writeU16LE(cv, 32, 0);
    writeU16LE(cv, 34, 0);
    writeU16LE(cv, 36, 0);
    writeU32LE(cv, 38, 0);
    writeU32LE(cv, 42, offset);
    cen.set(name, 46);
    central.push(cen);
    offset += local.length + data.length;
  }

  const centralDir = concatBytes(central);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  writeU32LE(ev, 0, 0x06054b50);
  writeU16LE(ev, 4, 0);
  writeU16LE(ev, 6, 0);
  writeU16LE(ev, 8, files.length);
  writeU16LE(ev, 10, files.length);
  writeU32LE(ev, 12, centralDir.length);
  writeU32LE(ev, 16, offset);
  writeU16LE(ev, 20, 0);

  return concatBytes([...parts, centralDir, end]);
}

export function buildDocxFromText(title: string, body: string): Uint8Array {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const paragraphs = body.split("\n").map(
    (line) => `<w:p><w:r><w:t xml:space="preserve">${escape(line)}</w:t></w:r></w:p>`,
  );
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>
<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>${escape(title)}</w:t></w:r></w:p>
${paragraphs.join("")}
<w:sectPr/></w:body></w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  return zipStore([
    { name: "[Content_Types].xml", data: utf8Bytes(contentTypes) },
    { name: "_rels/.rels", data: utf8Bytes(rels) },
    { name: "word/document.xml", data: utf8Bytes(documentXml) },
  ]);
}
