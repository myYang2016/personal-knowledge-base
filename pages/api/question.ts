import type { NextApiRequest, NextApiResponse } from "next";
import { parseJson } from '../../js/utils';
import { embedOne, openai } from './common/initOpenAi';
import { searchVectorByPartition } from './common/initMilvus';
import Joi from "joi";
import { checkBadword } from './common/badword';

interface ChatParams {
  question: string;
}

const schema = Joi.object<ChatParams>({
  question: Joi.string().min(1).max(2000).required(),
});

/**
 * @swagger
 * /api/case/question:
 *  get:
 *   summary: 获取聊天回复
 *   description: "以数据流的方式返回内容，可以参考https://developer.mozilla.org/zh-CN/docs/Web/API/EventSource\n    const evtSource = new EventSource(`/api/chat-question?vid=${props.vid}&question=${content}`);\n    evtSource.onmessage= (event)=>{\n    constdata=parseJson(event.data);\n    if(!data) {\n    return;\n    }\n    // content：回复内容\n    // done：是否完成输送\n    // details：完成后，返回的推荐内容\n    // error： 错误信息\n    // message： 说明\n    const{content,done,details,error,message} =data;\n    }\n    "
 *   parameters:
 *    - name: question
 *      in: query
 *      description: 问题
 *      required: true
 *   responses:
 *    200:
 *     description: 成功
 *     content:
 *      text/event-stream:
 *       schema:
 *        type: string
 *        description: 聊天回复，json字符串
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'text/event-stream;charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('X-Accel-Buffering', 'no');
  const { error, value } = schema.validate(req.query);
  if (error || !value) {
    res.write(`data: ${JSON.stringify({ message: error.message, done: true, error: true })}\n\n`);
    return;
  }
  const { question } = value;
  const checkResult = await checkBadword(question);
  if (checkResult.status) {
    res.write(`data: ${JSON.stringify({ content: '非常抱歉，提问中所涉及的词汇可能不适宜讨论，请问您是否可以换一个问题呢？', done: false })}\n\n`);
    res.write(`data: ${JSON.stringify({ done: true, details: { indexs: [], startTime: '' } })}\n\n`);
    return;
  }
  try {
    console.time('embedOne');
    const queryEmbedding = await embedOne(question);
    console.timeEnd('embedOne');
    console.time('searcher');
    const searcherResult = await searchVectorByPartition({
      name: 'case',
      partitionNames: ['case1'],
      vector: queryEmbedding,
      topK: 10,
      outputFields: ['question', 'reason', 'caseId', 'solution']
    });
    let searcher: { question: string, reason: string, caseId: string, solution: number, score: number }[] = [];
    if (searcherResult && Array.isArray(searcherResult.results)) {
      searcher = searcherResult.results as any;
    }
    console.timeEnd('searcher');
    console.time('createCompletion');
    console.log({ question });
    const messages = [
      { role: 'system', content: `You are a case consultation assistant of POLYV, please understand the context dialogue to answer questions, and give reasons and solutions.` },
    ];
    for (const item of searcher) {
      messages.push({ role: 'user', content: item.question });
      messages.push({ role: 'assistant', content: `原因：${item.reason}
解决方案：${item.solution}` });
    }
    messages.push({ role: 'user', content: question });
    const completion = await openai.createCompletion({
      model: "gpt-3.5-turbo",
      // @ts-ignore
      messages,
      temperature: 1,
      stream: true,
    }, { responseType: 'stream' });
    console.timeEnd('createCompletion');
    // @ts-ignore
    completion.data.on('data', (data: string) => {
      const lines = data.toString().split('\n').filter(line => line.trim() !== '');
      for (const line of lines) {
        const message = line.replace(/^data: /, '');
        if (message === '[DONE]') {
          res.write(`data: ${JSON.stringify({ done: true, cases: searcher.map(v => v.caseId) })}\n\n`);
          res.end('done\n');
          return;
        }
        const parsed = parseJson(message);
        if (parsed) {
          const content = parsed.choices[0].delta.content;
          if (typeof content === 'string') {
            res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
          }
        }
      }
    });
  } catch (error) {
    console.error(error);
    res.write(`data: ${JSON.stringify({ message: (error as any).response?.statusText || (error as any).message, done: true, error: true })}\n\n`);
  }
}
