import { App, TFile } from 'obsidian';

/**
 * 打开文件并定位到指定行
 * 如果文件已打开，复用现有标签页；否则在新标签页中打开
 * @param app Obsidian App 实例
 * @param filePath 文件路径
 * @param lineNumber 可选的行号（1-based）
 * @returns 是否成功打开
 */
export async function openFileAtLine(
  app: App,
  filePath: string,
  lineNumber?: number
): Promise<boolean> {
  const file = app.vault.getAbstractFileByPath(filePath);
  if (!(file instanceof TFile)) {
    return false;
  }

  // 检查文件是否已打开
  const leaves = app.workspace.getLeavesOfType('markdown');
  let targetLeaf = leaves.find(leaf => {
    const viewState = leaf.getViewState();
    return viewState.state?.file === file.path;
  });

  if (targetLeaf) {
    // 复用已打开的 leaf
    await targetLeaf.openFile(file, {
      active: true,
      eState: lineNumber ? { line: lineNumber - 1 } : undefined
    });
  } else {
    // 使用 openLinkText 打开新文件
    await app.workspace.openLinkText(file.path, '', false, {
      eState: lineNumber ? { line: lineNumber - 1 } : undefined
    });
  }

  return true;
}
