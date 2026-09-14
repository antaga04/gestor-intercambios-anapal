import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

type DateInput = Date | string | number;

const toDate = (d: DateInput) => (d instanceof Date ? d : new Date(d));

export const formatDate = (d: DateInput) => format(toDate(d), 'dd/MM/yyyy', { locale: es });
export const formatDateTime = (d: DateInput) => format(toDate(d), 'dd/MM/yyyy HH:mm', { locale: es });
export const formatLongDate = (d: DateInput) => format(toDate(d), "d 'de' MMMM 'de' yyyy", { locale: es });
export const formatRelative = (d: DateInput) => formatDistanceToNow(toDate(d), { locale: es, addSuffix: true });

const intFormatter = new Intl.NumberFormat('es-ES');
export const formatInt = (n: number) => intFormatter.format(n);

export { formatBilletes } from '@anapal/shared';

export const daysUntil = (d: DateInput) => Math.ceil((toDate(d).getTime() - Date.now()) / 86_400_000);
