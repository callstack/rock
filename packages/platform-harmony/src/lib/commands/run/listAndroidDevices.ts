import { getDevices } from './hdc.js';

export type DeviceData = {
  deviceId: string | undefined;
  readableName: string;
  connected: boolean;
  type: 'emulator' | 'phone';
};

export async function listAndroidDevices() {
  const devices = await getDevices();

  const allDevices: Array<DeviceData> = [];

  for (const device of devices) {
    const phoneData: DeviceData = {
      deviceId: device.name,
      // @todo get readable name
      readableName: device.name,
      type: 'phone',
      connected: true,
    };
    allDevices.push(phoneData);
  }

  return allDevices;
}
