// todo 编辑总结
import type { NextApiRequest, NextApiResponse } from "next";
import nodeXlsx from 'node-xlsx'	//引用node-xlsx模块
import * as path from 'path';  //引用path模块
import { insertCaseVector } from './common/initMilvus';
import { embedOne } from './common/initOpenAi';

//下方ex1是读取出来的数组，数组长度取决于Excel文件的工作表(sheet)
const ex1 = nodeXlsx.parse(path.resolve(__dirname, './case.xlsx'))	//读取excel表格

let excel_content = ex1[0].data	//取出excel文件中的第一个工作表中的全部数据

excel_content.splice(0, 1)	//一般来说表中的第一条数据可能是标题没有用，所以删掉

console.log(excel_content.length)

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  for (let i = 0, len = excel_content.length; i < len; i++) {
    // if (i < 13750) {
    //   continue;
    // }
    const item = excel_content[i];
    if (!Array.isArray(item)) {
      continue;
    }
    const caseId = item[0] || '';
    const question = item[1] || '';
    const reason = item[2] || '';
    const solution = item[3] || '';
    if (!question) {
      continue;
    }
    console.log(i);
    console.time('embedding');
    const embedding = await embedOne(question);
    console.timeEnd('embedding');
    console.time('insert');
    await insertCaseVector({
      vector: embedding, name: 'case', partitionName: 'case1', question, reason, solution, caseId,
    });
    console.timeEnd('insert');
  }
  res.status(200).send('ok');
}
