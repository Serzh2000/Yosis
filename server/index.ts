import express, { type ErrorRequestHandler } from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BuildManager } from './builds';
import { SimulationManager } from './simulations';
import { PhysicalManager } from './physical';
import { RequestError, validateProject, validateSimulationConfig } from './validation';
import {
  ApiSecurity,
  createJobLimits,
  claimJob,
  requireJobOwner,
  environmentApiOptions,
  type ApiOptions,
} from './api-security';
import { UserStore } from './user-store';
import { workspace, dataDirectory } from './paths';
import { DebuggerBackupStore, createDebuggerBackupRouter } from './debugger-backup-store';
import { SyntaxManager } from './syntax';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const DEVELOPMENT_ORIGINS = new Set(['http://127.0.0.1:5173', 'http://localhost:5173']);

export function createApp(
  manager: BuildManager,
  production = false,
  simulations = new SimulationManager(path.join(path.dirname(manager.root), '.simulations')),
  physical = new PhysicalManager(path.join(path.dirname(manager.root), '.physical'), manager),
  options: ApiOptions = environmentApiOptions(),
) {
  const app = express();
  const security = new ApiSecurity(options);
  const local = !security.publicOrigin;
  const limits = createJobLimits(options, local);
  const userStore = new UserStore(path.join(path.dirname(manager.root), '.users'));
  const syntax = new SyntaxManager();
  app.locals.close = () => syntax.close();
  app.disable('x-powered-by');
  app.use((request, response, next) => {
    const host = request.get('host');
    let hostname: string;
    try {
      hostname = new URL(`http://${host}`).hostname;
    } catch {
      response.status(403).json({ error: 'Недопустимый адрес сервера.' });
      return;
    }
    // Переход localhost → 127.0.0.1 (единый локальный адрес) приходит как cross-site навигация
    // за страницей документа; API и вложенные кадры по-прежнему отклоняются.
    const documentNavigation =
      local &&
      request.method === 'GET' &&
      !request.path.startsWith('/api/') &&
      request.get('sec-fetch-mode') === 'navigate' &&
      request.get('sec-fetch-dest') === 'document';
    if (
      (local ? !LOOPBACK_HOSTS.has(hostname) : host !== security.publicOrigin!.host) ||
      (request.get('sec-fetch-site') === 'cross-site' && !documentNavigation)
    ) {
      response.status(403).json({ error: 'Запрос должен поступать через разрешённый адрес IDE.' });
      return;
    }
    const origin = request.get('origin');
    const developmentOrigin = local && !production && origin && DEVELOPMENT_ORIGINS.has(origin);
    const expectedOrigin = security.publicOrigin?.origin ?? `http://${host}`;
    if (origin && origin !== expectedOrigin && !developmentOrigin) {
      response
        .status(403)
        .json({ error: 'Запрос должен поступать с того же адреса, что и интерфейс IDE.' });
      return;
    }
    response.setHeader('X-Content-Type-Options', 'nosniff');
    if (request.path.startsWith('/api/')) response.setHeader('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '3mb', strict: true }));
  app.post('/api/session', (request, response) => security.login(request, response));
  app.use('/api', (request, response, next) => {
    const user = security.user(request);
    if (!user) {
      response.status(401).json({ error: 'Войдите с персональным ключом доступа.' });
      return;
    }
    response.locals.user = user;
    next();
  });
  app.get('/api/session', (_request, response) =>
    response.json({ user: response.locals.user, local }),
  );
  app.delete('/api/session', (request, response) => security.logout(request, response));
  app.use(
    '/api/debugger-backups',
    createDebuggerBackupRouter(
      new DebuggerBackupStore(path.join(dataDirectory, '.debugger-backups')),
      (request) => String(request.res?.locals.user),
    ),
  );
  app.get('/api/projects', async (_request, response) =>
    response.json(await userStore.list(response.locals.user)),
  );
  app.get('/api/projects/:id', async (request, response) =>
    response.json(await userStore.get(response.locals.user, request.params.id)),
  );
  app.put('/api/projects/:id', async (request, response) =>
    response.json(
      await userStore.save(
        response.locals.user,
        request.params.id,
        request.body?.project,
        request.get('if-match'),
      ),
    ),
  );
  app.delete('/api/projects/:id', async (request, response) => {
    await userStore.delete(response.locals.user, request.params.id);
    response.status(204).end();
  });
  app.get('/api/progress', async (_request, response) =>
    response.json(await userStore.progress(response.locals.user)),
  );
  app.put('/api/progress', async (request, response) => {
    await userStore.saveProgress(response.locals.user, request.body);
    response.status(204).end();
  });
  app.post('/api/syntax', async (request, response) => {
    if (!request.is('application/json'))
      throw new RequestError('Ожидается Content-Type: application/json.', 415);
    const project = validateProject(request.body?.project),
      abort = new AbortController();
    response.once('close', () => {
      if (!response.writableFinished) abort.abort();
    });
    const result = await syntax.check(response.locals.user, project, abort.signal);
    if (!response.destroyed) response.json(result);
  });
  for (const [route, jobs] of [
    ['builds', manager],
    ['simulations', simulations],
    ['physical', physical],
  ] as const) {
    app.use(`/api/${route}/:id`, async (request, response, next) => {
      await requireJobOwner(jobs.root, request.params.id, response.locals.user, local);
      next();
    });
    app.get(`/api/${route}/:id/status`, async (request, response) => {
      const offset = request.query.logOffset === undefined ? 0 : Number(request.query.logOffset);
      response.json(await jobs.status(request.params.id, offset));
    });
  }
  async function submit<T extends { id: string }>(
    user: string,
    jobs: {
      root: string;
      status(id: string): Promise<{ status?: unknown }>;
      cancel(id: string): Promise<unknown>;
    },
    create: () => Promise<T>,
  ) {
    const reservation = await limits.reserve(user);
    let result: T | undefined;
    try {
      result = await create();
      await claimJob(jobs.root, result.id, user);
      const id = result.id;
      reservation.register(id, () => jobs.status(id));
      return result;
    } catch (error) {
      if (result) await jobs.cancel(result.id);
      throw error;
    } finally {
      reservation.release();
    }
  }
  app.get('/api/health', async (_request, response) => {
    const [status, simulator, placement] = await Promise.all([
      manager.health(),
      simulations.health(),
      physical.health(),
    ]);
    response.json({
      ...status,
      simulator,
      physical: placement,
      capabilities: {
        ...status.capabilities,
        simulation: status.yosys.available && simulator.available,
        placeAndRoute: placement.available,
        bitstream: placement.available && placement.bitstreamAvailable,
      },
    });
  });
  app.post('/api/builds', async (request, response) => {
    if (!request.is('application/json'))
      throw new RequestError('Ожидается Content-Type: application/json.', 415);
    const project = validateProject(request.body?.project);
    response
      .status(202)
      .json(await submit(response.locals.user, manager, () => manager.create(project)));
  });
  app.get('/api/builds/:id', async (request, response) =>
    response.json(await manager.get(request.params.id)),
  );
  app.post('/api/builds/:id/cancel', async (request, response) => {
    response.json(await manager.cancel(request.params.id));
  });
  app.get('/api/builds/:id/artifacts/:name', async (request, response) => {
    const filename = await manager.artifact(request.params.id, request.params.name);
    response.download(filename, request.params.name, { dotfiles: 'allow' });
  });
  app.post('/api/simulations', async (request, response) => {
    if (!request.is('application/json'))
      throw new RequestError('Ожидается Content-Type: application/json.', 415);
    const project = validateProject(request.body?.project),
      config = validateSimulationConfig(request.body?.config);
    response
      .status(202)
      .json(
        await submit(response.locals.user, simulations, () => simulations.create(project, config)),
      );
  });
  app.get('/api/simulations/:id', async (request, response) =>
    response.json(await simulations.get(request.params.id)),
  );
  app.post('/api/simulations/:id/cancel', async (request, response) =>
    response.json(await simulations.cancel(request.params.id)),
  );
  app.get('/api/simulations/:id/artifacts/:name', async (request, response) => {
    const filename = await simulations.artifact(request.params.id, request.params.name);
    response.download(filename, request.params.name, { dotfiles: 'allow' });
  });
  app.post('/api/physical', async (request, response) => {
    if (!request.is('application/json'))
      throw new RequestError('Ожидается Content-Type: application/json.', 415);
    await requireJobOwner(manager.root, request.body?.buildId, response.locals.user, local);
    const project = validateProject(request.body?.project);
    response
      .status(202)
      .json(
        await submit(response.locals.user, physical, () =>
          physical.create(project, request.body?.buildId, request.body?.config),
        ),
      );
  });
  app.get('/api/physical/:id', async (request, response) =>
    response.json(await physical.get(request.params.id)),
  );
  app.post('/api/physical/:id/cancel', async (request, response) =>
    response.json(await physical.cancel(request.params.id)),
  );
  app.get('/api/physical/:id/artifacts/:name', async (request, response) => {
    const artifact = await physical.artifact(request.params.id, request.params.name);
    response.setHeader('Content-Type', artifact.mime);
    response.setHeader('Content-Disposition', `attachment; filename="${artifact.filename}"`);
    response.send(artifact.content);
  });
  app.use('/api', (_request, response) =>
    response.status(404).json({ error: 'Маршрут API не найден.' }),
  );
  if (production) {
    app.use(express.static(path.join(workspace, 'dist')));
    app.get('/{*path}', (_request, response) =>
      // `root` keeps the dotfile check relative to dist: an install path such as
      // C:\Users\name\.apps\yosis must not turn every deep link into 404.
      response.sendFile('index.html', { root: path.join(workspace, 'dist') }),
    );
  }
  const errors: ErrorRequestHandler = (error, _request, response, _next) => {
    const status =
      error instanceof RequestError
        ? error.status
        : error.status === 413
          ? 413
          : error.type === 'entity.parse.failed'
            ? 400
            : 500;
    const message =
      status === 413
        ? 'Размер запроса превышает допустимый.'
        : status === 400 && error.type === 'entity.parse.failed'
          ? 'Не удалось прочитать JSON запроса.'
          : error instanceof RequestError
            ? error.message
            : 'Ошибка сервиса сборки.';
    if (status === 500) console.error(error);
    response.status(status).json({ error: message });
  };
  app.use(errors);
  return app;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const port = Number(process.env.YOSIS_API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error('YOSIS_API_PORT должен быть числом от 1 до 65535.');
  const manager = new BuildManager(path.join(dataDirectory, '.builds'));
  const simulations = new SimulationManager(path.join(dataDirectory, '.simulations'));
  const physical = new PhysicalManager(path.join(dataDirectory, '.physical'), manager);
  const production = process.argv.includes('--production');
  void Promise.all([manager.prune(), simulations.prune(), physical.prune()]);
  const host = process.env.YOSIS_LISTEN_HOST ?? '127.0.0.1';
  if (!LOOPBACK_HOSTS.has(host) && !process.env.YOSIS_PUBLIC_ORIGIN)
    throw new Error('Публичный listen host требует YOSIS_PUBLIC_ORIGIN и авторизации.');
  const app = createApp(manager, production, simulations, physical);
  const server = app.listen(port, host, (error?: Error) => {
    if (error) {
      console.error(`Не удалось запустить API на порту ${port}: ${error.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Yosis: http://127.0.0.1:${port} · ${production ? 'production' : 'API'}`);
  });
  const stop = async () => {
    server.close();
    app.locals.close();
    await Promise.all([manager.close(), simulations.close(), physical.close()]);
    process.exit(0);
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}
