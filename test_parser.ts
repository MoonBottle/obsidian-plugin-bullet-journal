
import { LineParser } from './src/utils/lineParser';

const testLines = [
    "[HiBot - AIoT 智能助理](http://jira.example.com/browse/HIBOT-123) #任务 @L1",
    "普通任务 #任务 [JIRA](http://jira.example.com/browse/TASK-456)",
    "任务带裸链接 #任务 http://example.com",
    "混合链接 #任务 [Markdown](http://md.com) 和 http://raw.com"
];

testLines.forEach((line, index) => {
    console.log(`\nTest Case ${index + 1}: ${line}`);
    const task = LineParser.parseTaskLine(line, index + 1);
    console.log("Parsed Name:", task.name);
    console.log("Parsed Links:", JSON.stringify(task.links, null, 2));
});
