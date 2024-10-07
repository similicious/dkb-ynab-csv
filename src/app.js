import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";
import { format, format as formatDate, parse as parseDate } from "date-fns";

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
  reader.readAsText(file, "");
}

function generateYnabCsv(fileContents) {
  // Parse csv, omitting the first 6 lines which are not CSV
  const dkbTransactions = parse(fileContents, {
    from_line: 5,
    delimiter: ",",
    columns: true,
    skip_empty_lines: true,
  });

  // Transform all transactions to the YNAB format
  const ynabTransactions = dkbTransactions.map((record) => {
    let transactionDate = parseDate(
      record.Wertstellung,
      "dd.MM.yy",
      new Date()
    );

    return {
      Date: formatDate(transactionDate, "yyyy-MM-dd"),
      Payee: record["Zahlungsempfänger*in"],
      Memo: `${record["Zahlungsempfänger*in"]} / ${record["Verwendungszweck"]}`,
      Amount: record["Betrag (€)"],
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
