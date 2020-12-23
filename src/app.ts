import { BehaviorSubject, combineLatest, fromEvent, merge, Observable, Subject, timer } from 'rxjs';
import { map, mapTo, startWith, tap } from 'rxjs/operators';

console.clear();

//////////////////////////// DOM ELEMENTS AND CLICK HANDLERS ////////////////////////////

const doorSensorOkButton = document.getElementById('doorSensorOkButton');
const doorSensorIntrusionButton = document.getElementById('doorSensorIntrusionButton');
const doorSensorStatusHtmlElement = document.getElementById('doorSensorStatusHtmlElement');

const livingRoomSensorOkButton = document.getElementById('livingRoomSensorOkButton');
const livingRoomSensorIntrusionButton = document.getElementById('livingRoomSensorIntrusionButton');
const livingRoomSensorStatusHtmlElement = document.getElementById('livingRoomSensorStatusHtmlElement');

const perimeterSensorOkButton = document.getElementById('perimeterSensorOkButton');
const perimeterSensorIntrusionButton = document.getElementById('perimeterSensorIntrusionButton');
const perimeterSensorStatusHtmlElement = document.getElementById('perimeterSensorStatusHtmlElement');

const alarmStatusHtmlElement = document.getElementById('alarmStatusHtmlElement');

const alarmIcon = document.getElementById('alarmIcon');
const policeIcon = document.getElementById('policeIcon');

function handleIntrusionClick(okButton: HTMLElement, intrusionButton: HTMLElement, intrusion$: Subject<boolean>) {
    merge(
        fromEvent(intrusionButton, 'click')
            .pipe(tap(e => console.log(`%c${ e.target['name'] } Intrusion detected!!`, 'background: #8B0000; color: #FFFFFF')),
                mapTo(true)),

        fromEvent(okButton, 'click')
            .pipe(tap(e => console.log(`%c${ e.target['name'] } Intrusion deactivated!!`, 'background: #00AA00; color: #FFFFFF')),
                mapTo(false))
    )
        .subscribe((intrusion: boolean) => intrusion$.next(intrusion));
}

const doorIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const livingRoomIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const perimeterIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

handleIntrusionClick(doorSensorOkButton, doorSensorIntrusionButton, doorIntrusionController$);
handleIntrusionClick(livingRoomSensorOkButton, livingRoomSensorIntrusionButton, livingRoomIntrusionController$);
handleIntrusionClick(perimeterSensorOkButton, perimeterSensorIntrusionButton, perimeterIntrusionController$);

//////////////////////////// DEFINITIONS ////////////////////////////

enum Sensors {
    Door = 'Door',
    LivingRoom = 'LivingRoom',
    Perimeter = 'Perimeter'
}

enum SensorStatus {
    Connecting = 'Connecting',
    Ok = 'Ok',
    Intrusion = 'Intrusion'
}

///////////////////////// UTILS ///////////////////////////

/*

ORDENAR EL CODI I FER GUIÍO!!!!!!!!!!!!!!!!!!!!!!!!!!!!

MILLORES MIRANT EL DOM!!!!

TAKE WHIlE AMB UN INHIBIDOR STATUS

 */

const addSensorStatus = (sensor: HTMLElement) => (status: SensorStatus) => {
    sensor.innerText = status.toUpperCase();
    sensor.className = `sensor-status ${ status }`;
};

const intFrom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

function createSensor(intrusionController$: Observable<boolean>): Observable<SensorStatus> {
    return combineLatest([timer(intFrom(1500, 5000), 1000),
                          intrusionController$])
        .pipe(
            map(([, intrusion]) => intrusion ? SensorStatus.Intrusion : SensorStatus.Ok),
            startWith(SensorStatus.Connecting)
        );
}

function setAlarmStatus([doorStatus, livingRoomStatus, perimeterStatus]: [SensorStatus, SensorStatus, SensorStatus]) {
    const status = [doorStatus, livingRoomStatus, perimeterStatus].includes(SensorStatus.Connecting)
        ? SensorStatus.Connecting
        : [doorStatus, livingRoomStatus, perimeterStatus].includes(SensorStatus.Intrusion)
            ? SensorStatus.Intrusion
            : SensorStatus.Ok;

    addSensorStatus(alarmStatusHtmlElement)(status);

    if (status === SensorStatus.Intrusion) {
        alarmIcon.className = 'alarm-icon active';
    } else {
        alarmIcon.className = 'alarm-icon inactive';
    }
}

//////////////////////////////// EXERCISE ////////////////////////////////

const doorSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();
const livingRoomSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();
const perimeterSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();

const allSensorsStatuses$ = combineLatest([doorSensorStatus$, livingRoomSensorStatus$, perimeterSensorStatus$]);

allSensorsStatuses$
    .pipe(
        tap(_ => setAlarmStatus(_))
    )
    .subscribe(console.log);

doorSensorStatus$
    .subscribe((status: SensorStatus) => addSensorStatus(doorSensorStatusHtmlElement)(status));

livingRoomSensorStatus$
    .subscribe((status: SensorStatus) => addSensorStatus(livingRoomSensorStatusHtmlElement)(status));

perimeterSensorStatus$
    .subscribe((status: SensorStatus) => addSensorStatus(perimeterSensorStatusHtmlElement)(status));

// Creació després de las subscriptions
createSensor(doorIntrusionController$)
    .subscribe(doorSensorStatus$);

createSensor(livingRoomIntrusionController$)
    .subscribe(livingRoomSensorStatus$);

createSensor(perimeterIntrusionController$)
    .subscribe(perimeterSensorStatus$);
