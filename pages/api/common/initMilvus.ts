import { MilvusClient, DataType, FieldType } from '@zilliz/milvus2-sdk-node';
import { delay } from '../../../js/utils';

const env = process.env.APP_ENV;
const host = env === 'dev' ? '172.18.102.163:19530' : 'localhost:19530';
const milvusClient = new MilvusClient(host);

const defaultCollectionfields: FieldType[] = [
  {
    name: 'id',
    data_type: DataType.Int64,
    is_primary_key: true,
    description: '',
    autoID: true,
  },
  {
    name: 'vector',
    data_type: DataType.FloatVector,
    description: '',
    type_params: {
      dim: 1536,
    },
  },
  {
    name: 'content',
    data_type: DataType.VarChar,
    description: '原文本',
    type_params: {
      max_length: '2000',
    },
  },
  {
    name: 'type',
    data_type: DataType.VarChar,
    description: '类型',
    type_params: {
      max_length: '100',
    },
  },
  {
    name: 'startTime',
    data_type: DataType.VarChar,
    description: '开始时间',
    type_params: {
      max_length: '2000',
    },
  },
  {
    name: 'endTime',
    data_type: DataType.VarChar,
    description: '结束时间',
    type_params: {
      max_length: '2000',
    },
  },
  {
    name: 'startIndex',
    data_type: DataType.Int64,
    description: '开始位置',
  },
  {
    name: 'endIndex',
    data_type: DataType.Int64,
    description: '结束位置',
  },
  {
    name: 'indexs',
    data_type: DataType.VarChar,
    description: '索引',
    type_params: {
      max_length: '2000',
    },
  }
]

async function createCollection(name: string, fields = defaultCollectionfields) {
  const hasCollectionRes = await milvusClient.hasCollection({
    collection_name: name,
  });
  console.log({ hasCollectionRes })
  if (hasCollectionRes.value) {
    return;
  }
  const createRes = await milvusClient.createCollection({
    collection_name: name,
    fields,
  });
  console.log('--- create collection ---', createRes);
}

export function getHasPartition(name: string, partitionName: string) {
  return milvusClient.hasPartition({
    collection_name: name,
    partition_name: partitionName,
  });
}

async function createPartition(name: string, partitionName: string, fields = defaultCollectionfields) {
  await createCollection(name, fields);
  const result = await getHasPartition(name, partitionName);
  if (result.value) {
    return;
  }
  return milvusClient.createPartition({
    collection_name: name,
    partition_name: partitionName,
  });
}

export type VectorDataType = 'subtitle' | 'summary';

const caseCollectionfields: FieldType[] = [
  {
    name: 'id',
    data_type: DataType.Int64,
    is_primary_key: true,
    description: '',
    autoID: true,
  },
  {
    name: 'vector',
    data_type: DataType.FloatVector,
    description: '',
    type_params: {
      dim: 1536,
    },
  },
  {
    name: 'question',
    data_type: DataType.VarChar,
    description: '问题',
    type_params: {
      max_length: '2000',
    },
  },
  {
    name: 'reason',
    data_type: DataType.VarChar,
    description: '原因',
    type_params: {
      max_length: '5000',
    },
  },
  {
    name: 'solution',
    data_type: DataType.VarChar,
    description: '解决方案',
    type_params: {
      max_length: '5000',
    },
  },
  {
    name: 'caseId',
    data_type: DataType.VarChar,
    description: '案例id',
    type_params: {
      max_length: '200',
    },
  },
];
export async function insertCaseVector(options: {
  vector: number[], name: string, partitionName: string, question: string, reason: string, solution: string, caseId: string,
}) {
  const { vector, name, partitionName, question, reason, solution, caseId } = options;
  const createPartitionResult = await createPartition(name, partitionName, caseCollectionfields);
  console.log({ insertName: name, partitionName, createPartitionResult });
  const insertResult = await milvusClient.insert({
    collection_name: name,
    partition_name: partitionName,
    fields_data: [{ vector, question, reason, solution, caseId }],
  });
  console.log({ insertResult });
  await milvusClient.createIndex({
    collection_name: name,
    field_name: 'vector',
    extra_params: {
      index_type: 'IVF_FLAT',
      metric_type: 'IP',
      params: JSON.stringify({ nlist: 10 }),
    },
  });
}

export async function insertVector(options: {
  vector: number[], content: string, startTime: string, endTime: string, startIndex: number,
  endIndex: number, indexs: number[], name: string, partitionName: string, type?: VectorDataType,
}) {
  const { 
    vector, content, startTime, endTime, startIndex, endIndex, indexs, name, partitionName, type = 'subtitle' 
  } = options;
  const createPartitionResult = await createPartition(name, partitionName);
  console.log({ insertName: name, partitionName, createPartitionResult });
  const insertResult = await milvusClient.insert({
    collection_name: name,
    partition_name: partitionName,
    fields_data: [{ vector, content, type, startTime, endTime, startIndex, endIndex, indexs: JSON.stringify(indexs) }],
  });
  console.log({ insertResult });
  await milvusClient.createIndex({
    collection_name: name,
    field_name: 'vector',
    extra_params: {
      index_type: 'IVF_FLAT',
      metric_type: 'IP',
      params: JSON.stringify({ nlist: 10 }),
    },
  });
  console.log('--- Create Index in Collection ---');
}

export async function searchVectorByPartition(options: {
  vector: number[], name: string, partitionNames: string[], topK: number,
  outputFields?: string[],
}) {
  let retryTimes = 0;
  while (true) {
    const { vector, name, partitionNames, topK, outputFields = ['content', 'startTime', 'endTime', 'startIndex', 'endIndex', 'indexs', 'type'] } = options;
    try {
      console.time('search');
      const result = await milvusClient.search({
        collection_name: name,
        partition_names: partitionNames,
        vectors: [vector],
        search_params: {
          anns_field: "vector",
          topk: String(topK),
          metric_type: "IP",
          params: JSON.stringify({ nprobe: 10 }),
        },
        vector_type: DataType.FloatVector,
        output_fields: outputFields,
      });
      if (result.results.length === 0) {
        retryTimes += 1;
        if (retryTimes > 5) {
          return null;
        }
        console.log('--- search result is empty ---');
        console.time('loadCollectionSync');
        console.log({ name, partitionNames });
        const loadCollectionRes = await milvusClient.loadCollectionSync({
          collection_name: name,
        });
        console.log({ loadCollectionRes });
        console.timeEnd('loadCollectionSync');
        await delay(3000);
        continue;
      }
      console.timeEnd('search');
      return result;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
}
