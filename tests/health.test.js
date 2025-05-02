import request from 'supertest';
import app from '../src/app.js';

describe('GET /api/v1/health', () => {
  it('should return server health status', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('message');
  });
});

