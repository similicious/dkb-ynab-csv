import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";
import { format, isValid, parse as parseDate } from "date-fns";

const fileInputElement = document.querySelector("#file-input");
const dropzone = document.querySelector("#dropzone");

dropzone.addEventListener("drop", (e) => {
  e.preventDefault();

  [...(e.dataTransfer.items ?? [])]
    .filter((f) => f.kind === "file")
    .map((f) => f.getAsFile())
    .forEach((f) => readFile(f, (content) => generateYnabCsv(content)));
});

dropzone.addEventListener("dragover", (e) => e.preventDefault());

fileInputElement.addEventListener("change", () => {
  const file = fileInputElement.files[0];

  readFile(file, (content) => generateYnabCsv(content));
});

function readFile(file, cb) {
  const reader = new FileReader();

  reader.addEventListener("load", () => cb(reader.result));
  reader.readAsText(file, "windows-1252");
}

function generateYnabCsv(fileContents) {
  // Parse csv, omitting the first 6 lines which are not CSV
  const dkbTransactions = parse(fileContents, {
    from_line: 7,
    delimiter: ";",
    columns: true,
    skip_empty_lines: true,
  });

  // Transform all transactions to the YNAB format
  const ynabTransactions = dkbTransactions.map((record) => {
    // Credit card / EC transactions contain the actual date in the note (Verwendungszweck).
    let actualTransactionDate = record.Buchungstag;
    // So we try to parse it ...
    const dateCandidate = new parseDate(
      record.Verwendungszweck.substring(0, 10),
      "yyyy-MM-dd",
      new Date()
    );

    // .. and set it, if it worked.
    if (isValid(dateCandidate)) {
      actualTransactionDate = format(dateCandidate, "dd.MM.yyyy");
    }

    return {
      Date: actualTransactionDate,
      Payee: record["Auftraggeber / Begünstigter"],
      Memo: `${record["Verwendungszweck"]} / ${record["Auftraggeber / Begünstigter"]}`,
      Amount: record["Betrag (EUR)"],
    };
  });

  // Stringify transaction array back to csv
  const ynabTransactionsCsv = stringify(ynabTransactions, {
    quoted: true,
    header: true,
  });

  // Download result file to disk
  download(
    `ynab_data_${format(new Date(), "yyyyMMddHHmm")}.csv`,
    ynabTransactionsCsv
  );

  fileInputElement.value = null;
}

function download(filename, text) {
  var element = document.createElement("a");
  element.setAttribute(
    "href",
    "data:text/plain;charset=utf-8," + encodeURIComponent(text)
  );
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}
