import { BehaviorSubject, combineLatest, Observable, Subject, timer } from 'rxjs';
import { mapTo, pluck, startWith } from 'rxjs/operators';

console.clear();

//////////////////////////// DOM ELEMENTS ////////////////////////////

const doorSensorStatus = document.getElementById('doorSensorStatus');
const livingRoomSensorStatus = document.getElementById('livingRoomSensorStatus');
const perimeterSensorStatus = document.getElementById('perimeterSensorStatus');
const bedRoomSensorStatus = document.getElementById('bedRoomSensorStatus');

//////////////////////////// DEFINITIONS ////////////////////////////

///////////////////////// UTILS ///////////////////////////

const addSensorStatus = (sensor: HTMLElement) => (text: string) => sensor.innerText += text + '\n';

export function formatCurrentTime(): string {
    const date = new Date();
    return `${ date.getDate() }-${ date.getMonth() + 1 }-${ date.getFullYear() }  ${ date.getHours() }:${ date.getMinutes() }:${ date.getSeconds() }`;
}

const intFrom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

//////////////////////////////// EXERCISE ////////////////////////////////

enum SensorStatus {
    Connecting = 'Connecting',
    Ok = 'Ok',
    Intrusion = 'Intrusion'
}

interface IntrusionSummary {
    door: boolean;
    livingRoom: boolean;
    perimeter: boolean;
    bedroom: boolean;
}

const createSensor = (): Observable<SensorStatus> => timer(intFrom(1500, 5000), 1000)
    .pipe(
        mapTo(SensorStatus.Ok),
        startWith(SensorStatus.Connecting)
    );
/*
export const searchType$ = fromEvent(searchTypeSelect, 'change')
    .pipe(
        pluck('target', 'value'),
        startWith('movie')
    );

*/

const intrusions$: BehaviorSubject<IntrusionSummary> = new BehaviorSubject<IntrusionSummary>({
    bedroom: false,
    door: false,
    livingRoom: false,
    perimeter: false
});

const doorSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();

doorSensorStatus$
    .subscribe(console.log);

combineLatest([
    createSensor(),
    intrusions$.pipe(pluck('door'))
])
    .subscribe(doorSensorStatus$);
