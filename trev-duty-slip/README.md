# Trev Duty Slip PDF Generator

This project generates **print-ready A4 portrait PDFs** from `data.json` using the provided `template.html`.

## Setup

```bash
cd trev-duty-slip
npm install
```

## Run (generate PDFs)

```bash
npm run generate
```

Output PDFs will be created in `trev-duty-slip/out/`.

## Data format

Edit `data.json` (array of slips). Example is included in `data.sample.json`.

Optional:
- `gpsMapImagePath`: local image path for GPS map (png/jpg). If provided, it will be embedded into the PDF.

