export interface RadioEnvironment {
  enabled: boolean;
  ssid: string;
  password: string;
  rssi: number;
  httpBody: string;
  httpStatus: number;
  mqttTopic: string;
  mqttValue: string;
  bleEnabled: boolean;
  bleName: string;
  bleUuid: string;
  bleValue: string;
  bluetoothReply: string;
}
export interface RadioEvent {
  time: number;
  protocol: 'WiFi' | 'HTTP' | 'MQTT' | 'BLE' | 'Bluetooth';
  action: string;
  detail: string;
  success: boolean;
}
export interface RadioState {
  wifiConnected: boolean;
  ssid: string;
  ip: string;
  rssi: number;
  bleAdvertising: string;
  bleConnected: boolean;
  bluetoothConnected: boolean;
  events: RadioEvent[];
}
export const defaultRadio: RadioEnvironment = {
  enabled: true,
  ssid: 'CircuitLab',
  password: 'circuitlab',
  rssi: -48,
  httpBody: '{"led":1}',
  httpStatus: 200,
  mqttTopic: 'circuitlab/led',
  mqttValue: '1',
  bleEnabled: true,
  bleName: 'Virtual sensor',
  bleUuid: 'ffe1',
  bleValue: '25',
  bluetoothReply: 'OK',
};
export function validateRadio(input: unknown): RadioEnvironment {
  if (!input || typeof input !== 'object') throw new Error('Некорректная беспроводная среда.');
  const v = input as RadioEnvironment;
  for (const key of [
    'ssid',
    'password',
    'httpBody',
    'mqttTopic',
    'mqttValue',
    'bleName',
    'bleUuid',
    'bleValue',
    'bluetoothReply',
  ] as const)
    if (
      typeof v[key] !== 'string' ||
      new TextEncoder().encode(v[key]).length > 80 ||
      /[\t\r\n]/.test(v[key])
    )
      throw new Error('Параметр радиосреды ' + key + ': до 80 байт без переводов строк.');
  if (
    typeof v.enabled !== 'boolean' ||
    typeof v.bleEnabled !== 'boolean' ||
    !Number.isInteger(v.rssi) ||
    v.rssi < -100 ||
    v.rssi > -1 ||
    !Number.isInteger(v.httpStatus) ||
    v.httpStatus < 100 ||
    v.httpStatus > 599
  )
    throw new Error('Некорректные параметры радиосреды.');
  return { ...v };
}
