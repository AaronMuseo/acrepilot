export function calendarToLocalDate(value:string):Date {const [year,month,day]=value.split('-').map(Number);return new Date(year,month-1,day,12);}
export function localDateToCalendar(value:Date):string{return String(value.getFullYear()).padStart(4,'0')+'-'+String(value.getMonth()+1).padStart(2,'0')+'-'+String(value.getDate()).padStart(2,'0');}
