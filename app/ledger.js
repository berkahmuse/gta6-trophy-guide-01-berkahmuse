// Leonida Ledger: the trophy list kept as a book of accounts.
// A ruled table (one line per trophy) with a sidebar holding the balance, the
// roadmap order, the missable lines, export/import and the spoiler rule.
// The book is kept in localStorage; classic script, no modules, no network.
"use strict";
var LEDGER_KEY = "leonida-ledger-v1";
var STAGE_TITLES = {
  1: "The story, in order — chapters, finale, and the six single-mission lines that fall due inside it",
  2: "The people — stranger strands and finales, Cal's fishing, Bret's hunt",
  3: "The state — 52 areas, meditation spots, card sets, WAiNK posts, vehicles, garages",
  4: "The counters — stunts, range golds, drone races, race wins, challenges, one arcade game",
  5: "Heat and money — partner lines, vaults, gangs, choices, the second-attempt line, $250k washed, $100k spent",
  6: "The audit — 100% completion, then the platinum posts itself",
};

var book;
try { book = JSON.parse(localStorage.getItem(LEDGER_KEY) || "null"); } catch (e) { book = null; }
var settled = new Set((book && book.settled) || []);
var tallies = (book && book.tallies) || {};
var spoiler = !book || book.spoiler !== false;

function keep() {
  localStorage.setItem(LEDGER_KEY, JSON.stringify({ settled: Array.from(settled), tallies: tallies, spoiler: spoiler }));
}

function isHiddenLine(t) {
  return spoiler && t.hidden && t.kinds.indexOf("story") !== -1 && !settled.has(t.name);
}

function mk(tag, cls, text) {
  var n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function render(trophies) {
  var q = document.getElementById("q").value.trim().toLowerCase();
  var kind = document.getElementById("kindSel").value;
  var grade = document.getElementById("gradeSel").value;
  var rows = document.getElementById("rows");
  rows.textContent = "";
  trophies.forEach(function (t) {
    if (kind === "missable" && !t.missable) return;
    if (kind !== "all" && kind !== "missable" && t.kinds.indexOf(kind) === -1) return;
    if (grade !== "all" && t.grade !== grade) return;
    if (q && (t.name + " " + t.description + " " + t.guide).toLowerCase().indexOf(q) === -1) return;
    var hide = isHiddenLine(t);
    var tr = document.createElement("tr");
    if (settled.has(t.name)) tr.className = "settled";
    if (t.missable && !settled.has(t.name)) tr.classList.add("missable-open");

    var tdDone = mk("td", "c-done");
    var box = document.createElement("input");
    box.type = "checkbox";
    box.checked = settled.has(t.name);
    box.setAttribute("aria-label", "Settle " + t.name);
    box.addEventListener("change", function () {
      if (box.checked) settled.add(t.name); else settled.delete(t.name);
      keep(); render(trophies);
    });
    tdDone.appendChild(box);

    var tdName = mk("td", "c-name");
    var nm = mk("div", hide ? "tname hidden-name" : "tname", hide ? "— story line, sealed by the spoiler rule —" : t.name);
    var ds = mk("div", "tdesc", hide ? "Earn it, or lift the spoiler rule in the sidebar, to read the official entry." : t.description);
    var flags = mk("div", "tflags");
    if (t.missable) flags.appendChild(mk("span", "flag miss", "MISSABLE"));
    if (t.hidden) flags.appendChild(mk("span", "flag", "hidden"));
    flags.appendChild(mk("span", "flag", "stage " + t.stage));
    t.kinds.forEach(function (k) { flags.appendChild(mk("span", "flag", k)); });
    tdName.append(nm, ds, flags);

    var tdGrade = mk("td", "c-grade");
    tdGrade.appendChild(mk("span", "grade " + t.grade, t.grade));

    var tdNote = mk("td", "c-note");
    tdNote.appendChild(mk("p", "", hide ? "The ledger's note for this line is sealed with its name until it is earned." : t.guide));
    tdNote.appendChild(mk("p", "ref", t.sources));

    var tdCount = mk("td", "c-count");
    if (t.target) {
      var step = t.target >= 1000 ? 5000 : 1;
      var minus = mk("button", "", "−");
      minus.type = "button";
      minus.addEventListener("click", function () {
        tallies[t.name] = Math.max(0, (tallies[t.name] || 0) - step); keep(); render(trophies);
      });
      var plus = mk("button", "", "+");
      plus.type = "button";
      plus.addEventListener("click", function () {
        tallies[t.name] = Math.min(t.target, (tallies[t.name] || 0) + step);
        if (tallies[t.name] >= t.target) settled.add(t.name);
        keep(); render(trophies);
      });
      tdCount.append(minus, mk("span", "", " " + (tallies[t.name] || 0) + " / " + t.target + " "), plus, mk("div", "", t.unit));
    } else {
      tdCount.textContent = "—";
    }
    tr.append(tdDone, tdName, tdGrade, tdNote, tdCount);
    rows.appendChild(tr);
  });

  document.getElementById("balEarned").textContent = String(settled.size);
  var open = trophies.filter(function (t) { return t.missable && !settled.has(t.name); });
  document.getElementById("balMiss").textContent = String(open.length);

  var rl = document.getElementById("roadmapList");
  rl.textContent = "";
  [1, 2, 3, 4, 5, 6].forEach(function (n) {
    var inStage = trophies.filter(function (t) { return t.stage === n; });
    var done = inStage.filter(function (t) { return settled.has(t.name); }).length;
    var li = document.createElement("li");
    li.append(mk("span", "stage-n", "Stage " + n + " (" + done + "/" + inStage.length + ") — "), mk("span", "", STAGE_TITLES[n] + "."));
    rl.appendChild(li);
  });

  var ml = document.getElementById("missableList");
  ml.textContent = "";
  trophies.filter(function (t) { return t.missable; }).forEach(function (t) {
    var li = mk("li", settled.has(t.name) ? "settled" : "", t.name);
    ml.appendChild(li);
  });
}

fetch("data/trophies.json").then(function (r) { return r.json(); }).then(function (data) {
  var trophies = data.trophies;
  document.getElementById("q").addEventListener("input", function () { render(trophies); });
  document.getElementById("kindSel").addEventListener("change", function () { render(trophies); });
  document.getElementById("gradeSel").addEventListener("change", function () { render(trophies); });
  var spoilerBox = document.getElementById("spoilerBox");
  spoilerBox.checked = spoiler;
  spoilerBox.addEventListener("change", function () { spoiler = spoilerBox.checked; keep(); render(trophies); });
  document.getElementById("exportBtn").addEventListener("click", function () {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ settled: Array.from(settled), tallies: tallies, spoiler: spoiler }, null, 2)], { type: "application/json" }));
    a.download = "leonida-ledger-book.json";
    a.click();
  });
  document.getElementById("importFile").addEventListener("change", function (e) {
    var f = e.target.files[0];
    if (!f) return;
    f.text().then(function (text) {
      try {
        var p = JSON.parse(text);
        settled = new Set(p.settled || []);
        tallies = p.tallies || {};
        spoiler = p.spoiler !== false;
        spoilerBox.checked = spoiler;
        keep(); render(trophies);
      } catch (err) { alert("That file is not a Leonida Ledger book export."); }
    });
  });
  render(trophies);
});
