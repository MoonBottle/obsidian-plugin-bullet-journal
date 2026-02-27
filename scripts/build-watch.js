const esbuild = require('esbuild');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
require('dotenv').config();

const isWatch = process.argv.includes('--watch');

const PLUGIN_DIR = process.env.OBSIDIAN_PLUGIN_DIR || '../.obsidian/plugins/obsidian-plugin-bullet-journal/';

const filesToSync = [
  { source: 'main.js', required: true },
  { source: 'styles.css', required: true },
  { source: 'manifest.json', required: false }
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

    await ctx.watch();

    // 启动 CSS 文件监听
    watchCSS();

    console.log('[build] 正在监听文件变化，按 Ctrl+C 停止');
  } else {
    console.log('[build] 开始构建...');
    await ctx.rebuild();
    await ctx.dispose();
  }
}

build().catch((error) => {
  console.error('[build] 错误:', error);
  process.exit(1);
});
