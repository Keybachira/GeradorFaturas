/** Teste temporário das máscaras/validações novas (apagado a seguir). */
function mascararData(v) {
  var d = String(v).replace(/\D/g, "").slice(0, 8);
  if (d.length >= 5) return d.slice(0, 2) + "/" + d.slice(2, 4) + "/" + d.slice(4);
  if (d.length >= 3) return d.slice(0, 2) + "/" + d.slice(2);
  return d;
}
var T = [["", ""], ["1", "1"], ["13", "13"], ["131", "13/1"], ["1310", "13/10"],
         ["13102", "13/10/2"], ["13102026", "13/10/2026"], ["13/10/2026", "13/10/2026"],
         ["13102026999", "13/10/2026"], ["abc12x", "12"]];
var ok = 0;
T.forEach(function (p) {
  var r = mascararData(p[0]);
  var bom = r === p[1];
  if (bom) ok++;
  console.log((bom ? "PASS" : "FAIL") + '  mascararData("' + p[0] + '") = "' + r + '"');
});
console.log("--- data: " + ok + "/" + T.length);
console.log("");

var NIF = [9, 10, 14];
function nifOk(v) {
  v = String(v).trim();
  if (!v) return true;
  return /^\d+$/.test(v) && NIF.indexOf(v.length) !== -1;
}
[["5000734110", true], ["5001301993", true], ["29246638810001", true],
 ["123", false], ["1234567890123", false], ["abcdefghi", false], ["", true]]
  .forEach(function (p) {
    var r = nifOk(p[0]);
    console.log((r === p[1] ? "PASS" : "FAIL") + '  nif("' + p[0] + '") = ' + r);
  });

function limparNif(v) { return String(v).replace(/\D/g, "").slice(0, 14); }
[["abc123", "123"], ["12.345.678", "12345678"], ["1234567890123456", "12345678901234"]]
  .forEach(function (p) {
    var r = limparNif(p[0]);
    console.log((r === p[1] ? "PASS" : "FAIL") + '  limparNif("' + p[0] + '") = "' + r + '"');
  });

console.log("");
function plural(n) { return n + (n === 1 ? " linha" : " linhas"); }
[[0, "0 linhas"], [1, "1 linha"], [2, "2 linhas"], [7, "7 linhas"]]
  .forEach(function (p) {
    var r = plural(p[0]);
    console.log((r === p[1] ? "PASS" : "FAIL") + '  plural(' + p[0] + ') = "' + r + '"');
  });
