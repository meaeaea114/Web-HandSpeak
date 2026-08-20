// lib/date-utils.ts

export type DateFormat = 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
export type TimeFormat = '12h' | '24h';

export const formatSystemDate = (dateStringOrTimestamp: any, format: DateFormat): string => {
  if (!dateStringOrTimestamp) return '';
  const date = new Date(dateStringOrTimestamp?.seconds ? dateStringOrTimestamp.toDate() : dateStringOrTimestamp);
  
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();

  switch (format) {
    case 'DD/MM/YYYY': return `${day}/${month}/${year}`;
    case 'YYYY-MM-DD': return `${year}-${month}-${day}`;
    case 'MM/DD/YYYY': 
    default:
      return `${month}/${day}/${year}`;
  }
};

export const formatSystemTime = (dateStringOrTimestamp: any, format: TimeFormat): string => {
  if (!dateStringOrTimestamp) return '';
  const date = new Date(dateStringOrTimestamp?.seconds ? dateStringOrTimestamp.toDate() : dateStringOrTimestamp);

  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: format === '12h'
  });
};