/**
 * @jest-environment node
 */

import { loadScript } from './loadScript';

describe('loadScript on server', () => {
  it('should resolve with null if called on the server', async () => {
    const response = await loadScript();
    expect(response).toBeNull();
  });
});
