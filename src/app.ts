import { BehaviorSubject, combineLatest, fromEvent, interval, merge, Observable, of, Subject, timer } from 'rxjs';
import {
    delay, distinctUntilChanged, filter, first, map, mapTo, pairwise, scan, skipUntil, startWith, switchMap, takeWhile, tap
} from 'rxjs/operators';

console.clear();

/**                 DOM ELEMENTS
 * Constantes para acceder a los elementos de la página html
 */

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

const alarmKeyHtmlElement = document.getElementById('alarmKey');

//////////////////////////// DEFINITIONS ////////////////////////////

enum SensorStatus {
    Connecting = 'Connecting',
    Ok = 'Ok',
    Intrusion = 'Intrusion'
}

///////////////////////// UTILS ///////////////////////////

/**
 * Nos permite poner un texto en las cajas de status DE LOS SENSORES (CONNECTING; OK; INTRUSION)
 * @param sensor
 */
const setElementStatus = (sensor: HTMLElement) => (status: SensorStatus) => {
    sensor.innerText = status.toUpperCase();
    sensor.className = `sensor-status ${ status }`;
};

const intFrom = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1) + min);

//////////////////////////////// EJERCICIO ////////////////////////////////

/**
 * Nos permite crear un sensor. Este sensor será linkado a un intrusionController, que es quién nos dice si hay intrusión o no para ese sensor.
 * La salida de este stream es uno de los status posibles, evaluando si hay intrusión o no.
 * @param intrusionController$
 */
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

/**
 * Nos permite setear el estado global del SISTEMA DE ALARMA, es decir el status de LA ALARMA
 * @param sensorStatuses
 */
function setAlarmStatus(sensorStatuses: Array<SensorStatus>) {
    const status = sensorStatuses.includes(SensorStatus.Connecting)
        ? SensorStatus.Connecting
        : sensorStatuses.includes(SensorStatus.Intrusion)
            ? SensorStatus.Intrusion
            : SensorStatus.Ok;

    setElementStatus(alarmStatusHtmlElement)(status);
    alarmIcon.className = `alarm-action ${ status === SensorStatus.Intrusion ? 'active' : 'inactive' }`;
}

/**
 * Cambia la clase css del icono del policia para que se pinte
 */
const callPoliceUI = () => policeIcon.className = 'alarm-action active';


/**
 * Nos permite comprobar si un status concreto está dentro de un array de statuses
 */
const hasStatus = (status: SensorStatus) => (statuses: Array<SensorStatus>) => statuses.includes(status);

/**
 * Utilizando la función anterior, nos permite consultar si hay un estado de intrusión
 */
const hasIntrusionStatus = hasStatus(SensorStatus.Intrusion);

/**
 * Nos permite determinar si el botón de llave de la alarma esta activo o no
 */
const alarmKeyEnabled = (enabled: boolean) => alarmKeyHtmlElement.className = ` ${ enabled ? 'active' : 'inactive' }`;

//////////////////////////////// EXERCISE ////////////////////////////////
/**
 * Streams para controlar los estados de los distintos sensores
 */
const doorSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();
const livingRoomSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();
const perimeterSensorStatus$: Subject<SensorStatus> = new Subject<SensorStatus>();

/**
 * Combinación de los estados de todos los sensores
 */
const allSensorsStatuses$ = combineLatest([doorSensorStatus$, livingRoomSensorStatus$, perimeterSensorStatus$]);

/**
 * Operador Custom:
 * nos permite determinar si un sensor pasa de estado connecting a ok.
 * Nos ayudará a ignorar clicks mientras los sonsores no están connectados.
 */
const skipWhileSensorNotConnected = () => (sensor$: Observable<SensorStatus>) => sensor$
    .pipe(
        pairwise(),
        first(([previous, current]: [SensorStatus, SensorStatus]) => previous === SensorStatus.Connecting && current === SensorStatus.Ok),
        mapTo(true)
    );

/**
 * Declaramos estos 3 streams para controlar cuando los sensores están conectados
 */
const doorSensorConnected$ = doorSensorStatus$.pipe(skipWhileSensorNotConnected());
const livingRoomSensorConnected$ = livingRoomSensorStatus$.pipe(skipWhileSensorNotConnected());
const perimeterSensorConnected$ = perimeterSensorStatus$.pipe(skipWhileSensorNotConnected());

/**
 * Este stream nos dice cuando los 3 sensores están conectados: Cuando todos me devuelvan true
 */
const allSensorsConnected$ = combineLatest([doorSensorConnected$, livingRoomSensorConnected$, perimeterSensorConnected$])
    .pipe(
        first(([door, livingRoom, perimeter]: [boolean, boolean, boolean]) => door && livingRoom && perimeter),
        mapTo(true)
    );

/**
 * Handler para controlar los clicks sobre los botones de ok o de intrusión:
 * mergeamos ambos streams, puesto que la respuesta será del mismo tipo (boolean).
 * Solo escuchamos cuando todos los sensores han sido conectados
 * A partir de aquí, si hay una intrusión, notificaremos al stream de control de intrusión que le hayamos pasado
 */
function handleSensorClick(okButton: HTMLElement, intrusionButton: HTMLElement, intrusion$: Subject<boolean>) {
    merge(
        fromEvent(intrusionButton, 'click')
            .pipe(skipUntil(allSensorsConnected$), tap(e => console.log(`%c${ e.target['name'] } Intrusion detected!!`, 'background: #8B0000; color: #FFFFFF')),
                mapTo(true)),

        fromEvent(okButton, 'click')
            .pipe(skipUntil(allSensorsConnected$), tap(e => console.log(`%c${ e.target['name'] } Intrusion deactivated!!`, 'background: #00AA00; color: #FFFFFF')),
                mapTo(false))
    )
        .subscribe((intrusion: boolean) => intrusion$.next(intrusion));
}

/**
 * Los distintos streams para controlar todas las posibles intrusiones o inhibiciones
 */
const doorIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const livingRoomIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const perimeterIntrusionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
const inhibitionController$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

/**
        Creamos las suscripciones para cada sensor y su respectivo controlador de intrusión
 */
handleSensorClick(doorSensorOkButton, doorSensorIntrusionButton, doorIntrusionController$);
handleSensorClick(livingRoomSensorOkButton, livingRoomSensorIntrusionButton, livingRoomIntrusionController$);
handleSensorClick(perimeterSensorOkButton, perimeterSensorIntrusionButton, perimeterIntrusionController$);

/**
 * Gestionamos el caso de que se active la inhibición
 * ponemos el componente html con ciertas propiedades
 * Enviamos un true al controllador de inhibición
 */
fromEvent(inhibitionButton, 'click')
    .pipe(tap(e => {
        console.log(`%c${ e.target['name'] } detected!!`, 'background: #8B0000; color: #FFFFFF');
        inhibitionHtmlElement.className = 'alarm-item blinking';
    }))
    .subscribe(() => inhibitionController$.next(true));

/**
 * Stream para controlar si debemos llamar o no a la policía
 */
const callPolice$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

/**
 * Cuando el stream anterior de un true, llamamos a la policía (hacemos que se active el icono)
 */
callPolice$
    .pipe(filter(call => call))
    .subscribe(() => callPoliceUI());

/**
 * Gestión del icono de alarma según los sensores y el sensor de inhibición
 */
combineLatest([
    allSensorsStatuses$,
    inhibitionController$.pipe(map(inhibition => inhibition ? [SensorStatus.Intrusion] : [SensorStatus.Ok]))
])
    .subscribe(([sensorStatuses, inhibitionStatus]: [Array<SensorStatus>, Array<SensorStatus>]) => setAlarmStatus([sensorStatuses,
                                                                                                                   inhibitionStatus].flatMap(_ => _)));

// Hay una alarma real cuando se detecta una intrusión y no se desactiva antes del delay de seguridad
const REAL_ALARM_DELAY_SECONDS = 5;

/**
 * stream para controlar si algún sensor tiene intrusión
 */
const sensorsHaveIntrusion$: Observable<boolean> = allSensorsStatuses$
    .pipe(
        map(_ => hasIntrusionStatus(_)),
        distinctUntilChanged()
    );

/**
 * Este stream nos sirve para controlar el delay que hay que dejar para notificar el icono de alarma:
 * - si hay intrusión => REAL_ALARM_DELAY_SECONDS
 * - sino, el delay es 0, porque queremos decir inmediatamente que no hay intrusión alguna
 */
const alarmSignals$: Observable<boolean> = sensorsHaveIntrusion$
    .pipe(
        switchMap((anyIntrusion: boolean) => of(anyIntrusion)
            .pipe(delay(anyIntrusion ? REAL_ALARM_DELAY_SECONDS * 1000 : 0)))
    );

/**
 * A continuación es donde controlamos cuándo avisar a la policía:
 * - escuchamos cualquier emisión de los streams alarmSignals$ y inhibitionController$
 * - filtramos en aquellos casos que nos den un true, en ese momento llamaremos a la policía
 */
merge(alarmSignals$, inhibitionController$)
    .pipe(filter(intrusion => !!intrusion))
    .subscribe(callPolice$);

/**
 * Cuenta atrás para mostrar por pantalla
 */
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

/**
 * Altualizamos los componentes html según cada status stream
 */
doorSensorStatus$
    .subscribe((status: SensorStatus) => setElementStatus(doorSensorStatusHtmlElement)(status));

livingRoomSensorStatus$
    .subscribe((status: SensorStatus) => setElementStatus(livingRoomSensorStatusHtmlElement)(status));

perimeterSensorStatus$
    .subscribe((status: SensorStatus) => setElementStatus(perimeterSensorStatusHtmlElement)(status));

/**
 * Creamos los distintos sensores
 */
createSensor(doorIntrusionController$)
    .subscribe(doorSensorStatus$);

createSensor(livingRoomIntrusionController$)
    .subscribe(livingRoomSensorStatus$);

createSensor(perimeterIntrusionController$)
    .subscribe(perimeterSensorStatus$);
