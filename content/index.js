/**
 * 内容总入口：代码只从这里取素材，不直接 import 具体文件。
 * 加一份新素材 = 在对应目录写一个文件 + 在它的 index.js 里加一行。
 */

import { regions, regionList } from './regions/index.js';
import { activities, activityList } from './activities/index.js';
import { terrains, terrainList } from './terrains/index.js';
import { questions, questionList, defaultQuestionId } from './questions/index.js';

export const content = {
  regions,
  activities,
  terrains,
  questions,
  regionList,
  activityList,
  terrainList,
  questionList,
  defaultQuestionId
};

export default content;
