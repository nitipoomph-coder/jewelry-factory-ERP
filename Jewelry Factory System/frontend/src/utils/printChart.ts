export function printChartDashboard(docTitle?: string): void {
  const originalTitle = document.title;
  if (docTitle) document.title = docTitle;

  // บังคับให้ Recharts วัดSizeNewก่อนPrint
  window.dispatchEvent(new Event('resize'));

  // Wait 1 frame ให้ re-render เสร็จก่อนค่อยเClose print dialog
  requestAnimationFrame(() => {
    window.print();
  });

  if (docTitle) {
    window.addEventListener('afterprint', () => {
      document.title = originalTitle;
    }, { once: true });
  }
}
