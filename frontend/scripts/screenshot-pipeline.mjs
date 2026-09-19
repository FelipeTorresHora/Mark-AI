import { chromium } from 'playwright';

const outDir = '/cursor/stores/bc-d5e9446c-e77f-4a54-9387-2569f0009005/media/pipeline';
const base = 'http://127.0.0.1:5173';

const brandProfile = {
  name: 'Clínica Aurora',
  niche: 'Saúde e bem-estar',
  tone: 'Profissional',
  target_audience: 'Pacientes da região metropolitana',
  unique_value: 'Atendimento humanizado com foco em prevenção',
};

async function mockAuth(page) {
  await page.route('**/api/v1/auth/refresh', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ access_token: 'demo-token' }),
    }),
  );
  await page.route('**/api/v1/auth/me', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ id: 'user-1', email: 'demo@markai.test' }),
    }),
  );
  await page.route('**/api/v1/brand-profile', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(brandProfile),
    }),
  );
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

await mockAuth(page);
await page.goto(`${base}/objetivo`, { waitUntil: 'networkidle' });
await page.waitForSelector('text=Qual é o seu objetivo?', { timeout: 15000 });
await page.screenshot({ path: `${outDir}/objective-page.png`, fullPage: true });

await page.route('**/api/v1/campaigns/camp-demo', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      id: 'camp-demo',
      topic: 'Abrir agenda da clínica com mais confiança local',
      brand_context: brandProfile,
      status: 'DONE',
      created_at: '2026-09-19T12:00:00Z',
      updated_at: '2026-09-19T12:00:00Z',
    }),
  }),
);
await page.route('**/api/v1/posts**', (route) =>
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [
        {
          id: 'post-1',
          campaign_id: 'camp-demo',
          platform: 'LINKEDIN',
          content: 'A confiança começa antes da consulta. Na Clínica Aurora, cada detalhe importa.',
          status: 'APPROVED',
          created_at: '2026-09-19T12:00:00Z',
          updated_at: '2026-09-19T12:00:00Z',
        },
      ],
      total: 1,
      skip: 0,
      limit: 20,
    }),
  }),
);

await page.goto(`${base}/campanhas/camp-demo`, { waitUntil: 'networkidle' });
await page.waitForSelector('text=Aprovar ou refazer', { timeout: 15000 });
await page.getByRole('button', { name: /Refazer/i }).click();
await page.waitForSelector('text=O que melhorar neste post?', { timeout: 5000 });
await page.screenshot({ path: `${outDir}/review-redo-panel.png`, fullPage: true });

await browser.close();
console.log('Screenshots saved to', outDir);
