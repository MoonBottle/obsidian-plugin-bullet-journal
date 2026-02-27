import { App, Editor, MarkdownView, TFile, Plugin } from 'obsidian';
import { ViewPlugin, Decoration, DecorationSet, EditorView, WidgetType, ViewUpdate } from '@codemirror/view';
import { RangeSetBuilder } from '@codemirror/state';
import { LineParser } from '../utils/lineParser';
import { EventDetailsModal } from '../modals/EventDetailsModal';

// Helper to get App instance
function getApp(): App {
  return (window as any).app;
}

class TaskButtonWidget extends WidgetType {
  constructor(
    private lineText: string,
    private lineNumber: number // 1-based
  ) {
    super();
  }

  toDOM(view: EditorView): HTMLElement {
    const span = document.createElement('span');
    span.className = 'hk-work-task-btn';
    // Add an icon or just a box. The screenshot implies a button.
    // We can use an SVG icon or a simple char.
    // Using a simple unicode char or CSS-styled box.
    // Let's use a "Details" icon (e.g. ℹ️ or similar)
    // Or just an empty box that is styled via CSS to look like the red box (but likely user wants a button).
    // I'll add a class and maybe an icon.
    // Obsidian uses Lucide icons. We can create one.
    // But for simplicity, I'll use a span with text/icon.
    span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-check"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg>';
    
    span.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.openModal(view);
    };
    
    return span;
  }

  private openModal(view: EditorView) {
    const app = getApp();
    const activeLeaf = app.workspace.getLeaf(false);

    // Try to get file from the view if possible, or active file
    let file: TFile | null = null;
    if (activeLeaf.view instanceof MarkdownView) {
        file = activeLeaf.view.file;
    } else {
        file = app.workspace.getActiveFile();
    }

    if (!file) return;

    // Parse the item
    const item = LineParser.parseItemLine(this.lineText, this.lineNumber);
    if (!item) return;

    // Scan context
    const context = this.scanContext(view, this.lineNumber);

    // Check if current line is a task line (not an item line)
    const isTaskLine = this.lineText.includes('#任务');

    // Get plugin instance from global
    const plugin = (window as any).hkWorkPlugin;

    new EventDetailsModal(app, {
      title: item.content,
      start: item.startDateTime || item.date || '',
      end: item.endDateTime || item.date || '',
      allDay: !item.startDateTime, // Assuming all day if no time
      project: file.basename,
      projectLinks: context.projectLinks,
      task: context.taskName,
      taskLinks: context.taskLinks,
      level: context.level,
      item: item.content,
      hasItems: !isTaskLine,
      filePath: file.path,
      lineNumber: item.lineNumber,
      fromEditor: true
    }, plugin).open();
  }

  private scanContext(view: EditorView, currentLineNumber: number): { taskName: string, level: string, projectLinks: Array<{ name: string; url: string }>, taskLinks?: Array<{ name: string; url: string }> } {
    let taskName = '';
    let level = '';
    const projectLinks: Array<{ name: string; url: string }> = [];
    let taskLinks: Array<{ name: string; url: string }> | undefined;

    const doc = view.state.doc;
    
    // First check if current line is a task line
    const currentLine = doc.line(currentLineNumber);
    const currentText = currentLine.text;
    if (currentText.includes('#任务')) {
      const task = LineParser.parseTaskLine(currentText, currentLineNumber);
      console.log('[TaskGutter] Current line is task line:', currentText);
      console.log('[TaskGutter] Parsed task:', task);
      taskName = task.name;
      level = task.level;
      taskLinks = task.links;
    } else {
      // Scan upwards for Task
      // currentLineNumber is 1-based. 
      // We start from the line before the current one.
      for (let i = currentLineNumber - 1; i >= 1; i--) {
        const line = doc.line(i);
        const text = line.text;
        
        if (text.includes('#任务')) {
          const task = LineParser.parseTaskLine(text, i);
          console.log('[TaskGutter] Found task line:', text);
          console.log('[TaskGutter] Parsed task:', task);
          taskName = task.name;
          level = task.level;
          taskLinks = task.links;
          break;
        }
      }
    }

    // Scan file header for Project Links (first 50 lines)
    // Supports: 
    // - 甘特图：url
    // - [name](url) (excluding task lines)
    const limit = Math.min(doc.lines, 50);
    for (let i = 1; i <= limit; i++) {
      const line = doc.line(i);
      const text = line.text.trim();
      
      // Stop scanning if we hit "### 工作任务"
      if (text === '### 工作任务') {
        break;
      }

      // Check for Gantt link
      const ganttMatch = text.match(/甘特图[：:]\s*(https?:\/\/\S+)/);
      if (ganttMatch) {
        projectLinks.push({ name: '甘特图', url: ganttMatch[1] });
        continue;
      }

      // Check for Markdown links [name](url)
      // Make sure it's not a task line or an item line
      if (!text.includes('#任务') && !LineParser.isItemLine(text) && text.startsWith('[') && text.includes('](')) {
        const linkMatch = text.match(/\[(.*?)\]\((.*?)\)/);
        if (linkMatch) {
          projectLinks.push({ name: linkMatch[1], url: linkMatch[2] });
        }
      }
    }

    return { taskName, level, projectLinks, taskLinks };
  }
}

export const taskGutterPlugin = ViewPlugin.fromClass(class {
  decorations: DecorationSet;

  constructor(view: EditorView) {
    this.decorations = this.buildDecorations(view);
  }

  update(update: ViewUpdate) {
    if (update.docChanged || update.viewportChanged) {
      this.decorations = this.buildDecorations(update.view);
    }
  }

  buildDecorations(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>();
    
    for (const { from, to } of view.visibleRanges) {
      // Expand range to line boundaries
      const startLine = view.state.doc.lineAt(from);
      const endLine = view.state.doc.lineAt(to);
      
      for (let i = startLine.number; i <= endLine.number; i++) {
        const line = view.state.doc.line(i);
        const text = line.text;
        
        if (LineParser.isItemLine(text)) {
          // Find the start of the text (skipping indentation)
          const textStart = text.search(/\S|$/);
          
          builder.add(
            line.from + textStart,
            line.from + textStart,
            Decoration.widget({
              widget: new TaskButtonWidget(text, i),
              side: -1
            })
          );
        }
      }
    }

    return builder.finish();
  }
}, {
  decorations: v => v.decorations
});
