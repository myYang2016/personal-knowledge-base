import { Configuration, OpenAIApi } from "openai";
import { delay } from "../../../js/utils";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

export async function embedOne(text: string) {
  while (true) {
    try {
      const result = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: text.replace(/\n/g, " "),
      });

      return result?.data.data[0].embedding;
    } catch (error) {
      console.log('error', error);
      await delay(2000);
    }
  }
};
