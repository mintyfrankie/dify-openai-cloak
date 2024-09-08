import { describe, expect, it } from '@jest/globals';
import { app } from './app';

describe('Express App', () => {
  it('should be an Express application', () => {
    expect(app).toHaveProperty('listen');
    expect(app).toHaveProperty('use');
    expect(app).toHaveProperty('get');
    expect(app).toHaveProperty('post');
  });

  it('should have a GET route for /', () => {
    const route = app._router.stack.find(
      (layer: any) => layer.route && layer.route.path === '/'
    );
    expect(route).toBeDefined();
    expect(route.route.methods.get).toBe(true);
  });
});