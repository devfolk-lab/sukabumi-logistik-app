/** Page size of the shipping label, in millimetres. */
const LABEL_WIDTH_MM = 100
const LABEL_HEIGHT_MM = 150

/**
 * Resolves once every image under `root` has loaded or failed, so a print or
 * capture does not show empty logo boxes.
 */
export function waitForImages(root: ParentNode = document): Promise<unknown> {
  return Promise.all([...root.querySelectorAll('img')].map(img => img.complete
    ? null
    : new Promise((resolve) => {
        img.addEventListener('load', resolve, { once: true })
        img.addEventListener('error', resolve, { once: true })
      })))
}

/**
 * Saves `label` as a one-page 100 × 150 mm PDF named `filename`. The label is
 * rasterised at roughly 300 dpi, which is what thermal label printers expect.
 * Both libraries load on first use, so pages that never download skip them.
 */
export async function downloadLabelPdf(label: HTMLElement, filename: string): Promise<void> {
  const [{ domToCanvas }, { jsPDF }] = await Promise.all([
    import('modern-screenshot'),
    import('jspdf')
  ])

  await waitForImages(label)
  await document.fonts.ready

  // 100 mm is ~378 CSS px; 300 dpi across 100 mm is ~1181 px.
  const canvas = await domToCanvas(label, { scale: 3.125, backgroundColor: '#ffffff' })

  // Fit to the page width; a label taller than the page is scaled to fit it.
  let width = LABEL_WIDTH_MM
  let height = width * canvas.height / canvas.width
  if (height > LABEL_HEIGHT_MM) {
    width *= LABEL_HEIGHT_MM / height
    height = LABEL_HEIGHT_MM
  }

  const pdf = new jsPDF({ unit: 'mm', format: [LABEL_WIDTH_MM, LABEL_HEIGHT_MM], orientation: 'portrait' })
  // Without compression jsPDF embeds raw pixels, several megabytes for a
  // mostly white label. PNG stays lossless, so barcode edges stay sharp.
  pdf.addImage(canvas, 'PNG', (LABEL_WIDTH_MM - width) / 2, 0, width, height, undefined, 'FAST')
  pdf.save(filename)
}
