import { getDevices } from './hdc.js';

export type DeviceData = {
  deviceId: string | undefined;
  readableName: string | undefined;
  connected: boolean;
  type: 'emulator' | 'phone';
};

export async function listHarmonyDevices() {
  const devices = await getDevices();

  const allDevices: Array<DeviceData> = [];

  for (const device of devices) {
    const phoneData: DeviceData = {
      deviceId: device.name,
      // @todo get readable name
      readableName: device.name,
      type: 'phone',
      connected: device.state === 'Connected',
    };
    allDevices.push(phoneData);
  }

  return allDevices;
}
