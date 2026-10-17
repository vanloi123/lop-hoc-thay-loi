/* ==========================================================
   ĐỌC / GHI EXCEL (.xlsx) & CSV — tự viết, không cần thư viện ngoài, chạy cả khi không có mạng
   .xlsx là tệp ZIP chứa các tệp XML: ghi bằng ZIP "store", đọc bằng DecompressionStream("deflate-raw")
   ========================================================== */
export const XL = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder("utf-8");
  const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = u8 => { let c = 0xFFFFFFFF; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

  function zip(files) { // files: [{name, text}]
    const parts = [], central = []; let off = 0;
    for (const f of files) {
      const name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true);
      lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, b) => a + b.length, 0), end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true); end.setUint32(12, cdSize, true); end.setUint32(16, off, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  }
  async function inflateRaw(u8) {
    if (typeof DecompressionStream === "undefined") throw new Error("Trình duyệt quá cũ, không giải nén được. Hãy dùng Chrome hoặc Edge bản mới.");
    const s = new Blob([u8]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }
  async function unzip(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf); let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("Tệp không phải Excel (.xlsx) hợp lệ.");
    const n = dv.getUint16(e + 10, true); let p = dv.getUint32(e + 16, true); const out = new Map();
    for (let k = 0; k < n; k++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), lho = dv.getUint32(p + 42, true);
      const name = dec.decode(u8.subarray(p + 46, p + 46 + nlen));
      const start = lho + 30 + dv.getUint16(lho + 26, true) + dv.getUint16(lho + 28, true), raw = u8.subarray(start, start + csize);
      out.set(name, { method, raw });
      p += 46 + nlen + xlen + clen;
    }
    return { async text(name) { const f = out.get(name); if (!f) return null; return dec.decode(f.method === 8 ? await inflateRaw(f.raw) : f.raw); }, names: [...out.keys()] };
  }

  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");
  const colName = i => { let s = ""; i++; while (i) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; };
  const colIndex = ref => { let n = 0; for (const ch of ref.replace(/\d+/g, "")) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
  const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main", RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

  /* sheets: [{name, rows:[[...]], widths:[..], header:bool, note:bool, list:{col, values}}] */
  function write(sheets) {
    const styles = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="${NS}"><fonts count="4"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><i/><sz val="11"/><color rgb="FF5F6B80"/><name val="Calibri"/></font><font><b/><sz val="13"/><color rgb="FF1F3B63"/><name val="Calibri"/></font></fonts>
<fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F3B63"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF4D6"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="6"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="49" fontId="1" fillId="2" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
<xf numFmtId="49" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="2" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
<xf numFmtId="49" fontId="3" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyFont="1"/>
<xf numFmtId="49" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
    const sheetXml = sh => {
      const rows = sh.rows.map((r, ri) => {
        const style = c => sh.styleOf ? sh.styleOf(ri, c) : sh.header && ri === 0 ? 1 : 2;
        const cells = r.map((v, ci) => v == null || v === "" ? "" : `<c r="${colName(ci)}${ri + 1}" t="inlineStr" s="${style(ci)}"><is><t xml:space="preserve">${esc(v)}</t></is></c>`).join("");
        return `<row r="${ri + 1}"${sh.header && ri === 0 ? ' ht="24" customHeight="1"' : ""}>${cells}</row>`;
      }).join("");
      const cols = (sh.widths || []).map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" style="2" customWidth="1"/>`).join("");
      const pane = sh.header ? `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` : `<sheetViews><sheetView workbookViewId="0"/></sheetViews>`;
      const dv = sh.list ? `<dataValidations count="1"><dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Giá trị không hợp lệ" error="Chỉ nhập Đ hoặc S" sqref="${sh.list.col}2:${sh.list.col}1000"><formula1>"${esc(sh.list.values)}"</formula1></dataValidation></dataValidations>` : "";
      return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="${NS}" xmlns:r="${RNS}">${pane}<sheetFormatPr defaultRowHeight="18"/>${cols ? `<cols>${cols}</cols>` : ""}<sheetData>${rows}</sheetData>${dv}</worksheet>`;
    };
    const files = [
      { name: "[Content_Types].xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
      { name: "_rels/.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
      { name: "xl/workbook.xml", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${NS}" xmlns:r="${RNS}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name.slice(0, 31))}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
      { name: "xl/_rels/workbook.xml.rels", text: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
      { name: "xl/styles.xml", text: styles },
      ...sheets.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml(s) }))
    ];
    return zip(files);
  }

  const parseXml = t => new DOMParser().parseFromString(t, "application/xml");
  const all = (node, tag) => [...node.getElementsByTagNameNS("*", tag)];
  const numText = v => { const n = Number(v); if (!isFinite(n)) return String(v); return Number.isInteger(n) ? String(n) : String(+n.toPrecision(12)).replace(".", ","); };
  async function read(buf) {
    const z = await unzip(buf);
    const wb = await z.text("xl/workbook.xml"); if (!wb) throw new Error("Tệp không phải Excel (.xlsx) hợp lệ.");
    const relsT = await z.text("xl/_rels/workbook.xml.rels"), rels = {};
    if (relsT) all(parseXml(relsT), "Relationship").forEach(r => { let t = r.getAttribute("Target") || ""; t = t.startsWith("/") ? t.slice(1) : "xl/" + t.replace(/^\.\//, ""); rels[r.getAttribute("Id")] = t; });
    const ssT = await z.text("xl/sharedStrings.xml"), shared = [];
    if (ssT) all(parseXml(ssT), "si").forEach(si => shared.push(all(si, "t").filter(t => !t.closest || !t.parentNode || t.parentNode.localName !== "rPh").map(t => t.textContent).join("")));
    const out = [];
    for (const s of all(parseXml(wb), "sheet")) {
      const rid = s.getAttributeNS(RNS, "id") || s.getAttribute("r:id"), path = rels[rid] || `xl/worksheets/sheet${out.length + 1}.xml`;
      const xt = await z.text(path); if (!xt) continue;
      const rows = [];
      all(parseXml(xt), "row").forEach((r, ri) => {
        const rn = (+r.getAttribute("r") || ri + 1) - 1, row = rows[rn] = [];
        all(r, "c").forEach((c, ci) => {
          const ref = c.getAttribute("r"), col = ref ? colIndex(ref) : ci, t = c.getAttribute("t"), v = all(c, "v")[0]?.textContent;
          let val = "";
          if (t === "s") val = shared[+v] ?? "";
          else if (t === "inlineStr") val = all(c, "t").map(x => x.textContent).join("");
          else if (t === "b") val = v === "1" ? "Đ" : "S";
          else if (t === "str" || t === "e") val = v ?? "";
          else if (v != null) val = numText(v);
          row[col] = String(val).trim();
        });
      });
      out.push({ name: s.getAttribute("name") || `Trang ${out.length + 1}`, rows: Array.from(rows, r => Array.from(r || [], x => x ?? "")) });
    }
    return out;
  }

  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    const first = text.split(/\r?\n/)[0] || "", cnt = ch => first.split(ch).length;
    const d = cnt("\t") > 1 ? "\t" : cnt(";") > cnt(",") ? ";" : ",";
    const rows = []; let row = [], cur = "", q = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
      else if (ch === '"') q = true;
      else if (ch === d) { row.push(cur.trim()); cur = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cur.trim()); rows.push(row); row = []; cur = ""; }
      else cur += ch;
    }
    if (cur || row.length) { row.push(cur.trim()); rows.push(row); }
    return rows;
  }
  return { write, read, parseCSV };
})();
