const esbuild = require('esbuild');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
require('dotenv').config();

const isWatch = process.argv.includes('--watch');

const PLUGIN_BASE_DIR = process.env.OBSIDIAN_PLUGIN_DIR || '../.obsidian/plugins';
const PLUGIN_NAME = 'obsidian-plugin-bullet-journal';
const PLUGIN_DIR = path.join(PLUGIN_BASE_DIR, PLUGIN_NAME);

const filesToSync = [
  { source: 'main.js', required: true },
  { source: 'styles.css', required: true },
  { source: 'manifest.json', required: false },
  { source: 'mcp-server.js', required: false }
];

async function ensureDir(dir) {
  try {
    await fsp.access(dir);
  } catch {
    await fsp.mkdir(dir, { recursive: true });
    console.log(`[build] 创建目录: ${dir}`);
  }
}

async function syncFile(sourceFile, targetDir, required) {
  const sourcePath = path.resolve(sourceFile);
  const targetPath = path.join(targetDir, path.basename(sourceFile));

  try {
    await fsp.access(sourcePath);
  } catch (error) {
    if (required) {
      console.error(`[build] 错误: 必需文件不存在: ${sourceFile}`);
      return false;
    } else {
      return true;
    }
  }

  try {
    const content = await fsp.readFile(sourcePath);
    await fsp.writeFile(targetPath, content);
    console.log(`[build] 同步成功: ${sourceFile} -> ${targetPath}`);
    return true;
  } catch (error) {
    console.error(`[build] 同步失败: ${sourceFile}`, error.message);
    return false;
  }
}

async function syncFiles() {
  const targetDir = path.resolve(PLUGIN_DIR);
  await ensureDir(targetDir);

  let allSuccess = true;
  for (const { source, required } of filesToSync) {
    const success = await syncFile(source, targetDir, required);
    if (!success && required) {
      allSuccess = false;
    }
  }

  return allSuccess;
}

// 创建同步插件
const syncPlugin = {
  name: 'sync-plugin',
  setup(build) {
    build.onEnd(async (result) => {
      if (result.errors.length > 0) {
        console.error('[build] 构建失败:', result.errors);
        return;
      }
      console.log('[build] 构建完成，开始同步文件...');
      await syncFiles();
    });
  }
};

// 使用 fs.watch 监听 CSS 文件
function watchCSS() {
  const cssFiles = filesToSync
    .filter(f => f.source.endsWith('.css'))
    .map(f => path.resolve(f.source));

  cssFiles.forEach(cssPath => {
    try {
      fs.watch(cssPath, async (eventType) => {
        if (eventType === 'change') {
          console.log(`[build] 检测到 CSS 变更: ${path.basename(cssPath)}`);
          await syncFile(path.basename(cssPath), path.resolve(PLUGIN_DIR), true);
        }
      });
      console.log(`[build] 开始监听 CSS: ${path.basename(cssPath)}`);
    } catch (error) {
      console.error(`[build] 监听 CSS 失败: ${cssPath}`, error.message);
    }
  });
}

async function buildMCP() {
  try {
    const result = await esbuild.build({
      entryPoints: ['src/mcp/server.ts'],
      outfile: 'mcp-server.js',
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'cjs',
      minify: false,
      sourcemap: true
    });

    if (result.errors.length > 0) {
      console.error('[build-mcp] MCP 构建失败:', result.errors);
      return false;
    }

    console.log('[build-mcp] MCP 服务器构建成功');
    return true;
  } catch (error) {
    console.error('[build-mcp] MCP 构建错误:', error.message);
    return false;
  }
}

async function build() {
  const ctx = await esbuild.context({
    entryPoints: ['main.ts'],
    bundle: true,
    outfile: 'main.js',
    external: [
      'obsidian',
      'electron',
      '@codemirror/autocomplete',
      '@codemirror/closebrackets',
      '@codemirror/collab',
      '@codemirror/commands',
      '@codemirror/comment',
      '@codemirror/fold',
      '@codemirror/gutter',
      '@codemirror/highlight',
      '@codemirror/history',
      '@codemirror/language',
      '@codemirror/lint',
      '@codemirror/matchbrackets',
      '@codemirror/panel',
      '@codemirror/rangeset',
      '@codemirror/rectangular-selection',
      '@codemirror/search',
      '@codemirror/state',
      '@codemirror/stream-parser',
      '@codemirror/text',
      '@codemirror/tooltip',
      '@codemirror/view'
    ],
    format: 'cjs',
    platform: 'node',
    logLevel: 'info',
    plugins: [syncPlugin],
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': isWatch ? '"development"' : '"production"'
    }
  });

  if (isWatch) {
    console.log('[build] 启动 watch 模式...');
    console.log(`[build] 插件目录: ${path.resolve(PLUGIN_DIR)}`);

    // 先构建 MCP 服务器
    await buildMCP();

    await ctx.watch();

    // 启动 CSS 文件监听
    watchCSS();

    // 监听 MCP 相关文件变化
    watchMCP();

    console.log('[build] 正在监听文件变化，按 Ctrl+C 停止');
  } else {
    console.log('[build] 开始构建...');
    await ctx.rebuild();
    await ctx.dispose();
    // 非 watch 模式也构建 MCP
    await buildMCP();
  }
}

// 监听 MCP 相关文件变化
function watchMCP() {
  const mcpDir = path.resolve('src/mcp');
  try {
    fs.watch(mcpDir, { recursive: true }, async (eventType, filename) => {
      if (filename && filename.endsWith('.ts')) {
        console.log(`[build-mcp] 检测到 MCP 文件变更: ${filename}`);
        await buildMCP();
        await syncFile('mcp-server.js', path.resolve(PLUGIN_DIR), false);
      }
    });
    console.log(`[build-mcp] 开始监听 MCP 目录: ${mcpDir}`);
  } catch (error) {
    console.error(`[build-mcp] 监听 MCP 目录失败:`, error.message);
  }
}

build().catch((error) => {
  console.error('[build] 错误:', error);
  process.exit(1);
});
