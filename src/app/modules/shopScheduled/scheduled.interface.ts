
export interface DaySchedule {
    day: string;
    time: string;
    isClosed: boolean;
}

export interface ServiceTime {
    time: string;
    discount?: string;
}

export interface ShopSchedule {
    dailySchedule: DaySchedule[];
    serviceTimeSchedule: ServiceTime[];
}
