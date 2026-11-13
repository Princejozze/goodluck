export function formatTZS(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) return 'TSh 0';
  return `TSh ${Math.round(amount).toLocaleString('en-US')}`;
}

export function formatDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateTimeString: string): string {
  if (!dateTimeString) return '';
  try {
    const d = new Date(dateTimeString);
    return `${d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })} at ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
  } catch {
    return dateTimeString;
  }
}
