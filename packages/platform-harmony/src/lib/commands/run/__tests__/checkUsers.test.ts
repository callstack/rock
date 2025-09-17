import { spawn } from '@rock-js/tools';
import type { Mock } from 'vitest';
import { describe, it } from 'vitest';
import { checkUsers } from '../listAndroidUsers.js';

// output of "adb -s ... shell pm users list" command
const gradleOutput = `
Users:
        UserInfo{0:Homersimpsons:c13} running
        UserInfo{10:Guest:404}
`;

describe('check android users', () => {
  it('should correctly parse recieved users', async () => {
    (spawn as Mock).mockResolvedValueOnce({ stdout: gradleOutput });
    const users = await checkUsers('device');

    expect(users).toStrictEqual([
      { id: '0', name: 'Homersimpsons' },
      { id: '10', name: 'Guest' },
    ]);
  });
});
