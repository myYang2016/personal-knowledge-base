## 使用向量数据库和chatGPT建立属于自己的知识库

> 背景：介绍和记录关于chatGPT在知识库中的应用

### 下载
* 下载nodejs环境，参考[nodejs](https://nodejs.org/en/download)
* 下载向量数据库[milvus](https://milvus.io/docs/install_milvus.md)

### openai key
* 申请openai key，参考[openai](https://beta.openai.com/)
* 将openai key填入.env.customize中
* 将.env.customize改名为.env

### 构建
```
<!-- 下载 -->
npm install
<!-- 运行 -->
npm run dev
```

### 准备数据
> 建立知识库前，需要将自己的知识整理，然后向量化。
1. 将自己的知识整理成excel表格，如/public/case.xlsx
2. 复制/public/case.xlsx到.next/server/pages/api
3. 请求接口http://127.0.0.1:3000/api/push,将excel表格中的数据向量化并存入milvus数据库中

### 运行页面进行提问
> 运行页面，进行提问，chatGPT会根据你的提问，从milvus数据库中找到最相似的问题，并返回答案
1. 运行页面，请求http://127.0.0.1:3000
2. 输入问题，点击提问

### Todo
- [ ] 支持上传excel表格，自动向量化
- [ ] 增加用户管理，限制管理员权限