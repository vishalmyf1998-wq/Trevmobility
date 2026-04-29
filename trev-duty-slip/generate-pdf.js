import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import puppeteer from "puppeteer";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function fileToDataUrl(filePath) {
  const abs = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const buf = await fs.readFile(abs);
  const ext = path.extname(abs).toLowerCase();
  const mime =
    ext === ".png"
      ? "image/png"
      : ext === ".jpg" || ext === ".jpeg"
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function applyTemplate(template, data) {
  return template.replaceAll(/\{\{(\w+)\}\}/g, (_, key) => escapeHtml(data[key]));
}

function safeName(input) {
  return String(input ?? "")
    .trim()
    .replaceAll(/[<>:"/\\|?*\u0000-\u001F]/g, "_")
    .replaceAll(/\s+/g, " ")
    .slice(0, 80);
}

async function main() {
  const templatePath = path.join(process.cwd(), "template.html");
  const dataPath = path.join(process.cwd(), "data.json");
  const outDir = path.join(process.cwd(), "out");

  await fs.mkdir(outDir, { recursive: true });

  const template = await fs.readFile(templatePath, "utf8");
  const raw = await fs.readFile(dataPath, "utf8");
  const slips = JSON.parse(raw);

  if (!Array.isArray(slips) || slips.length === 0) {
    throw new Error("data.json must be a non-empty JSON array. (Try copying data.sample.json -> data.json)");
  }

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    for (let i = 0; i < slips.length; i++) {
      const slip = slips[i] ?? {};
      const merged = {
        slipNo: "DS-__________",
        date: "__/__/____",
        employeeName: "______________________________",
        employeeId: "______________",
        reportingManager: "________________________",
        contactNo: "________________________",
        fromDate: "__/__/____",
        toDate: "__/__/____",
        dutyType: "________________",
        startTime: "__:__",
        endTime: "__:__",
        totalHours: "_____",
        pickupLocation: "________________________________",
        dropLocation: "________________________________",
        approverName: "________________",
        approverDate: "__/__/____",
        ...slip,
      };

      const html = applyTemplate(template, merged);
      const page = await browser.newPage();

      // Use setContent for reliable @page sizing with inline CSS.
      await page.setContent(html, { waitUntil: "networkidle0" });

      // If gps map image is provided, embed it.
      if (slip.gpsMapImagePath) {
        const dataUrl = await fileToDataUrl(slip.gpsMapImagePath);
        await page.evaluate((src) => {
          const img = document.querySelector("img.gps-map");
          const ph = document.querySelector(".gps-map-placeholder");
          if (img) {
            img.src = src;
            img.classList.remove("hidden");
          }
          if (ph) ph.remove();
        }, dataUrl);
      }

      const fileBase = safeName(merged.slipNo) || `slip-${i + 1}`;
      const outPath = path.join(outDir, `${String(i + 1).padStart(3, "0")}-${fileBase}.pdf`);

      await page.pdf({
        path: outPath,
        format: "A4",
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: "0mm", right: "0mm", bottom: "0mm", left: "0mm" },
      });

      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exitCode = 1;
});

