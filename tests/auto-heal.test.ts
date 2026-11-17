import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyPatch, collectContext, requestPatch } from '../scripts/auto-heal';
import type { FailureContext, SourcePatch } from '../scripts/auto-heal';

let repositoryRoot: string;
const source = 'export const status: string = "broken";\n';
const patch: SourcePatch = {
  summary: 'Restore the expected status.',
  edits: [{ path: 'src/service.ts', oldText: '"broken"', newText: '"ok"' }],
};
const context: FailureContext = {
  rules: 'Keep layers separate.',
  failureLog: 'FAIL',
  diff: '',
  files: [],
};

beforeEach(async (): Promise<void> => {
  repositoryRoot = await mkdtemp(join(tmpdir(), 'campushub-auto-heal-'));
  await mkdir(join(repositoryRoot, 'src/__tests__'), { recursive: true });
  await mkdir(join(repositoryRoot, 'src/test'), { recursive: true });
  await mkdir(join(repositoryRoot, 'shared'));
  await Promise.all([
    writeFile(join(repositoryRoot, 'src/service.ts'), source),
    writeFile(join(repositoryRoot, 'src/__tests__/service.test.ts'), 'test context'),
    writeFile(join(repositoryRoot, 'src/test/setup.ts'), 'test helper'),
    writeFile(
      join(repositoryRoot, 'shared/api.d.ts'),
      'export interface Status { status: string }',
    ),
    writeFile(join(repositoryRoot, '.cursorignore'), 'src/ignored.ts\n'),
    writeFile(join(repositoryRoot, 'AGENTS.md'), 'Repository rules'),
    writeFile(join(repositoryRoot, 'test-results.log'), 'FAIL src/__tests__/service.test.ts'),
    writeFile(
      join(repositoryRoot, 'failing.diff'),
      'diff --git a/src/service.ts b/src/service.ts\n- broken\n+ ok\n',
    ),
  ]);
  execFileSync('git', ['init', '--quiet'], { cwd: repositoryRoot });
  execFileSync('git', ['add', '.'], { cwd: repositoryRoot });
});

afterEach(async (): Promise<void> => {
  await rm(repositoryRoot, { recursive: true, force: true });
});

describe('auto-heal source patch boundaries', (): void => {
  it('applies a source fix and preserves tests', async (): Promise<void> => {
    await applyPatch(repositoryRoot, patch);
    expect(await readFile(join(repositoryRoot, 'src/service.ts'), 'utf8')).toBe(
      source.replace('broken', 'ok'),
    );
    expect(await readFile(join(repositoryRoot, 'src/__tests__/service.test.ts'), 'utf8')).toBe(
      'test context',
    );
  });

  it.each([
    '../outside.ts',
    'src/../outside.ts',
    '/tmp/outside.ts',
    'src/__tests__/service.test.ts',
    'src/test/setup.ts',
    'src/service.spec.ts',
    'src/new-file.ts',
    'shared/api.d.ts',
    '.github/workflows/ci.yml',
    'package.json',
  ])('rejects forbidden or untracked path %s', async (path: string): Promise<void> => {
    await expect(
      applyPatch(repositoryRoot, {
        ...patch,
        edits: [{ ...patch.edits[0], path }],
      }),
    ).rejects.toThrow('forbidden or untracked');
    expect(await readFile(join(repositoryRoot, 'src/service.ts'), 'utf8')).toBe(source);
  });

  it('validates the entire patch before writing files', async (): Promise<void> => {
    await expect(
      applyPatch(repositoryRoot, {
        ...patch,
        edits: [...patch.edits, { ...patch.edits[0], path: 'package.json' }],
      }),
    ).rejects.toThrow();
    expect(await readFile(join(repositoryRoot, 'src/service.ts'), 'utf8')).toBe(source);
  });

  it.each(['missing', 'export', '"broken"'])(
    'rejects missing or ambiguous fragment %s',
    async (oldText: string): Promise<void> => {
      await writeFile(join(repositoryRoot, 'src/service.ts'), source + source);
      await expect(
        applyPatch(repositoryRoot, {
          ...patch,
          edits: [{ path: 'src/service.ts', oldText, newText: 'fixed' }],
        }),
      ).rejects.toThrow('exactly one');
    },
  );

  it('rejects an unchanged replacement', async (): Promise<void> => {
    await expect(
      applyPatch(repositoryRoot, {
        ...patch,
        edits: [{ ...patch.edits[0], newText: patch.edits[0].oldText }],
      }),
    ).rejects.toThrow('exactly one');
  });

  it('treats replacement text literally', async (): Promise<void> => {
    await applyPatch(repositoryRoot, {
      ...patch,
      edits: [{ ...patch.edits[0], newText: '"$&"' }],
    });
    expect(await readFile(join(repositoryRoot, 'src/service.ts'), 'utf8')).toContain('"$&"');
  });

  it('rejects an empty repair without changing files', async (): Promise<void> => {
    await expect(
      applyPatch(repositoryRoot, { summary: 'Infrastructure failure', edits: [] }),
    ).rejects.toThrow('safe source fix');
    expect(await readFile(join(repositoryRoot, 'src/service.ts'), 'utf8')).toBe(source);
  });

  it('rejects a tracked source symbolic link', async (): Promise<void> => {
    await symlink(join(repositoryRoot, 'src/service.ts'), join(repositoryRoot, 'src/link.ts'));
    execFileSync('git', ['add', 'src/link.ts'], { cwd: repositoryRoot });
    await expect(
      applyPatch(repositoryRoot, {
        ...patch,
        edits: [{ ...patch.edits[0], path: 'src/link.ts' }],
      }),
    ).rejects.toThrow(/symbolic links|forbidden or untracked/);
    expect(await readFile(join(repositoryRoot, 'src/service.ts'), 'utf8')).toBe(source);
  });
});

describe('auto-heal failure context', (): void => {
  it('includes the log, diff, rules and test context while excluding ignored and untracked files', async (): Promise<void> => {
    await writeFile(join(repositoryRoot, 'src/ignored.ts'), 'ignored source');
    execFileSync('git', ['add', 'src/ignored.ts'], { cwd: repositoryRoot });
    await writeFile(join(repositoryRoot, 'src/untracked.ts'), 'untracked source');
    await writeFile(
      join(repositoryRoot, 'failing.diff'),
      'diff --git a/src/service.ts b/src/service.ts\n- broken\n+ ok\n' +
        'diff --git a/src/ignored.ts b/src/ignored.ts\n- private\n+ ignored change\n',
    );
    const result = await collectContext(
      repositoryRoot,
      join(repositoryRoot, 'test-results.log'),
      join(repositoryRoot, 'failing.diff'),
    );
    expect(result.rules).toBe('Repository rules');
    expect(result.diff).toContain('broken');
    expect(result.diff).not.toContain('ignored change');
    expect(result.failureLog).toContain('FAIL');
    expect(result.files[0].path).toBe('src/__tests__/service.test.ts');
    expect(result.files.map((file: { path: string }): string => file.path)).toEqual(
      expect.arrayContaining(['src/service.ts', 'shared/api.d.ts']),
    );
    expect(
      result.files.some((file: { path: string }): boolean => /ignored|untracked/.test(file.path)),
    ).toBe(false);
  });

  it('rejects an empty log before contacting a model', async (): Promise<void> => {
    await writeFile(join(repositoryRoot, 'test-results.log'), '');
    await expect(
      collectContext(
        repositoryRoot,
        join(repositoryRoot, 'test-results.log'),
        join(repositoryRoot, 'failing.diff'),
      ),
    ).rejects.toThrow('empty');
  });
});

describe('auto-heal model responses', (): void => {
  it('sends failure context and parses a structured patch', async (): Promise<void> => {
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ finish_reason: 'stop', message: { content: JSON.stringify(patch) } }],
        }),
      ),
    );
    await expect(requestPatch('test-key', 'gpt-4.1', context)).resolves.toEqual(patch);
    const requestBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body)) as {
      model: string;
      messages: { content: string }[];
      response_format: { type: string };
    };
    expect(requestBody.model).toBe('gpt-4.1');
    expect(requestBody.messages[0].content).toContain('Parse the attached Jest failure log.');
    expect(JSON.parse(requestBody.messages[1].content)).toEqual(context);
    expect(requestBody.response_format.type).toBe('json_schema');
  });

  it('reports provider failures without exposing response data', async (): Promise<void> => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('sensitive provider payload', { status: 429 }));
    await expect(requestPatch('test-key', 'gpt-4.1', context)).rejects.toThrow('HTTP 429');
  });

  it.each([
    ['insufficient_quota', 'API quota exhausted'],
    ['rate_limit_exceeded', 'API rate limit exceeded'],
  ])('distinguishes provider error %s', async (code: string, expected: string): Promise<void> => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code, message: 'sensitive provider payload' },
        }),
        { status: 429 },
      ),
    );
    await expect(requestPatch('test-key', 'gpt-4.1', context)).rejects.toThrow(expected);
  });

  it('does not log arbitrary provider error codes', async (): Promise<void> => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          error: { code: 'sensitive provider payload', message: 'sensitive provider payload' },
        }),
        { status: 429 },
      ),
    );
    await expect(requestPatch('test-key', 'gpt-4.1', context)).rejects.toThrow(
      'OpenAI request failed (HTTP 429). Check the key, model access, and API quota.',
    );
  });

  it.each([
    { finish_reason: 'length', message: { content: JSON.stringify(patch) } },
    { finish_reason: 'stop', message: { content: null } },
    { finish_reason: 'stop', message: { content: '{"summary":"missing edits"}' } },
    { finish_reason: 'stop', message: { content: 'not JSON' } },
  ])('rejects incomplete or malformed responses %#', async (choice: unknown): Promise<void> => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response(JSON.stringify({ choices: [choice] })));
    await expect(requestPatch('test-key', 'gpt-4.1', context)).rejects.toThrow();
  });
});
