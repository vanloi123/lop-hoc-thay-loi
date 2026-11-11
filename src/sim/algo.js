/* =====================================================================
   MÔ PHỎNG THUẬT TOÁN PYTHON
   Mỗi thuật toán có mã Python thật và một bộ sinh bước (viết bằng JS, bám đúng từng dòng Python):
   mỗi bước cho biết dòng đang chạy, giá trị các biến, trạng thái danh sách, vị trí các con trỏ,
   và một câu giải thích tiếng Việt. Chế độ "Điền code": chọn đoạn code đúng cho chỗ trống rồi chạy thử.
   ===================================================================== */

const fmtList = a => "[" + a.map(x => (x == null ? "_" : typeof x.v === "string" ? `'${x.v}'` : x.v)).join(", ") + "]";
const clone = a => a.map(x => (x ? { ...x } : null));
const items = arr => arr.map((v, k) => ({ id: k, v }));

/* ---------- các thuật toán ---------- */
const ALGOS = [
  {
    id: "twosum", group: "Hai con trỏ", name: "Tìm cặp có tổng bằng k", big: "O(n)",
    desc: "Trên danh sách đã sắp xếp tăng dần, đặt con trỏ i ở đầu, j ở cuối. Tổng nhỏ quá thì tăng i, lớn quá thì giảm j.",
    input: { arr: [1, 3, 4, 6, 8, 11, 15], target: 14 }, sorted: true, params: ["target"],
    code: (I) => [
      "def tim_cap(a, k):",
      "    i, j = 0, len(a) - 1",
      "    while i < j:",
      "        s = a[i] + a[j]",
      "        if s == k:",
      "            return i, j",
      "        elif s < k:",
      "            i += 1",
      "        else:",
      "            j -= 1",
      "    return None",
      "",
      `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`,
      `print(tim_cap(a, ${I.target}))`
    ],
    blanks: [
      { ln: 3, tok: "i < j", opts: ["i < j", "i <= len(a)", "j < i"], why: { "i <= len(a)": "Hai con trỏ phải dừng khi gặp nhau; điều kiện này cho i chạy quá cuối danh sách.", "j < i": "Lúc đầu i = 0 < j nên vòng lặp không chạy lần nào." } },
      { ln: 8, tok: "i += 1", opts: ["i += 1", "j -= 1", "i -= 1"], why: { "j -= 1": "Tổng đang nhỏ hơn k: giảm j làm tổng nhỏ thêm. Cần tăng i để lấy số lớn hơn.", "i -= 1": "i lùi về trái sẽ lấy số nhỏ hơn và có thể ra ngoài danh sách." } },
      { ln: 10, tok: "j -= 1", opts: ["j -= 1", "i += 1", "j += 1"], why: { "i += 1": "Tổng đang lớn hơn k: tăng i làm tổng lớn thêm. Cần giảm j.", "j += 1": "j đang ở cuối, tăng j sẽ vượt khỏi danh sách." } }
    ],
    *run(I) {
      const a = items(I.arr), k = I.target; const out = [];
      const S = (ln, msg, v = {}, x = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), k, ...v }, out: [...out], ...x });
      yield S(13, `Tạo danh sách a gồm ${a.length} số, đã sắp xếp tăng dần.`, {}, {});
      yield S(14, `Gọi hàm tim_cap(a, ${k}): tìm hai số có tổng bằng ${k}.`);
      let i = 0, j = a.length - 1;
      yield S(2, `Đặt con trỏ i ở đầu (i = 0) và j ở cuối (j = ${j}).`, { i, j }, { ptr: { i, j } });
      while (true) {
        yield S(3, i < j ? `i = ${i} < j = ${j}: hai con trỏ chưa gặp nhau, tiếp tục.` : `i = ${i}, j = ${j}: hai con trỏ đã gặp nhau, dừng vòng lặp.`, { i, j }, { ptr: { i, j } });
        if (!(i < j)) break;
        const s = a[i].v + a[j].v;
        yield S(4, `s = a[${i}] + a[${j}] = ${a[i].v} + ${a[j].v} = ${s}.`, { i, j, s }, { ptr: { i, j }, cmp: [i, j] });
        yield S(5, s === k ? `s = ${s} bằng k = ${k}. Tìm thấy!` : `s = ${s} khác k = ${k}.`, { i, j, s }, { ptr: { i, j }, cmp: [i, j] });
        if (s === k) { out.push(`(${i}, ${j})`); yield S(6, `Trả về vị trí (${i}, ${j}): ${a[i].v} + ${a[j].v} = ${k}.`, { i, j, s }, { ptr: { i, j }, ok: [i, j] }); yield S(14, `In kết quả: (${i}, ${j}).`, {}, { ok: [i, j], end: true }); return; }
        yield S(7, s < k ? `s = ${s} < k = ${k}: tổng còn nhỏ.` : `s = ${s} > k = ${k}: tổng đang lớn.`, { i, j, s }, { ptr: { i, j }, cmp: [i, j] });
        if (s < k) { i++; yield S(8, `Tăng i lên ${i} để lấy số lớn hơn (${a[i].v}).`, { i, j, s }, { ptr: { i, j } }); }
        else { yield S(9, "Vào nhánh else.", { i, j, s }, { ptr: { i, j } }); j--; yield S(10, `Giảm j xuống ${j} để lấy số nhỏ hơn (${a[j].v}).`, { i, j, s }, { ptr: { i, j } }); }
      }
      out.push("None"); yield S(11, "Không có cặp nào, trả về None.", { i, j }); yield S(14, "In kết quả: None.", {}, { end: true });
    }
  },
  {
    id: "reverse", group: "Hai con trỏ", name: "Đảo ngược danh sách", big: "O(n)",
    desc: "Hai con trỏ ở hai đầu, đổi chỗ hai phần tử rồi cùng tiến vào giữa. Chỉ cần đi nửa danh sách.",
    input: { arr: [5, 8, 2, 9, 1, 7] }, params: [],
    code: (I) => ["def dao_nguoc(a):", "    i, j = 0, len(a) - 1", "    while i < j:", "        a[i], a[j] = a[j], a[i]", "        i += 1", "        j -= 1", "    return a", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, "print(dao_nguoc(a))"],
    blanks: [
      { ln: 4, tok: "a[i], a[j] = a[j], a[i]", opts: ["a[i], a[j] = a[j], a[i]", "a[i] = a[j]", "a[j] = a[i]"], why: { "a[i] = a[j]": "Chỉ gán một chiều: giá trị cũ của a[i] bị mất. Python đổi chỗ bằng a[i], a[j] = a[j], a[i].", "a[j] = a[i]": "Chỉ gán một chiều: giá trị cũ của a[j] bị mất." } },
      { ln: 6, tok: "j -= 1", opts: ["j -= 1", "j += 1", "i -= 1"], why: { "j += 1": "j đang ở bên phải, phải tiến dần về giữa (giảm).", "i -= 1": "i vừa tăng lại giảm, i đứng yên, vòng lặp không dừng." } }
    ],
    *run(I) {
      const a = items(I.arr), out = [];
      const S = (ln, msg, v = {}, x = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), ...v }, out: [...out], ...x });
      const done = new Set();
      yield S(9, `Tạo danh sách a gồm ${a.length} phần tử.`);
      yield S(10, "Gọi hàm dao_nguoc(a).");
      let i = 0, j = a.length - 1;
      yield S(2, `Đặt i = 0 (đầu) và j = ${j} (cuối).`, { i, j }, { ptr: { i, j } });
      while (true) {
        yield S(3, i < j ? `i = ${i} < j = ${j}: còn phải đổi chỗ.` : `i = ${i}, j = ${j}: đã tới giữa danh sách, dừng.`, { i, j }, { ptr: { i, j }, ok: [...done] });
        if (!(i < j)) break;
        [a[i], a[j]] = [a[j], a[i]]; done.add(i); done.add(j);
        yield S(4, `Đổi chỗ a[${i}] và a[${j}]: ${a[j].v} ↔ ${a[i].v}.`, { i, j }, { ptr: { i, j }, swap: [i, j], ok: [...done] });
        i++; yield S(5, `Tăng i lên ${i}.`, { i, j }, { ptr: { i, j }, ok: [...done] });
        j--; yield S(6, `Giảm j xuống ${j}.`, { i, j }, { ptr: { i, j }, ok: [...done] });
      }
      a.forEach((_, k) => done.add(k));
      yield S(7, "Trả về danh sách đã đảo ngược.", { i, j }, { ok: [...done] });
      out.push(fmtList(a)); yield S(10, `In ra ${fmtList(a)}.`, {}, { ok: [...done], end: true });
    }
  },
  {
    id: "palin", group: "Hai con trỏ", name: "Kiểm tra chuỗi đối xứng", big: "O(n)",
    desc: "So sánh kí tự đầu với kí tự cuối, rồi tiến hai con trỏ vào giữa. Chỉ cần một cặp khác nhau là không đối xứng.",
    input: { str: "abcba" }, params: ["str"],
    code: (I) => ["def doi_xung(s):", "    i, j = 0, len(s) - 1", "    while i < j:", "        if s[i] != s[j]:", "            return False", "        i += 1", "        j -= 1", "    return True", "", `s = "${I.str}"`, "print(doi_xung(s))"],
    blanks: [
      { ln: 4, tok: "s[i] != s[j]", opts: ["s[i] != s[j]", "s[i] == s[j]", "i != j"], why: { "s[i] == s[j]": "Hai kí tự giống nhau là bình thường; phải trả về False khi chúng KHÁC nhau.", "i != j": "Đây là so sánh vị trí, không phải so sánh kí tự." } },
      { ln: 8, tok: "return True", opts: ["return True", "return False", "return i"], why: { "return False": "Đi hết mà không thấy cặp nào khác nhau thì chuỗi đối xứng, phải trả về True.", "return i": "Hàm cần trả về True hoặc False." } }
    ],
    *run(I) {
      const a = items([...I.str]), out = [];
      const S = (ln, msg, v = {}, x = {}) => ({ ln, msg, a: clone(a), vars: { s: `"${I.str}"`, ...v }, out: [...out], ...x });
      const ok = [];
      yield S(10, `Chuỗi s = "${I.str}" gồm ${a.length} kí tự.`);
      yield S(11, "Gọi hàm doi_xung(s).");
      let i = 0, j = a.length - 1;
      yield S(2, `Đặt i = 0 và j = ${j}.`, { i, j }, { ptr: { i, j } });
      while (true) {
        yield S(3, i < j ? `i = ${i} < j = ${j}: còn cặp kí tự cần so sánh.` : "Hai con trỏ đã gặp nhau.", { i, j }, { ptr: { i, j }, ok: [...ok] });
        if (!(i < j)) break;
        const diff = a[i].v !== a[j].v;
        yield S(4, `So sánh s[${i}] = '${a[i].v}' với s[${j}] = '${a[j].v}': ${diff ? "khác nhau" : "giống nhau"}.`, { i, j }, { ptr: { i, j }, cmp: [i, j], ok: [...ok] });
        if (diff) { out.push("False"); yield S(5, "Có cặp kí tự khác nhau: chuỗi không đối xứng, trả về False.", { i, j }, { ptr: { i, j }, bad: [i, j] }); yield S(11, "In ra False.", {}, { bad: [i, j], end: true }); return; }
        ok.push(i, j);
        i++; yield S(6, `Tăng i lên ${i}.`, { i, j }, { ptr: { i, j }, ok: [...ok] });
        j--; yield S(7, `Giảm j xuống ${j}.`, { i, j }, { ptr: { i, j }, ok: [...ok] });
      }
      out.push("True"); yield S(8, "Mọi cặp đều giống nhau: chuỗi đối xứng, trả về True.", { i, j }, { ok: a.map((_, k) => k) }); yield S(11, "In ra True.", {}, { ok: a.map((_, k) => k), end: true });
    }
  },
  {
    id: "window", group: "Cửa sổ trượt", name: "Tổng lớn nhất của k số liền nhau", big: "O(n)",
    desc: "Cửa sổ rộng k ô trượt dần sang phải: cộng số mới vào, trừ số vừa rời khỏi cửa sổ, không phải cộng lại từ đầu.",
    input: { arr: [2, 1, 5, 1, 3, 2, 9, 1], k: 3 }, params: ["k"],
    code: (I) => ["def tong_lon_nhat(a, k):", "    s = sum(a[:k])", "    best = s", "    for i in range(k, len(a)):", "        s += a[i] - a[i - k]", "        best = max(best, s)", "    return best", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, `print(tong_lon_nhat(a, ${I.k}))`],
    blanks: [
      { ln: 5, tok: "a[i] - a[i - k]", opts: ["a[i] - a[i - k]", "a[i]", "a[i] + a[i - k]"], why: { "a[i]": "Chỉ cộng số mới mà không bỏ số cũ thì cửa sổ cứ dài ra.", "a[i] + a[i - k]": "Số a[i - k] vừa rời cửa sổ phải bị TRỪ đi, không phải cộng thêm." } },
      { ln: 6, tok: "max(best, s)", opts: ["max(best, s)", "min(best, s)", "s"], why: { "min(best, s)": "Đề hỏi tổng LỚN nhất.", "s": "Gán best = s sẽ chỉ giữ tổng của cửa sổ cuối cùng." } }
    ],
    *run(I) {
      const a = items(I.arr), k = Math.min(I.k, a.length), out = [];
      const S = (ln, msg, v = {}, x = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), k, ...v }, out: [...out], ...x });
      yield S(9, `Tạo danh sách a gồm ${a.length} số.`);
      yield S(10, `Gọi tong_lon_nhat(a, ${k}): tìm tổng lớn nhất của ${k} số liền nhau.`);
      let s = a.slice(0, k).reduce((p, x) => p + x.v, 0);
      yield S(2, `Tổng ${k} số đầu tiên: ${a.slice(0, k).map(x => x.v).join(" + ")} = ${s}.`, { s }, { win: [0, k - 1] });
      let best = s, bw = [0, k - 1];
      yield S(3, `best = ${best}.`, { s, best }, { win: [0, k - 1], ok: [0, k - 1] });
      for (let i = k; i < a.length; i++) {
        yield S(4, `i = ${i}: cửa sổ trượt sang phải một ô.`, { s, best, i }, { win: [i - k, i - 1], ptr: { i } });
        s += a[i].v - a[i - k].v;
        yield S(5, `Cộng a[${i}] = ${a[i].v} (vào cửa sổ), trừ a[${i - k}] = ${a[i - k].v} (rời cửa sổ): s = ${s}.`, { s, best, i }, { win: [i - k + 1, i], ptr: { i }, cmp: [i, i - k] });
        const nb = Math.max(best, s);
        if (nb > best) bw = [i - k + 1, i];
        yield S(6, nb > best ? `s = ${s} lớn hơn best = ${best}: cập nhật best = ${nb}.` : `s = ${s} không lớn hơn best = ${best}, giữ nguyên.`, { s, best: nb, i }, { win: [i - k + 1, i], ptr: { i } });
        best = nb;
      }
      yield S(7, `Trả về best = ${best} (các số ${a.slice(bw[0], bw[1] + 1).map(x => x.v).join(", ")}).`, { s, best }, { win: bw, ok: Array.from({ length: bw[1] - bw[0] + 1 }, (_, t) => bw[0] + t) });
      out.push(String(best)); yield S(10, `In ra ${best}.`, {}, { win: bw, end: true });
    }
  },
  {
    id: "linear", group: "Tìm kiếm", name: "Tìm kiếm tuần tự", big: "O(n)",
    desc: "Lần lượt so sánh từng phần tử với giá trị cần tìm, từ đầu đến cuối danh sách.",
    input: { arr: [7, 2, 9, 4, 6, 1], x: 6 }, params: ["x"],
    code: (I) => ["def tim_tuan_tu(a, x):", "    for i in range(len(a)):", "        if a[i] == x:", "            return i", "    return -1", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, `print(tim_tuan_tu(a, ${I.x}))`],
    blanks: [
      { ln: 3, tok: "a[i] == x", opts: ["a[i] == x", "a[i] = x", "i == x"], why: { "a[i] = x": "Dấu = là phép gán. So sánh bằng phải dùng ==.", "i == x": "i là vị trí, x là giá trị cần tìm; phải so sánh a[i] với x." } },
      { ln: 5, tok: "return -1", opts: ["return -1", "return i", "return 0"], why: { "return i": "Ra khỏi vòng lặp nghĩa là không tìm thấy; quy ước trả về -1.", "return 0": "0 là vị trí hợp lệ (phần tử đầu tiên), dễ hiểu nhầm là tìm thấy." } }
    ],
    *run(I) {
      const a = items(I.arr), x = I.x, out = [], seen = [];
      const S = (ln, msg, v = {}, e = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), x, ...v }, out: [...out], ...e });
      yield S(7, `Tạo danh sách a gồm ${a.length} số.`);
      yield S(8, `Gọi hàm tìm số ${x} trong a.`);
      for (let i = 0; i < a.length; i++) {
        yield S(2, `i = ${i}: xét phần tử thứ ${i}.`, { i }, { ptr: { i }, dim: [...seen] });
        const eq = a[i].v === x;
        yield S(3, `a[${i}] = ${a[i].v} ${eq ? "==" : "!="} ${x}.`, { i }, { ptr: { i }, cmp: [i], dim: [...seen] });
        if (eq) { out.push(String(i)); yield S(4, `Tìm thấy ${x} ở vị trí ${i}, trả về ${i}.`, { i }, { ptr: { i }, ok: [i], dim: [...seen] }); yield S(8, `In ra ${i}. Đã so sánh ${i + 1} lần.`, {}, { ok: [i], dim: [...seen], end: true }); return; }
        seen.push(i);
      }
      out.push("-1"); yield S(5, `Không có ${x} trong danh sách, trả về -1.`, {}, { dim: [...seen] }); yield S(8, `In ra -1. Đã so sánh ${a.length} lần.`, {}, { dim: [...seen], end: true });
    }
  },
  {
    id: "binary", group: "Tìm kiếm", name: "Tìm kiếm nhị phân", big: "O(log n)",
    desc: "Trên danh sách đã sắp xếp: so sánh với phần tử ở giữa rồi bỏ đi một nửa. Mỗi bước vùng tìm kiếm còn một nửa.",
    input: { arr: [2, 5, 8, 12, 16, 23, 38, 56, 72], x: 23 }, sorted: true, params: ["x"],
    code: (I) => ["def tim_nhi_phan(a, x):", "    lo, hi = 0, len(a) - 1", "    while lo <= hi:", "        mid = (lo + hi) // 2", "        if a[mid] == x:", "            return mid", "        elif a[mid] < x:", "            lo = mid + 1", "        else:", "            hi = mid - 1", "    return -1", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, `print(tim_nhi_phan(a, ${I.x}))`],
    blanks: [
      { ln: 3, tok: "lo <= hi", opts: ["lo <= hi", "lo < hi", "lo >= hi"], why: { "lo < hi": "Khi lo == hi vẫn còn đúng một phần tử chưa xét; dùng < sẽ bỏ sót nó.", "lo >= hi": "Lúc đầu lo < hi nên vòng lặp không chạy." } },
      { ln: 4, tok: "(lo + hi) // 2", opts: ["(lo + hi) // 2", "(lo + hi) / 2", "lo + hi // 2"], why: { "(lo + hi) / 2": "Phép / cho số thực (ví dụ 3.5), không dùng làm chỉ số được. Dùng // để chia lấy phần nguyên.", "lo + hi // 2": "Phép // được tính trước phép +, nên đây là lo + (hi // 2). Cần có dấu ngoặc." } },
      { ln: 8, tok: "lo = mid + 1", opts: ["lo = mid + 1", "lo = mid", "hi = mid - 1"], why: { "lo = mid": "a[mid] đã được xét rồi; giữ lo = mid có thể làm vòng lặp chạy mãi.", "hi = mid - 1": "a[mid] < x nghĩa là x nằm ở nửa PHẢI; phải dời lo lên, không phải dời hi xuống." } }
    ],
    *run(I) {
      const a = items(I.arr), x = I.x, out = [];
      const S = (ln, msg, v = {}, e = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), x, ...v }, out: [...out], ...e });
      const dimOut = (lo, hi) => a.map((_, k) => k).filter(k => k < lo || k > hi);
      yield S(13, `Tạo danh sách a gồm ${a.length} số đã sắp xếp tăng dần.`);
      yield S(14, `Gọi hàm tìm số ${x} trong a.`);
      let lo = 0, hi = a.length - 1, steps = 0;
      yield S(2, `Vùng tìm kiếm là cả danh sách: lo = 0, hi = ${hi}.`, { lo, hi }, { ptr: { lo, hi }, win: [lo, hi] });
      while (true) {
        yield S(3, lo <= hi ? `lo = ${lo} <= hi = ${hi}: vùng tìm kiếm còn ${hi - lo + 1} phần tử.` : `lo = ${lo} > hi = ${hi}: vùng tìm kiếm rỗng.`, { lo, hi }, { ptr: { lo, hi }, win: lo <= hi ? [lo, hi] : null, dim: dimOut(lo, hi) });
        if (!(lo <= hi)) break;
        const mid = (lo + hi) >> 1; steps++;
        yield S(4, `mid = (${lo} + ${hi}) // 2 = ${mid}.`, { lo, hi, mid }, { ptr: { lo, hi, mid }, win: [lo, hi], dim: dimOut(lo, hi) });
        const v = a[mid].v;
        yield S(5, `a[mid] = a[${mid}] = ${v} ${v === x ? "==" : "!="} ${x}.`, { lo, hi, mid }, { ptr: { lo, hi, mid }, win: [lo, hi], cmp: [mid], dim: dimOut(lo, hi) });
        if (v === x) { out.push(String(mid)); yield S(6, `Tìm thấy ${x} ở vị trí ${mid} sau ${steps} lần so sánh.`, { lo, hi, mid }, { ptr: { mid }, ok: [mid], dim: dimOut(mid, mid) }); yield S(14, `In ra ${mid}. Tìm tuần tự sẽ cần ${mid + 1} lần so sánh.`, {}, { ok: [mid], dim: dimOut(mid, mid), end: true }); return; }
        yield S(7, v < x ? `${v} < ${x}: số cần tìm nằm ở nửa bên phải.` : `${v} > ${x}: số cần tìm nằm ở nửa bên trái.`, { lo, hi, mid }, { ptr: { lo, hi, mid }, win: [lo, hi], cmp: [mid], dim: dimOut(lo, hi) });
        if (v < x) { lo = mid + 1; yield S(8, `Bỏ nửa trái: lo = mid + 1 = ${lo}.`, { lo, hi, mid }, { ptr: { lo, hi }, win: lo <= hi ? [lo, hi] : null, dim: dimOut(lo, hi) }); }
        else { yield S(9, "Vào nhánh else.", { lo, hi, mid }, { ptr: { lo, hi, mid }, win: [lo, hi], dim: dimOut(lo, hi) }); hi = mid - 1; yield S(10, `Bỏ nửa phải: hi = mid - 1 = ${hi}.`, { lo, hi, mid }, { ptr: { lo, hi }, win: lo <= hi ? [lo, hi] : null, dim: dimOut(lo, hi) }); }
      }
      out.push("-1"); yield S(11, `Không có ${x} trong danh sách, trả về -1.`, { lo, hi }, { dim: a.map((_, k) => k) }); yield S(14, "In ra -1.", {}, { end: true });
    }
  },
  {
    id: "bubble", group: "Sắp xếp", name: "Sắp xếp nổi bọt", big: "O(n²)",
    desc: "So sánh từng cặp đứng cạnh nhau, sai thứ tự thì đổi chỗ. Sau mỗi lượt, số lớn nhất \"nổi\" về cuối.",
    input: { arr: [5, 1, 4, 2, 8, 3] }, params: [],
    code: (I) => ["def noi_bot(a):", "    n = len(a)", "    for i in range(n - 1):", "        for j in range(n - 1 - i):", "            if a[j] > a[j + 1]:", "                a[j], a[j + 1] = a[j + 1], a[j]", "    return a", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, "print(noi_bot(a))"],
    blanks: [
      { ln: 4, tok: "n - 1 - i", opts: ["n - 1 - i", "n", "n - 1"], why: { "n": "j chạy tới n - 1 thì a[j + 1] vượt khỏi danh sách (IndexError).", "n - 1": "Chạy được nhưng thừa: i số cuối đã đúng chỗ, không cần so sánh lại." } },
      { ln: 5, tok: "a[j] > a[j + 1]", opts: ["a[j] > a[j + 1]", "a[j] < a[j + 1]", "a[j] > a[j]"], why: { "a[j] < a[j + 1]": "Điều kiện này sắp xếp GIẢM dần.", "a[j] > a[j]": "Một số không bao giờ lớn hơn chính nó, không có lần đổi chỗ nào." } }
    ],
    *run(I) {
      const a = items(I.arr), n = a.length, out = [], sortedTail = [];
      const S = (ln, msg, v = {}, e = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), n, ...v }, out: [...out], ...e, ok: [...sortedTail, ...(e.ok || [])] });
      yield S(9, `Tạo danh sách a gồm ${n} số chưa sắp xếp.`);
      yield S(10, "Gọi hàm noi_bot(a).");
      yield S(2, `n = ${n}.`);
      for (let i = 0; i < n - 1; i++) {
        yield S(3, `Lượt i = ${i}: đưa số lớn nhất còn lại về vị trí ${n - 1 - i}.`, { i });
        for (let j = 0; j < n - 1 - i; j++) {
          yield S(4, `j = ${j}: xét cặp a[${j}] và a[${j + 1}].`, { i, j }, { ptr: { j, "j+1": j + 1 } });
          const gt = a[j].v > a[j + 1].v;
          yield S(5, `${a[j].v} ${gt ? ">" : "<="} ${a[j + 1].v}: ${gt ? "sai thứ tự" : "đúng thứ tự, giữ nguyên"}.`, { i, j }, { ptr: { j, "j+1": j + 1 }, cmp: [j, j + 1] });
          if (gt) { [a[j], a[j + 1]] = [a[j + 1], a[j]]; yield S(6, `Đổi chỗ: ${a[j].v} ↔ ${a[j + 1].v}.`, { i, j }, { ptr: { j, "j+1": j + 1 }, swap: [j, j + 1] }); }
        }
        sortedTail.push(n - 1 - i);
      }
      sortedTail.push(0);
      yield S(7, "Danh sách đã sắp xếp tăng dần, trả về a.");
      out.push(fmtList(a)); yield S(10, `In ra ${fmtList(a)}.`, {}, { end: true });
    }
  },
  {
    id: "selection", group: "Sắp xếp", name: "Sắp xếp chọn", big: "O(n²)",
    desc: "Mỗi lượt tìm số nhỏ nhất trong phần chưa sắp xếp rồi đưa nó về đầu phần đó.",
    input: { arr: [29, 10, 14, 37, 13, 5] }, params: [],
    code: (I) => ["def sap_xep_chon(a):", "    n = len(a)", "    for i in range(n - 1):", "        m = i", "        for j in range(i + 1, n):", "            if a[j] < a[m]:", "                m = j", "        a[i], a[m] = a[m], a[i]", "    return a", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, "print(sap_xep_chon(a))"],
    blanks: [
      { ln: 5, tok: "range(i + 1, n)", opts: ["range(i + 1, n)", "range(n)", "range(i, n - 1)"], why: { "range(n)": "Xét lại cả phần đã sắp xếp sẽ kéo số nhỏ ở đầu ra khỏi chỗ đúng.", "range(i, n - 1)": "Bỏ sót phần tử cuối cùng a[n - 1]." } },
      { ln: 7, tok: "m = j", opts: ["m = j", "m = a[j]", "j = m"], why: { "m = a[j]": "m lưu VỊ TRÍ của số nhỏ nhất, không phải giá trị.", "j = m": "Gán ngược chiều: làm thay đổi biến đếm j của vòng lặp." } }
    ],
    *run(I) {
      const a = items(I.arr), n = a.length, out = [], head = [];
      const S = (ln, msg, v = {}, e = {}) => ({ ln, msg, a: clone(a), vars: { a: fmtList(a), n, ...v }, out: [...out], ...e, ok: [...head, ...(e.ok || [])] });
      yield S(11, `Tạo danh sách a gồm ${n} số chưa sắp xếp.`);
      yield S(12, "Gọi hàm sap_xep_chon(a).");
      yield S(2, `n = ${n}.`);
      for (let i = 0; i < n - 1; i++) {
        yield S(3, `Lượt i = ${i}: tìm số nhỏ nhất trong a[${i}..${n - 1}].`, { i }, { ptr: { i }, win: [i, n - 1] });
        let m = i;
        yield S(4, `Tạm coi a[${i}] = ${a[i].v} là nhỏ nhất: m = ${i}.`, { i, m }, { ptr: { i, m }, win: [i, n - 1] });
        for (let j = i + 1; j < n; j++) {
          yield S(5, `j = ${j}.`, { i, m, j }, { ptr: { i, m, j }, win: [i, n - 1] });
          const lt = a[j].v < a[m].v;
          yield S(6, `a[${j}] = ${a[j].v} ${lt ? "<" : ">="} a[m] = ${a[m].v}.`, { i, m, j }, { ptr: { i, m, j }, cmp: [j, m], win: [i, n - 1] });
          if (lt) { m = j; yield S(7, `Số nhỏ nhất mới ở vị trí m = ${m} (giá trị ${a[m].v}).`, { i, m, j }, { ptr: { i, m, j }, win: [i, n - 1] }); }
        }
        [a[i], a[m]] = [a[m], a[i]]; head.push(i);
        yield S(8, m === i ? `a[${i}] đã là nhỏ nhất, không cần đổi chỗ.` : `Đổi chỗ a[${i}] và a[${m}]: đưa ${a[i].v} về vị trí ${i}.`, { i, m }, { ptr: { i, m }, swap: m === i ? null : [i, m] });
      }
      head.push(n - 1);
      yield S(9, "Danh sách đã sắp xếp, trả về a.");
      out.push(fmtList(a)); yield S(12, `In ra ${fmtList(a)}.`, {}, { end: true });
    }
  },
  {
    id: "insertion", group: "Sắp xếp", name: "Sắp xếp chèn", big: "O(n²)",
    desc: "Giống xếp bài trên tay: rút từng lá, dời các lá lớn hơn sang phải rồi chèn lá đó vào đúng chỗ.",
    input: { arr: [12, 11, 13, 5, 6, 7] }, params: [],
    code: (I) => ["def sap_xep_chen(a):", "    for i in range(1, len(a)):", "        x = a[i]", "        j = i - 1", "        while j >= 0 and a[j] > x:", "            a[j + 1] = a[j]", "            j -= 1", "        a[j + 1] = x", "    return a", "", `a = ${JSON.stringify(I.arr).replace(/,/g, ", ")}`, "print(sap_xep_chen(a))"],
    blanks: [
      { ln: 5, tok: "j >= 0 and a[j] > x", opts: ["j >= 0 and a[j] > x", "a[j] > x", "j >= 0 or a[j] > x"], why: { "a[j] > x": "Thiếu j >= 0: khi j = -1, Python đọc a[-1] (phần tử CUỐI) và chạy sai.", "j >= 0 or a[j] > x": "Dùng or thì vòng lặp vẫn chạy khi j < 0 và dời sai." } },
      { ln: 8, tok: "a[j + 1] = x", opts: ["a[j + 1] = x", "a[j] = x", "a[i] = x"], why: { "a[j] = x": "j đang trỏ vào số nhỏ hơn hoặc bằng x; x phải nằm ngay SAU nó, tức a[j + 1].", "a[i] = x": "Đặt x lại chỗ cũ, không chèn được." } }
    ],
    *run(I) {
      const a = items(I.arr), out = []; let held = null;
      const S = (ln, msg, v = {}, e = {}) => ({ ln, msg, a: clone(a), held: held && { ...held }, vars: { a: fmtList(a.map(t => t || (held ? { v: held.v } : null))), ...v }, out: [...out], ...e });
      yield S(11, `Tạo danh sách a gồm ${a.length} số.`);
      yield S(12, "Gọi hàm sap_xep_chen(a).");
      for (let i = 1; i < a.length; i++) {
        yield S(2, `i = ${i}: phần a[0..${i - 1}] đã có thứ tự, chèn a[${i}] vào.`, { i }, { ptr: { i }, ok: Array.from({ length: i }, (_, k) => k) });
        held = a[i]; a[i] = null;
        yield S(3, `Rút x = ${held.v} ra.`, { i, x: held.v }, { ptr: { i }, ok: Array.from({ length: i }, (_, k) => k) });
        let j = i - 1;
        yield S(4, `j = ${j}.`, { i, x: held.v, j }, { ptr: { i, j } });
        while (true) {
          const cond = j >= 0 && a[j].v > held.v;
          yield S(5, j < 0 ? "j = -1: đã tới đầu danh sách." : `a[${j}] = ${a[j].v} ${cond ? ">" : "<="} x = ${held.v}: ${cond ? "dời sang phải" : "dừng, đã tìm được chỗ chèn"}.`, { i, x: held.v, j }, { ptr: j >= 0 ? { i, j } : { i }, cmp: j >= 0 ? [j] : [] });
          if (!cond) break;
          a[j + 1] = a[j]; a[j] = null;
          yield S(6, `Dời ${a[j + 1].v} sang phải một ô.`, { i, x: held.v, j }, { ptr: { i, j } });
          j--; yield S(7, `j = ${j}.`, { i, x: held.v, j }, { ptr: j >= 0 ? { i, j } : { i } });
        }
        a[j + 1] = held; held = null;
        yield S(8, `Chèn x = ${a[j + 1].v} vào vị trí ${j + 1}.`, { i, x: a[j + 1].v, j }, { ptr: { i }, ok: Array.from({ length: i + 1 }, (_, k) => k) });
      }
      yield S(9, "Danh sách đã sắp xếp, trả về a.", {}, { ok: a.map((_, k) => k) });
      out.push(fmtList(a)); yield S(12, `In ra ${fmtList(a)}.`, {}, { ok: a.map((_, k) => k), end: true });
    }
  }
];

/* ---------- tô màu cú pháp Python ---------- */
const KW = /\b(def|return|while|for|in|if|elif|else|and|or|not|None|True|False|range|len|print|sum|max|min)\b/g;
function hl(line) {
  const esc = line.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  return esc
    .replace(/("[^"]*")/g, '<span class="py-s">$1</span>')
    .replace(/(#.*)$/, '<span class="py-c">$1</span>')
    .replace(KW, m => `<span class="${/^(range|len|print|sum|max|min)$/.test(m) ? "py-b" : "py-k"}">${m}</span>`)
    .replace(/(?<![\w">])(\d+)(?![\w"])/g, '<span class="py-n">$1</span>');
}

const PTR_COL = { i: "#0066ff", j: "#e2600b", lo: "#0066ff", hi: "#e2600b", mid: "#c8317a", m: "#178a41", "j+1": "#e2600b" };

export default function runAlgo(st, g, api) {
  const { h, on, Sfx, FX, toast, hud, Result } = api;
  const root = h("div", { class: "alg" }); st.append(root);
  const list = h("aside", { class: "alg-list", "aria-label": "Chọn thuật toán" });
  const mid = h("section", { class: "alg-mid" });
  const side = h("aside", { class: "alg-side" });
  root.append(list, mid, side);

  let mode = null, algo = ALGOS[0], input = null, steps = [], si = 0, timer = 0, playing = false, speed = 900;
  let fill = null; // { picks: {ln: tok}, tries: {ln: n}, checked: bool }
  let chal = null; // { queue: [ids], idx, right, total, firstTry }

  /* ---------- dữ liệu đầu vào ---------- */
  const defInput = a => JSON.parse(JSON.stringify(a.input));
  function randomInput(a) {
    const I = defInput(a), r = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
    if (I.arr) {
      const n = r(6, 9); let arr = Array.from({ length: n }, () => r(1, 60));
      arr = [...new Set(arr)]; while (arr.length < 6) arr.push(r(61, 99));
      if (a.sorted) arr.sort((x, y) => x - y);
      I.arr = arr;
      if ("target" in I) { const p = r(0, arr.length - 2), q = r(p + 1, arr.length - 1); I.target = Math.random() < .8 ? arr[p] + arr[q] : arr[arr.length - 1] * 3; }
      if ("x" in I) I.x = Math.random() < .8 ? arr[r(0, arr.length - 1)] : 100;
      if ("k" in I) I.k = r(2, 3);
    }
    if ("str" in I) { const words = ["abcba", "radar", "level", "python", "noon", "racecar", "mango", "stats"]; I.str = words[r(0, words.length - 1)]; }
    return I;
  }
  function build() {
    steps = []; const it = algo.run(input); let s; let guard = 0;
    while (!(s = it.next()).done && guard++ < 2000) steps.push(s.value);
    si = 0;
  }

  /* ---------- khung bên trái: danh sách thuật toán ---------- */
  function paintList() {
    const groups = [...new Set(ALGOS.map(a => a.group))];
    list.replaceChildren(h("div", { class: "pcb-th" }, h("b", {}, mode === "fill" ? "Điền code" : "Thuật toán"), h("small", {}, mode === "fill" && chal ? `Bài ${chal.idx + 1}/${chal.queue.length}` : `${ALGOS.length} bài`)),
      ...groups.map(gr => h("div", { class: "alg-grp" }, h("small", {}, gr), ...ALGOS.filter(a => a.group === gr).map(a => {
        const locked = mode === "fill" && chal && a.id !== chal.queue[chal.idx];
        const b = h("button", { class: "alg-it" + (a === algo ? " on" : ""), "data-hit": true, disabled: locked }, h("b", {}, a.name), h("span", {}, a.big));
        on(b, () => { if (a !== algo) select(a); }); return b;
      }))));
  }
  function select(a, keepInput) {
    stop(); algo = a; if (!keepInput) input = defInput(a);
    fill = mode === "fill" ? { picks: {}, tries: {}, wrong: {}, solved: false } : null;
    build(); paintList(); paintAll();
  }

  /* ---------- khung giữa: mô phỏng danh sách ---------- */
  const viz = h("div", { class: "alg-viz" }), msgEl = h("p", { class: "alg-msg", "aria-live": "polite" }), ctrl = h("div", { class: "alg-ctrl" });
  const inputBar = h("div", { class: "alg-input" });
  const cellEls = new Map();
  let lastAlgo = null;
  function paintViz() {
    const s = steps[si]; if (!s) return;
    if (lastAlgo !== algo || viz.dataset.n != s.a.length) { viz.innerHTML = ""; cellEls.clear(); lastAlgo = algo; viz.dataset.n = s.a.length; }
    const n = s.a.length, W = Math.min(84, Math.max(44, Math.floor((viz.clientWidth || 640) / Math.max(n, 1)) - 8)), gap = 8, total = n * (W + gap) - gap;
    const nums = s.a.filter(Boolean).map(x => x.v).filter(v => typeof v === "number"), maxV = Math.max(1, ...nums, s.held?.v || 0);
    const isNum = typeof (s.a.find(Boolean) || s.held || {}).v === "number";
    const left = k => `calc(50% - ${total / 2}px + ${k * (W + gap)}px)`;
    // nền: ô vị trí, chỉ số, vùng cửa sổ
    let base = viz.querySelector(".alg-base"); if (!base) { base = h("div", { class: "alg-base" }); viz.append(base); }
    base.replaceChildren(...s.a.map((_, k) => {
      const inWin = s.win && k >= s.win[0] && k <= s.win[1];
      return h("div", { class: "alg-slot" + (inWin ? " win" : "") + (s.dim?.includes(k) ? " dim" : ""), style: `left:${left(k)};width:${W}px` }, h("small", {}, k));
    }));
    // các phần tử (giữ nguyên phần tử DOM theo id để hoạt ảnh đổi chỗ chạy mượt)
    const seen = new Set();
    s.a.forEach((x, k) => {
      if (!x) return; seen.add(x.id);
      let el = cellEls.get(x.id);
      if (!el) { el = h("div", { class: "alg-cell" }, h("b", {})); viz.append(el); cellEls.set(x.id, el); }
      const hpx = isNum ? 46 + Math.round(x.v / maxV * 110) : 64;
      el.style.left = left(k); el.style.width = W + "px"; el.style.height = hpx + "px"; el.style.bottom = "64px";
      el.firstChild.textContent = typeof x.v === "string" ? x.v : x.v;
      el.className = "alg-cell" + (s.cmp?.includes(k) ? " cmp" : "") + (s.swap?.includes(k) ? " swap" : "") + (s.ok?.includes(k) ? " ok" : "") + (s.bad?.includes(k) ? " bad" : "") + (s.dim?.includes(k) ? " dim" : "") + (!isNum ? " chr" : "");
    });
    // phần tử đang được "cầm" lên (sắp xếp chèn)
    if (s.held) {
      let el = cellEls.get(s.held.id); if (!el) { el = h("div", { class: "alg-cell" }, h("b", {})); viz.append(el); cellEls.set(s.held.id, el); }
      seen.add(s.held.id);
      const hole = s.a.indexOf(null);
      el.style.left = left(hole); el.style.width = W + "px"; el.style.height = 46 + Math.round(s.held.v / maxV * 110) + "px"; el.style.bottom = "236px";
      el.firstChild.textContent = s.held.v; el.className = "alg-cell held";
    }
    cellEls.forEach((el, id) => { if (!seen.has(id)) { el.remove(); cellEls.delete(id); } });
    // con trỏ dưới chỉ số
    let pl = viz.querySelector(".alg-ptrs"); if (!pl) { pl = h("div", { class: "alg-ptrs" }); viz.append(pl); }
    const byIdx = {};
    Object.entries(s.ptr || {}).forEach(([name, k]) => { if (k >= 0 && k < n) (byIdx[k] ||= []).push(name); });
    pl.replaceChildren(...Object.entries(byIdx).map(([k, names]) => h("div", { class: "alg-ptr", style: `left:${left(+k)};width:${W}px` }, ...names.map(nm => h("span", { style: `--pc:${PTR_COL[nm] || "#555"}` }, nm)))));
    msgEl.textContent = s.msg;
    viz.classList.toggle("end", !!s.end);
  }
  function paintCtrl() {
    const b = (ic, lbl, fn, dis, cls = "") => on(h("button", { class: "btn " + cls, "data-hit": true, "aria-label": lbl, title: lbl, disabled: dis, html: ic }), fn);
    ctrl.replaceChildren(
      b('<svg viewBox="0 0 24 24"><path d="M6 5v14M19 5l-9 7 9 7z"/></svg>', "Về đầu", () => { stop(); si = 0; paintStep(); }, si === 0, "icon"),
      b('<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>', "Lùi một bước", () => { stop(); si = Math.max(0, si - 1); paintStep(); }, si === 0, "icon"),
      on(h("button", { class: "btn primary lg alg-play", "data-hit": true }, h("span", { class: "ico", html: playing ? '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4.5v15l12-7.5z"/></svg>' }), playing ? "Tạm dừng" : si >= steps.length - 1 ? "Chạy lại" : "Chạy"), togglePlay),
      b('<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>', "Bước tiếp", () => { stop(); next(); }, si >= steps.length - 1, "icon"),
      b('<svg viewBox="0 0 24 24"><path d="M18 5v14M5 5l9 7-9 7z"/></svg>', "Tới cuối", () => { stop(); si = steps.length - 1; paintStep(); }, si >= steps.length - 1, "icon"),
      h("label", { class: "alg-speed" }, h("small", {}, "Tốc độ"), (() => { const r = h("input", { type: "range", min: 150, max: 1800, step: 50, value: 1950 - speed, "aria-label": "Tốc độ chạy" }); r.addEventListener("input", () => { speed = 1950 - +r.value; }); return r; })()),
      h("span", { class: "alg-stepn" }, `Bước ${si + 1}/${steps.length}`));
  }
  function paintInput() {
    const parts = [];
    if (input.arr) {
      const f = h("input", { type: "text", value: input.arr.join(", "), "aria-label": "Danh sách đầu vào", class: "alg-arr" });
      f.addEventListener("change", () => {
        let arr = f.value.split(/[,\s;]+/).map(Number).filter(v => Number.isFinite(v)).slice(0, 12);
        if (arr.length < 2) { toast("Hãy nhập ít nhất 2 số, cách nhau bởi dấu phẩy.", 2200); f.value = input.arr.join(", "); return; }
        if (algo.sorted) { const was = arr.join(); arr.sort((x, y) => x - y); if (arr.join() !== was) toast("Thuật toán này cần danh sách đã sắp xếp, máy đã sắp xếp lại giúp em.", 2600); }
        input.arr = arr; rebuild();
      });
      parts.push(h("label", {}, h("small", {}, "a ="), f));
    }
    if ("str" in input) { const f = h("input", { type: "text", value: input.str, maxLength: 12, class: "alg-arr" }); f.addEventListener("change", () => { input.str = f.value.replace(/[^\p{L}\d]/gu, "").slice(0, 12) || "abba"; rebuild(); }); parts.push(h("label", {}, h("small", {}, "s ="), f)); }
    algo.params.filter(p => p !== "str").forEach(p => { const f = h("input", { type: "number", value: input[p], class: "alg-num" }); f.addEventListener("change", () => { input[p] = +f.value || 0; if (p === "k") input.k = Math.max(1, Math.min(input.k, input.arr.length)); rebuild(); }); parts.push(h("label", {}, h("small", {}, p + " ="), f)); });
    parts.push(on(h("button", { class: "btn sm", "data-hit": true }, "Dữ liệu ngẫu nhiên"), () => { input = randomInput(algo); rebuild(); }));
    inputBar.replaceChildren(...parts);
  }
  function rebuild() { stop(); build(); paintAll(); }

  /* ---------- khung phải: mã Python, biến, kết quả ---------- */
  const codeEl = h("pre", { class: "alg-code", "aria-label": "Mã Python" }), varsEl = h("div", { class: "alg-vars" }), outEl = h("pre", { class: "alg-out" });
  function paintCode() {
    const s = steps[si], lines = algo.code(input);
    codeEl.replaceChildren(...lines.map((t, k) => {
      const ln = k + 1, bl = fill && algo.blanks.find(b => b.ln === ln);
      const row = h("div", { class: "cl" + (s && s.ln === ln && (!fill || fill.solved) ? " cur" : "") }, h("i", {}, ln));
      if (bl) {
        const [pre, post] = t.split(bl.tok), pick = fill.picks[ln], state = fill.wrong[ln] ? "bad" : pick && fill.solved ? "ok" : "";
        const span = h("span", { class: "code" });
        span.innerHTML = hl(pre);
        const blank = on(h("button", { class: "blank " + state + (fill.open === ln ? " open" : ""), "data-hit": true }, pick || "  ?  "), () => { fill.open = ln; paintSide(); });
        span.append(blank); const tail = h("span", {}); tail.innerHTML = hl(post); span.append(tail);
        row.append(span);
      } else { const span = h("span", { class: "code" }); span.innerHTML = hl(t) || " "; row.append(span); }
      return row;
    }));
    codeEl.querySelector(".cl.cur")?.scrollIntoView({ block: "nearest" });
  }
  let prevVars = {};
  function paintVars() {
    const s = steps[si]; if (!s) return;
    const v = s.vars || {};
    varsEl.replaceChildren(h("small", {}, "Biến"), h("div", { class: "alg-vgrid" }, Object.entries(v).map(([k, val]) => h("div", { class: "alg-var" + (prevVars[k] !== undefined && String(prevVars[k]) !== String(val) ? " chg" : "") }, h("b", {}, k), h("span", {}, String(val))))));
    prevVars = v;
    outEl.replaceChildren(h("small", {}, "Kết quả print"), ...(s.out.length ? s.out.map(t => h("div", {}, t)) : [h("div", { class: "muted" }, "…")]));
  }
  function paintSide() {
    const parts = [h("div", { class: "alg-ch" }, h("b", {}, "Mã Python"), h("span", { class: "alg-big" }, `Độ phức tạp ${algo.big}`)), codeEl];
    if (fill && !fill.solved) {
      const open = fill.open && algo.blanks.find(b => b.ln === fill.open);
      if (open) parts.push(h("div", { class: "alg-opts" }, h("small", {}, `Chọn code cho dòng ${open.ln}:`), ...shuffleOnce(open).map(o => on(h("button", { class: "alg-opt" + (fill.picks[open.ln] === o ? " on" : ""), "data-hit": true }, h("code", {}, o)), () => { fill.picks[open.ln] = o; delete fill.wrong[open.ln]; fill.open = nextBlank(open.ln); Sfx.tick(); paintAll(); }))));
      const ready = algo.blanks.every(b => fill.picks[b.ln]);
      parts.push(h("div", { class: "alg-fillbar" }, h("p", {}, ready ? "Đã điền đủ. Bấm Kiểm tra để chạy thử." : `Bấm vào ô “?” để chọn code. Còn ${algo.blanks.filter(b => !fill.picks[b.ln]).length} chỗ trống.`),
        on(h("button", { class: "btn primary", "data-hit": true, disabled: !ready }, "Kiểm tra"), checkFill)));
      if (fill.feedback) parts.push(h("div", { class: "vres bad" }, ...fill.feedback.map(t => h("p", {}, t))));
      codeEl.classList.add("filling");
    } else {
      codeEl.classList.remove("filling");
      parts.push(varsEl, outEl);
      if (fill?.solved && chal) parts.push(on(h("button", { class: "btn primary block", "data-hit": true }, chal.idx + 1 >= chal.queue.length ? "Xem kết quả" : "Bài tiếp theo"), nextChallenge));
    }
    side.replaceChildren(...parts);
    paintCode();
  }
  const shuf = new Map();
  function shuffleOnce(b) { if (!shuf.has(b)) shuf.set(b, [...b.opts].sort(() => Math.random() - .5)); return shuf.get(b); }
  const nextBlank = ln => (algo.blanks.find(b => b.ln > ln && !fill.picks[b.ln]) || algo.blanks.find(b => !fill.picks[b.ln]))?.ln || null;
  function checkFill() {
    const wrong = algo.blanks.filter(b => fill.picks[b.ln] !== b.tok);
    algo.blanks.forEach(b => { fill.tries[b.ln] = (fill.tries[b.ln] || 0) + 1; });
    if (!wrong.length) {
      fill.solved = true; fill.feedback = null; Sfx.right(); FX.burstEl?.(codeEl, 24);
      const first = algo.blanks.filter(b => fill.tries[b.ln] === 1).length;
      if (chal) { chal.right += first; chal.total += algo.blanks.length; }
      toast("Code đúng rồi! Bấm Chạy để xem thuật toán hoạt động.", 2400); paintAll(); return;
    }
    Sfx.wrong(); fill.wrong = Object.fromEntries(wrong.map(b => [b.ln, true]));
    fill.feedback = wrong.map(b => `Dòng ${b.ln}: “${fill.picks[b.ln]}” chưa đúng. ${b.why[fill.picks[b.ln]] || ""}`);
    fill.open = wrong[0].ln; paintAll();
  }

  /* ---------- chạy ---------- */
  function paintStep() { paintViz(); paintCtrl(); paintCode(); paintVars(); updHud(); }
  function paintAll() {
    mid.replaceChildren(h("div", { class: "alg-head" }, h("div", {}, h("h2", {}, algo.name), h("p", {}, algo.desc))), inputBar, viz, msgEl, ctrl);
    paintInput(); paintSide(); paintStep();
    const locked = fill && !fill.solved;
    mid.classList.toggle("locked", !!locked);
    if (locked) msgEl.textContent = "Điền đúng các chỗ trống trong mã Python bên phải để chạy thử thuật toán.";
  }
  function next() { if (si < steps.length - 1) { si++; const s = steps[si]; if (s.swap) Sfx.tone(520, .06, "triangle", .05); else if (s.cmp) Sfx.tick(); if (s.end && !s.bad) Sfx.right(); paintStep(); } }
  function togglePlay() {
    if (fill && !fill.solved) return;
    if (playing) return stop();
    if (si >= steps.length - 1) si = 0;
    playing = true; paintCtrl();
    const tick = () => { if (!playing) return; if (si >= steps.length - 1) { stop(); return; } next(); timer = setTimeout(tick, speed); };
    timer = setTimeout(tick, 200);
  }
  function stop() { playing = false; clearTimeout(timer); if (ctrl.isConnected) paintCtrl(); }
  const updHud = () => hud({ progress: mode === "fill" && chal ? `Bài <b>${chal.idx + 1}/${chal.queue.length}</b>` : `Bước <b>${si + 1}/${steps.length}</b>`, score: null, extra: mode === "fill" && chal ? `Đúng ngay lần đầu <b>${chal.right}/${chal.total}</b>` : "" });
  const onKey = e => {
    if (!mode || /input|textarea/i.test(e.target.tagName)) return;
    if (e.key === " ") { e.preventDefault(); togglePlay(); } else if (e.key === "ArrowRight") { stop(); next(); } else if (e.key === "ArrowLeft") { stop(); si = Math.max(0, si - 1); paintStep(); }
  };
  addEventListener("keydown", onKey);

  /* ---------- thử thách điền code ---------- */
  function nextChallenge() {
    if (chal.idx + 1 >= chal.queue.length) return finish();
    chal.idx++; select(ALGOS.find(a => a.id === chal.queue[chal.idx]));
  }
  function finish() {
    stop();
    Result(g, { score: chal.right * 10, correct: chal.right, total: chal.total, label: "Chỗ trống điền đúng ngay lần đầu",
      title: chal.right === chal.total ? "Viết code chuẩn từng dòng!" : chal.right / chal.total >= .6 ? "Code tốt lắm!" : "Ôn lại thuật toán rồi thử lại nhé!",
      note: `Điền code Python cho ${chal.queue.length} thuật toán: ${chal.queue.map(id => ALGOS.find(a => a.id === id).name.toLowerCase()).join(", ")}.`,
      stats: [["Số bài", String(chal.queue.length)], ["Đúng ngay lần đầu", `${chal.right}/${chal.total}`]] });
  }

  /* ---------- chọn chế độ ---------- */
  function start(m) {
    mode = m; root.querySelector(".pcb-start")?.remove(); Sfx.right();
    if (m === "fill") { chal = { queue: [...ALGOS].sort(() => Math.random() - .5).slice(0, 4).map(a => a.id), idx: 0, right: 0, total: 0 }; select(ALGOS.find(a => a.id === chal.queue[0])); }
    else select(algo);
  }
  input = defInput(algo); build(); paintList(); paintAll();
  mid.append(h("div", { class: "pcb-start" }, h("div", { class: "pcb-start-c" },
    h("h2", {}, "Thuật toán Python"),
    h("p", {}, `${ALGOS.length} thuật toán cơ bản: hai con trỏ, cửa sổ trượt, tìm kiếm tuần tự và nhị phân, ba cách sắp xếp. Mỗi bước hiện dòng code đang chạy, giá trị các biến và danh sách thay đổi ra sao.`),
    h("div", { class: "pcb-modes" },
      on(h("button", { class: "pcb-mode", "data-hit": true }, h("b", {}, "Xem chạy từng bước"), h("span", {}, "Chọn thuật toán, đổi dữ liệu đầu vào, chạy tự động hoặc bấm từng bước. Phím cách để chạy, mũi tên để đi từng bước.")), () => start("view")),
      on(h("button", { class: "pcb-mode", "data-hit": true }, h("b", {}, "Điền code"), h("span", {}, "4 thuật toán ngẫu nhiên, mỗi bài có vài chỗ trống trong mã Python. Chọn đúng code thì mới chạy được.")), () => start("fill"))))));
  return () => { stop(); removeEventListener("keydown", onKey); };
}
