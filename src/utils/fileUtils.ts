import { App, TFile, moment } from 'obsidian';

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

/**
 * 更新事项的日期
 * @param app Obsidian App 实例
 * @param filePath 文件路径
 * @param lineNumber 行号（1-based）
 * @param newDate 新日期（YYYY-MM-DD 格式）
 * @param newTime 可选的新时间（HH:mm 格式）
 * @returns 是否更新成功
 */
export async function updateItemDate(
  app: App,
  filePath: string,
  lineNumber: number,
  newDate: string,
  newTime?: string
): Promise<boolean> {
  try {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      console.error('[Bullet Journal] File not found:', filePath);
      return false;
    }

    const content = await app.vault.read(file);
    const lines = content.split('\n');

    if (lineNumber < 1 || lineNumber > lines.length) {
      console.error('[Bullet Journal] Line number out of range:', lineNumber);
      return false;
    }

    const currentLine = lines[lineNumber - 1];
    const dateMatch = currentLine.match(/@(\d{4}-\d{2}-\d{2})/);
    const timeMatch = currentLine.match(/@(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})/);

    let newLine: string;
    if (timeMatch && newTime) {
      newLine = currentLine.replace(
        /@\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/,
        `@${newDate} ${newTime}`
      );
    } else if (timeMatch) {
      newLine = currentLine.replace(
        /@\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}/,
        `@${newDate} ${timeMatch[2]}`
      );
    } else if (dateMatch) {
      if (newTime) {
        newLine = currentLine.replace(
          /@\d{4}-\d{2}-\d{2}/,
          `@${newDate} ${newTime}`
        );
      } else {
        newLine = currentLine.replace(/@\d{4}-\d{2}-\d{2}/, `@${newDate}`);
      }
    } else {
      newLine = currentLine.replace(/@(\d{4}-\d{2}-\d{2})?/, `@${newDate}${newTime ? ' ' + newTime : ''}`);
    }

    lines[lineNumber - 1] = newLine;
    await app.vault.modify(file, lines.join('\n'));
    return true;
  } catch (error) {
    console.error('[Bullet Journal] Failed to update item date:', error);
    return false;
  }
}

/**
 * 更新事项的状态标签
 * @param app Obsidian App 实例
 * @param filePath 文件路径
 * @param lineNumber 行号（1-based）
 * @param status 状态标签（#done 或 #abandoned）
 * @returns 是否更新成功
 */
export async function updateItemStatus(
  app: App,
  filePath: string,
  lineNumber: number,
  status: 'completed' | 'abandoned'
): Promise<boolean> {
  try {
    const file = app.vault.getAbstractFileByPath(filePath);
    if (!(file instanceof TFile)) {
      console.error('[Bullet Journal] File not found:', filePath);
      return false;
    }

    const content = await app.vault.read(file);
    const lines = content.split('\n');

    if (lineNumber < 1 || lineNumber > lines.length) {
      console.error('[Bullet Journal] Line number out of range:', lineNumber);
      return false;
    }

    let currentLine = lines[lineNumber - 1];
    const statusTag = status === 'completed' ? '#done' : '#abandoned';
    const zhStatusTag = status === 'completed' ? '#已完成' : '#已放弃';

    if (currentLine.includes(statusTag) || currentLine.includes(zhStatusTag)) {
      return true;
    }

    const existingStatusMatch = currentLine.match(/(#done|#abandoned|#已完成|#已放弃)/);
    if (existingStatusMatch) {
      currentLine = currentLine.replace(existingStatusMatch[1], statusTag);
    } else {
      currentLine = currentLine.trim() + ' ' + statusTag;
    }

    lines[lineNumber - 1] = currentLine;
    await app.vault.modify(file, lines.join('\n'));
    return true;
  } catch (error) {
    console.error('[Bullet Journal] Failed to update item status:', error);
    return false;
  }
}

/**
 * 获取明天的日期字符串
 */
export function getTomorrowDate(): string {
  const tomorrow = moment();
  tomorrow.add(1, 'days');
  return tomorrow.format('YYYY-MM-DD');
}

/**
 * 获取今天的日期字符串
 */
export function getTodayDate(): string {
  return moment().format('YYYY-MM-DD');
}
