import { BehaviorSubject, combineLatest, fromEvent, interval, merge, Observable, of, Subject, timer } from 'rxjs';
import {
    delay, distinctUntilChanged, filter, first, map, mapTo, pairwise, scan, skipUntil, skipWhile, startWith, switchMap, takeWhile, tap
} from 'rxjs/operators';

console.clear();

/*

ORDENAR EL CODI I FER GUIÍO!!!!!!!!!!!!!!!!!!!!!!!!!!!!


Acabar:
* escriure els punts que s'han de fer
* MILLORES MIRANT EL DOM!!!! (performance)
* TAKE WHIlE AMB UN INHIBIDOR STATUS

 */

//////////////////////////// DOM ELEMENTS  ////////////////////////////

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
const inhibitionButton = document.getElementById('inhibitionButton');
const alarmCounterHtmlElement = document.getElementById('alarmCounterHtmlElement');
const inhibitionHtmlElement = document.getElementById('inhibitionHtmlElement');

//////////////////////////// DEFINITIONS ////////////////////////////

enum SensorStatus {
    Connecting = 'Connecting',
    Ok = 'Ok',
    Intrusion = 'Intrusion'
}



///////////////////////// UTILS ///////////////////////////

const setElementStatus = (sensor: HTMLElement) => (status: SensorStatus) => {
    sensor.innerText = status.toUpperCase();
    sensor.className = `sensor-status ${ status }`;
};

const intFrom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

//////////////////////////////// EJERCICIO ////////////////////////////////

function createSensor(intrusionController$: Observable<boolean>): Observable<SensorStatus> {
    return combineLatest([
        timer(intFrom(1500, 5000), 1000),
        intrusionController$
    ])
        .pipe(
            map(([, intrusion]) => intrusion ? SensorStatus.Intrusion : SensorStatus.Ok),
            startWith(SensorStatus.Connecting)
        );
}

function setAlarmStatus(sensorStatuses: Array<SensorStatus>) {
    const status = sensorStatuses.includes(SensorStatus.Connecting)
        ? SensorStatus.Connecting
        : sensorStatuses.includes(SensorStatus.Intrusion)
            ? SensorStatus.Intrusion
            : SensorStatus.Ok;

    setElementStatus(alarmStatusHtmlElement)(status);
    alarmIcon.className = `alarm-action ${ status === SensorStatus.Intrusion ? 'active' : 'inactive' }`;
}

const callPoliceUI = () => policeIcon.className = 'alarm-action active';

const hasStatus = (status: SensorStatus) => (statuses: Array<SensorStatus>) => statuses.includes(status);

const hasIntrusionStatus = hasStatus(SensorStatus.Intrusion);

//////////////////////////////// EXERCISE ////////////////////////////////

const doorSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();
const livingRoomSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();
const perimeterSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();

const allSensorsStatuses$ = combineLatest([doorSensorStatus$, livingRoomSensorStatus$, perimeterSensorStatus$]);

// EXTRA

const skipWhileSensorNotConnected = () => (sensor$: Observable<SensorStatus>) => sensor$
    .pipe(
        pairwise(),
        first(([previous, current]: [SensorStatus, SensorStatus]) => previous === SensorStatus.Connecting && current === SensorStatus.Ok),
        mapTo(true)
    );

const doorSensorConnected$ = doorSensorStatus$.pipe(skipWhileSensorNotConnected());
const livingRoomSensorConnected$ = livingRoomSensorStatus$.pipe(skipWhileSensorNotConnected());
const perimeterSensorConnected$ = perimeterSensorStatus$.pipe(skipWhileSensorNotConnected());

const allSensorsConnected$ = combineLatest([doorSensorConnected$, livingRoomSensorConnected$, perimeterSensorConnected$])
    .pipe(
        first(([door, livingRoom, perimeter]: [boolean, boolean, boolean]) => !!door && !!livingRoom && !!perimeter),
        mapTo(true)
    );

//////////////////

//////////////////////////// CLICK HANDLERS ////////////////////////////
function handleSensorClick(okButton: HTMLElement, intrusionButton: HTMLElement, intrusion$: Subject<boolean>) {
    merge(
        fromEvent(intrusionButton, 'click')
            .pipe( skipUntil(allSensorsConnected$), tap(e => console.log(`%c${ e.target['name'] } Intrusion detected!!`, 'background: #8B0000; color: #FFFFFF')),
                mapTo(true)),

        fromEvent(okButton, 'click')
            .pipe( skipUntil(allSensorsConnected$), tap(e => console.log(`%c${ e.target['name'] } Intrusion deactivated!!`, 'background: #00AA00; color: #FFFFFF')),
                mapTo(false))
    )
        .subscribe((intrusion: boolean) => intrusion$.next(intrusion));
}

//////////////////////////// INTRUSION CONTROLLERS ////////////////////////////
const doorIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const livingRoomIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const perimeterIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const inhibitionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

/*
        Creamos las suscripciones para cada sensor y su respectivo controlador de intrusión
 */
handleSensorClick(doorSensorOkButton, doorSensorIntrusionButton, doorIntrusionController$);
handleSensorClick(livingRoomSensorOkButton, livingRoomSensorIntrusionButton, livingRoomIntrusionController$);
handleSensorClick(perimeterSensorOkButton, perimeterSensorIntrusionButton, perimeterIntrusionController$);

fromEvent(inhibitionButton, 'click')
    .pipe(tap(e => {
        console.log(`%c${ e.target['name'] } detected!!`, 'background: #8B0000; color: #FFFFFF');
        inhibitionHtmlElement.className = 'alarm-item blinking';
    }))
    .subscribe(() => inhibitionController$.next(true));

const callPolice$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

callPolice$
    .pipe(filter(call => !!call))
    .subscribe(() => callPoliceUI());

combineLatest([
    allSensorsStatuses$,
    inhibitionController$.pipe(map(inhibition => inhibition ? [SensorStatus.Intrusion] : [SensorStatus.Ok]))
])
    .subscribe(([sensorStatuses, inhibitionStatus]: [Array<SensorStatus>, Array<SensorStatus>]) => setAlarmStatus([sensorStatuses,
                                                                                                                   inhibitionStatus].flatMap(_ => _)));

// Hay una alarma real cuando se detecta una intrusión y no se desactiva antes del delay de seguridad
const REAL_ALARM_DELAY_SECONDS = 5;

const sensorsHaveIntrusion$: Observable<boolean> = allSensorsStatuses$
    .pipe(
        map(_ => hasIntrusionStatus(_)),
        distinctUntilChanged()
    );

const alarmSignals$: Observable<boolean> = sensorsHaveIntrusion$
    .pipe(
        switchMap((anyIntrusion: boolean) => of(anyIntrusion)
            .pipe(delay(anyIntrusion ? REAL_ALARM_DELAY_SECONDS * 1000 : 0)))
    );

// primer ensenyar sense el merge perque s'entengui

merge(alarmSignals$, inhibitionController$)
    .pipe(filter(intrusion => !!intrusion))
    .subscribe(callPolice$);

const alarmCountDown$ = sensorsHaveIntrusion$
    .pipe(
        switchMap(anyIntrusion => {
            return anyIntrusion
                ? interval(1000)
                    .pipe(
                        scan(countDown => countDown - 1, REAL_ALARM_DELAY_SECONDS),
                        takeWhile(_ => _ >= 0)
                    )
                : of(REAL_ALARM_DELAY_SECONDS);
        }));

alarmCountDown$
    .subscribe(_ => alarmCounterHtmlElement.innerText = String(_));

doorSensorStatus$
    .subscribe((status: SensorStatus) => setElementStatus(doorSensorStatusHtmlElement)(status));

livingRoomSensorStatus$
    .subscribe((status: SensorStatus) => setElementStatus(livingRoomSensorStatusHtmlElement)(status));

perimeterSensorStatus$
    .subscribe((status: SensorStatus) => setElementStatus(perimeterSensorStatusHtmlElement)(status));

// Creació després de las subscriptions
createSensor(doorIntrusionController$)
    .subscribe(doorSensorStatus$);

createSensor(livingRoomIntrusionController$)
    .subscribe(livingRoomSensorStatus$);

createSensor(perimeterIntrusionController$)
    .subscribe(perimeterSensorStatus$);

/*
Exercicis

- que no es respongui a cap botó mentre els sensors s'estan connectant
- quan s'ha avisat a la poli, no s'ha de poder polsar el botó de ok
- unificar totes les subscripcions y posar un take while per dir quan acaba tot (inhibició)
 */



