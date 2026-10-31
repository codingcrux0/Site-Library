const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-10-30" becomes "30 Oct 2026". Done by hand (not toLocaleDateString), so the server HTML and the browser always agree.
export function formatDate(iso: string) {
  const [year, month, day] = iso.split("-");
  const name = MONTHS[Number(month) - 1];
  return name ? `${Number(day)} ${name} ${year}` : iso;
}
