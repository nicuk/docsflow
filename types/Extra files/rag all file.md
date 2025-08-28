================================================
FILE: env.example
================================================
### This is sample file of .env


### Server Configuration
HOST=0.0.0.0
PORT=9621
WEBUI_TITLE='My Graph KB'
WEBUI_DESCRIPTION="Simple and Fast Graph Based RAG System"
OLLAMA_EMULATING_MODEL_TAG=latest
# WORKERS=2
# CORS_ORIGINS=http://localhost:3000,http://localhost:8080

### Login Configuration
# AUTH_ACCOUNTS='admin:admin123,user1:pass456'
# TOKEN_SECRET=Your-Key-For-LightRAG-API-Server
# TOKEN_EXPIRE_HOURS=48
# GUEST_TOKEN_EXPIRE_HOURS=24
# JWT_ALGORITHM=HS256

### API-Key to access LightRAG Server API
# LIGHTRAG_API_KEY=your-secure-api-key-here
# WHITELIST_PATHS=/health,/api/*

### Optional SSL Configuration
# SSL=true
# SSL_CERTFILE=/path/to/cert.pem
# SSL_KEYFILE=/path/to/key.pem

### Directory Configuration (defaults to current working directory)
### Should not be set if deploy by docker (Set by Dockerfile instead of .env)
### Default value is ./inputs and ./rag_storage
# INPUT_DIR=<absolute_path_for_doc_input_dir>

### RAGAnything Configuration (Multimodal Document Processing)
### ---
### Parser Configuration
# PARSE_METHOD=auto
# OUTPUT_DIR=./output
# PARSER=mineru
# DISPLAY_CONTENT_STATS=true

### Multimodal Processing Configuration
# ENABLE_IMAGE_PROCESSING=true
# ENABLE_TABLE_PROCESSING=true
# ENABLE_EQUATION_PROCESSING=true

### Batch Processing Configuration
# MAX_CONCURRENT_FILES=1
# SUPPORTED_FILE_EXTENSIONS=.pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md
# RECURSIVE_FOLDER_PROCESSING=true

### Context Extraction Configuration
# CONTEXT_WINDOW=1
# CONTEXT_MODE=page
# MAX_CONTEXT_TOKENS=2000
# INCLUDE_HEADERS=true
# INCLUDE_CAPTIONS=true
# CONTEXT_FILTER_CONTENT_TYPES=text
# CONTENT_FORMAT=minerU

### Max nodes return from grap retrieval
# MAX_GRAPH_NODES=1000

### Logging level
# LOG_LEVEL=INFO
# VERBOSE=False
# LOG_MAX_BYTES=10485760
# LOG_BACKUP_COUNT=5
### Logfile location (defaults to current working directory)
# LOG_DIR=/path/to/log/directory

### Settings for RAG query
# HISTORY_TURNS=3
# COSINE_THRESHOLD=0.2
# TOP_K=60
# MAX_TOKEN_TEXT_CHUNK=4000
# MAX_TOKEN_RELATION_DESC=4000
# MAX_TOKEN_ENTITY_DESC=4000

### Entity and ralation summarization configuration
### Language: English, Chinese, French, German ...
SUMMARY_LANGUAGE=English
### Number of duplicated entities/edges to trigger LLM re-summary on merge ( at least 3 is recommented)
# FORCE_LLM_SUMMARY_ON_MERGE=6
### Max tokens for entity/relations description after merge
# MAX_TOKEN_SUMMARY=500

### Number of parallel processing documents(Less than MAX_ASYNC/2 is recommended)
# MAX_PARALLEL_INSERT=2
### Chunk size for document splitting, 500~1500 is recommended
# CHUNK_SIZE=1200
# CHUNK_OVERLAP_SIZE=100

### LLM Configuration
ENABLE_LLM_CACHE=true
ENABLE_LLM_CACHE_FOR_EXTRACT=true
### Time out in seconds for LLM, None for infinite timeout
TIMEOUT=240
### Some models like o1-mini require temperature to be set to 1
TEMPERATURE=0
### Max concurrency requests of LLM
MAX_ASYNC=4
### MAX_TOKENS: max tokens send to LLM for entity relation summaries (less than context size of the model)
### MAX_TOKENS: set as num_ctx option for Ollama by API Server
MAX_TOKENS=32768
### LLM Binding type: openai, ollama, lollms, azure_openai
LLM_BINDING=openai
LLM_MODEL=gpt-4o
LLM_BINDING_HOST=https://api.openai.com/v1
LLM_BINDING_API_KEY=your_api_key
### Optional for Azure
# AZURE_OPENAI_API_VERSION=2024-08-01-preview
# AZURE_OPENAI_DEPLOYMENT=gpt-4o

### Embedding Configuration
### Embedding Binding type: openai, ollama, lollms, azure_openai
EMBEDDING_BINDING=ollama
EMBEDDING_MODEL=bge-m3:latest
EMBEDDING_DIM=1024
EMBEDDING_BINDING_API_KEY=your_api_key
# If the embedding service is deployed within the same Docker stack, use host.docker.internal instead of localhost
EMBEDDING_BINDING_HOST=http://localhost:11434
### Num of chunks send to Embedding in single request
# EMBEDDING_BATCH_NUM=32
### Max concurrency requests for Embedding
# EMBEDDING_FUNC_MAX_ASYNC=16
### Maximum tokens sent to Embedding for each chunk (no longer in use?)
# MAX_EMBED_TOKENS=8192
### Optional for Azure
# AZURE_EMBEDDING_DEPLOYMENT=text-embedding-3-large
# AZURE_EMBEDDING_API_VERSION=2023-05-15

### Data storage selection
# LIGHTRAG_KV_STORAGE=PGKVStorage
# LIGHTRAG_VECTOR_STORAGE=PGVectorStorage
# LIGHTRAG_DOC_STATUS_STORAGE=PGDocStatusStorage
# LIGHTRAG_GRAPH_STORAGE=Neo4JStorage

### TiDB Configuration (Deprecated)
# TIDB_HOST=localhost
# TIDB_PORT=4000
# TIDB_USER=your_username
# TIDB_PASSWORD='your_password'
# TIDB_DATABASE=your_database
### separating all data from difference Lightrag instances(deprecating)
# TIDB_WORKSPACE=default

### PostgreSQL Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=your_username
POSTGRES_PASSWORD='your_password'
POSTGRES_DATABASE=your_database
POSTGRES_MAX_CONNECTIONS=12
### separating all data from difference Lightrag instances(deprecating)
# POSTGRES_WORKSPACE=default

### Neo4j Configuration
NEO4J_URI=neo4j+s://xxxxxxxx.databases.neo4j.io
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD='your_password'

### Independent AGM Configuration(not for AMG embedded in PostreSQL)
# AGE_POSTGRES_DB=
# AGE_POSTGRES_USER=
# AGE_POSTGRES_PASSWORD=
# AGE_POSTGRES_HOST=
# AGE_POSTGRES_PORT=8529

# AGE Graph Name(apply to PostgreSQL and independent AGM)
### AGE_GRAPH_NAME is precated
# AGE_GRAPH_NAME=lightrag

### MongoDB Configuration
MONGO_URI=mongodb://root:root@localhost:27017/
MONGO_DATABASE=LightRAG
### separating all data from difference Lightrag instances(deprecating)
# MONGODB_GRAPH=false

### Milvus Configuration
MILVUS_URI=http://localhost:19530
MILVUS_DB_NAME=lightrag
# MILVUS_USER=root
# MILVUS_PASSWORD=your_password
# MILVUS_TOKEN=your_token

### Qdrant
QDRANT_URL=http://localhost:16333
# QDRANT_API_KEY=your-api-key

### Redis
REDIS_URI=redis://localhost:6379



================================================
FILE: LICENSE
================================================
MIT License

Copyright (c) 2025 ✨Data Intelligence Lab@HKU✨

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.



================================================
FILE: MANIFEST.in
================================================
include requirements.txt
include README.md
include README_zh.md
include LICENSE
recursive-include raganything *.py
recursive-include examples *.py
global-exclude *.pyc
global-exclude __pycache__
global-exclude *.egg-info



================================================
FILE: README_zh.md
================================================
<div align="center">

<div style="margin: 20px 0;">
  <img src="./assets/logo.png" width="120" height="120" alt="RAG-Anything Logo" style="border-radius: 20px; box-shadow: 0 8px 32px rgba(0, 217, 255, 0.3);">
</div>

# 🚀 RAG-Anything: All-in-One RAG System

<div align="center">
  <div style="width: 100%; height: 2px; margin: 20px 0; background: linear-gradient(90deg, transparent, #00d9ff, transparent);"></div>
</div>

<div align="center">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 25px; text-align: center;">
    <p>
      <a href='https://github.com/HKUDS/RAG-Anything'><img src='https://img.shields.io/badge/🔥项目-主页-00d9ff?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1a2e'></a>
      <a href='https://arxiv.org/abs/2410.05779'><img src='https://img.shields.io/badge/📄arXiv-2410.05779-ff6b6b?style=for-the-badge&logo=arxiv&logoColor=white&labelColor=1a1a2e'></a>
      <a href='https://github.com/HKUDS/LightRAG'><img src='https://img.shields.io/badge/⚡基于-LightRAG-4ecdc4?style=for-the-badge&logo=lightning&logoColor=white&labelColor=1a1a2e'></a>
    </p>
    <p>
      <a href="https://github.com/HKUDS/RAG-Anything/stargazers"><img src='https://img.shields.io/github/stars/HKUDS/RAG-Anything?color=00d9ff&style=for-the-badge&logo=star&logoColor=white&labelColor=1a1a2e' /></a>
      <img src="https://img.shields.io/badge/🐍Python-3.10-4ecdc4?style=for-the-badge&logo=python&logoColor=white&labelColor=1a1a2e">
      <a href="https://pypi.org/project/raganything/"><img src="https://img.shields.io/pypi/v/raganything.svg?style=for-the-badge&logo=pypi&logoColor=white&labelColor=1a1a2e&color=ff6b6b"></a>
    </p>
    <p>
      <a href="https://discord.gg/yF2MmDJyGJ"><img src="https://img.shields.io/badge/💬Discord-社区-7289da?style=for-the-badge&logo=discord&logoColor=white&labelColor=1a1a2e"></a>
      <a href="https://github.com/HKUDS/RAG-Anything/issues/7"><img src="https://img.shields.io/badge/💬微信群-交流-07c160?style=for-the-badge&logo=wechat&logoColor=white&labelColor=1a1a2e"></a>
    </p>
    <p>
      <a href="README_zh.md"><img src="https://img.shields.io/badge/🇨🇳中文版-1a1a2e?style=for-the-badge"></a>
      <a href="README.md"><img src="https://img.shields.io/badge/🇺🇸English-1a1a2e?style=for-the-badge"></a>
    </p>
  </div>
</div>

</div>

<div align="center" style="margin: 30px 0;">
  <img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="800">
</div>

<div align="center">
  <a href="#-快速开始" style="text-decoration: none;">
    <img src="https://img.shields.io/badge/快速开始-立即开始使用-00d9ff?style=for-the-badge&logo=rocket&logoColor=white&labelColor=1a1a2e">
  </a>
</div>

---

## 🎉 新闻
- [X] [2025.08.12]🎯📢 🔍 RAGAnything 现在支持 **VLM增强查询** 模式！当文档包含图片时，系统可以自动将图片与文本上下文一起直接传递给VLM进行综合多模态分析。
- [X] [2025.07.05]🎯📢 RAGAnything 新增[上下文配置模块](docs/context_aware_processing.md)，支持为多模态内容处理添加相关上下文信息。
- [X] [2025.07.04]🎯📢 RAGAnything 现在支持多模态内容查询，实现了集成文本、图像、表格和公式处理的增强检索生成功能。
- [X] [2025.07.03]🎯📢 RAGAnything 在GitHub上达到了1K星标🌟！感谢您的支持和贡献。

---

## 🌟 系统概述

*下一代多模态智能*

<div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%); border-radius: 15px; padding: 25px; margin: 20px 0; border: 2px solid #00d9ff; box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);">

**RAG-Anything**是一个综合性多模态文档处理RAG系统。该系统能够无缝处理和查询包含文本、图像、表格、公式等多模态内容的复杂文档，提供完整的检索增强(RAG)生成解决方案。

<img src="assets/rag_anything_framework.png" alt="RAG-Anything" />

</div>

### 🎯 核心特性

<div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 15px; padding: 25px; margin: 20px 0;">

- **🔄 端到端多模态处理流水线** - 提供从文档解析到多模态查询响应的完整处理链路，确保系统的一体化运行
- **📄 多格式文档支持** - 支持PDF、Office文档（DOC/DOCX/PPT/PPTX/XLS/XLSX）、图像等主流文档格式的统一处理和解析
- **🧠 多模态内容分析引擎** - 针对图像、表格、公式和通用文本内容部署专门的处理器，确保各类内容的精准解析
- **🔗 基于知识图谱索引** - 实现自动化实体提取和关系构建，建立跨模态的语义连接网络
- **⚡ 灵活的处理架构** - 支持基于MinerU的智能解析模式和直接多模态内容插入模式，满足不同应用场景需求
- **📋 直接内容列表插入** - 跳过文档解析，直接插入来自外部源的预解析内容列表，支持多种数据来源整合
- **🎯 跨模态检索机制** - 实现跨文本和多模态内容的智能检索，提供精准的信息定位和匹配能力

</div>

---

## 🏗️ 算法原理与架构

<div style="background: linear-gradient(135deg, #0f0f23 0%, #1a1a2e 100%); border-radius: 15px; padding: 25px; margin: 20px 0; border-left: 5px solid #00d9ff;">

### 核心算法

**RAG-Anything** 采用灵活的分层架构设计，实现多阶段多模态处理流水线，将传统RAG系统扩展为支持异构内容类型的综合处理平台。

</div>

<div align="center">
  <div style="width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; background: linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%); border-radius: 15px; border: 1px solid rgba(0, 217, 255, 0.2);">
    <div style="display: flex; justify-content: space-around; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 10px;">📄</div>
        <div style="font-size: 14px; color: #00d9ff;">文档解析</div>
      </div>
      <div style="font-size: 20px; color: #00d9ff;">→</div>
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 10px;">🧠</div>
        <div style="font-size: 14px; color: #00d9ff;">内容分析</div>
      </div>
      <div style="font-size: 20px; color: #00d9ff;">→</div>
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 10px;">🔍</div>
        <div style="font-size: 14px; color: #00d9ff;">知识图谱</div>
      </div>
      <div style="font-size: 20px; color: #00d9ff;">→</div>
      <div style="text-align: center;">
        <div style="font-size: 24px; margin-bottom: 10px;">🎯</div>
        <div style="font-size: 14px; color: #00d9ff;">智能检索</div>
      </div>
    </div>
  </div>
</div>

### 1. 文档解析阶段

<div style="background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 4px solid #4ecdc4;">

该系统构建了高精度文档解析平台，通过结构化提取引擎实现多模态元素的完整识别与提取。系统采用自适应内容分解机制，智能分离文档中的文本、图像、表格、公式等异构内容，并保持其语义关联性。同时支持PDF、Office文档、图像等主流格式的统一处理，提供标准化的多模态内容输出。

**核心组件：**

- **⚙️ 结构化提取引擎**：集成 [MinerU](https://github.com/opendatalab/MinerU) 文档解析框架，实现精确的文档结构识别与内容提取，确保多模态元素的完整性和准确性。

- **🧩 自适应内容分解机制**：建立智能内容分离系统，自动识别并提取文档中的文本块、图像、表格、公式等异构元素，保持元素间的语义关联关系。

- **📁 多格式兼容处理**：部署专业化解析器矩阵，支持PDF、Office文档系列（DOC/DOCX/PPT/PPTX/XLS/XLSX）、图像等主流格式的统一处理与标准化输出。

</div>

### 2. 多模态内容理解与处理

<div style="background: linear-gradient(90deg, #16213e 0%, #0f3460 100%); border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 4px solid #ff6b6b;">

该多模态内容处理系统通过自主分类路由机制实现异构内容的智能识别与优化分发。系统采用并发多流水线架构，确保文本和多模态内容的高效并行处理，在最大化吞吐量的同时保持内容完整性，并能完整提取和保持原始文档的层次结构与元素关联关系。

**核心组件：**

- **🎯 自主内容分类与路由**：自动识别、分类并将不同内容类型路由至优化的执行通道。

- **⚡ 并发多流水线架构**：通过专用处理流水线实现文本和多模态内容的并发执行。这种方法在保持内容完整性的同时最大化吞吐效率。

- **🏗️ 文档层次结构提取**：在内容转换过程中提取并保持原始文档的层次结构和元素间关系。

</div>

### 3. 多模态分析引擎

<div style="background: linear-gradient(90deg, #0f3460 0%, #1a1a2e 100%); border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 4px solid #00d9ff;">

系统部署了面向异构数据模态的模态感知处理单元：

**专用分析器：**

- **🔍 视觉内容分析器**：
  - 集成视觉模型进行图像分析和内容识别
  - 基于视觉语义生成上下文感知的描述性标题
  - 提取视觉元素间的空间关系和层次结构

- **📊 结构化数据解释器**：
  - 对表格和结构化数据格式进行系统性解释
  - 实现数据趋势分析的统计模式识别算法
  - 识别多个表格数据集间的语义关系和依赖性

- **📐 数学表达式解析器**：
  - 高精度解析复杂数学表达式和公式
  - 提供原生LaTeX格式支持以实现与学术工作流的无缝集成
  - 建立数学方程与领域特定知识库间的概念映射

- **🔧 可扩展模态处理器**：
  - 为自定义和新兴内容类型提供可配置的处理框架
  - 通过插件架构实现新模态处理器的动态集成
  - 支持专用场景下处理流水线的运行时配置

</div>

### 4. 多模态知识图谱索引

<div style="background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 4px solid #4ecdc4;">

多模态知识图谱构建模块将文档内容转换为结构化语义表示。系统提取多模态实体，建立跨模态关系，并保持层次化组织结构。通过加权相关性评分实现优化的知识检索。

**核心功能：**

- **🔍 多模态实体提取**：将重要的多模态元素转换为结构化知识图谱实体。该过程包括语义标注和元数据保存。

- **🔗 跨模态关系映射**：在文本实体和多模态组件之间建立语义连接和依赖关系。通过自动化关系推理算法实现这一功能。

- **🏗️ 层次结构保持**：通过"归属于"关系链维护原始文档组织结构。这些关系链保持逻辑内容层次和章节依赖关系。

- **⚖️ 加权关系评分**：为关系类型分配定量相关性分数。评分基于语义邻近性和文档结构内的上下文重要性。

</div>

### 5. 模态感知检索

<div style="background: linear-gradient(90deg, #16213e 0%, #0f3460 100%); border-radius: 10px; padding: 20px; margin: 15px 0; border-left: 4px solid #ff6b6b;">

混合检索系统结合向量相似性搜索与图遍历算法，实现全面的内容检索。系统实现模态感知排序机制，并维护检索元素间的关系一致性，确保上下文集成的信息传递。

**检索机制：**

- **🔀 向量-图谱融合**：集成向量相似性搜索与图遍历算法。该方法同时利用语义嵌入和结构关系实现全面的内容检索。

- **📊 模态感知排序**：实现基于内容类型相关性的自适应评分机制。系统根据查询特定的模态偏好调整排序结果。

- **🔗 关系一致性维护**：维护检索元素间的语义和结构关系。确保信息传递的连贯性和上下文完整性。

</div>

---

## 🚀 快速开始

*启动您的AI之旅*

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212284158-e840e285-664b-44d7-b79b-e264b5e54825.gif" width="400">
</div>

### 安装

#### 选项1：从PyPI安装（推荐）

```bash
# 基础安装
pip install raganything

# 安装包含扩展格式支持的可选依赖：
pip install 'raganything[all]'              # 所有可选功能
pip install 'raganything[image]'            # 图像格式转换 (BMP, TIFF, GIF, WebP)
pip install 'raganything[text]'             # 文本文件处理 (TXT, MD)
pip install 'raganything[image,text]'       # 多个功能组合
```

#### 选项2：从源码安装

```bash
git clone https://github.com/HKUDS/RAG-Anything.git
cd RAG-Anything
pip install -e .

# 安装可选依赖
pip install -e '.[all]'
```

#### 可选依赖

- **`[image]`** - 启用BMP、TIFF、GIF、WebP图像格式处理（需要Pillow）
- **`[text]`** - 启用TXT和MD文件处理（需要ReportLab）
- **`[all]`** - 包含所有Python可选依赖

> **⚠️ Office文档处理配置要求：**
> - Office文档 (.doc, .docx, .ppt, .pptx, .xls, .xlsx) 需要安装 **LibreOffice**
> - 从[LibreOffice官网](https://www.libreoffice.org/download/download/)下载安装
> - **Windows**：从官网下载安装包
> - **macOS**：`brew install --cask libreoffice`
> - **Ubuntu/Debian**：`sudo apt-get install libreoffice`
> - **CentOS/RHEL**：`sudo yum install libreoffice`

**检查MinerU安装：**

```bash
# 验证安装
mineru --version

# 检查是否正确配置
python -c "from raganything import RAGAnything; rag = RAGAnything(); print('✅ MinerU安装正常' if rag.check_mineru_installation() else '❌ MinerU安装有问题')"
```

模型在首次使用时自动下载。手动下载参考[MinerU模型源配置](https://github.com/opendatalab/MinerU/blob/master/README_zh-CN.md#22-%E6%A8%A1%E5%9E%8B%E6%BA%90%E9%85%8D%E7%BD%AE)：

### 使用示例

#### 1. 端到端文档处理

```python
import asyncio
from raganything import RAGAnything, RAGAnythingConfig
from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc

async def main():
    # 设置 API 配置
    api_key = "your-api-key"
    base_url = "your-base-url"  # 可选

    # 创建 RAGAnything 配置
    config = RAGAnythingConfig(
        working_dir="./rag_storage",
        parser="mineru",  # 选择解析器：mineru 或 docling
        parse_method="auto",  # 解析方法：auto, ocr 或 txt
        enable_image_processing=True,
        enable_table_processing=True,
        enable_equation_processing=True,
    )

    # 定义 LLM 模型函数
    def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
        return openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )

    # 定义视觉模型函数用于图像处理
    def vision_model_func(
        prompt, system_prompt=None, history_messages=[], image_data=None, messages=None, **kwargs
    ):
        # 如果提供了messages格式（用于多模态VLM增强查询），直接使用
        if messages:
            return openai_complete_if_cache(
                "gpt-4o",
                "",
                system_prompt=None,
                history_messages=[],
                messages=messages,
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )
        # 传统单图片格式
        elif image_data:
            return openai_complete_if_cache(
                "gpt-4o",
                "",
                system_prompt=None,
                history_messages=[],
                messages=[
                    {"role": "system", "content": system_prompt}
                    if system_prompt
                    else None,
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                },
                            },
                        ],
                    }
                    if image_data
                    else {"role": "user", "content": prompt},
                ],
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )
        # 纯文本格式
        else:
            return llm_model_func(prompt, system_prompt, history_messages, **kwargs)

    # 定义嵌入函数
    embedding_func = EmbeddingFunc(
        embedding_dim=3072,
        max_token_size=8192,
        func=lambda texts: openai_embed(
            texts,
            model="text-embedding-3-large",
            api_key=api_key,
            base_url=base_url,
        ),
    )

    # 初始化 RAGAnything
    rag = RAGAnything(
        config=config,
        llm_model_func=llm_model_func,
        vision_model_func=vision_model_func,
        embedding_func=embedding_func,
    )

    # 处理文档
    await rag.process_document_complete(
        file_path="path/to/your/document.pdf",
        output_dir="./output",
        parse_method="auto"
    )

    # 查询处理后的内容
    # 纯文本查询 - 基本知识库搜索
    text_result = await rag.aquery(
        "文档的主要内容是什么？",
        mode="hybrid"
    )
    print("文本查询结果:", text_result)

    # 多模态查询 - 包含具体多模态内容的查询
    multimodal_result = await rag.aquery_with_multimodal(
        "分析这个性能数据并解释与现有文档内容的关系",
        multimodal_content=[{
            "type": "table",
            "table_data": """系统,准确率,F1分数
                            RAGAnything,95.2%,0.94
                            基准方法,87.3%,0.85""",
            "table_caption": "性能对比结果"
        }],
        mode="hybrid"
    )
    print("多模态查询结果:", multimodal_result)

if __name__ == "__main__":
    asyncio.run(main())
```

#### 2. 直接多模态内容处理

```python
import asyncio
from lightrag import LightRAG
from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc
from raganything.modalprocessors import ImageModalProcessor, TableModalProcessor

async def process_multimodal_content():
    # 设置 API 配置
    api_key = "your-api-key"
    base_url = "your-base-url"  # 可选

    # 初始化 LightRAG
    rag = LightRAG(
        working_dir="./rag_storage",
        llm_model_func=lambda prompt, system_prompt=None, history_messages=[], **kwargs: openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        ),
        embedding_func=EmbeddingFunc(
            embedding_dim=3072,
            max_token_size=8192,
            func=lambda texts: openai_embed(
                texts,
                model="text-embedding-3-large",
                api_key=api_key,
                base_url=base_url,
            ),
        )
    )
    await rag.initialize_storages()

    # 处理图像
    image_processor = ImageModalProcessor(
        lightrag=rag,
        modal_caption_func=lambda prompt, system_prompt=None, history_messages=[], image_data=None, **kwargs: openai_complete_if_cache(
            "gpt-4o",
            "",
            system_prompt=None,
            history_messages=[],
            messages=[
                {"role": "system", "content": system_prompt} if system_prompt else None,
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                ]} if image_data else {"role": "user", "content": prompt}
            ],
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        ) if image_data else openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )
    )

    image_content = {
        "img_path": "path/to/image.jpg",
        "img_caption": ["图1：实验结果"],
        "img_footnote": ["数据收集于2024年"]
    }

    description, entity_info = await image_processor.process_multimodal_content(
        modal_content=image_content,
        content_type="image",
        file_path="research_paper.pdf",
        entity_name="实验结果图表"
    )

    # 处理表格
    table_processor = TableModalProcessor(
        lightrag=rag,
        modal_caption_func=lambda prompt, system_prompt=None, history_messages=[], **kwargs: openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )
    )

    table_content = {
        "table_body": """
        | 方法 | 准确率 | F1分数 |
        |------|--------|--------|
        | RAGAnything | 95.2% | 0.94 |
        | 基准方法 | 87.3% | 0.85 |
        """,
        "table_caption": ["性能对比"],
        "table_footnote": ["测试数据集结果"]
    }

    description, entity_info = await table_processor.process_multimodal_content(
        modal_content=table_content,
        content_type="table",
        file_path="research_paper.pdf",
        entity_name="性能结果表格"
    )

if __name__ == "__main__":
    asyncio.run(process_multimodal_content())
```

#### 3. 批量处理

```python
# 处理多个文档
await rag.process_folder_complete(
    folder_path="./documents",
    output_dir="./output",
    file_extensions=[".pdf", ".docx", ".pptx"],
    recursive=True,
    max_workers=4
)
```

#### 4. 自定义模态处理器

```python
from raganything.modalprocessors import GenericModalProcessor

class CustomModalProcessor(GenericModalProcessor):
    async def process_multimodal_content(self, modal_content, content_type, file_path, entity_name):
        # 你的自定义处理逻辑
        enhanced_description = await self.analyze_custom_content(modal_content)
        entity_info = self.create_custom_entity(enhanced_description, entity_name)
        return await self._create_entity_and_chunk(enhanced_description, entity_info, file_path)
```

#### 5. 查询选项

RAG-Anything 提供三种类型的查询方法：

**纯文本查询** - 使用LightRAG直接进行知识库搜索：
```python
# 文本查询的不同模式
text_result_hybrid = await rag.aquery("你的问题", mode="hybrid")
text_result_local = await rag.aquery("你的问题", mode="local")
text_result_global = await rag.aquery("你的问题", mode="global")
text_result_naive = await rag.aquery("你的问题", mode="naive")

# 同步版本
sync_text_result = rag.query("你的问题", mode="hybrid")
```

**VLM增强查询** - 使用VLM自动分析检索上下文中的图像：
```python
# VLM增强查询（当提供vision_model_func时自动启用）
vlm_result = await rag.aquery(
    "分析文档中的图表和数据",
    mode="hybrid"
    # vlm_enhanced=True 当vision_model_func可用时自动设置
)

# 手动控制VLM增强
vlm_enabled = await rag.aquery(
    "这个文档中的图片显示了什么内容？",
    mode="hybrid",
    vlm_enhanced=True  # 强制启用VLM增强
)

vlm_disabled = await rag.aquery(
    "这个文档中的图片显示了什么内容？",
    mode="hybrid",
    vlm_enhanced=False  # 强制禁用VLM增强
)

# 当文档包含图片时，VLM可以直接查看和分析图片
# 系统将自动：
# 1. 检索包含图片路径的相关上下文
# 2. 加载图片并编码为base64格式
# 3. 将文本上下文和图片一起发送给VLM进行综合分析
```

**多模态查询** - 包含特定多模态内容分析的增强查询：
```python
# 包含表格数据的查询
table_result = await rag.aquery_with_multimodal(
    "比较这些性能指标与文档内容",
    multimodal_content=[{
        "type": "table",
        "table_data": """方法,准确率,速度
                        LightRAG,95.2%,120ms
                        传统方法,87.3%,180ms""",
        "table_caption": "性能对比"
    }],
    mode="hybrid"
)

# 包含公式内容的查询
equation_result = await rag.aquery_with_multimodal(
    "解释这个公式及其与文档内容的相关性",
    multimodal_content=[{
        "type": "equation",
        "latex": "P(d|q) = \\frac{P(q|d) \\cdot P(d)}{P(q)}",
        "equation_caption": "文档相关性概率"
    }],
    mode="hybrid"
)
```

#### 6. 加载已存在的LightRAG实例

```python
import asyncio
from raganything import RAGAnything
from lightrag import LightRAG
from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc
import os

async def load_existing_lightrag():
    # 设置 API 配置
    api_key = "your-api-key"
    base_url = "your-base-url"  # 可选

    # 首先，创建或加载已存在的 LightRAG 实例
    lightrag_working_dir = "./existing_lightrag_storage"

    # 检查是否存在之前的 LightRAG 实例
    if os.path.exists(lightrag_working_dir) and os.listdir(lightrag_working_dir):
        print("✅ 发现已存在的 LightRAG 实例，正在加载...")
    else:
        print("❌ 未找到已存在的 LightRAG 实例，将创建新实例")

    # 使用您的配置创建/加载 LightRAG 实例
    lightrag_instance = LightRAG(
        working_dir=lightrag_working_dir,
        llm_model_func=lambda prompt, system_prompt=None, history_messages=[], **kwargs: openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        ),
        embedding_func=EmbeddingFunc(
            embedding_dim=3072,
            max_token_size=8192,
            func=lambda texts: openai_embed(
                texts,
                model="text-embedding-3-large",
                api_key=api_key,
                base_url=base_url,
            ),
        )
    )

    # 初始化存储（如果有现有数据，这将加载它们）
    await lightrag_instance.initialize_storages()
    await initialize_pipeline_status()

    # 定义视觉模型函数用于图像处理
    def vision_model_func(
        prompt, system_prompt=None, history_messages=[], image_data=None, messages=None, **kwargs
    ):
        # 如果提供了messages格式（用于多模态VLM增强查询），直接使用
        if messages:
            return openai_complete_if_cache(
                "gpt-4o",
                "",
                system_prompt=None,
                history_messages=[],
                messages=messages,
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )
        # 传统单图片格式
        elif image_data:
            return openai_complete_if_cache(
                "gpt-4o",
                "",
                system_prompt=None,
                history_messages=[],
                messages=[
                    {"role": "system", "content": system_prompt}
                    if system_prompt
                    else None,
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{image_data}"
                                },
                            },
                        ],
                    }
                    if image_data
                    else {"role": "user", "content": prompt},
                ],
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )
        # 纯文本格式
        else:
            return lightrag_instance.llm_model_func(prompt, system_prompt, history_messages, **kwargs)

    # 现在使用已存在的 LightRAG 实例初始化 RAGAnything
    rag = RAGAnything(
        lightrag=lightrag_instance,  # 传入已存在的 LightRAG 实例
        vision_model_func=vision_model_func,
        # 注意：working_dir、llm_model_func、embedding_func 等都从 lightrag_instance 继承
    )

    # 查询已存在的知识库
    result = await rag.aquery(
        "这个 LightRAG 实例中处理了哪些数据？",
        mode="hybrid"
    )
    print("查询结果:", result)

    # 向已存在的 LightRAG 实例添加新的多模态文档
    await rag.process_document_complete(
        file_path="path/to/new/multimodal_document.pdf",
        output_dir="./output"
    )

if __name__ == "__main__":
    asyncio.run(load_existing_lightrag())
```

#### 7. 直接插入内容列表

当您已经有预解析的内容列表（例如，来自外部解析器或之前的处理结果）时，可以直接插入到 RAGAnything 中而无需文档解析：

```python
import asyncio
from raganything import RAGAnything, RAGAnythingConfig
from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc

async def insert_content_list_example():
    # 设置 API 配置
    api_key = "your-api-key"
    base_url = "your-base-url"  # 可选

    # 创建 RAGAnything 配置
    config = RAGAnythingConfig(
        working_dir="./rag_storage",
        enable_image_processing=True,
        enable_table_processing=True,
        enable_equation_processing=True,
    )

    # 定义模型函数
    def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
        return openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )

    def vision_model_func(prompt, system_prompt=None, history_messages=[], image_data=None, messages=None, **kwargs):
        # 如果提供了messages格式（用于多模态VLM增强查询），直接使用
        if messages:
            return openai_complete_if_cache(
                "gpt-4o",
                "",
                system_prompt=None,
                history_messages=[],
                messages=messages,
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )
        # 传统单图片格式
        elif image_data:
            return openai_complete_if_cache(
                "gpt-4o",
                "",
                system_prompt=None,
                history_messages=[],
                messages=[
                    {"role": "system", "content": system_prompt} if system_prompt else None,
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_data}"}}
                        ],
                    } if image_data else {"role": "user", "content": prompt},
                ],
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )
        # 纯文本格式
        else:
            return llm_model_func(prompt, system_prompt, history_messages, **kwargs)

    embedding_func = EmbeddingFunc(
        embedding_dim=3072,
        max_token_size=8192,
        func=lambda texts: openai_embed(
            texts,
            model="text-embedding-3-large",
            api_key=api_key,
            base_url=base_url,
        ),
    )

    # 初始化 RAGAnything
    rag = RAGAnything(
        config=config,
        llm_model_func=llm_model_func,
        vision_model_func=vision_model_func,
        embedding_func=embedding_func,
    )

    # 示例：来自外部源的预解析内容列表
    content_list = [
        {
            "type": "text",
            "text": "这是我们研究论文的引言部分。",
            "page_idx": 0  # 此内容出现的页码
        },
        {
            "type": "image",
            "img_path": "/absolute/path/to/figure1.jpg",  # 重要：使用绝对路径
            "img_caption": ["图1：系统架构"],
            "img_footnote": ["来源：作者原创设计"],
            "page_idx": 1  # 此图像出现的页码
        },
        {
            "type": "table",
            "table_body": "| 方法 | 准确率 | F1分数 |\n|------|--------|--------|\n| 我们的方法 | 95.2% | 0.94 |\n| 基准方法 | 87.3% | 0.85 |",
            "table_caption": ["表1：性能对比"],
            "table_footnote": ["测试数据集结果"],
            "page_idx": 2  # 此表格出现的页码
        },
        {
            "type": "equation",
            "latex": "P(d|q) = \\frac{P(q|d) \\cdot P(d)}{P(q)}",
            "text": "文档相关性概率公式",
            "page_idx": 3  # 此公式出现的页码
        },
        {
            "type": "text",
            "text": "总之，我们的方法在所有指标上都表现出优越的性能。",
            "page_idx": 4  # 此内容出现的页码
        }
    ]

    # 直接插入内容列表
    await rag.insert_content_list(
        content_list=content_list,
        file_path="research_paper.pdf",  # 用于引用的参考文件名
        split_by_character=None,         # 可选的文本分割
        split_by_character_only=False,   # 可选的文本分割模式
        doc_id=None,                     # 可选的自定义文档ID（如果未提供将自动生成）
        display_stats=True               # 显示内容统计信息
    )

    # 查询插入的内容
    result = await rag.aquery(
        "研究中提到的主要发现和性能指标是什么？",
        mode="hybrid"
    )
    print("查询结果:", result)

    # 您也可以使用不同的文档ID插入多个内容列表
    another_content_list = [
        {
            "type": "text",
            "text": "这是来自另一个文档的内容。",
            "page_idx": 0  # 此内容出现的页码
        },
        {
            "type": "table",
            "table_body": "| 特性 | 值 |\n|------|----|\n| 速度 | 快速 |\n| 准确性 | 高 |",
            "table_caption": ["特性对比"],
            "page_idx": 1  # 此表格出现的页码
        }
    ]

    await rag.insert_content_list(
        content_list=another_content_list,
        file_path="another_document.pdf",
        doc_id="custom-doc-id-123"  # 自定义文档ID
    )

if __name__ == "__main__":
    asyncio.run(insert_content_list_example())
```

**内容列表格式：**

`content_list` 应遵循标准格式，每个项目都是包含以下内容的字典：

- **文本内容**: `{"type": "text", "text": "内容文本", "page_idx": 0}`
- **图像内容**: `{"type": "image", "img_path": "/absolute/path/to/image.jpg", "img_caption": ["标题"], "img_footnote": ["注释"], "page_idx": 1}`
- **表格内容**: `{"type": "table", "table_body": "markdown表格", "table_caption": ["标题"], "table_footnote": ["注释"], "page_idx": 2}`
- **公式内容**: `{"type": "equation", "latex": "LaTeX公式", "text": "描述", "page_idx": 3}`
- **通用内容**: `{"type": "custom_type", "content": "任何内容", "page_idx": 4}`

**重要说明：**
- **`img_path`**: 必须是图像文件的绝对路径（例如：`/home/user/images/chart.jpg` 或 `C:\Users\user\images\chart.jpg`）
- **`page_idx`**: 表示内容在原始文档中出现的页码（从0开始的索引）
- **内容顺序**: 项目按照在列表中出现的顺序进行处理

此方法在以下情况下特别有用：
- 您有来自外部解析器的内容（非MinerU/Docling）
- 您想要处理程序化生成的内容
- 您需要将来自多个源的内容插入到单个知识库中
- 您有想要重用的缓存解析结果

---

## 🛠️ 示例

*实际应用演示*

<div align="center">
  <img src="https://user-images.githubusercontent.com/74038190/212257455-13e3e01e-d6a6-45dc-bb92-3ab87b12dfc1.gif" width="300">
</div>

`examples/` 目录包含完整的使用示例：

- **`raganything_example.py`**：基于MinerU的端到端文档处理
- **`modalprocessors_example.py`**：直接多模态内容处理
- **`office_document_test.py`**：Office文档解析测试（无需API密钥）
- **`image_format_test.py`**：图像格式解析测试（无需API密钥）
- **`text_format_test.py`**：文本格式解析测试（无需API密钥）

**运行示例：**

```bash
# 端到端处理（包含解析器选择）
python examples/raganything_example.py path/to/document.pdf --api-key YOUR_API_KEY --parser mineru

# 直接模态处理
python examples/modalprocessors_example.py --api-key YOUR_API_KEY

# Office文档解析测试（仅MinerU功能）
python examples/office_document_test.py --file path/to/document.docx

# 图像格式解析测试（仅MinerU功能）
python examples/image_format_test.py --file path/to/image.bmp

# 文本格式解析测试（仅MinerU功能）
python examples/text_format_test.py --file path/to/document.md

# 检查LibreOffice安装
python examples/office_document_test.py --check-libreoffice --file dummy

# 检查PIL/Pillow安装
python examples/image_format_test.py --check-pillow --file dummy

# 检查ReportLab安装
python examples/text_format_test.py --check-reportlab --file dummy
```

> **注意**：API密钥仅在完整RAG处理和LLM集成时需要。解析测试文件（`office_document_test.py`、`image_format_test.py` 和 `text_format_test.py`）仅测试MinerU功能，无需API密钥。

---

## 🔧 配置

*系统优化参数*

### 环境变量

创建 `.env` 文件（参考 `.env.example`）：

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_BASE_URL=your_base_url  # 可选
OUTPUT_DIR=./output             # 解析文档的默认输出目录
PARSER=mineru                   # 解析器选择：mineru 或 docling
PARSE_METHOD=auto              # 解析方法：auto, ocr 或 txt
```

**注意：** 为了向后兼容，旧的环境变量名称仍然有效：
- `MINERU_PARSE_METHOD` 已弃用，请使用 `PARSE_METHOD`

### 解析器配置

RAGAnything 现在支持多种解析器，每种解析器都有其特定的优势：

#### MinerU 解析器
- 支持PDF、图像、Office文档等多种格式
- 强大的OCR和表格提取能力
- 支持GPU加速

#### Docling 解析器
- 专门优化Office文档和HTML文件的解析
- 更好的文档结构保持
- 原生支持多种Office格式

### MinerU配置

```bash
# MinerU 2.0使用命令行参数而不是配置文件
# 查看可用选项：
mineru --help

# 常用配置：
mineru -p input.pdf -o output_dir -m auto    # 自动解析模式
mineru -p input.pdf -o output_dir -m ocr     # OCR重点解析
mineru -p input.pdf -o output_dir -b pipeline --device cuda  # GPU加速
```

你也可以通过RAGAnything参数配置解析：

```python
# 基础解析配置和解析器选择
await rag.process_document_complete(
    file_path="document.pdf",
    output_dir="./output/",
    parse_method="auto",          # 或 "ocr", "txt"
    parser="mineru"               # 可选："mineru" 或 "docling"
)

# 高级解析配置（包含特殊参数）
await rag.process_document_complete(
    file_path="document.pdf",
    output_dir="./output/",
    parse_method="auto",          # 解析方法："auto", "ocr", "txt"
    parser="mineru",              # 解析器选择："mineru" 或 "docling"

    # MinerU特殊参数 - 支持的所有kwargs：
    lang="ch",                   # 文档语言优化（如："ch", "en", "ja"）
    device="cuda:0",             # 推理设备："cpu", "cuda", "cuda:0", "npu", "mps"
    start_page=0,                # 起始页码（0为基准，适用于PDF）
    end_page=10,                 # 结束页码（0为基准，适用于PDF）
    formula=True,                # 启用公式解析
    table=True,                  # 启用表格解析
    backend="pipeline",          # 解析后端：pipeline|vlm-transformers|vlm-sglang-engine|vlm-sglang-client
    source="huggingface",        # 模型源："huggingface", "modelscope", "local"
    # vlm_url="http://127.0.0.1:3000" # 当backend=vlm-sglang-client时，需指定服务地址

    # RAGAnything标准参数
    display_stats=True,          # 显示内容统计信息
    split_by_character=None,     # 可选的文本分割字符
    doc_id=None                  # 可选的文档ID
)
```

> **注意**：MinerU 2.0不再使用 `magic-pdf.json` 配置文件。所有设置现在通过命令行参数或函数参数传递。RAG-Anything现在支持多种文档解析器 - 你可以根据需要在MinerU和Docling之间选择。

### 处理要求

不同内容类型需要特定的可选依赖：

- **Office文档** (.doc, .docx, .ppt, .pptx, .xls, .xlsx): 安装并配置 [LibreOffice](https://www.libreoffice.org/download/download/)
- **扩展图像格式** (.bmp, .tiff, .gif, .webp): 使用 `pip install raganything[image]` 安装
- **文本文件** (.txt, .md): 使用 `pip install raganything[text]` 安装

> **📋 快速安装**: 使用 `pip install raganything[all]` 启用所有格式支持（仅Python依赖 - LibreOffice仍需单独安装）

---

## 🧪 支持的内容类型

### 文档格式

- **PDF** - 研究论文、报告、演示文稿
- **Office文档** - DOC、DOCX、PPT、PPTX、XLS、XLSX
- **图像** - JPG、PNG、BMP、TIFF、GIF、WebP
- **文本文件** - TXT、MD

### 多模态元素

- **图像** - 照片、图表、示意图、截图
- **表格** - 数据表、对比图、统计摘要
- **公式** - LaTeX格式的数学公式
- **通用内容** - 通过可扩展处理器支持的自定义内容类型

*格式特定依赖的安装说明请参见[配置](#-配置)部分。*

---

## 📖 引用

*学术参考*

<div align="center">
  <div style="width: 60px; height: 60px; margin: 20px auto; position: relative;">
    <div style="width: 100%; height: 100%; border: 2px solid #00d9ff; border-radius: 50%; position: relative;">
      <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 24px; color: #00d9ff;">📖</div>
    </div>
    <div style="position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); width: 20px; height: 20px; background: white; border-right: 2px solid #00d9ff; border-bottom: 2px solid #00d9ff; transform: rotate(45deg);"></div>
  </div>
</div>

```bibtex
@article{guo2024lightrag,
  title={LightRAG: Simple and Fast Retrieval-Augmented Generation},
  author={Zirui Guo and Lianghao Xia and Yanhua Yu and Tu Ao and Chao Huang},
  year={2024},
  eprint={2410.05779},
  archivePrefix={arXiv},
  primaryClass={cs.IR}
}
```

---

## 🔗 相关项目

*生态系统与扩展*

<div align="center">
  <table>
    <tr>
      <td align="center">
        <a href="https://github.com/HKUDS/LightRAG">
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%); border-radius: 15px; border: 1px solid rgba(0, 217, 255, 0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <span style="font-size: 32px;">⚡</span>
          </div>
          <b>LightRAG</b><br>
          <sub>简单快速的RAG系统</sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/HKUDS/VideoRAG">
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%); border-radius: 15px; border: 1px solid rgba(0, 217, 255, 0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <span style="font-size: 32px;">🎥</span>
          </div>
          <b>VideoRAG</b><br>
          <sub>超长上下文视频RAG系统</sub>
        </a>
      </td>
      <td align="center">
        <a href="https://github.com/HKUDS/MiniRAG">
          <div style="width: 100px; height: 100px; background: linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%); border-radius: 15px; border: 1px solid rgba(0, 217, 255, 0.2); display: flex; align-items: center; justify-content: center; margin-bottom: 10px;">
            <span style="font-size: 32px;">✨</span>
          </div>
          <b>MiniRAG</b><br>
          <sub>极简RAG系统</sub>
        </a>
      </td>
    </tr>
  </table>
</div>

---

## ⭐ Star History

*社区增长轨迹*

<div align="center">
  <a href="https://star-history.com/#HKUDS/RAG-Anything&Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=HKUDS/RAG-Anything&type=Date&theme=dark" />
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=HKUDS/RAG-Anything&type=Date" />
      <img alt="Star History Chart" src="https://api.star-history.com/svg?repos=HKUDS/RAG-Anything&type=Date" style="border-radius: 15px; box-shadow: 0 0 30px rgba(0, 217, 255, 0.3);" />
    </picture>
  </a>
</div>

---

## 🤝 贡献者

*加入创新*

<div align="center">
  感谢所有贡献者！
</div>

<div align="center">
  <a href="https://github.com/HKUDS/RAG-Anything/graphs/contributors">
    <img src="https://contrib.rocks/image?repo=HKUDS/RAG-Anything" style="border-radius: 15px; box-shadow: 0 0 20px rgba(0, 217, 255, 0.3);" />
  </a>
</div>

---

<div align="center" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 15px; padding: 30px; margin: 30px 0;">
  <div>
    <img src="https://user-images.githubusercontent.com/74038190/212284100-561aa473-3905-4a80-b561-0d28506553ee.gif" width="500">
  </div>
  <div style="margin-top: 20px;">
    <a href="https://github.com/HKUDS/RAG-Anything" style="text-decoration: none;">
      <img src="https://img.shields.io/badge/⭐%20在GitHub上为我们点星-1a1a2e?style=for-the-badge&logo=github&logoColor=white">
    </a>
    <a href="https://github.com/HKUDS/RAG-Anything/issues" style="text-decoration: none;">
      <img src="https://img.shields.io/badge/🐛%20报告问题-ff6b6b?style=for-the-badge&logo=github&logoColor=white">
    </a>
    <a href="https://github.com/HKUDS/RAG-Anything/discussions" style="text-decoration: none;">
      <img src="https://img.shields.io/badge/💬%20讨论交流-4ecdc4?style=for-the-badge&logo=github&logoColor=white">
    </a>
  </div>
</div>

<div align="center">
  <div style="width: 100%; max-width: 600px; margin: 20px auto; padding: 20px; background: linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%); border-radius: 15px; border: 1px solid rgba(0, 217, 255, 0.2);">
    <div style="display: flex; justify-content: center; align-items: center; gap: 15px;">
      <span style="font-size: 24px;">⭐</span>
      <span style="color: #00d9ff; font-size: 18px;">感谢您访问RAG-Anything!</span>
      <span style="font-size: 24px;">⭐</span>
    </div>
    <div style="margin-top: 10px; color: #00d9ff; font-size: 16px;">构建多模态AI的未来</div>
  </div>
</div>

<div align="center">
  <img src="https://readme-typing-svg.herokuapp.com?font=Orbitron&size=20&duration=3000&pause=1000&color=00D9FF&center=true&vCenter=true&width=600&lines=感谢您访问RAG-Anything!;构建多模态AI的未来;如果觉得有用请点星⭐!" alt="Closing Animation" />
</div>

<style>
@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(0, 217, 255, 0.5); }
  50% { box-shadow: 0 0 20px rgba(0, 217, 255, 0.8); }
  100% { box-shadow: 0 0 5px rgba(0, 217, 255, 0.5); }
}
</style>



================================================
FILE: requirements.txt
================================================
huggingface_hub
# LightRAG packages
lightrag-hku
# MinerU 2.0 packages (replaces magic-pdf)
mineru[core]
# Progress bars for batch processing
tqdm
# Note: Optional dependencies are now defined in setup.py extras_require:
# - [image]: Pillow>=10.0.0 (for BMP, TIFF, GIF, WebP format conversion)
# - [text]: reportlab>=4.0.0 (for TXT, MD to PDF conversion)
# - [office]: requires LibreOffice (external program, not Python package)
# - [all]: includes all optional dependencies
#
# Install with: pip install raganything[image,text] or pip install raganything[all]



================================================
FILE: setup.py
================================================
import setuptools
from pathlib import Path


# Reading the long description from README.md
def read_long_description():
    try:
        return Path("README.md").read_text(encoding="utf-8")
    except FileNotFoundError:
        return "A description of RAGAnything is currently unavailable."


# Retrieving metadata from __init__.py
def retrieve_metadata():
    vars2find = ["__author__", "__version__", "__url__"]
    vars2readme = {}
    try:
        with open("./raganything/__init__.py") as f:
            for line in f.readlines():
                for v in vars2find:
                    if line.startswith(v):
                        line = (
                            line.replace(" ", "")
                            .replace('"', "")
                            .replace("'", "")
                            .strip()
                        )
                        vars2readme[v] = line.split("=")[1]
    except FileNotFoundError:
        raise FileNotFoundError("Metadata file './raganything/__init__.py' not found.")

    # Checking if all required variables are found
    missing_vars = [v for v in vars2find if v not in vars2readme]
    if missing_vars:
        raise ValueError(
            f"Missing required metadata variables in __init__.py: {missing_vars}"
        )

    return vars2readme


# Reading dependencies from requirements.txt
def read_requirements():
    deps = []
    try:
        with open("./requirements.txt") as f:
            deps = [
                line.strip() for line in f if line.strip() and not line.startswith("#")
            ]
    except FileNotFoundError:
        print(
            "Warning: 'requirements.txt' not found. No dependencies will be installed."
        )
    return deps


metadata = retrieve_metadata()
long_description = read_long_description()
requirements = read_requirements()

# Define extras_require for optional features
extras_require = {
    "image": ["Pillow>=10.0.0"],  # For image format conversion (BMP, TIFF, GIF, WebP)
    "text": ["reportlab>=4.0.0"],  # For text file to PDF conversion (TXT, MD)
    "office": [],  # Office document processing requires LibreOffice (external program)
    "all": ["Pillow>=10.0.0", "reportlab>=4.0.0"],  # All optional features
    "markdown": [
        "markdown>=3.4.0",
        "weasyprint>=60.0",
        "pygments>=2.10.0",
    ],  # Enhanced markdown conversion
}

setuptools.setup(
    name="raganything",
    url=metadata["__url__"],
    version=metadata["__version__"],
    author=metadata["__author__"],
    description="RAGAnything: All-in-One RAG System",
    long_description=long_description,
    long_description_content_type="text/markdown",
    packages=setuptools.find_packages(
        exclude=("tests*", "docs*")
    ),  # Automatically find packages
    classifiers=[
        "Development Status :: 4 - Beta",
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Intended Audience :: Developers",
        "Topic :: Software Development :: Libraries :: Python Modules",
    ],
    python_requires=">=3.9",
    install_requires=requirements,
    extras_require=extras_require,
    include_package_data=True,  # Includes non-code files from MANIFEST.in
    project_urls={  # Additional project metadata
        "Documentation": metadata.get("__url__", ""),
        "Source": metadata.get("__url__", ""),
        "Tracker": f"{metadata.get('__url__', '')}/issues"
        if metadata.get("__url__")
        else "",
    },
)



================================================
FILE: .pre-commit-config.yaml
================================================
repos:
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v5.0.0
    hooks:
      - id: trailing-whitespace
        exclude: ^lightrag/api/webui/
      - id: end-of-file-fixer
        exclude: ^lightrag/api/webui/
      - id: requirements-txt-fixer
        exclude: ^lightrag/api/webui/


  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.4
    hooks:
      - id: ruff-format
        exclude: ^lightrag/api/webui/
      - id: ruff
        args: [--fix, --ignore=E402]
        exclude: ^lightrag/api/webui/


  - repo: https://github.com/mgedmin/check-manifest
    rev: "0.49"
    hooks:
      - id: check-manifest
        stages: [manual]
        exclude: ^lightrag/api/webui/



================================================
FILE: docs/batch_processing.md
================================================
# Batch Processing

This document describes the batch processing feature for RAG-Anything, which allows you to process multiple documents in parallel for improved throughput.

## Overview

The batch processing feature allows you to process multiple documents concurrently, significantly improving throughput for large document collections. It provides parallel processing, progress tracking, error handling, and flexible configuration options.

## Key Features

- **Parallel Processing**: Process multiple files concurrently using thread pools
- **Progress Tracking**: Real-time progress bars with `tqdm`
- **Error Handling**: Comprehensive error reporting and recovery
- **Flexible Input**: Support for files, directories, and recursive search
- **Configurable Workers**: Adjustable number of parallel workers
- **Installation Check Bypass**: Optional skip for environments with package conflicts

## Installation

```bash
# Basic installation
pip install raganything[all]

# Required for batch processing
pip install tqdm
```

## Usage

### Basic Batch Processing

```python
from raganything.batch_parser import BatchParser

# Create batch parser
batch_parser = BatchParser(
    parser_type="mineru",  # or "docling"
    max_workers=4,
    show_progress=True,
    timeout_per_file=300,
    skip_installation_check=False  # Set to True if having parser installation issues
)

# Process multiple files
result = batch_parser.process_batch(
    file_paths=["doc1.pdf", "doc2.docx", "folder/"],
    output_dir="./batch_output",
    parse_method="auto",
    recursive=True
)

# Check results
print(result.summary())
print(f"Success rate: {result.success_rate:.1f}%")
print(f"Processing time: {result.processing_time:.2f} seconds")
```

### Asynchronous Batch Processing

```python
import asyncio
from raganything.batch_parser import BatchParser

async def async_batch_processing():
    batch_parser = BatchParser(
        parser_type="mineru",
        max_workers=4,
        show_progress=True
    )

    # Process files asynchronously
    result = await batch_parser.process_batch_async(
        file_paths=["doc1.pdf", "doc2.docx"],
        output_dir="./output",
        parse_method="auto"
    )

    return result

# Run async processing
result = asyncio.run(async_batch_processing())
```

### Integration with RAG-Anything

```python
from raganything import RAGAnything

rag = RAGAnything()

# Process documents with batch functionality
result = rag.process_documents_batch(
    file_paths=["doc1.pdf", "doc2.docx"],
    output_dir="./output",
    max_workers=4,
    show_progress=True
)

print(f"Processed {len(result.successful_files)} files successfully")
```

### Process Documents with RAG Integration

```python
# Process documents in batch and then add them to RAG
result = await rag.process_documents_with_rag_batch(
    file_paths=["doc1.pdf", "doc2.docx"],
    output_dir="./output",
    max_workers=4,
    show_progress=True
)

print(f"Processed {result['successful_rag_files']} files with RAG")
print(f"Total processing time: {result['total_processing_time']:.2f} seconds")
```

### Command Line Interface

```bash
# Basic batch processing
python -m raganything.batch_parser path/to/docs/ --output ./output --workers 4

# With specific parser
python -m raganything.batch_parser path/to/docs/ --parser mineru --method auto

# Without progress bar
python -m raganything.batch_parser path/to/docs/ --output ./output --no-progress

# Help
python -m raganything.batch_parser --help
```

## Configuration

### Environment Variables

```env
# Batch processing configuration
MAX_CONCURRENT_FILES=4
SUPPORTED_FILE_EXTENSIONS=.pdf,.docx,.doc,.pptx,.ppt,.xlsx,.xls,.txt,.md
RECURSIVE_FOLDER_PROCESSING=true
PARSER_OUTPUT_DIR=./parsed_output
```

### BatchParser Parameters

- **parser_type**: `"mineru"` or `"docling"` (default: `"mineru"`)
- **max_workers**: Number of parallel workers (default: `4`)
- **show_progress**: Show progress bar (default: `True`)
- **timeout_per_file**: Timeout per file in seconds (default: `300`)
- **skip_installation_check**: Skip parser installation check (default: `False`)

## Supported File Types

- **PDF files**: `.pdf`
- **Office documents**: `.doc`, `.docx`, `.ppt`, `.pptx`, `.xls`, `.xlsx`
- **Images**: `.png`, `.jpg`, `.jpeg`, `.bmp`, `.tiff`, `.tif`, `.gif`, `.webp`
- **Text files**: `.txt`, `.md`

## API Reference

### BatchProcessingResult

```python
@dataclass
class BatchProcessingResult:
    successful_files: List[str]      # Successfully processed files
    failed_files: List[str]          # Failed files
    total_files: int                 # Total number of files
    processing_time: float           # Total processing time in seconds
    errors: Dict[str, str]           # Error messages for failed files
    output_dir: str                  # Output directory used

    def summary(self) -> str:        # Human-readable summary
    def success_rate(self) -> float: # Success rate as percentage
```

### BatchParser Methods

```python
class BatchParser:
    def __init__(self, parser_type: str = "mineru", max_workers: int = 4, ...):
        """Initialize batch parser"""

    def get_supported_extensions(self) -> List[str]:
        """Get list of supported file extensions"""

    def filter_supported_files(self, file_paths: List[str], recursive: bool = True) -> List[str]:
        """Filter files to only supported types"""

    def process_batch(self, file_paths: List[str], output_dir: str, ...) -> BatchProcessingResult:
        """Process files in batch"""

    async def process_batch_async(self, file_paths: List[str], output_dir: str, ...) -> BatchProcessingResult:
        """Process files in batch asynchronously"""
```

## Performance Considerations

### Memory Usage
- Each worker uses additional memory
- Recommended: 2-4 workers for most systems
- Monitor memory usage with large files

### CPU Usage
- Parallel processing utilizes multiple cores
- Optimal worker count depends on CPU cores and file sizes
- I/O may become bottleneck with many small files

### Recommended Settings
- **Small files** (< 1MB): Higher worker count (6-8)
- **Large files** (> 100MB): Lower worker count (2-3)
- **Mixed sizes**: Start with 4 workers and adjust

## Troubleshooting

### Common Issues

#### Memory Errors
```python
# Solution: Reduce max_workers
batch_parser = BatchParser(max_workers=2)
```

#### Timeout Errors
```python
# Solution: Increase timeout_per_file
batch_parser = BatchParser(timeout_per_file=600)  # 10 minutes
```

#### Parser Installation Issues
```python
# Solution: Skip installation check
batch_parser = BatchParser(skip_installation_check=True)
```

#### File Not Found Errors
- Check file paths and permissions
- Ensure input files exist
- Verify directory access rights

### Debug Mode

Enable debug logging for detailed information:

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Create batch parser with debug logging
batch_parser = BatchParser(parser_type="mineru", max_workers=2)
```

### Error Handling

The batch processor provides comprehensive error handling:

```python
result = batch_parser.process_batch(file_paths=["doc1.pdf", "doc2.docx"])

# Check for errors
if result.failed_files:
    print("Failed files:")
    for file_path in result.failed_files:
        error_message = result.errors.get(file_path, "Unknown error")
        print(f"  - {file_path}: {error_message}")

# Process only successful files
for file_path in result.successful_files:
    print(f"Successfully processed: {file_path}")
```

## Examples

### Process Entire Directory

```python
from pathlib import Path

# Process all supported files in a directory
batch_parser = BatchParser(max_workers=4)
directory_path = Path("./documents")

result = batch_parser.process_batch(
    file_paths=[str(directory_path)],
    output_dir="./processed",
    recursive=True  # Include subdirectories
)

print(f"Processed {len(result.successful_files)} out of {result.total_files} files")
```

### Filter Files Before Processing

```python
# Get all files in directory
all_files = ["doc1.pdf", "image.png", "spreadsheet.xlsx", "unsupported.xyz"]

# Filter to supported files only
supported_files = batch_parser.filter_supported_files(all_files)
print(f"Will process {len(supported_files)} out of {len(all_files)} files")

# Process only supported files
result = batch_parser.process_batch(
    file_paths=supported_files,
    output_dir="./output"
)
```

### Custom Error Handling

```python
def process_with_retry(file_paths, max_retries=3):
    """Process files with retry logic"""

    for attempt in range(max_retries):
        result = batch_parser.process_batch(file_paths, "./output")

        if not result.failed_files:
            break  # All files processed successfully

        print(f"Attempt {attempt + 1}: {len(result.failed_files)} files failed")
        file_paths = result.failed_files  # Retry failed files

    return result
```

## Best Practices

1. **Start with default settings** and adjust based on performance
2. **Monitor system resources** during batch processing
3. **Use appropriate worker counts** for your hardware
4. **Handle errors gracefully** with retry logic
5. **Test with small batches** before processing large collections
6. **Use skip_installation_check** if facing parser installation issues
7. **Enable progress tracking** for long-running operations
8. **Set appropriate timeouts** based on expected file processing times

## Conclusion

The batch processing feature significantly improves RAG-Anything's throughput for large document collections. It provides flexible configuration options, comprehensive error handling, and seamless integration with the existing RAG-Anything pipeline.



================================================
FILE: docs/context_aware_processing.md
================================================
# Context-Aware Multimodal Processing in RAGAnything

This document describes the context-aware multimodal processing feature in RAGAnything, which provides surrounding content information to LLMs when analyzing images, tables, equations, and other multimodal content for enhanced accuracy and relevance.

## Overview

The context-aware feature enables RAGAnything to automatically extract and provide surrounding text content as context when processing multimodal content. This leads to more accurate and contextually relevant analysis by giving AI models additional information about where the content appears in the document structure.

### Key Benefits

- **Enhanced Accuracy**: Context helps AI understand the purpose and meaning of multimodal content
- **Semantic Coherence**: Generated descriptions align with document context and terminology
- **Automated Integration**: Context extraction is automatically enabled during document processing
- **Flexible Configuration**: Multiple extraction modes and filtering options

## Key Features

### 1. Configuration Support
- **Integrated Configuration**: Complete context options in `RAGAnythingConfig`
- **Environment Variables**: Configure all context parameters via environment variables
- **Dynamic Updates**: Runtime configuration updates supported
- **Content Format Control**: Configurable content source format detection

### 2. Automated Integration
- **Auto-Initialization**: Modal processors automatically receive tokenizer and context configuration
- **Content Source Setup**: Document processing automatically sets content sources for context extraction
- **Position Information**: Automatic position info (page_idx, index) passed to processors
- **Batch Processing**: Context-aware batch processing for efficient document handling

### 3. Advanced Token Management
- **Accurate Token Counting**: Uses LightRAG's tokenizer for precise token calculation
- **Smart Boundary Preservation**: Truncates at sentence/paragraph boundaries
- **Backward Compatibility**: Fallback to character truncation when tokenizer unavailable

### 4. Universal Context Extraction
- **Multiple Formats**: Support for MinerU, plain text, custom formats
- **Flexible Modes**: Page-based and chunk-based context extraction
- **Content Filtering**: Configurable content type filtering
- **Header Support**: Optional inclusion of document headers and structure

## Configuration

### RAGAnythingConfig Parameters

```python
# Context Extraction Configuration
context_window: int = 1                    # Context window size (pages/chunks)
context_mode: str = "page"                 # Context mode ("page" or "chunk")
max_context_tokens: int = 2000             # Maximum context tokens
include_headers: bool = True               # Include document headers
include_captions: bool = True              # Include image/table captions
context_filter_content_types: List[str] = ["text"]  # Content types to include
content_format: str = "minerU"             # Default content format for context extraction
```

### Environment Variables

```bash
# Context extraction settings
CONTEXT_WINDOW=2
CONTEXT_MODE=page
MAX_CONTEXT_TOKENS=3000
INCLUDE_HEADERS=true
INCLUDE_CAPTIONS=true
CONTEXT_FILTER_CONTENT_TYPES=text,image
CONTENT_FORMAT=minerU
```

## Usage Guide

### 1. Basic Configuration

```python
from raganything import RAGAnything, RAGAnythingConfig

# Create configuration with context settings
config = RAGAnythingConfig(
    context_window=2,
    context_mode="page",
    max_context_tokens=3000,
    include_headers=True,
    include_captions=True,
    context_filter_content_types=["text", "image"],
    content_format="minerU"
)

# Create RAGAnything instance
rag_anything = RAGAnything(
    config=config,
    llm_model_func=your_llm_function,
    embedding_func=your_embedding_function
)
```

### 2. Automatic Document Processing

```python
# Context is automatically enabled during document processing
await rag_anything.process_document_complete("document.pdf")
```

### 3. Manual Content Source Configuration

```python
# Set content source for specific content lists
rag_anything.set_content_source_for_context(content_list, "minerU")

# Update context configuration at runtime
rag_anything.update_context_config(
    context_window=1,
    max_context_tokens=1500,
    include_captions=False
)
```

### 4. Direct Modal Processor Usage

```python
from raganything.modalprocessors import (
    ContextExtractor,
    ContextConfig,
    ImageModalProcessor
)

# Configure context extraction
config = ContextConfig(
    context_window=1,
    context_mode="page",
    max_context_tokens=2000,
    include_headers=True,
    include_captions=True,
    filter_content_types=["text"]
)

# Initialize context extractor
context_extractor = ContextExtractor(config)

# Initialize modal processor with context support
processor = ImageModalProcessor(lightrag, caption_func, context_extractor)

# Set content source
processor.set_content_source(content_list, "minerU")

# Process with context
item_info = {
    "page_idx": 2,
    "index": 5,
    "type": "image"
}

result = await processor.process_multimodal_content(
    modal_content=image_data,
    content_type="image",
    file_path="document.pdf",
    entity_name="Architecture Diagram",
    item_info=item_info
)
```

## Context Modes

### Page-Based Context (`context_mode="page"`)
- Extracts context based on page boundaries
- Uses `page_idx` field from content items
- Suitable for document-structured content
- Example: Include text from 2 pages before and after current image

### Chunk-Based Context (`context_mode="chunk"`)
- Extracts context based on content item positions
- Uses sequential position in content list
- Suitable for fine-grained control
- Example: Include 5 content items before and after current table

## Processing Workflow

### 1. Document Parsing
```
Document Input → MinerU Parsing → content_list Generation
```

### 2. Context Setup
```
content_list → Set as Context Source → All Modal Processors Gain Context Capability
```

### 3. Multimodal Processing
```
Multimodal Content → Extract Surrounding Context → Enhanced LLM Analysis → More Accurate Results
```

## Content Source Formats

### MinerU Format
```json
[
    {
        "type": "text",
        "text": "Document content here...",
        "text_level": 1,
        "page_idx": 0
    },
    {
        "type": "image",
        "img_path": "images/figure1.jpg",
        "img_caption": ["Figure 1: Architecture"],
        "page_idx": 1
    }
]
```

### Custom Text Chunks
```python
text_chunks = [
    "First chunk of text content...",
    "Second chunk of text content...",
    "Third chunk of text content..."
]
```

### Plain Text
```python
full_document = "Complete document text with all content..."
```

## Configuration Examples

### High-Precision Context
For focused analysis with minimal context:
```python
config = RAGAnythingConfig(
    context_window=1,
    context_mode="page",
    max_context_tokens=1000,
    include_headers=True,
    include_captions=False,
    context_filter_content_types=["text"]
)
```

### Comprehensive Context
For broad analysis with rich context:
```python
config = RAGAnythingConfig(
    context_window=2,
    context_mode="page",
    max_context_tokens=3000,
    include_headers=True,
    include_captions=True,
    context_filter_content_types=["text", "image", "table"]
)
```

### Chunk-Based Analysis
For fine-grained sequential context:
```python
config = RAGAnythingConfig(
    context_window=5,
    context_mode="chunk",
    max_context_tokens=2000,
    include_headers=False,
    include_captions=False,
    context_filter_content_types=["text"]
)
```

## Performance Optimization

### 1. Accurate Token Control
- Uses real tokenizer for precise token counting
- Avoids exceeding LLM token limits
- Provides consistent performance

### 2. Smart Truncation
- Truncates at sentence boundaries
- Maintains semantic integrity
- Adds truncation indicators

### 3. Caching Optimization
- Context extraction results can be reused
- Reduces redundant computation overhead

## Advanced Features

### Context Truncation
The system automatically truncates context to fit within token limits:
- Uses actual tokenizer for accurate token counting
- Attempts to end at sentence boundaries (periods)
- Falls back to line boundaries if needed
- Adds "..." indicator for truncated content

### Header Formatting
When `include_headers=True`, headers are formatted with markdown-style prefixes:
```
# Level 1 Header
## Level 2 Header
### Level 3 Header
```

### Caption Integration
When `include_captions=True`, image and table captions are included as:
```
[Image: Figure 1 caption text]
[Table: Table 1 caption text]
```

## Integration with RAGAnything

The context-aware feature is seamlessly integrated into RAGAnything's workflow:

1. **Automatic Setup**: Context extractors are automatically created and configured
2. **Content Source Management**: Document processing automatically sets content sources
3. **Processor Integration**: All modal processors receive context capabilities
4. **Configuration Consistency**: Single configuration system for all context settings

## Error Handling

The system includes robust error handling:
- Gracefully handles missing or invalid content sources
- Returns empty context for unsupported formats
- Logs warnings for configuration issues
- Continues processing even if context extraction fails

## Compatibility

- **Backward Compatible**: Existing code works without modification
- **Optional Feature**: Context can be selectively enabled/disabled
- **Flexible Configuration**: Supports multiple configuration combinations

## Best Practices

1. **Token Limits**: Ensure `max_context_tokens` doesn't exceed LLM context limits
2. **Performance Impact**: Larger context windows increase processing time
3. **Content Quality**: Context quality directly affects analysis accuracy
4. **Window Size**: Match window size to content structure (documents vs articles)
5. **Content Filtering**: Use `context_filter_content_types` to reduce noise

## Troubleshooting

### Common Issues

**Context Not Extracted**
- Check if `set_content_source_for_context()` was called
- Verify `item_info` contains required fields (`page_idx`, `index`)
- Confirm content source format is correct

**Context Too Long/Short**
- Adjust `max_context_tokens` setting
- Modify `context_window` size
- Check `context_filter_content_types` configuration

**Irrelevant Context**
- Refine `context_filter_content_types` to exclude noise
- Reduce `context_window` size
- Set `include_captions=False` if captions are not helpful

**Configuration Issues**
- Verify environment variables are set correctly
- Check RAGAnythingConfig parameter names
- Ensure content_format matches your data source

## Examples

Check out these example files for complete usage demonstrations:

- **Configuration Examples**: See how to set up different context configurations
- **Integration Examples**: Learn how to integrate context-aware processing into your workflow
- **Custom Processors**: Examples of creating custom modal processors with context support

## API Reference

For detailed API documentation, see the docstrings in:
- `raganything/modalprocessors.py` - Context extraction and modal processors
- `raganything/config.py` - Configuration options
- `raganything/raganything.py` - Main RAGAnything class integration



================================================
FILE: docs/enhanced_markdown.md
================================================
# Enhanced Markdown Conversion

This document describes the enhanced markdown conversion feature for RAG-Anything, which provides high-quality PDF generation from markdown files with multiple backend options and advanced styling.

## Overview

The enhanced markdown conversion feature provides professional-quality PDF generation from markdown files. It supports multiple conversion backends, advanced styling options, syntax highlighting, and seamless integration with RAG-Anything's document processing pipeline.

## Key Features

- **Multiple Backends**: WeasyPrint, Pandoc, and automatic backend selection
- **Advanced Styling**: Custom CSS, syntax highlighting, and professional layouts
- **Image Support**: Embedded images with proper scaling and positioning
- **Table Support**: Formatted tables with borders and professional styling
- **Code Highlighting**: Syntax highlighting for code blocks using Pygments
- **Custom Templates**: Support for custom CSS and document templates
- **Table of Contents**: Automatic TOC generation with navigation links
- **Professional Typography**: High-quality fonts and spacing

## Installation

### Required Dependencies

```bash
# Basic installation
pip install raganything[all]

# Required for enhanced markdown conversion
pip install markdown weasyprint pygments
```

### Optional Dependencies

```bash
# For Pandoc backend (system installation required)
# Ubuntu/Debian:
sudo apt-get install pandoc wkhtmltopdf

# macOS:
brew install pandoc wkhtmltopdf

# Or using conda:
conda install -c conda-forge pandoc wkhtmltopdf
```

### Backend-Specific Installation

#### WeasyPrint (Recommended)
```bash
# Install WeasyPrint with system dependencies
pip install weasyprint

# Ubuntu/Debian system dependencies:
sudo apt-get install -y build-essential python3-dev python3-pip \
    python3-setuptools python3-wheel python3-cffi libcairo2 \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    libffi-dev shared-mime-info
```

#### Pandoc
- Download from: https://pandoc.org/installing.html
- Requires system-wide installation
- Used for complex document structures and LaTeX-quality output

## Usage

### Basic Conversion

```python
from raganything.enhanced_markdown import EnhancedMarkdownConverter, MarkdownConfig

# Create converter with default settings
converter = EnhancedMarkdownConverter()

# Convert markdown file to PDF
success = converter.convert_file_to_pdf(
    input_path="document.md",
    output_path="document.pdf",
    method="auto"  # Automatically select best available backend
)

if success:
    print("✅ Conversion successful!")
else:
    print("❌ Conversion failed")
```

### Advanced Configuration

```python
# Create custom configuration
config = MarkdownConfig(
    page_size="A4",           # A4, Letter, Legal, etc.
    margin="1in",             # CSS-style margins
    font_size="12pt",         # Base font size
    line_height="1.5",        # Line spacing
    include_toc=True,         # Generate table of contents
    syntax_highlighting=True, # Enable code syntax highlighting

    # Custom CSS styling
    custom_css="""
    body {
        font-family: 'Georgia', serif;
        color: #333;
    }
    h1 {
        color: #2c3e50;
        border-bottom: 2px solid #3498db;
        padding-bottom: 0.3em;
    }
    code {
        background-color: #f8f9fa;
        padding: 2px 4px;
        border-radius: 3px;
    }
    pre {
        background-color: #f8f9fa;
        border-left: 4px solid #3498db;
        padding: 15px;
        border-radius: 5px;
    }
    table {
        border-collapse: collapse;
        width: 100%;
        margin: 1em 0;
    }
    th, td {
        border: 1px solid #ddd;
        padding: 8px 12px;
        text-align: left;
    }
    th {
        background-color: #f2f2f2;
        font-weight: bold;
    }
    """
)

converter = EnhancedMarkdownConverter(config)
```

### Backend Selection

```python
# Check available backends
converter = EnhancedMarkdownConverter()
backend_info = converter.get_backend_info()

print("Available backends:")
for backend, available in backend_info["available_backends"].items():
    status = "✅" if available else "❌"
    print(f"  {status} {backend}")

print(f"Recommended backend: {backend_info['recommended_backend']}")

# Use specific backend
converter.convert_file_to_pdf(
    input_path="document.md",
    output_path="document.pdf",
    method="weasyprint"  # or "pandoc", "pandoc_system", "auto"
)
```

### Content Conversion

```python
# Convert markdown content directly (not from file)
markdown_content = """
# Sample Document

## Introduction
This is a **bold** statement with *italic* text.

## Code Example
```python
def hello_world():
    print("Hello, World!")
    return "Success"
```

## Table
| Feature | Status | Notes |
|---------|--------|-------|
| PDF Generation | ✅ | Working |
| Syntax Highlighting | ✅ | Pygments |
| Custom CSS | ✅ | Full support |
"""

success = converter.convert_markdown_to_pdf(
    markdown_content=markdown_content,
    output_path="sample.pdf",
    method="auto"
)
```

### Command Line Interface

```bash
# Basic conversion
python -m raganything.enhanced_markdown document.md --output document.pdf

# With specific backend
python -m raganything.enhanced_markdown document.md --method weasyprint

# With custom CSS file
python -m raganything.enhanced_markdown document.md --css custom_style.css

# Show backend information
python -m raganything.enhanced_markdown --info

# Help
python -m raganything.enhanced_markdown --help
```

## Backend Comparison

| Backend | Pros | Cons | Best For | Quality |
|---------|------|------|----------|---------|
| **WeasyPrint** | • Excellent CSS support<br>• Fast rendering<br>• Great web-style layouts<br>• Python-based | • Limited LaTeX features<br>• Requires system deps | • Web-style documents<br>• Custom styling<br>• Fast conversion | ⭐⭐⭐⭐ |
| **Pandoc** | • Extensive features<br>• LaTeX-quality output<br>• Academic formatting<br>• Many input/output formats | • Slower conversion<br>• System installation<br>• Complex setup | • Academic papers<br>• Complex documents<br>• Publication quality | ⭐⭐⭐⭐⭐ |
| **Auto** | • Automatic selection<br>• Fallback support<br>• User-friendly | • May not use optimal backend | • General use<br>• Quick setup<br>• Development | ⭐⭐⭐⭐ |

## Configuration Options

### MarkdownConfig Parameters

```python
@dataclass
class MarkdownConfig:
    # Page layout
    page_size: str = "A4"              # A4, Letter, Legal, A3, etc.
    margin: str = "1in"                # CSS margin format
    font_size: str = "12pt"            # Base font size
    line_height: str = "1.5"           # Line spacing multiplier

    # Content options
    include_toc: bool = True           # Generate table of contents
    syntax_highlighting: bool = True   # Enable code highlighting
    image_max_width: str = "100%"      # Maximum image width
    table_style: str = "..."           # Default table CSS

    # Styling
    css_file: Optional[str] = None     # External CSS file path
    custom_css: Optional[str] = None   # Inline CSS content
    template_file: Optional[str] = None # Custom HTML template

    # Output options
    output_format: str = "pdf"         # Currently only PDF supported
    output_dir: Optional[str] = None   # Output directory

    # Metadata
    metadata: Optional[Dict[str, str]] = None  # Document metadata
```

### Supported Markdown Features

#### Basic Formatting
- **Headers**: `# ## ### #### ##### ######`
- **Emphasis**: `*italic*`, `**bold**`, `***bold italic***`
- **Links**: `[text](url)`, `[text][ref]`
- **Images**: `![alt](url)`, `![alt][ref]`
- **Lists**: Ordered and unordered, nested
- **Blockquotes**: `> quote`
- **Line breaks**: Double space or `\n\n`

#### Advanced Features
- **Tables**: GitHub-style tables with alignment
- **Code blocks**: Fenced code blocks with language specification
- **Inline code**: `backtick code`
- **Horizontal rules**: `---` or `***`
- **Footnotes**: `[^1]` references
- **Definition lists**: Term and definition pairs
- **Attributes**: `{#id .class key=value}`

#### Code Highlighting

```markdown
```python
def example_function():
    """This will be syntax highlighted"""
    return "Hello, World!"
```

```javascript
function exampleFunction() {
    // This will also be highlighted
    return "Hello, World!";
}
```
```

## Integration with RAG-Anything

The enhanced markdown conversion integrates seamlessly with RAG-Anything:

```python
from raganything import RAGAnything

# Initialize RAG-Anything
rag = RAGAnything()

# Process markdown files - enhanced conversion is used automatically
await rag.process_document_complete("document.md")

# Batch processing with enhanced markdown conversion
result = rag.process_documents_batch(
    file_paths=["doc1.md", "doc2.md", "doc3.md"],
    output_dir="./output"
)

# The .md files will be converted to PDF using enhanced conversion
# before being processed by the RAG system
```

## Performance Considerations

### Conversion Speed
- **WeasyPrint**: ~1-3 seconds for typical documents
- **Pandoc**: ~3-10 seconds for typical documents
- **Large documents**: Time scales roughly linearly with content

### Memory Usage
- **WeasyPrint**: ~50-100MB per conversion
- **Pandoc**: ~100-200MB per conversion
- **Images**: Large images increase memory usage significantly

### Optimization Tips
1. **Resize large images** before embedding
2. **Use compressed images** (JPEG for photos, PNG for graphics)
3. **Limit concurrent conversions** to avoid memory issues
4. **Cache converted content** when processing multiple times

## Examples

### Sample Markdown Document

```markdown
# Technical Documentation

## Table of Contents
[TOC]

## Overview
This document provides comprehensive technical specifications.

## Architecture

### System Components
1. **Parser Engine**: Handles document processing
2. **Storage Layer**: Manages data persistence
3. **Query Interface**: Provides search capabilities

### Code Implementation
```python
from raganything import RAGAnything

# Initialize system
rag = RAGAnything(config={
    "working_dir": "./storage",
    "enable_image_processing": True
})

# Process document
await rag.process_document_complete("document.pdf")
```

### Performance Metrics

| Component | Throughput | Latency | Memory |
|-----------|------------|---------|--------|
| Parser | 100 docs/hour | 36s avg | 2.5 GB |
| Storage | 1000 ops/sec | 1ms avg | 512 MB |
| Query | 50 queries/sec | 20ms avg | 1 GB |

## Integration Notes

> **Important**: Always validate input before processing.

## Conclusion
The enhanced system provides excellent performance for document processing workflows.
```

### Generated PDF Features

The enhanced markdown converter produces PDFs with:

- **Professional typography** with proper font selection and spacing
- **Syntax-highlighted code blocks** using Pygments
- **Formatted tables** with borders and alternating row colors
- **Clickable table of contents** with navigation links
- **Responsive images** that scale appropriately
- **Custom styling** through CSS
- **Proper page breaks** and margins
- **Document metadata** and properties

## Troubleshooting

### Common Issues

#### WeasyPrint Installation Problems
```bash
# Ubuntu/Debian: Install system dependencies
sudo apt-get update
sudo apt-get install -y build-essential python3-dev libcairo2 \
    libpango-1.0-0 libpangocairo-1.0-0 libgdk-pixbuf2.0-0 \
    libffi-dev shared-mime-info

# Then reinstall WeasyPrint
pip install --force-reinstall weasyprint
```

#### Pandoc Not Found
```bash
# Check if Pandoc is installed
pandoc --version

# Install Pandoc (Ubuntu/Debian)
sudo apt-get install pandoc wkhtmltopdf

# Or download from: https://pandoc.org/installing.html
```

#### CSS Issues
- Check CSS syntax in custom_css
- Verify CSS file paths exist
- Test CSS with simple HTML first
- Use browser developer tools to debug styling

#### Image Problems
- Ensure images are accessible (correct paths)
- Check image file formats (PNG, JPEG, GIF supported)
- Verify image file permissions
- Consider image size and format optimization

#### Font Issues
```python
# Use web-safe fonts
config = MarkdownConfig(
    custom_css="""
    body {
        font-family: 'Arial', 'Helvetica', sans-serif;
    }
    """
)
```

### Debug Mode

Enable detailed logging for troubleshooting:

```python
import logging

# Enable debug logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

# Create converter with debug logging
converter = EnhancedMarkdownConverter()
result = converter.convert_file_to_pdf("test.md", "test.pdf")
```

### Error Handling

```python
def robust_conversion(input_path, output_path):
    """Convert with fallback backends"""
    converter = EnhancedMarkdownConverter()

    # Try backends in order of preference
    backends = ["weasyprint", "pandoc", "auto"]

    for backend in backends:
        try:
            success = converter.convert_file_to_pdf(
                input_path=input_path,
                output_path=output_path,
                method=backend
            )
            if success:
                print(f"✅ Conversion successful with {backend}")
                return True
        except Exception as e:
            print(f"❌ {backend} failed: {str(e)}")
            continue

    print("❌ All backends failed")
    return False
```

## API Reference

### EnhancedMarkdownConverter

```python
class EnhancedMarkdownConverter:
    def __init__(self, config: Optional[MarkdownConfig] = None):
        """Initialize converter with optional configuration"""

    def convert_file_to_pdf(self, input_path: str, output_path: str, method: str = "auto") -> bool:
        """Convert markdown file to PDF"""

    def convert_markdown_to_pdf(self, markdown_content: str, output_path: str, method: str = "auto") -> bool:
        """Convert markdown content to PDF"""

    def get_backend_info(self) -> Dict[str, Any]:
        """Get information about available backends"""

    def convert_with_weasyprint(self, markdown_content: str, output_path: str) -> bool:
        """Convert using WeasyPrint backend"""

    def convert_with_pandoc(self, markdown_content: str, output_path: str) -> bool:
        """Convert using Pandoc backend"""
```

## Best Practices

1. **Choose the right backend** for your use case:
   - **WeasyPrint** for web-style documents and custom CSS
   - **Pandoc** for academic papers and complex formatting
   - **Auto** for general use and development

2. **Optimize images** before embedding:
   - Use appropriate formats (JPEG for photos, PNG for graphics)
   - Compress images to reduce file size
   - Set reasonable maximum widths

3. **Design responsive layouts**:
   - Use relative units (%, em) instead of absolute (px)
   - Test with different page sizes
   - Consider print-specific CSS

4. **Test your styling**:
   - Start with default styling and incrementally customize
   - Test with sample content before production use
   - Validate CSS syntax

5. **Handle errors gracefully**:
   - Implement fallback backends
   - Provide meaningful error messages
   - Log conversion attempts for debugging

6. **Performance optimization**:
   - Cache converted content when possible
   - Process large batches with appropriate worker counts
   - Monitor memory usage with large documents

## Conclusion

The enhanced markdown conversion feature provides professional-quality PDF generation with flexible styling options and multiple backend support. It seamlessly integrates with RAG-Anything's document processing pipeline while offering standalone functionality for markdown-to-PDF conversion needs.



================================================
FILE: examples/batch_processing_example.py
================================================
#!/usr/bin/env python
"""
Batch Processing Example for RAG-Anything

This example demonstrates how to use the batch processing capabilities
to process multiple documents in parallel for improved throughput.

Features demonstrated:
- Basic batch processing with BatchParser
- Asynchronous batch processing
- Integration with RAG-Anything
- Error handling and progress tracking
- File filtering and directory processing
"""

import asyncio
import logging
from pathlib import Path
import tempfile
import time

# Add project root directory to Python path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from raganything import RAGAnything, RAGAnythingConfig
from raganything.batch_parser import BatchParser


def create_sample_documents():
    """Create sample documents for batch processing testing"""
    temp_dir = Path(tempfile.mkdtemp())
    sample_files = []

    # Create various document types
    documents = {
        "document1.txt": "This is a simple text document for testing batch processing.",
        "document2.txt": "Another text document with different content.",
        "document3.md": """# Markdown Document

## Introduction
This is a markdown document for testing.

### Features
- Markdown formatting
- Code blocks
- Lists

```python
def example():
    return "Hello from markdown"
```
""",
        "report.txt": """Business Report

Executive Summary:
This report demonstrates batch processing capabilities.

Key Findings:
1. Parallel processing improves throughput
2. Progress tracking enhances user experience
3. Error handling ensures reliability

Conclusion:
Batch processing is essential for large-scale document processing.
""",
        "notes.md": """# Meeting Notes

## Date: 2024-01-15

### Attendees
- Alice Johnson
- Bob Smith
- Carol Williams

### Discussion Topics
1. **Batch Processing Implementation**
   - Parallel document processing
   - Progress tracking
   - Error handling strategies

2. **Performance Metrics**
   - Target: 100 documents/hour
   - Memory usage: < 4GB
   - Success rate: > 95%

### Action Items
- [ ] Implement batch processing
- [ ] Add progress bars
- [ ] Test with large document sets
- [ ] Optimize memory usage

### Next Steps
Continue development and testing of batch processing features.
""",
    }

    # Create files
    for filename, content in documents.items():
        file_path = temp_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        sample_files.append(str(file_path))

    return sample_files, temp_dir


def demonstrate_basic_batch_processing():
    """Demonstrate basic batch processing functionality"""
    print("\n" + "=" * 60)
    print("BASIC BATCH PROCESSING DEMONSTRATION")
    print("=" * 60)

    # Create sample documents
    sample_files, temp_dir = create_sample_documents()

    try:
        print(f"Created {len(sample_files)} sample documents in: {temp_dir}")
        for file_path in sample_files:
            print(f"  - {Path(file_path).name}")

        # Create batch parser
        batch_parser = BatchParser(
            parser_type="mineru",
            max_workers=3,
            show_progress=True,
            timeout_per_file=60,
            skip_installation_check=True,  # Skip installation check for demo
        )

        print("\nBatch parser configured:")
        print("  - Parser type: mineru")
        print("  - Max workers: 3")
        print("  - Progress tracking: enabled")
        print("  - Timeout per file: 60 seconds")

        # Check supported extensions
        supported_extensions = batch_parser.get_supported_extensions()
        print(f"  - Supported extensions: {supported_extensions}")

        # Filter files to supported types
        supported_files = batch_parser.filter_supported_files(sample_files)
        print("\nFile filtering results:")
        print(f"  - Total files: {len(sample_files)}")
        print(f"  - Supported files: {len(supported_files)}")

        # Process batch
        output_dir = temp_dir / "batch_output"
        print("\nStarting batch processing...")
        print(f"Output directory: {output_dir}")

        start_time = time.time()
        result = batch_parser.process_batch(
            file_paths=supported_files,
            output_dir=str(output_dir),
            parse_method="auto",
            recursive=False,
        )
        processing_time = time.time() - start_time

        # Display results
        print("\n" + "-" * 40)
        print("BATCH PROCESSING RESULTS")
        print("-" * 40)
        print(result.summary())
        print(f"Total processing time: {processing_time:.2f} seconds")
        print(f"Success rate: {result.success_rate:.1f}%")

        if result.successful_files:
            print("\nSuccessfully processed files:")
            for file_path in result.successful_files:
                print(f"  ✅ {Path(file_path).name}")

        if result.failed_files:
            print("\nFailed files:")
            for file_path in result.failed_files:
                error = result.errors.get(file_path, "Unknown error")
                print(f"  ❌ {Path(file_path).name}: {error}")

        return result

    except Exception as e:
        print(f"❌ Batch processing demonstration failed: {str(e)}")
        return None


async def demonstrate_async_batch_processing():
    """Demonstrate asynchronous batch processing"""
    print("\n" + "=" * 60)
    print("ASYNCHRONOUS BATCH PROCESSING DEMONSTRATION")
    print("=" * 60)

    # Create sample documents
    sample_files, temp_dir = create_sample_documents()

    try:
        print(f"Processing {len(sample_files)} documents asynchronously...")

        # Create batch parser
        batch_parser = BatchParser(
            parser_type="mineru",
            max_workers=2,
            show_progress=True,
            skip_installation_check=True,
        )

        # Process batch asynchronously
        output_dir = temp_dir / "async_output"

        start_time = time.time()
        result = await batch_parser.process_batch_async(
            file_paths=sample_files,
            output_dir=str(output_dir),
            parse_method="auto",
            recursive=False,
        )
        processing_time = time.time() - start_time

        # Display results
        print("\n" + "-" * 40)
        print("ASYNC BATCH PROCESSING RESULTS")
        print("-" * 40)
        print(result.summary())
        print(f"Async processing time: {processing_time:.2f} seconds")
        print(f"Success rate: {result.success_rate:.1f}%")

        return result

    except Exception as e:
        print(f"❌ Async batch processing demonstration failed: {str(e)}")
        return None


async def demonstrate_rag_integration():
    """Demonstrate batch processing integration with RAG-Anything"""
    print("\n" + "=" * 60)
    print("RAG-ANYTHING BATCH INTEGRATION DEMONSTRATION")
    print("=" * 60)

    # Create sample documents
    sample_files, temp_dir = create_sample_documents()

    try:
        # Initialize RAG-Anything with temporary storage
        config = RAGAnythingConfig(
            working_dir=str(temp_dir / "rag_storage"),
            enable_image_processing=True,
            enable_table_processing=True,
            enable_equation_processing=True,
            max_concurrent_files=2,
        )

        rag = RAGAnything(config=config)

        print("RAG-Anything initialized with batch processing capabilities")

        # Show available batch methods
        batch_methods = [method for method in dir(rag) if "batch" in method.lower()]
        print(f"Available batch methods: {batch_methods}")

        # Demonstrate batch processing with RAG integration
        print(f"\nProcessing {len(sample_files)} documents with RAG integration...")

        # Use the RAG-integrated batch processing
        try:
            # Process documents in batch
            result = rag.process_documents_batch(
                file_paths=sample_files,
                output_dir=str(temp_dir / "rag_batch_output"),
                max_workers=2,
                show_progress=True,
            )

            print("\n" + "-" * 40)
            print("RAG BATCH PROCESSING RESULTS")
            print("-" * 40)
            print(result.summary())
            print(f"Success rate: {result.success_rate:.1f}%")

            # Demonstrate batch processing with full RAG integration
            print("\nProcessing documents with full RAG integration...")

            rag_result = await rag.process_documents_with_rag_batch(
                file_paths=sample_files[:2],  # Process subset for demo
                output_dir=str(temp_dir / "rag_full_output"),
                max_workers=1,
                show_progress=True,
            )

            print("\n" + "-" * 40)
            print("FULL RAG INTEGRATION RESULTS")
            print("-" * 40)
            print(f"Parse result: {rag_result['parse_result'].summary()}")
            print(
                f"RAG processing time: {rag_result['total_processing_time']:.2f} seconds"
            )
            print(
                f"Successfully processed with RAG: {rag_result['successful_rag_files']}"
            )
            print(f"Failed RAG processing: {rag_result['failed_rag_files']}")

            return rag_result

        except Exception as e:
            print(f"⚠️ RAG integration demo completed with limitations: {str(e)}")
            print(
                "Note: This is expected in environments without full API configuration"
            )
            return None

    except Exception as e:
        print(f"❌ RAG integration demonstration failed: {str(e)}")
        return None


def demonstrate_directory_processing():
    """Demonstrate processing entire directories"""
    print("\n" + "=" * 60)
    print("DIRECTORY PROCESSING DEMONSTRATION")
    print("=" * 60)

    # Create a directory structure with nested files
    temp_dir = Path(tempfile.mkdtemp())

    # Create main directory files
    main_files = {
        "overview.txt": "Main directory overview document",
        "readme.md": "# Project README\n\nThis is the main project documentation.",
    }

    # Create subdirectory
    sub_dir = temp_dir / "subdirectory"
    sub_dir.mkdir()

    sub_files = {
        "details.txt": "Detailed information in subdirectory",
        "notes.md": "# Notes\n\nAdditional notes and information.",
    }

    # Write all files
    all_files = []
    for filename, content in main_files.items():
        file_path = temp_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        all_files.append(str(file_path))

    for filename, content in sub_files.items():
        file_path = sub_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        all_files.append(str(file_path))

    try:
        print("Created directory structure:")
        print(f"  Main directory: {temp_dir}")
        print(f"  Files in main: {list(main_files.keys())}")
        print(f"  Subdirectory: {sub_dir}")
        print(f"  Files in sub: {list(sub_files.keys())}")

        # Create batch parser
        batch_parser = BatchParser(
            parser_type="mineru",
            max_workers=2,
            show_progress=True,
            skip_installation_check=True,
        )

        # Process entire directory recursively
        print("\nProcessing entire directory recursively...")

        result = batch_parser.process_batch(
            file_paths=[str(temp_dir)],  # Pass directory path
            output_dir=str(temp_dir / "directory_output"),
            parse_method="auto",
            recursive=True,  # Include subdirectories
        )

        print("\n" + "-" * 40)
        print("DIRECTORY PROCESSING RESULTS")
        print("-" * 40)
        print(result.summary())
        print(f"Total files found and processed: {result.total_files}")
        print(f"Success rate: {result.success_rate:.1f}%")

        if result.successful_files:
            print("\nSuccessfully processed:")
            for file_path in result.successful_files:
                relative_path = Path(file_path).relative_to(temp_dir)
                print(f"  ✅ {relative_path}")

        return result

    except Exception as e:
        print(f"❌ Directory processing demonstration failed: {str(e)}")
        return None


def demonstrate_error_handling():
    """Demonstrate error handling and recovery"""
    print("\n" + "=" * 60)
    print("ERROR HANDLING DEMONSTRATION")
    print("=" * 60)

    temp_dir = Path(tempfile.mkdtemp())

    # Create files with various issues
    files_with_issues = {
        "valid_file.txt": "This is a valid file that should process successfully.",
        "empty_file.txt": "",  # Empty file
        "large_file.txt": "x" * 1000000,  # Large file (1MB of 'x')
    }

    created_files = []
    for filename, content in files_with_issues.items():
        file_path = temp_dir / filename
        with open(file_path, "w", encoding="utf-8") as f:
            f.write(content)
        created_files.append(str(file_path))

    # Add a non-existent file to the list
    created_files.append(str(temp_dir / "non_existent_file.txt"))

    try:
        print(f"Testing error handling with {len(created_files)} files:")
        for file_path in created_files:
            name = Path(file_path).name
            exists = Path(file_path).exists()
            size = Path(file_path).stat().st_size if exists else 0
            print(f"  - {name}: {'exists' if exists else 'missing'}, {size} bytes")

        # Create batch parser with short timeout for demonstration
        batch_parser = BatchParser(
            parser_type="mineru",
            max_workers=2,
            show_progress=True,
            timeout_per_file=30,  # Short timeout for demo
            skip_installation_check=True,
        )

        # Process files and handle errors
        result = batch_parser.process_batch(
            file_paths=created_files,
            output_dir=str(temp_dir / "error_test_output"),
            parse_method="auto",
        )

        print("\n" + "-" * 40)
        print("ERROR HANDLING RESULTS")
        print("-" * 40)
        print(result.summary())

        if result.successful_files:
            print("\nSuccessful files:")
            for file_path in result.successful_files:
                print(f"  ✅ {Path(file_path).name}")

        if result.failed_files:
            print("\nFailed files with error details:")
            for file_path in result.failed_files:
                error = result.errors.get(file_path, "Unknown error")
                print(f"  ❌ {Path(file_path).name}: {error}")

        # Demonstrate retry logic
        if result.failed_files:
            print(
                f"\nDemonstrating retry logic for {len(result.failed_files)} failed files..."
            )

            # Retry only the failed files
            retry_result = batch_parser.process_batch(
                file_paths=result.failed_files,
                output_dir=str(temp_dir / "retry_output"),
                parse_method="auto",
            )

            print(f"Retry results: {retry_result.summary()}")

        return result

    except Exception as e:
        print(f"❌ Error handling demonstration failed: {str(e)}")
        return None


async def main():
    """Main demonstration function"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    print("RAG-Anything Batch Processing Demonstration")
    print("=" * 70)
    print("This example demonstrates various batch processing capabilities:")
    print("  - Basic batch processing with progress tracking")
    print("  - Asynchronous processing for improved performance")
    print("  - Integration with RAG-Anything pipeline")
    print("  - Directory processing with recursive file discovery")
    print("  - Comprehensive error handling and recovery")

    results = {}

    # Run demonstrations
    print("\n🚀 Starting demonstrations...")

    # Basic batch processing
    results["basic"] = demonstrate_basic_batch_processing()

    # Asynchronous processing
    results["async"] = await demonstrate_async_batch_processing()

    # RAG integration
    results["rag"] = await demonstrate_rag_integration()

    # Directory processing
    results["directory"] = demonstrate_directory_processing()

    # Error handling
    results["error_handling"] = demonstrate_error_handling()

    # Summary
    print("\n" + "=" * 70)
    print("DEMONSTRATION SUMMARY")
    print("=" * 70)

    for demo_name, result in results.items():
        if result:
            if hasattr(result, "success_rate"):
                print(
                    f"✅ {demo_name.upper()}: {result.success_rate:.1f}% success rate"
                )
            else:
                print(f"✅ {demo_name.upper()}: Completed successfully")
        else:
            print(f"❌ {demo_name.upper()}: Failed or had limitations")

    print("\n📊 Key Features Demonstrated:")
    print("  - Parallel document processing with configurable worker counts")
    print("  - Real-time progress tracking with tqdm progress bars")
    print("  - Comprehensive error handling and reporting")
    print("  - File filtering based on supported document types")
    print("  - Directory processing with recursive file discovery")
    print("  - Asynchronous processing for improved performance")
    print("  - Integration with RAG-Anything document pipeline")
    print("  - Retry logic for failed documents")
    print("  - Detailed processing statistics and timing")

    print("\n💡 Best Practices Highlighted:")
    print("  - Use appropriate worker counts for your system")
    print("  - Enable progress tracking for long-running operations")
    print("  - Handle errors gracefully with retry mechanisms")
    print("  - Filter files to supported types before processing")
    print("  - Set reasonable timeouts for document processing")
    print("  - Use skip_installation_check for environments with conflicts")


if __name__ == "__main__":
    asyncio.run(main())



================================================
FILE: examples/enhanced_markdown_example.py
================================================
#!/usr/bin/env python
"""
Enhanced Markdown Conversion Example for RAG-Anything

This example demonstrates the enhanced markdown to PDF conversion capabilities
with multiple backends, advanced styling, and professional formatting.

Features demonstrated:
- Basic markdown to PDF conversion
- Multiple conversion backends (WeasyPrint, Pandoc)
- Custom CSS styling and configuration
- Backend detection and selection
- Error handling and fallback mechanisms
- Command-line interface usage
"""

import logging
from pathlib import Path
import tempfile

# Add project root directory to Python path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from raganything.enhanced_markdown import EnhancedMarkdownConverter, MarkdownConfig


def create_sample_markdown_content():
    """Create comprehensive sample markdown content for testing"""

    # Basic sample
    basic_content = """# Basic Markdown Sample

## Introduction
This is a simple markdown document demonstrating basic formatting.

### Text Formatting
- **Bold text** and *italic text*
- `Inline code` examples
- [Links to external sites](https://github.com)

### Lists
1. First ordered item
2. Second ordered item
3. Third ordered item

- Unordered item
- Another unordered item
  - Nested item
  - Another nested item

### Blockquotes
> This is a blockquote with important information.
> It can span multiple lines.

### Code Block
```python
def hello_world():
    print("Hello, World!")
    return "Success"
```
"""

    # Technical documentation sample
    technical_content = """# Technical Documentation

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Implementation](#implementation)
- [Performance](#performance)

## Overview
This document provides comprehensive technical specifications for the enhanced markdown conversion system.

## Architecture

### Core Components
1. **Markdown Parser**: Processes markdown syntax
2. **CSS Engine**: Applies styling and layout
3. **PDF Generator**: Creates final PDF output
4. **Backend Manager**: Handles multiple conversion engines

### Data Flow
```mermaid
graph LR
    A[Markdown Input] --> B[Parser]
    B --> C[CSS Processor]
    C --> D[PDF Generator]
    D --> E[PDF Output]
```

## Implementation

### Python Code Example
```python
from raganything.enhanced_markdown import EnhancedMarkdownConverter, MarkdownConfig

# Configure converter
config = MarkdownConfig(
    page_size="A4",
    margin="1in",
    include_toc=True,
    syntax_highlighting=True
)

# Create converter
converter = EnhancedMarkdownConverter(config)

# Convert to PDF
success = converter.convert_file_to_pdf(
    input_path="document.md",
    output_path="output.pdf",
    method="weasyprint"
)
```

### Configuration Options
```yaml
converter:
  page_size: A4
  margin: 1in
  font_size: 12pt
  include_toc: true
  syntax_highlighting: true
  backend: weasyprint
```

## Performance

### Benchmark Results
| Backend | Speed | Quality | Features |
|---------|-------|---------|----------|
| WeasyPrint | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Pandoc | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

### Processing Times
- **Small documents** (< 10 pages): 1-3 seconds
- **Medium documents** (10-50 pages): 3-10 seconds
- **Large documents** (> 50 pages): 10-30 seconds

## Advanced Features

### Custom CSS Styling
The system supports advanced CSS customization:

```css
body {
    font-family: 'Georgia', serif;
    line-height: 1.6;
    color: #333;
}

h1 {
    color: #2c3e50;
    border-bottom: 2px solid #3498db;
    padding-bottom: 0.3em;
}

code {
    background-color: #f8f9fa;
    padding: 2px 4px;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
}

pre {
    background-color: #f8f9fa;
    border-left: 4px solid #3498db;
    padding: 15px;
    border-radius: 5px;
    overflow-x: auto;
}

table {
    border-collapse: collapse;
    width: 100%;
    margin: 1em 0;
}

th, td {
    border: 1px solid #ddd;
    padding: 8px 12px;
    text-align: left;
}

th {
    background-color: #f2f2f2;
    font-weight: bold;
}
```

### Image Support
![Sample Image](https://via.placeholder.com/400x200/3498db/ffffff?text=Sample+Image)

Images are automatically scaled and positioned appropriately in the PDF output.

## Conclusion
The enhanced markdown conversion system provides professional-quality PDF generation with extensive customization options and multiple backend support.

---

*Generated on: 2024-01-15*
*Version: 1.0.0*
"""

    # Academic paper sample
    academic_content = """# Research Paper: Advanced Document Processing

**Authors:** Alice Johnson¹, Bob Smith², Carol Williams¹
**Affiliations:**
¹ University of Technology
² Research Institute

## Abstract

This paper presents a comprehensive analysis of advanced document processing techniques using enhanced markdown conversion. Our research demonstrates significant improvements in processing speed and output quality through optimized backend selection and custom styling approaches.

**Keywords:** document processing, markdown conversion, PDF generation, performance optimization

## 1. Introduction

Document processing has become increasingly important in modern information systems. The ability to convert markdown documents to high-quality PDF outputs with professional formatting is crucial for academic, technical, and business applications.

### 1.1 Research Objectives

1. Evaluate different markdown conversion backends
2. Analyze performance characteristics of each approach
3. Develop optimization strategies for large-scale processing
4. Design flexible configuration systems for diverse use cases

### 1.2 Contributions

This work makes the following contributions:
- Comprehensive comparison of markdown conversion backends
- Performance optimization techniques for large documents
- Flexible configuration framework for customization
- Integration patterns for document processing pipelines

## 2. Methodology

### 2.1 Experimental Setup

We conducted experiments using the following configuration:

```python
# Experimental configuration
config = MarkdownConfig(
    page_size="A4",
    margin="1in",
    font_size="11pt",
    line_height="1.4",
    include_toc=True,
    syntax_highlighting=True
)
```

### 2.2 Test Documents

| Category | Count | Avg Size | Complexity |
|----------|-------|----------|------------|
| Simple | 100 | 2 pages | Low |
| Medium | 50 | 10 pages | Medium |
| Complex | 25 | 25 pages | High |

### 2.3 Metrics

We evaluated performance using the following metrics:
- **Conversion Speed**: Time to generate PDF (seconds)
- **Memory Usage**: Peak memory consumption (MB)
- **Output Quality**: Visual assessment score (1-10)
- **Feature Support**: Number of supported markdown features

## 3. Results

### 3.1 Performance Comparison

The following table summarizes our performance results:

| Backend | Speed (s) | Memory (MB) | Quality | Features |
|---------|-----------|-------------|---------|----------|
| WeasyPrint | 2.3 ± 0.5 | 85 ± 15 | 8.5 | 85% |
| Pandoc | 4.7 ± 1.2 | 120 ± 25 | 9.2 | 95% |

### 3.2 Quality Analysis

#### 3.2.1 Typography
WeasyPrint excels in web-style typography with excellent CSS support, while Pandoc provides superior academic formatting with LaTeX-quality output.

#### 3.2.2 Code Highlighting
Both backends support syntax highlighting through Pygments:

```python
def analyze_performance(backend, documents):
    '''Analyze conversion performance for given backend'''
    results = []

    for doc in documents:
        start_time = time.time()
        success = backend.convert(doc)
        end_time = time.time()

        results.append({
            'document': doc,
            'time': end_time - start_time,
            'success': success
        })

    return results
```

### 3.3 Scalability

Our scalability analysis shows:
- Linear scaling with document size for both backends
- Memory usage proportional to content complexity
- Optimal batch sizes of 10-20 documents for parallel processing

## 4. Discussion

### 4.1 Backend Selection Guidelines

Choose **WeasyPrint** for:
- Web-style documents with custom CSS
- Fast conversion requirements
- Simple to medium complexity documents

Choose **Pandoc** for:
- Academic papers and publications
- Complex document structures
- Maximum feature support requirements

### 4.2 Optimization Strategies

1. **Image Optimization**: Compress images before embedding
2. **CSS Minimization**: Use efficient CSS selectors
3. **Content Chunking**: Process large documents in sections
4. **Caching**: Cache converted content for repeated use

## 5. Conclusion

This research demonstrates that enhanced markdown conversion provides significant benefits for document processing workflows. The choice between WeasyPrint and Pandoc depends on specific requirements for speed, quality, and features.

### 5.1 Future Work

- Integration with cloud processing services
- Real-time collaborative editing support
- Advanced template systems
- Performance optimization for very large documents

## References

1. Johnson, A. et al. (2024). "Advanced Document Processing Techniques." *Journal of Information Systems*, 15(3), 45-62.
2. Smith, B. (2023). "PDF Generation Optimization." *Technical Computing Review*, 8(2), 12-28.
3. Williams, C. (2024). "Markdown Processing Frameworks." *Software Engineering Quarterly*, 22(1), 78-95.

---

**Manuscript received:** January 10, 2024
**Accepted for publication:** January 15, 2024
**Published online:** January 20, 2024
"""

    return {
        "basic": basic_content,
        "technical": technical_content,
        "academic": academic_content,
    }


def demonstrate_basic_conversion():
    """Demonstrate basic markdown to PDF conversion"""
    print("\n" + "=" * 60)
    print("BASIC MARKDOWN CONVERSION DEMONSTRATION")
    print("=" * 60)

    try:
        # Create converter with default settings
        converter = EnhancedMarkdownConverter()

        # Show backend information
        backend_info = converter.get_backend_info()
        print("Available conversion backends:")
        for backend, available in backend_info["available_backends"].items():
            status = "✅" if available else "❌"
            print(f"  {status} {backend}")
        print(f"Recommended backend: {backend_info['recommended_backend']}")

        # Get sample content
        samples = create_sample_markdown_content()
        temp_dir = Path(tempfile.mkdtemp())

        # Convert basic sample
        basic_md_path = temp_dir / "basic_sample.md"
        with open(basic_md_path, "w", encoding="utf-8") as f:
            f.write(samples["basic"])

        print(f"\nConverting basic sample: {basic_md_path}")

        success = converter.convert_file_to_pdf(
            input_path=str(basic_md_path),
            output_path=str(temp_dir / "basic_sample.pdf"),
            method="auto",  # Let the system choose the best backend
        )

        if success:
            print("✅ Basic conversion successful!")
            print(f"   Output: {temp_dir / 'basic_sample.pdf'}")
        else:
            print("❌ Basic conversion failed")

        return success, temp_dir

    except Exception as e:
        print(f"❌ Basic conversion demonstration failed: {str(e)}")
        return False, None


def demonstrate_backend_comparison():
    """Demonstrate different conversion backends"""
    print("\n" + "=" * 60)
    print("BACKEND COMPARISON DEMONSTRATION")
    print("=" * 60)

    try:
        samples = create_sample_markdown_content()
        temp_dir = Path(tempfile.mkdtemp())

        # Create technical document
        tech_md_path = temp_dir / "technical.md"
        with open(tech_md_path, "w", encoding="utf-8") as f:
            f.write(samples["technical"])

        print("Testing different backends with technical document...")

        # Test different backends
        backends = ["auto", "weasyprint", "pandoc"]
        results = {}

        for backend in backends:
            try:
                print(f"\nTesting {backend} backend...")

                converter = EnhancedMarkdownConverter()
                output_path = temp_dir / f"technical_{backend}.pdf"

                import time

                start_time = time.time()

                success = converter.convert_file_to_pdf(
                    input_path=str(tech_md_path),
                    output_path=str(output_path),
                    method=backend,
                )

                end_time = time.time()
                conversion_time = end_time - start_time

                if success:
                    file_size = (
                        output_path.stat().st_size if output_path.exists() else 0
                    )
                    print(
                        f"  ✅ {backend}: Success in {conversion_time:.2f}s, {file_size} bytes"
                    )
                    results[backend] = {
                        "success": True,
                        "time": conversion_time,
                        "size": file_size,
                        "output": str(output_path),
                    }
                else:
                    print(f"  ❌ {backend}: Failed")
                    results[backend] = {"success": False, "time": conversion_time}

            except Exception as e:
                print(f"  ❌ {backend}: Error - {str(e)}")
                results[backend] = {"success": False, "error": str(e)}

        # Summary
        print("\n" + "-" * 40)
        print("BACKEND COMPARISON SUMMARY")
        print("-" * 40)
        successful_backends = [b for b, r in results.items() if r.get("success", False)]
        print(f"Successful backends: {successful_backends}")

        if successful_backends:
            fastest = min(successful_backends, key=lambda b: results[b]["time"])
            print(f"Fastest backend: {fastest} ({results[fastest]['time']:.2f}s)")

        return results, temp_dir

    except Exception as e:
        print(f"❌ Backend comparison demonstration failed: {str(e)}")
        return None, None


def demonstrate_custom_styling():
    """Demonstrate custom CSS styling and configuration"""
    print("\n" + "=" * 60)
    print("CUSTOM STYLING DEMONSTRATION")
    print("=" * 60)

    try:
        samples = create_sample_markdown_content()
        temp_dir = Path(tempfile.mkdtemp())

        # Create custom CSS
        custom_css = """
        body {
            font-family: 'Times New Roman', serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #2c3e50;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        h1 {
            color: #c0392b;
            font-size: 2.2em;
            border-bottom: 3px solid #e74c3c;
            padding-bottom: 0.5em;
            margin-top: 2em;
        }

        h2 {
            color: #8e44ad;
            font-size: 1.6em;
            border-bottom: 2px solid #9b59b6;
            padding-bottom: 0.3em;
            margin-top: 1.5em;
        }

        h3 {
            color: #2980b9;
            font-size: 1.3em;
            margin-top: 1.2em;
        }

        code {
            background-color: #ecf0f1;
            color: #e74c3c;
            padding: 3px 6px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }

        pre {
            background-color: #2c3e50;
            color: #ecf0f1;
            padding: 20px;
            border-radius: 8px;
            border-left: 5px solid #3498db;
            overflow-x: auto;
            font-size: 0.9em;
        }

        pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
        }

        blockquote {
            background-color: #f8f9fa;
            border-left: 5px solid #3498db;
            margin: 1em 0;
            padding: 15px 20px;
            font-style: italic;
            color: #555;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1.5em 0;
            background-color: white;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        th {
            background-color: #3498db;
            color: white;
            padding: 12px 15px;
            text-align: left;
            font-weight: bold;
        }

        td {
            padding: 10px 15px;
            border-bottom: 1px solid #ecf0f1;
        }

        tr:nth-child(even) {
            background-color: #f8f9fa;
        }

        tr:hover {
            background-color: #e8f4fd;
        }

        ul, ol {
            margin-bottom: 1em;
            padding-left: 2em;
        }

        li {
            margin-bottom: 0.5em;
            line-height: 1.6;
        }

        a {
            color: #3498db;
            text-decoration: none;
            border-bottom: 1px dotted #3498db;
        }

        a:hover {
            color: #2980b9;
            border-bottom: 1px solid #2980b9;
        }

        .toc {
            background-color: #f8f9fa;
            border: 2px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 2em 0;
        }

        .toc h2 {
            color: #2c3e50;
            margin-top: 0;
            border-bottom: none;
        }

        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }

        .toc li {
            margin-bottom: 0.8em;
        }

        .toc a {
            color: #2c3e50;
            font-weight: 500;
            border-bottom: none;
        }
        """

        # Create custom configuration
        config = MarkdownConfig(
            page_size="A4",
            margin="0.8in",
            font_size="11pt",
            line_height="1.4",
            include_toc=True,
            syntax_highlighting=True,
            custom_css=custom_css,
        )

        converter = EnhancedMarkdownConverter(config)

        # Convert academic sample with custom styling
        academic_md_path = temp_dir / "academic_styled.md"
        with open(academic_md_path, "w", encoding="utf-8") as f:
            f.write(samples["academic"])

        print("Converting academic paper with custom styling...")
        print("Custom styling features:")
        print("  - Custom color scheme (reds, purples, blues)")
        print("  - Times New Roman serif font")
        print("  - Enhanced table styling with hover effects")
        print("  - Styled code blocks with dark theme")
        print("  - Custom blockquote styling")
        print("  - Professional header styling")

        success = converter.convert_file_to_pdf(
            input_path=str(academic_md_path),
            output_path=str(temp_dir / "academic_styled.pdf"),
            method="weasyprint",  # WeasyPrint is best for custom CSS
        )

        if success:
            print("✅ Custom styling conversion successful!")
            print(f"   Output: {temp_dir / 'academic_styled.pdf'}")

            # Also create a default version for comparison
            default_converter = EnhancedMarkdownConverter()
            default_success = default_converter.convert_file_to_pdf(
                input_path=str(academic_md_path),
                output_path=str(temp_dir / "academic_default.pdf"),
                method="weasyprint",
            )

            if default_success:
                print(f"   Comparison (default): {temp_dir / 'academic_default.pdf'}")
        else:
            print("❌ Custom styling conversion failed")

        return success, temp_dir

    except Exception as e:
        print(f"❌ Custom styling demonstration failed: {str(e)}")
        return False, None


def demonstrate_content_conversion():
    """Demonstrate converting markdown content directly (not from file)"""
    print("\n" + "=" * 60)
    print("CONTENT CONVERSION DEMONSTRATION")
    print("=" * 60)

    try:
        # Create markdown content programmatically
        dynamic_content = f"""# Dynamic Content Example

## Generated Information
This document was generated programmatically on {Path(__file__).name}.

## System Information
- **Python Path**: {sys.executable}
- **Script Location**: {Path(__file__).absolute()}
- **Working Directory**: {Path.cwd()}

## Dynamic Table
| Property | Value |
|----------|-------|
| Script Name | {Path(__file__).name} |
| Python Version | {sys.version.split()[0]} |
| Platform | {sys.platform} |

## Code Example
```python
# This content was generated dynamically
import sys
from pathlib import Path

def generate_report():
    return f"Report generated from {{Path(__file__).name}}"

print(generate_report())
```

## Features Demonstrated
This example shows how to:
1. Generate markdown content programmatically
2. Convert content directly without saving to file first
3. Include dynamic information in documents
4. Use different conversion methods

> **Note**: This content was created in memory and converted directly to PDF
> without intermediate file storage.

## Conclusion
Direct content conversion is useful for:
- Dynamic report generation
- Programmatic document creation
- API-based document services
- Real-time content processing
"""

        temp_dir = Path(tempfile.mkdtemp())
        converter = EnhancedMarkdownConverter()

        print("Converting dynamically generated markdown content...")
        print("Content includes:")
        print("  - System information")
        print("  - Dynamic tables with current values")
        print("  - Generated timestamps")
        print("  - Programmatic examples")

        # Convert content directly to PDF
        output_path = temp_dir / "dynamic_content.pdf"

        success = converter.convert_markdown_to_pdf(
            markdown_content=dynamic_content,
            output_path=str(output_path),
            method="auto",
        )

        if success:
            print("✅ Content conversion successful!")
            print(f"   Output: {output_path}")

            # Show file size
            file_size = output_path.stat().st_size
            print(f"   Generated PDF size: {file_size} bytes")
        else:
            print("❌ Content conversion failed")

        return success, temp_dir

    except Exception as e:
        print(f"❌ Content conversion demonstration failed: {str(e)}")
        return False, None


def demonstrate_error_handling():
    """Demonstrate error handling and fallback mechanisms"""
    print("\n" + "=" * 60)
    print("ERROR HANDLING DEMONSTRATION")
    print("=" * 60)

    try:
        temp_dir = Path(tempfile.mkdtemp())

        # Test cases with various issues
        test_cases = {
            "invalid_markdown": """# Invalid Markdown

This markdown has some {{invalid}} syntax and [broken links](http://nonexistent.invalid).

```unknown_language
This code block uses an unknown language
```

![Missing Image](nonexistent_image.png)
""",
            "complex_content": """# Complex Content Test

## Mathematical Expressions
This tests content that might be challenging for some backends:

$$ E = mc^2 $$

$$\\sum_{i=1}^{n} x_i = \\frac{n(n+1)}{2}$$

## Complex Tables
| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| Very long content that might wrap | Short | Medium length content | X | Y | Z | End |
| Another row with different lengths | A | B | C | D | E | F |

## Special Characters
Unicode: α, β, γ, δ, ε, ζ, η, θ, ι, κ, λ, μ, ν, ξ, ο, π, ρ, σ, τ, υ, φ, χ, ψ, ω
Symbols: ♠ ♣ ♥ ♦ ☀ ☁ ☂ ☃ ☄ ★ ☆ ☉ ☊ ☋ ☌ ☍ ☎ ☏
Arrows: ← ↑ → ↓ ↔ ↕ ↖ ↗ ↘ ↙
""",
            "empty_content": "",
            "minimal_content": "# Just a title",
        }

        print("Testing error handling with various content types...")

        results = {}

        for test_name, content in test_cases.items():
            print(f"\nTesting: {test_name}")

            try:
                # Try multiple backends for each test case
                for backend in ["auto", "weasyprint", "pandoc"]:
                    try:
                        converter = EnhancedMarkdownConverter()
                        output_path = temp_dir / f"{test_name}_{backend}.pdf"

                        success = converter.convert_markdown_to_pdf(
                            markdown_content=content,
                            output_path=str(output_path),
                            method=backend,
                        )

                        if success:
                            file_size = (
                                output_path.stat().st_size
                                if output_path.exists()
                                else 0
                            )
                            print(f"  ✅ {backend}: Success ({file_size} bytes)")
                            results[f"{test_name}_{backend}"] = {
                                "success": True,
                                "size": file_size,
                            }
                        else:
                            print(f"  ❌ {backend}: Failed")
                            results[f"{test_name}_{backend}"] = {"success": False}

                    except Exception as e:
                        print(f"  ❌ {backend}: Error - {str(e)[:60]}...")
                        results[f"{test_name}_{backend}"] = {
                            "success": False,
                            "error": str(e),
                        }

            except Exception as e:
                print(f"  ❌ Test case failed: {str(e)}")

        # Demonstrate robust conversion with fallbacks
        print("\nDemonstrating robust conversion with fallback logic...")

        def robust_convert(content, output_path):
            """Convert with multiple backend fallbacks"""
            backends = ["weasyprint", "pandoc", "auto"]

            for backend in backends:
                try:
                    converter = EnhancedMarkdownConverter()
                    success = converter.convert_markdown_to_pdf(
                        markdown_content=content,
                        output_path=output_path,
                        method=backend,
                    )
                    if success:
                        return backend, True
                except Exception:
                    continue

            return None, False

        # Test robust conversion
        test_content = test_cases["complex_content"]
        robust_output = temp_dir / "robust_conversion.pdf"

        successful_backend, success = robust_convert(test_content, str(robust_output))

        if success:
            print(f"✅ Robust conversion successful using {successful_backend}")
            print(f"   Output: {robust_output}")
        else:
            print("❌ All backends failed for robust conversion")

        # Summary
        print("\n" + "-" * 40)
        print("ERROR HANDLING SUMMARY")
        print("-" * 40)
        successful_conversions = sum(
            1 for r in results.values() if r.get("success", False)
        )
        total_attempts = len(results)
        success_rate = (
            (successful_conversions / total_attempts * 100) if total_attempts > 0 else 0
        )

        print(f"Total conversion attempts: {total_attempts}")
        print(f"Successful conversions: {successful_conversions}")
        print(f"Success rate: {success_rate:.1f}%")

        return results, temp_dir

    except Exception as e:
        print(f"❌ Error handling demonstration failed: {str(e)}")
        return None, None


def main():
    """Main demonstration function"""
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    print("RAG-Anything Enhanced Markdown Conversion Demonstration")
    print("=" * 70)
    print(
        "This example demonstrates various enhanced markdown conversion capabilities:"
    )
    print("  - Basic markdown to PDF conversion")
    print("  - Multiple backend comparison (WeasyPrint vs Pandoc)")
    print("  - Custom CSS styling and professional formatting")
    print("  - Direct content conversion without file I/O")
    print("  - Comprehensive error handling and fallback mechanisms")

    results = {}

    # Run demonstrations
    print("\n🚀 Starting demonstrations...")

    # Basic conversion
    success, temp_dir = demonstrate_basic_conversion()
    results["basic"] = success

    # Backend comparison
    backend_results, _ = demonstrate_backend_comparison()
    results["backends"] = backend_results

    # Custom styling
    styling_success, _ = demonstrate_custom_styling()
    results["styling"] = styling_success

    # Content conversion
    content_success, _ = demonstrate_content_conversion()
    results["content"] = content_success

    # Error handling
    error_results, _ = demonstrate_error_handling()
    results["error_handling"] = error_results

    # Summary
    print("\n" + "=" * 70)
    print("DEMONSTRATION SUMMARY")
    print("=" * 70)

    print("✅ Features Successfully Demonstrated:")
    if results["basic"]:
        print("  - Basic markdown to PDF conversion")
    if results["backends"]:
        successful_backends = [
            b for b, r in results["backends"].items() if r.get("success", False)
        ]
        print(f"  - Multiple backends: {successful_backends}")
    if results["styling"]:
        print("  - Custom CSS styling and professional formatting")
    if results["content"]:
        print("  - Direct content conversion without file I/O")
    if results["error_handling"]:
        success_rate = (
            sum(
                1 for r in results["error_handling"].values() if r.get("success", False)
            )
            / len(results["error_handling"])
            * 100
        )
        print(f"  - Error handling with {success_rate:.1f}% overall success rate")

    print("\n📊 Key Capabilities Highlighted:")
    print("  - Professional PDF generation with high-quality typography")
    print("  - Multiple conversion backends with automatic selection")
    print("  - Extensive CSS customization for branded documents")
    print("  - Syntax highlighting for code blocks using Pygments")
    print("  - Table formatting with professional styling")
    print("  - Image embedding with proper scaling")
    print("  - Table of contents generation with navigation")
    print("  - Comprehensive error handling and fallback mechanisms")

    print("\n💡 Best Practices Demonstrated:")
    print("  - Choose WeasyPrint for web-style documents and custom CSS")
    print("  - Choose Pandoc for academic papers and complex formatting")
    print("  - Use 'auto' method for general-purpose conversion")
    print("  - Implement fallback logic for robust conversion")
    print("  - Optimize images before embedding in documents")
    print("  - Test custom CSS with simple content first")
    print("  - Handle errors gracefully with multiple backend attempts")
    print("  - Use appropriate page sizes and margins for target use case")

    print("\n🎯 Integration Patterns:")
    print("  - Standalone conversion for document generation")
    print("  - Integration with RAG-Anything document pipeline")
    print("  - API-based document services")
    print("  - Batch processing for multiple documents")
    print("  - Dynamic content generation from templates")


if __name__ == "__main__":
    main()



================================================
FILE: examples/image_format_test.py
================================================
#!/usr/bin/env python3
"""
Image Format Parsing Test Script for RAG-Anything

This script demonstrates how to parse various image formats
using MinerU, including JPG, PNG, BMP, TIFF, GIF, and WebP files.

Requirements:
- PIL/Pillow library for format conversion
- RAG-Anything package

Usage:
    python image_format_test.py --file path/to/image.bmp
"""

import argparse
import asyncio
import sys
from pathlib import Path
from raganything import RAGAnything


def check_pillow_installation():
    """Check if PIL/Pillow is installed and available"""
    try:
        from PIL import Image

        print(
            f"✅ PIL/Pillow found: PIL version {Image.__version__ if hasattr(Image, '__version__') else 'Unknown'}"
        )
        return True
    except ImportError:
        print("❌ PIL/Pillow not found. Please install Pillow:")
        print("  pip install Pillow")
        return False


def get_image_info(image_path: Path):
    """Get detailed image information"""
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            return {
                "format": img.format,
                "mode": img.mode,
                "size": img.size,
                "has_transparency": img.mode in ("RGBA", "LA")
                or "transparency" in img.info,
            }
    except Exception as e:
        return {"error": str(e)}


async def test_image_format_parsing(file_path: str):
    """Test image format parsing with MinerU"""

    print(f"🧪 Testing image format parsing: {file_path}")

    # Check if file exists and is a supported image format
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"❌ File does not exist: {file_path}")
        return False

    supported_extensions = {
        ".jpg",
        ".jpeg",
        ".png",
        ".bmp",
        ".tiff",
        ".tif",
        ".gif",
        ".webp",
    }
    if file_path.suffix.lower() not in supported_extensions:
        print(f"❌ Unsupported file format: {file_path.suffix}")
        print(f"   Supported formats: {', '.join(supported_extensions)}")
        return False

    print(f"📸 File format: {file_path.suffix.upper()}")
    print(f"📏 File size: {file_path.stat().st_size / 1024:.1f} KB")

    # Get detailed image information
    img_info = get_image_info(file_path)
    if "error" not in img_info:
        print("🖼️  Image info:")
        print(f"   • Format: {img_info['format']}")
        print(f"   • Mode: {img_info['mode']}")
        print(f"   • Size: {img_info['size'][0]}x{img_info['size'][1]}")
        print(f"   • Has transparency: {img_info['has_transparency']}")

    # Check format compatibility with MinerU
    mineru_native_formats = {".jpg", ".jpeg", ".png"}
    needs_conversion = file_path.suffix.lower() not in mineru_native_formats

    if needs_conversion:
        print(
            f"ℹ️  Format {file_path.suffix.upper()} will be converted to PNG for MinerU compatibility"
        )
    else:
        print(f"✅ Format {file_path.suffix.upper()} is natively supported by MinerU")

    # Initialize RAGAnything (only for parsing functionality)
    rag = RAGAnything()

    try:
        # Test image parsing with MinerU
        print("\n🔄 Testing image parsing with MinerU...")
        content_list, md_content = await rag.parse_document(
            file_path=str(file_path),
            output_dir="./test_output",
            parse_method="ocr",  # Images use OCR method
            display_stats=True,
        )

        print("✅ Parsing successful!")
        print(f"   📊 Content blocks: {len(content_list)}")
        print(f"   📝 Markdown length: {len(md_content)} characters")

        # Analyze content types
        content_types = {}
        for item in content_list:
            if isinstance(item, dict):
                content_type = item.get("type", "unknown")
                content_types[content_type] = content_types.get(content_type, 0) + 1

        if content_types:
            print("   📋 Content distribution:")
            for content_type, count in sorted(content_types.items()):
                print(f"      • {content_type}: {count}")

        # Display extracted text (if any)
        if md_content.strip():
            print("\n📄 Extracted text preview (first 500 characters):")
            preview = md_content.strip()[:500]
            print(f"   {preview}{'...' if len(md_content) > 500 else ''}")
        else:
            print("\n📄 No text extracted from the image")

        # Display image processing results
        image_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "image"
        ]
        if image_items:
            print(f"\n🖼️  Found {len(image_items)} processed image(s):")
            for i, item in enumerate(image_items, 1):
                print(f"   {i}. Image path: {item.get('img_path', 'N/A')}")
                if item.get("img_caption"):
                    print(
                        f"      Caption: {item.get('img_caption', [])[0] if item.get('img_caption') else 'N/A'}"
                    )

        # Display text blocks (OCR results)
        text_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "text"
        ]
        if text_items:
            print("\n📝 OCR text blocks found:")
            for i, item in enumerate(text_items, 1):
                text_content = item.get("text", "")
                if text_content.strip():
                    preview = text_content.strip()[:200]
                    print(
                        f"   {i}. {preview}{'...' if len(text_content) > 200 else ''}"
                    )

        # Check for any tables detected in the image
        table_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "table"
        ]
        if table_items:
            print(f"\n📊 Found {len(table_items)} table(s) in image:")
            for i, item in enumerate(table_items, 1):
                print(f"   {i}. Table detected with content")

        print("\n🎉 Image format parsing test completed successfully!")
        print("📁 Output files saved to: ./test_output")
        return True

    except Exception as e:
        print(f"\n❌ Image format parsing failed: {str(e)}")
        import traceback

        print(f"   Full error: {traceback.format_exc()}")
        return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Test image format parsing with MinerU"
    )
    parser.add_argument("--file", help="Path to the image file to test")
    parser.add_argument(
        "--check-pillow", action="store_true", help="Only check PIL/Pillow installation"
    )

    args = parser.parse_args()

    # Check PIL/Pillow installation
    print("🔧 Checking PIL/Pillow installation...")
    if not check_pillow_installation():
        return 1

    if args.check_pillow:
        print("✅ PIL/Pillow installation check passed!")
        return 0

    # If not just checking dependencies, file argument is required
    if not args.file:
        print("❌ Error: --file argument is required when not using --check-pillow")
        parser.print_help()
        return 1

    # Run the parsing test
    try:
        success = asyncio.run(test_image_format_parsing(args.file))
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())



================================================
FILE: examples/insert_content_list_example.py
================================================
#!/usr/bin/env python
"""
Example script demonstrating direct content list insertion with RAGAnything

This example shows how to:
1. Create a simple content list with different content types
2. Insert content list directly without document parsing using insert_content_list() method
3. Perform pure text queries using aquery() method
4. Perform multimodal queries with specific multimodal content using aquery_with_multimodal() method
5. Handle different types of multimodal content in the inserted knowledge base
"""

import os
import argparse
import asyncio
import logging
import logging.config
from pathlib import Path

# Add project root directory to Python path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc, logger, set_verbose_debug
from raganything import RAGAnything, RAGAnythingConfig

from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=False)


def configure_logging():
    """Configure logging for the application"""
    # Get log directory path from environment variable or use current directory
    log_dir = os.getenv("LOG_DIR", os.getcwd())
    log_file_path = os.path.abspath(
        os.path.join(log_dir, "insert_content_list_example.log")
    )

    print(f"\nInsert Content List example log file: {log_file_path}\n")
    os.makedirs(os.path.dirname(log_dir), exist_ok=True)

    # Get log file max size and backup count from environment variables
    log_max_bytes = int(os.getenv("LOG_MAX_BYTES", 10485760))  # Default 10MB
    log_backup_count = int(os.getenv("LOG_BACKUP_COUNT", 5))  # Default 5 backups

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(levelname)s: %(message)s",
                },
                "detailed": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stderr",
                },
                "file": {
                    "formatter": "detailed",
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": log_file_path,
                    "maxBytes": log_max_bytes,
                    "backupCount": log_backup_count,
                    "encoding": "utf-8",
                },
            },
            "loggers": {
                "lightrag": {
                    "handlers": ["console", "file"],
                    "level": "INFO",
                    "propagate": False,
                },
            },
        }
    )

    # Set the logger level to INFO
    logger.setLevel(logging.INFO)
    # Enable verbose debug if needed
    set_verbose_debug(os.getenv("VERBOSE", "false").lower() == "true")


def create_sample_content_list():
    """
    Create a simple content list for testing insert_content_list functionality

    Returns:
        List[Dict]: Sample content list with various content types

    Note:
        - img_path should be absolute path to the image file
        - page_idx represents the page number where the content appears (0-based)
    """
    content_list = [
        # Introduction text
        {
            "type": "text",
            "text": "Welcome to the RAGAnything System Documentation. This guide covers the advanced multimodal document processing capabilities and features of our comprehensive RAG system.",
            "page_idx": 0,  # Page number where this content appears
        },
        # System architecture image
        {
            "type": "image",
            "img_path": "/absolute/path/to/system_architecture.jpg",  # IMPORTANT: Use absolute path to image file
            "img_caption": ["Figure 1: RAGAnything System Architecture"],
            "img_footnote": [
                "The architecture shows the complete pipeline from document parsing to multimodal query processing"
            ],
            "page_idx": 1,  # Page number where this image appears
        },
        # Performance comparison table
        {
            "type": "table",
            "table_body": """| System | Accuracy | Processing Speed | Memory Usage |
                            |--------|----------|------------------|--------------|
                            | RAGAnything | 95.2% | 120ms | 2.1GB |
                            | Traditional RAG | 87.3% | 180ms | 3.2GB |
                            | Baseline System | 82.1% | 220ms | 4.1GB |
                            | Simple Retrieval | 76.5% | 95ms | 1.8GB |""",
            "table_caption": [
                "Table 1: Performance Comparison of Different RAG Systems"
            ],
            "table_footnote": [
                "All tests conducted on the same hardware with identical test datasets"
            ],
            "page_idx": 2,  # Page number where this table appears
        },
        # Mathematical formula
        {
            "type": "equation",
            "latex": "Relevance(d, q) = \\sum_{i=1}^{n} w_i \\cdot sim(t_i^d, t_i^q) \\cdot \\alpha_i",
            "text": "Document relevance scoring formula where w_i are term weights, sim() is similarity function, and α_i are modality importance factors",
            "page_idx": 3,  # Page number where this equation appears
        },
        # Feature description
        {
            "type": "text",
            "text": "The system supports multiple content modalities including text, images, tables, and mathematical equations. Each modality is processed using specialized processors optimized for that content type.",
            "page_idx": 4,  # Page number where this content appears
        },
        # Technical specifications table
        {
            "type": "table",
            "table_body": """| Feature | Specification |
                            |---------|---------------|
                            | Supported Formats | PDF, DOCX, PPTX, XLSX, Images |
                            | Max Document Size | 100MB |
                            | Concurrent Processing | Up to 8 documents |
                            | Query Response Time | <200ms average |
                            | Knowledge Graph Nodes | Up to 1M entities |""",
            "table_caption": ["Table 2: Technical Specifications"],
            "table_footnote": [
                "Specifications may vary based on hardware configuration"
            ],
            "page_idx": 5,  # Page number where this table appears
        },
        # Conclusion
        {
            "type": "text",
            "text": "RAGAnything represents a significant advancement in multimodal document processing, providing comprehensive solutions for complex knowledge extraction and retrieval tasks.",
            "page_idx": 6,  # Page number where this content appears
        },
    ]

    return content_list


async def demo_insert_content_list(
    api_key: str,
    base_url: str = None,
    working_dir: str = None,
):
    """
    Demonstrate content list insertion and querying with RAGAnything

    Args:
        api_key: OpenAI API key
        base_url: Optional base URL for API
        working_dir: Working directory for RAG storage
    """
    try:
        # Create RAGAnything configuration
        config = RAGAnythingConfig(
            working_dir=working_dir or "./rag_storage",
            enable_image_processing=True,
            enable_table_processing=True,
            enable_equation_processing=True,
            display_content_stats=True,  # Show content statistics
        )

        # Define LLM model function
        def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
            return openai_complete_if_cache(
                "gpt-4o-mini",
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages,
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )

        # Define vision model function for image processing
        def vision_model_func(
            prompt, system_prompt=None, history_messages=[], image_data=None, **kwargs
        ):
            if image_data:
                return openai_complete_if_cache(
                    "gpt-4o",
                    "",
                    system_prompt=None,
                    history_messages=[],
                    messages=[
                        {"role": "system", "content": system_prompt}
                        if system_prompt
                        else None,
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_data}"
                                    },
                                },
                            ],
                        }
                        if image_data
                        else {"role": "user", "content": prompt},
                    ],
                    api_key=api_key,
                    base_url=base_url,
                    **kwargs,
                )
            else:
                return llm_model_func(prompt, system_prompt, history_messages, **kwargs)

        # Define embedding function
        embedding_func = EmbeddingFunc(
            embedding_dim=3072,
            max_token_size=8192,
            func=lambda texts: openai_embed(
                texts,
                model="text-embedding-3-large",
                api_key=api_key,
                base_url=base_url,
            ),
        )

        # Initialize RAGAnything
        rag = RAGAnything(
            config=config,
            llm_model_func=llm_model_func,
            vision_model_func=vision_model_func,
            embedding_func=embedding_func,
        )

        # Create sample content list
        logger.info("Creating sample content list...")
        content_list = create_sample_content_list()
        logger.info(f"Created content list with {len(content_list)} items")

        # Insert content list directly
        logger.info("\nInserting content list into RAGAnything...")
        await rag.insert_content_list(
            content_list=content_list,
            file_path="raganything_documentation.pdf",  # Reference file name for citation
            split_by_character=None,  # Optional text splitting
            split_by_character_only=False,  # Optional text splitting mode
            doc_id="demo-doc-001",  # Custom document ID
            display_stats=True,  # Show content statistics
        )
        logger.info("Content list insertion completed!")

        # Example queries - demonstrating different query approaches
        logger.info("\nQuerying inserted content:")

        # 1. Pure text queries using aquery()
        text_queries = [
            "What is RAGAnything and what are its main features?",
            "How does RAGAnything compare to traditional RAG systems?",
            "What are the technical specifications of the system?",
        ]

        for query in text_queries:
            logger.info(f"\n[Text Query]: {query}")
            result = await rag.aquery(query, mode="hybrid")
            logger.info(f"Answer: {result}")

        # 2. Multimodal query with specific multimodal content using aquery_with_multimodal()
        logger.info(
            "\n[Multimodal Query]: Analyzing new performance data against existing benchmarks"
        )
        multimodal_result = await rag.aquery_with_multimodal(
            "Compare this new performance data with the existing benchmark results in the documentation",
            multimodal_content=[
                {
                    "type": "table",
                    "table_data": """Method,Accuracy,Speed,Memory
                                New_Approach,97.1%,110ms,1.9GB
                                Enhanced_RAG,91.4%,140ms,2.5GB""",
                    "table_caption": "Latest experimental results",
                }
            ],
            mode="hybrid",
        )
        logger.info(f"Answer: {multimodal_result}")

        # 3. Another multimodal query with equation content
        logger.info("\n[Multimodal Query]: Mathematical formula analysis")
        equation_result = await rag.aquery_with_multimodal(
            "How does this similarity formula relate to the relevance scoring mentioned in the documentation?",
            multimodal_content=[
                {
                    "type": "equation",
                    "latex": "sim(a, b) = \\frac{a \\cdot b}{||a|| \\times ||b||} + \\beta \\cdot context\\_weight",
                    "equation_caption": "Enhanced cosine similarity with context weighting",
                }
            ],
            mode="hybrid",
        )
        logger.info(f"Answer: {equation_result}")

        # 4. Insert another content list with different document ID
        logger.info("\nInserting additional content list...")
        additional_content = [
            {
                "type": "text",
                "text": "This is additional documentation about advanced features and configuration options.",
                "page_idx": 0,  # Page number where this content appears
            },
            {
                "type": "table",
                "table_body": """| Configuration | Default Value | Range |
                                    |---------------|---------------|-------|
                                    | Chunk Size | 512 tokens | 128-2048 |
                                    | Context Window | 4096 tokens | 1024-8192 |
                                    | Batch Size | 32 | 1-128 |""",
                "table_caption": ["Advanced Configuration Parameters"],
                "page_idx": 1,  # Page number where this table appears
            },
        ]

        await rag.insert_content_list(
            content_list=additional_content,
            file_path="advanced_configuration.pdf",
            doc_id="demo-doc-002",  # Different document ID
        )

        # Query combined knowledge base
        logger.info("\n[Combined Query]: What configuration options are available?")
        combined_result = await rag.aquery(
            "What configuration options are available and what are their default values?",
            mode="hybrid",
        )
        logger.info(f"Answer: {combined_result}")

    except Exception as e:
        logger.error(f"Error in content list insertion demo: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())


def main():
    """Main function to run the example"""
    parser = argparse.ArgumentParser(description="Insert Content List Example")
    parser.add_argument(
        "--working_dir", "-w", default="./rag_storage", help="Working directory path"
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("LLM_BINDING_API_KEY"),
        help="OpenAI API key (defaults to LLM_BINDING_API_KEY env var)",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("LLM_BINDING_HOST"),
        help="Optional base URL for API",
    )

    args = parser.parse_args()

    # Check if API key is provided
    if not args.api_key:
        logger.error("Error: OpenAI API key is required")
        logger.error("Set api key environment variable or use --api-key option")
        return

    # Run the demo
    asyncio.run(
        demo_insert_content_list(
            args.api_key,
            args.base_url,
            args.working_dir,
        )
    )


if __name__ == "__main__":
    # Configure logging first
    configure_logging()

    print("RAGAnything Insert Content List Example")
    print("=" * 45)
    print("Demonstrating direct content list insertion without document parsing")
    print("=" * 45)

    main()



================================================
FILE: examples/modalprocessors_example.py
================================================
"""
Example of directly using modal processors

This example demonstrates how to use RAG-Anything's modal processors directly without going through MinerU.
"""

import asyncio
import argparse
from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc
from lightrag.kg.shared_storage import initialize_pipeline_status
from lightrag import LightRAG
from raganything.modalprocessors import (
    ImageModalProcessor,
    TableModalProcessor,
    EquationModalProcessor,
)

WORKING_DIR = "./rag_storage"


def get_llm_model_func(api_key: str, base_url: str = None):
    return (
        lambda prompt,
        system_prompt=None,
        history_messages=[],
        **kwargs: openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )
    )


def get_vision_model_func(api_key: str, base_url: str = None):
    return (
        lambda prompt,
        system_prompt=None,
        history_messages=[],
        image_data=None,
        **kwargs: openai_complete_if_cache(
            "gpt-4o",
            "",
            system_prompt=None,
            history_messages=[],
            messages=[
                {"role": "system", "content": system_prompt} if system_prompt else None,
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_data}"
                            },
                        },
                    ],
                }
                if image_data
                else {"role": "user", "content": prompt},
            ],
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )
        if image_data
        else openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        )
    )


async def process_image_example(lightrag: LightRAG, vision_model_func):
    """Example of processing an image"""
    # Create image processor
    image_processor = ImageModalProcessor(
        lightrag=lightrag, modal_caption_func=vision_model_func
    )

    # Prepare image content
    image_content = {
        "img_path": "image.jpg",
        "img_caption": ["Example image caption"],
        "img_footnote": ["Example image footnote"],
    }

    # Process image
    (description, entity_info, _) = await image_processor.process_multimodal_content(
        modal_content=image_content,
        content_type="image",
        file_path="image_example.jpg",
        entity_name="Example Image",
    )

    print("Image Processing Results:")
    print(f"Description: {description}")
    print(f"Entity Info: {entity_info}")


async def process_table_example(lightrag: LightRAG, llm_model_func):
    """Example of processing a table"""
    # Create table processor
    table_processor = TableModalProcessor(
        lightrag=lightrag, modal_caption_func=llm_model_func
    )

    # Prepare table content
    table_content = {
        "table_body": """
        | Name | Age | Occupation |
        |------|-----|------------|
        | John | 25  | Engineer   |
        | Mary | 30  | Designer   |
        """,
        "table_caption": ["Employee Information Table"],
        "table_footnote": ["Data updated as of 2024"],
    }

    # Process table
    (description, entity_info, _) = await table_processor.process_multimodal_content(
        modal_content=table_content,
        content_type="table",
        file_path="table_example.md",
        entity_name="Employee Table",
    )

    print("\nTable Processing Results:")
    print(f"Description: {description}")
    print(f"Entity Info: {entity_info}")


async def process_equation_example(lightrag: LightRAG, llm_model_func):
    """Example of processing a mathematical equation"""
    # Create equation processor
    equation_processor = EquationModalProcessor(
        lightrag=lightrag, modal_caption_func=llm_model_func
    )

    # Prepare equation content
    equation_content = {"text": "E = mc^2", "text_format": "LaTeX"}

    # Process equation
    (description, entity_info, _) = await equation_processor.process_multimodal_content(
        modal_content=equation_content,
        content_type="equation",
        file_path="equation_example.txt",
        entity_name="Mass-Energy Equivalence",
    )

    print("\nEquation Processing Results:")
    print(f"Description: {description}")
    print(f"Entity Info: {entity_info}")


async def initialize_rag(api_key: str, base_url: str = None):
    rag = LightRAG(
        working_dir=WORKING_DIR,
        embedding_func=EmbeddingFunc(
            embedding_dim=3072,
            max_token_size=8192,
            func=lambda texts: openai_embed(
                texts,
                model="text-embedding-3-large",
                api_key=api_key,
                base_url=base_url,
            ),
        ),
        llm_model_func=lambda prompt,
        system_prompt=None,
        history_messages=[],
        **kwargs: openai_complete_if_cache(
            "gpt-4o-mini",
            prompt,
            system_prompt=system_prompt,
            history_messages=history_messages,
            api_key=api_key,
            base_url=base_url,
            **kwargs,
        ),
    )

    await rag.initialize_storages()
    await initialize_pipeline_status()

    return rag


def main():
    """Main function to run the example"""
    parser = argparse.ArgumentParser(description="Modal Processors Example")
    parser.add_argument("--api-key", required=True, help="OpenAI API key")
    parser.add_argument("--base-url", help="Optional base URL for API")
    parser.add_argument(
        "--working-dir", "-w", default=WORKING_DIR, help="Working directory path"
    )

    args = parser.parse_args()

    # Run examples
    asyncio.run(main_async(args.api_key, args.base_url))


async def main_async(api_key: str, base_url: str = None):
    # Initialize LightRAG
    lightrag = await initialize_rag(api_key, base_url)

    # Get model functions
    llm_model_func = get_llm_model_func(api_key, base_url)
    vision_model_func = get_vision_model_func(api_key, base_url)

    # Run examples
    await process_image_example(lightrag, vision_model_func)
    await process_table_example(lightrag, llm_model_func)
    await process_equation_example(lightrag, llm_model_func)


if __name__ == "__main__":
    main()



================================================
FILE: examples/office_document_test.py
================================================
#!/usr/bin/env python3
"""
Office Document Parsing Test Script for RAG-Anything

This script demonstrates how to parse various Office document formats
using MinerU, including DOC, DOCX, PPT, PPTX, XLS, and XLSX files.

Requirements:
- LibreOffice installed on the system
- RAG-Anything package

Usage:
    python office_document_test.py --file path/to/office/document.docx
"""

import argparse
import asyncio
import sys
from pathlib import Path
from raganything import RAGAnything


def check_libreoffice_installation():
    """Check if LibreOffice is installed and available"""
    import subprocess

    for cmd in ["libreoffice", "soffice"]:
        try:
            result = subprocess.run(
                [cmd, "--version"], capture_output=True, check=True, timeout=10
            )
            print(f"✅ LibreOffice found: {result.stdout.decode().strip()}")
            return True
        except (
            subprocess.CalledProcessError,
            FileNotFoundError,
            subprocess.TimeoutExpired,
        ):
            continue

    print("❌ LibreOffice not found. Please install LibreOffice:")
    print("  - Windows: Download from https://www.libreoffice.org/download/download/")
    print("  - macOS: brew install --cask libreoffice")
    print("  - Ubuntu/Debian: sudo apt-get install libreoffice")
    print("  - CentOS/RHEL: sudo yum install libreoffice")
    return False


async def test_office_document_parsing(file_path: str):
    """Test Office document parsing with MinerU"""

    print(f"🧪 Testing Office document parsing: {file_path}")

    # Check if file exists and is a supported Office format
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"❌ File does not exist: {file_path}")
        return False

    supported_extensions = {".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx"}
    if file_path.suffix.lower() not in supported_extensions:
        print(f"❌ Unsupported file format: {file_path.suffix}")
        print(f"   Supported formats: {', '.join(supported_extensions)}")
        return False

    print(f"📄 File format: {file_path.suffix.upper()}")
    print(f"📏 File size: {file_path.stat().st_size / 1024:.1f} KB")

    # Initialize RAGAnything (only for parsing functionality)
    rag = RAGAnything()

    try:
        # Test document parsing with MinerU
        print("\n🔄 Testing document parsing with MinerU...")
        content_list, md_content = await rag.parse_document(
            file_path=str(file_path),
            output_dir="./test_output",
            parse_method="auto",
            display_stats=True,
        )

        print("✅ Parsing successful!")
        print(f"   📊 Content blocks: {len(content_list)}")
        print(f"   📝 Markdown length: {len(md_content)} characters")

        # Analyze content types
        content_types = {}
        for item in content_list:
            if isinstance(item, dict):
                content_type = item.get("type", "unknown")
                content_types[content_type] = content_types.get(content_type, 0) + 1

        if content_types:
            print("   📋 Content distribution:")
            for content_type, count in sorted(content_types.items()):
                print(f"      • {content_type}: {count}")

        # Display some parsed content preview
        if md_content.strip():
            print("\n📄 Parsed content preview (first 500 characters):")
            preview = md_content.strip()[:500]
            print(f"   {preview}{'...' if len(md_content) > 500 else ''}")

        # Display some structured content examples
        text_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "text"
        ]
        if text_items:
            print("\n📝 Sample text blocks:")
            for i, item in enumerate(text_items[:3], 1):
                text_content = item.get("text", "")
                if text_content.strip():
                    preview = text_content.strip()[:200]
                    print(
                        f"   {i}. {preview}{'...' if len(text_content) > 200 else ''}"
                    )

        # Check for images
        image_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "image"
        ]
        if image_items:
            print(f"\n🖼️  Found {len(image_items)} image(s):")
            for i, item in enumerate(image_items, 1):
                print(f"   {i}. Image path: {item.get('img_path', 'N/A')}")

        # Check for tables
        table_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "table"
        ]
        if table_items:
            print(f"\n📊 Found {len(table_items)} table(s):")
            for i, item in enumerate(table_items, 1):
                table_body = item.get("table_body", "")
                row_count = len(table_body.split("\n"))
                print(f"   {i}. Table with {row_count} rows")

        print("\n🎉 Office document parsing test completed successfully!")
        print("📁 Output files saved to: ./test_output")
        return True

    except Exception as e:
        print(f"\n❌ Office document parsing failed: {str(e)}")
        import traceback

        print(f"   Full error: {traceback.format_exc()}")
        return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(
        description="Test Office document parsing with MinerU"
    )
    parser.add_argument("--file", help="Path to the Office document to test")
    parser.add_argument(
        "--check-libreoffice",
        action="store_true",
        help="Only check LibreOffice installation",
    )

    args = parser.parse_args()

    # Check LibreOffice installation
    print("🔧 Checking LibreOffice installation...")
    if not check_libreoffice_installation():
        return 1

    if args.check_libreoffice:
        print("✅ LibreOffice installation check passed!")
        return 0

    # If not just checking dependencies, file argument is required
    if not args.file:
        print(
            "❌ Error: --file argument is required when not using --check-libreoffice"
        )
        parser.print_help()
        return 1

    # Run the parsing test
    try:
        success = asyncio.run(test_office_document_parsing(args.file))
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())



================================================
FILE: examples/raganything_example.py
================================================
#!/usr/bin/env python
"""
Example script demonstrating the integration of MinerU parser with RAGAnything

This example shows how to:
1. Process documents with RAGAnything using MinerU parser
2. Perform pure text queries using aquery() method
3. Perform multimodal queries with specific multimodal content using aquery_with_multimodal() method
4. Handle different types of multimodal content (tables, equations) in queries
"""

import os
import argparse
import asyncio
import logging
import logging.config
from pathlib import Path

# Add project root directory to Python path
import sys

sys.path.append(str(Path(__file__).parent.parent))

from lightrag.llm.openai import openai_complete_if_cache, openai_embed
from lightrag.utils import EmbeddingFunc, logger, set_verbose_debug
from raganything import RAGAnything, RAGAnythingConfig

from dotenv import load_dotenv

load_dotenv(dotenv_path=".env", override=False)


def configure_logging():
    """Configure logging for the application"""
    # Get log directory path from environment variable or use current directory
    log_dir = os.getenv("LOG_DIR", os.getcwd())
    log_file_path = os.path.abspath(os.path.join(log_dir, "raganything_example.log"))

    print(f"\nRAGAnything example log file: {log_file_path}\n")
    os.makedirs(os.path.dirname(log_dir), exist_ok=True)

    # Get log file max size and backup count from environment variables
    log_max_bytes = int(os.getenv("LOG_MAX_BYTES", 10485760))  # Default 10MB
    log_backup_count = int(os.getenv("LOG_BACKUP_COUNT", 5))  # Default 5 backups

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": "%(levelname)s: %(message)s",
                },
                "detailed": {
                    "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
                },
            },
            "handlers": {
                "console": {
                    "formatter": "default",
                    "class": "logging.StreamHandler",
                    "stream": "ext://sys.stderr",
                },
                "file": {
                    "formatter": "detailed",
                    "class": "logging.handlers.RotatingFileHandler",
                    "filename": log_file_path,
                    "maxBytes": log_max_bytes,
                    "backupCount": log_backup_count,
                    "encoding": "utf-8",
                },
            },
            "loggers": {
                "lightrag": {
                    "handlers": ["console", "file"],
                    "level": "INFO",
                    "propagate": False,
                },
            },
        }
    )

    # Set the logger level to INFO
    logger.setLevel(logging.INFO)
    # Enable verbose debug if needed
    set_verbose_debug(os.getenv("VERBOSE", "false").lower() == "true")


async def process_with_rag(
    file_path: str,
    output_dir: str,
    api_key: str,
    base_url: str = None,
    working_dir: str = None,
    parser: str = None,
):
    """
    Process document with RAGAnything

    Args:
        file_path: Path to the document
        output_dir: Output directory for RAG results
        api_key: OpenAI API key
        base_url: Optional base URL for API
        working_dir: Working directory for RAG storage
    """
    try:
        # Create RAGAnything configuration
        config = RAGAnythingConfig(
            working_dir=working_dir or "./rag_storage",
            parser=parser,  # Parser selection: mineru or docling
            parse_method="auto",  # Parse method: auto, ocr, or txt
            enable_image_processing=True,
            enable_table_processing=True,
            enable_equation_processing=True,
        )

        # Define LLM model function
        def llm_model_func(prompt, system_prompt=None, history_messages=[], **kwargs):
            return openai_complete_if_cache(
                "gpt-4o-mini",
                prompt,
                system_prompt=system_prompt,
                history_messages=history_messages,
                api_key=api_key,
                base_url=base_url,
                **kwargs,
            )

        # Define vision model function for image processing
        def vision_model_func(
            prompt,
            system_prompt=None,
            history_messages=[],
            image_data=None,
            messages=None,
            **kwargs,
        ):
            # If messages format is provided (for multimodal VLM enhanced query), use it directly
            if messages:
                return openai_complete_if_cache(
                    "gpt-4o",
                    "",
                    system_prompt=None,
                    history_messages=[],
                    messages=messages,
                    api_key=api_key,
                    base_url=base_url,
                    **kwargs,
                )
            # Traditional single image format
            elif image_data:
                return openai_complete_if_cache(
                    "gpt-4o",
                    "",
                    system_prompt=None,
                    history_messages=[],
                    messages=[
                        {"role": "system", "content": system_prompt}
                        if system_prompt
                        else None,
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:image/jpeg;base64,{image_data}"
                                    },
                                },
                            ],
                        }
                        if image_data
                        else {"role": "user", "content": prompt},
                    ],
                    api_key=api_key,
                    base_url=base_url,
                    **kwargs,
                )
            # Pure text format
            else:
                return llm_model_func(prompt, system_prompt, history_messages, **kwargs)

        # Define embedding function
        embedding_func = EmbeddingFunc(
            embedding_dim=3072,
            max_token_size=8192,
            func=lambda texts: openai_embed(
                texts,
                model="text-embedding-3-large",
                api_key=api_key,
                base_url=base_url,
            ),
        )

        # Initialize RAGAnything with new dataclass structure
        rag = RAGAnything(
            config=config,
            llm_model_func=llm_model_func,
            vision_model_func=vision_model_func,
            embedding_func=embedding_func,
        )

        # Process document
        await rag.process_document_complete(
            file_path=file_path, output_dir=output_dir, parse_method="auto"
        )

        # Example queries - demonstrating different query approaches
        logger.info("\nQuerying processed document:")

        # 1. Pure text queries using aquery()
        text_queries = [
            "What is the main content of the document?",
            "What are the key topics discussed?",
        ]

        for query in text_queries:
            logger.info(f"\n[Text Query]: {query}")
            result = await rag.aquery(query, mode="hybrid")
            logger.info(f"Answer: {result}")

        # 2. Multimodal query with specific multimodal content using aquery_with_multimodal()
        logger.info(
            "\n[Multimodal Query]: Analyzing performance data in context of document"
        )
        multimodal_result = await rag.aquery_with_multimodal(
            "Compare this performance data with any similar results mentioned in the document",
            multimodal_content=[
                {
                    "type": "table",
                    "table_data": """Method,Accuracy,Processing_Time
                                RAGAnything,95.2%,120ms
                                Traditional_RAG,87.3%,180ms
                                Baseline,82.1%,200ms""",
                    "table_caption": "Performance comparison results",
                }
            ],
            mode="hybrid",
        )
        logger.info(f"Answer: {multimodal_result}")

        # 3. Another multimodal query with equation content
        logger.info("\n[Multimodal Query]: Mathematical formula analysis")
        equation_result = await rag.aquery_with_multimodal(
            "Explain this formula and relate it to any mathematical concepts in the document",
            multimodal_content=[
                {
                    "type": "equation",
                    "latex": "F1 = 2 \\cdot \\frac{precision \\cdot recall}{precision + recall}",
                    "equation_caption": "F1-score calculation formula",
                }
            ],
            mode="hybrid",
        )
        logger.info(f"Answer: {equation_result}")

    except Exception as e:
        logger.error(f"Error processing with RAG: {str(e)}")
        import traceback

        logger.error(traceback.format_exc())


def main():
    """Main function to run the example"""
    parser = argparse.ArgumentParser(description="MinerU RAG Example")
    parser.add_argument("file_path", help="Path to the document to process")
    parser.add_argument(
        "--working_dir", "-w", default="./rag_storage", help="Working directory path"
    )
    parser.add_argument(
        "--output", "-o", default="./output", help="Output directory path"
    )
    parser.add_argument(
        "--api-key",
        default=os.getenv("LLM_BINDING_API_KEY"),
        help="OpenAI API key (defaults to LLM_BINDING_API_KEY env var)",
    )
    parser.add_argument(
        "--base-url",
        default=os.getenv("LLM_BINDING_HOST"),
        help="Optional base URL for API",
    )
    parser.add_argument(
        "--parser",
        default=os.getenv("PARSER", "mineru"),
        help="Optional base URL for API",
    )

    args = parser.parse_args()

    # Check if API key is provided
    if not args.api_key:
        logger.error("Error: OpenAI API key is required")
        logger.error("Set api key environment variable or use --api-key option")
        return

    # Create output directory if specified
    if args.output:
        os.makedirs(args.output, exist_ok=True)

    # Process with RAG
    asyncio.run(
        process_with_rag(
            args.file_path,
            args.output,
            args.api_key,
            args.base_url,
            args.working_dir,
            args.parser,
        )
    )


if __name__ == "__main__":
    # Configure logging first
    configure_logging()

    print("RAGAnything Example")
    print("=" * 30)
    print("Processing document with multimodal RAG pipeline")
    print("=" * 30)

    main()



================================================
FILE: examples/text_format_test.py
================================================
#!/usr/bin/env python3
"""
Text Format Parsing Test Script for RAG-Anything

This script demonstrates how to parse various text formats
using MinerU, including TXT and MD files.

Requirements:
- ReportLab library for PDF conversion
- RAG-Anything package

Usage:
    python text_format_test.py --file path/to/text/document.md
"""

import argparse
import asyncio
import sys
from pathlib import Path
from raganything import RAGAnything


def check_reportlab_installation():
    """Check if ReportLab is installed and available"""
    try:
        import reportlab

        print(
            f"✅ ReportLab found: version {reportlab.Version if hasattr(reportlab, 'Version') else 'Unknown'}"
        )
        return True
    except ImportError:
        print("❌ ReportLab not found. Please install ReportLab:")
        print("  pip install reportlab")
        return False


async def test_text_format_parsing(file_path: str):
    """Test text format parsing with MinerU"""

    print(f"🧪 Testing text format parsing: {file_path}")

    # Check if file exists and is a supported text format
    file_path = Path(file_path)
    if not file_path.exists():
        print(f"❌ File does not exist: {file_path}")
        return False

    supported_extensions = {".txt", ".md"}
    if file_path.suffix.lower() not in supported_extensions:
        print(f"❌ Unsupported file format: {file_path.suffix}")
        print(f"   Supported formats: {', '.join(supported_extensions)}")
        return False

    print(f"📄 File format: {file_path.suffix.upper()}")
    print(f"📏 File size: {file_path.stat().st_size / 1024:.1f} KB")

    # Display text file info
    try:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        print(f"📝 Text length: {len(content)} characters")
        print(f"📋 Line count: {len(content.splitlines())}")
    except UnicodeDecodeError:
        print(
            "⚠️  Text encoding: Non-UTF-8 (will try multiple encodings during processing)"
        )

    # Initialize RAGAnything (only for parsing functionality)
    rag = RAGAnything()

    try:
        # Test text parsing with MinerU
        print("\n🔄 Testing text parsing with MinerU...")
        content_list, md_content = await rag.parse_document(
            file_path=str(file_path),
            output_dir="./test_output",
            parse_method="auto",
            display_stats=True,
        )

        print("✅ Parsing successful!")
        print(f"   📊 Content blocks: {len(content_list)}")
        print(f"   📝 Markdown length: {len(md_content)} characters")

        # Analyze content types
        content_types = {}
        for item in content_list:
            if isinstance(item, dict):
                content_type = item.get("type", "unknown")
                content_types[content_type] = content_types.get(content_type, 0) + 1

        if content_types:
            print("   📋 Content distribution:")
            for content_type, count in sorted(content_types.items()):
                print(f"      • {content_type}: {count}")

        # Display extracted text (if any)
        if md_content.strip():
            print("\n📄 Extracted text preview (first 500 characters):")
            preview = md_content.strip()[:500]
            print(f"   {preview}{'...' if len(md_content) > 500 else ''}")
        else:
            print("\n📄 No text extracted from the document")

        # Display text blocks
        text_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "text"
        ]
        if text_items:
            print("\n📝 Text blocks found:")
            for i, item in enumerate(text_items[:3], 1):
                text_content = item.get("text", "")
                if text_content.strip():
                    preview = text_content.strip()[:200]
                    print(
                        f"   {i}. {preview}{'...' if len(text_content) > 200 else ''}"
                    )

        # Check for any tables detected in the text
        table_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "table"
        ]
        if table_items:
            print(f"\n📊 Found {len(table_items)} table(s) in document:")
            for i, item in enumerate(table_items, 1):
                table_body = item.get("table_body", "")
                row_count = len(table_body.split("\n"))
                print(f"   {i}. Table with {row_count} rows")

        # Check for images (unlikely in text files but possible in MD)
        image_items = [
            item
            for item in content_list
            if isinstance(item, dict) and item.get("type") == "image"
        ]
        if image_items:
            print(f"\n🖼️  Found {len(image_items)} image(s):")
            for i, item in enumerate(image_items, 1):
                print(f"   {i}. Image path: {item.get('img_path', 'N/A')}")

        print("\n🎉 Text format parsing test completed successfully!")
        print("📁 Output files saved to: ./test_output")
        return True

    except Exception as e:
        print(f"\n❌ Text format parsing failed: {str(e)}")
        import traceback

        print(f"   Full error: {traceback.format_exc()}")
        return False


def main():
    """Main function"""
    parser = argparse.ArgumentParser(description="Test text format parsing with MinerU")
    parser.add_argument("--file", help="Path to the text file to test")
    parser.add_argument(
        "--check-reportlab",
        action="store_true",
        help="Only check ReportLab installation",
    )

    args = parser.parse_args()

    # Check ReportLab installation
    print("🔧 Checking ReportLab installation...")
    if not check_reportlab_installation():
        return 1

    if args.check_reportlab:
        print("✅ ReportLab installation check passed!")
        return 0

    # If not just checking dependencies, file argument is required
    if not args.file:
        print("❌ Error: --file argument is required when not using --check-reportlab")
        parser.print_help()
        return 1

    # Run the parsing test
    try:
        success = asyncio.run(test_text_format_parsing(args.file))
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Unexpected error: {str(e)}")
        return 1


if __name__ == "__main__":
    sys.exit(main())



================================================
FILE: raganything/__init__.py
================================================
from .raganything import RAGAnything as RAGAnything
from .config import RAGAnythingConfig as RAGAnythingConfig

__version__ = "1.2.7"
__author__ = "Zirui Guo"
__url__ = "https://github.com/HKUDS/RAG-Anything"

__all__ = ["RAGAnything", "RAGAnythingConfig"]



================================================
FILE: raganything/batch.py
================================================
"""
Batch processing functionality for RAGAnything

Contains methods for processing multiple documents in batch mode
"""

import asyncio
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional, TYPE_CHECKING
import time

from .batch_parser import BatchParser, BatchProcessingResult

if TYPE_CHECKING:
    from .config import RAGAnythingConfig


class BatchMixin:
    """BatchMixin class containing batch processing functionality for RAGAnything"""

    # Type hints for mixin attributes (will be available when mixed into RAGAnything)
    config: "RAGAnythingConfig"
    logger: logging.Logger

    # Type hints for methods that will be available from other mixins
    async def _ensure_lightrag_initialized(self) -> None: ...
    async def process_document_complete(self, file_path: str, **kwargs) -> None: ...

    # ==========================================
    # ORIGINAL BATCH PROCESSING METHOD (RESTORED)
    # ==========================================

    async def process_folder_complete(
        self,
        folder_path: str,
        output_dir: str = None,
        parse_method: str = None,
        display_stats: bool = None,
        split_by_character: str | None = None,
        split_by_character_only: bool = False,
        file_extensions: Optional[List[str]] = None,
        recursive: bool = None,
        max_workers: int = None,
    ):
        """
        Process all supported files in a folder

        Args:
            folder_path: Path to the folder containing files to process
            output_dir: Directory for parsed outputs (optional)
            parse_method: Parsing method to use (optional)
            display_stats: Whether to display statistics (optional)
            split_by_character: Character to split by (optional)
            split_by_character_only: Whether to split only by character (optional)
            file_extensions: List of file extensions to process (optional)
            recursive: Whether to process folders recursively (optional)
            max_workers: Maximum number of workers for concurrent processing (optional)
        """
        if output_dir is None:
            output_dir = self.config.parser_output_dir
        if parse_method is None:
            parse_method = self.config.parse_method
        if display_stats is None:
            display_stats = True
        if file_extensions is None:
            file_extensions = self.config.supported_file_extensions
        if recursive is None:
            recursive = self.config.recursive_folder_processing
        if max_workers is None:
            max_workers = self.config.max_concurrent_files

        await self._ensure_lightrag_initialized()

        # Get all files in the folder
        folder_path_obj = Path(folder_path)
        if not folder_path_obj.exists():
            raise FileNotFoundError(f"Folder not found: {folder_path}")

        # Collect files based on supported extensions
        files_to_process = []
        for file_ext in file_extensions:
            if recursive:
                pattern = f"**/*{file_ext}"
            else:
                pattern = f"*{file_ext}"
            files_to_process.extend(folder_path_obj.glob(pattern))

        if not files_to_process:
            self.logger.warning(f"No supported files found in {folder_path}")
            return

        self.logger.info(
            f"Found {len(files_to_process)} files to process in {folder_path}"
        )

        # Create output directory if it doesn't exist
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Process files with controlled concurrency
        semaphore = asyncio.Semaphore(max_workers)
        tasks = []

        async def process_single_file(file_path: Path):
            async with semaphore:
                try:
                    await self.process_document_complete(
                        str(file_path),
                        output_dir=output_dir,
                        parse_method=parse_method,
                        split_by_character=split_by_character,
                        split_by_character_only=split_by_character_only,
                    )
                    return True, str(file_path), None
                except Exception as e:
                    self.logger.error(f"Failed to process {file_path}: {str(e)}")
                    return False, str(file_path), str(e)

        # Create tasks for all files
        for file_path in files_to_process:
            task = asyncio.create_task(process_single_file(file_path))
            tasks.append(task)

        # Wait for all tasks to complete
        results = await asyncio.gather(*tasks, return_exceptions=True)

        # Process results
        successful_files = []
        failed_files = []
        for result in results:
            if isinstance(result, Exception):
                failed_files.append(("unknown", str(result)))
            else:
                success, file_path, error = result
                if success:
                    successful_files.append(file_path)
                else:
                    failed_files.append((file_path, error))

        # Display statistics if requested
        if display_stats:
            self.logger.info("Processing complete!")
            self.logger.info(f"  Successful: {len(successful_files)} files")
            self.logger.info(f"  Failed: {len(failed_files)} files")
            if failed_files:
                self.logger.warning("Failed files:")
                for file_path, error in failed_files:
                    self.logger.warning(f"  - {file_path}: {error}")

    # ==========================================
    # NEW ENHANCED BATCH PROCESSING METHODS
    # ==========================================

    def process_documents_batch(
        self,
        file_paths: List[str],
        output_dir: Optional[str] = None,
        parse_method: Optional[str] = None,
        max_workers: Optional[int] = None,
        recursive: Optional[bool] = None,
        show_progress: bool = True,
        **kwargs,
    ) -> BatchProcessingResult:
        """
        Process multiple documents in batch using the new BatchParser

        Args:
            file_paths: List of file paths or directories to process
            output_dir: Output directory for parsed files
            parse_method: Parsing method to use
            max_workers: Maximum number of workers for parallel processing
            recursive: Whether to process directories recursively
            show_progress: Whether to show progress bar
            **kwargs: Additional arguments passed to the parser

        Returns:
            BatchProcessingResult: Results of the batch processing
        """
        # Use config defaults if not specified
        if output_dir is None:
            output_dir = self.config.parser_output_dir
        if parse_method is None:
            parse_method = self.config.parse_method
        if max_workers is None:
            max_workers = self.config.max_concurrent_files
        if recursive is None:
            recursive = self.config.recursive_folder_processing

        # Create batch parser
        batch_parser = BatchParser(
            parser_type=self.config.parser,
            max_workers=max_workers,
            show_progress=show_progress,
            skip_installation_check=True,  # Skip installation check for better UX
        )

        # Process batch
        return batch_parser.process_batch(
            file_paths=file_paths,
            output_dir=output_dir,
            parse_method=parse_method,
            recursive=recursive,
            **kwargs,
        )

    async def process_documents_batch_async(
        self,
        file_paths: List[str],
        output_dir: Optional[str] = None,
        parse_method: Optional[str] = None,
        max_workers: Optional[int] = None,
        recursive: Optional[bool] = None,
        show_progress: bool = True,
        **kwargs,
    ) -> BatchProcessingResult:
        """
        Asynchronously process multiple documents in batch

        Args:
            file_paths: List of file paths or directories to process
            output_dir: Output directory for parsed files
            parse_method: Parsing method to use
            max_workers: Maximum number of workers for parallel processing
            recursive: Whether to process directories recursively
            show_progress: Whether to show progress bar
            **kwargs: Additional arguments passed to the parser

        Returns:
            BatchProcessingResult: Results of the batch processing
        """
        # Use config defaults if not specified
        if output_dir is None:
            output_dir = self.config.parser_output_dir
        if parse_method is None:
            parse_method = self.config.parse_method
        if max_workers is None:
            max_workers = self.config.max_concurrent_files
        if recursive is None:
            recursive = self.config.recursive_folder_processing

        # Create batch parser
        batch_parser = BatchParser(
            parser_type=self.config.parser,
            max_workers=max_workers,
            show_progress=show_progress,
            skip_installation_check=True,  # Skip installation check for better UX
        )

        # Process batch asynchronously
        return await batch_parser.process_batch_async(
            file_paths=file_paths,
            output_dir=output_dir,
            parse_method=parse_method,
            recursive=recursive,
            **kwargs,
        )

    def get_supported_file_extensions(self) -> List[str]:
        """Get list of supported file extensions for batch processing"""
        batch_parser = BatchParser(parser_type=self.config.parser)
        return batch_parser.get_supported_extensions()

    def filter_supported_files(
        self, file_paths: List[str], recursive: Optional[bool] = None
    ) -> List[str]:
        """
        Filter file paths to only include supported file types

        Args:
            file_paths: List of file paths to filter
            recursive: Whether to process directories recursively

        Returns:
            List of supported file paths
        """
        if recursive is None:
            recursive = self.config.recursive_folder_processing

        batch_parser = BatchParser(parser_type=self.config.parser)
        return batch_parser.filter_supported_files(file_paths, recursive)

    async def process_documents_with_rag_batch(
        self,
        file_paths: List[str],
        output_dir: Optional[str] = None,
        parse_method: Optional[str] = None,
        max_workers: Optional[int] = None,
        recursive: Optional[bool] = None,
        show_progress: bool = True,
        **kwargs,
    ) -> Dict[str, Any]:
        """
        Process documents in batch and then add them to RAG

        This method combines document parsing and RAG insertion:
        1. First, parse all documents using batch processing
        2. Then, process each successfully parsed document with RAG

        Args:
            file_paths: List of file paths or directories to process
            output_dir: Output directory for parsed files
            parse_method: Parsing method to use
            max_workers: Maximum number of workers for parallel processing
            recursive: Whether to process directories recursively
            show_progress: Whether to show progress bar
            **kwargs: Additional arguments passed to the parser

        Returns:
            Dict containing both parse results and RAG processing results
        """
        start_time = time.time()

        # Use config defaults if not specified
        if output_dir is None:
            output_dir = self.config.parser_output_dir
        if parse_method is None:
            parse_method = self.config.parse_method
        if max_workers is None:
            max_workers = self.config.max_concurrent_files
        if recursive is None:
            recursive = self.config.recursive_folder_processing

        self.logger.info("Starting batch processing with RAG integration")

        # Step 1: Parse documents in batch
        parse_result = self.process_documents_batch(
            file_paths=file_paths,
            output_dir=output_dir,
            parse_method=parse_method,
            max_workers=max_workers,
            recursive=recursive,
            show_progress=show_progress,
            **kwargs,
        )

        # Step 2: Process with RAG
        # Initialize RAG system
        await self._ensure_lightrag_initialized()

        # Then, process each successful file with RAG
        rag_results = {}

        if parse_result.successful_files:
            self.logger.info(
                f"Processing {len(parse_result.successful_files)} files with RAG"
            )

            # Process files with RAG (this could be parallelized in the future)
            for file_path in parse_result.successful_files:
                try:
                    # Process the successfully parsed file with RAG
                    await self.process_document_complete(
                        file_path,
                        output_dir=output_dir,
                        parse_method=parse_method,
                        **kwargs,
                    )

                    # Get some statistics about the processed content
                    # This would require additional tracking in the RAG system
                    rag_results[file_path] = {"status": "success", "processed": True}

                except Exception as e:
                    self.logger.error(
                        f"Failed to process {file_path} with RAG: {str(e)}"
                    )
                    rag_results[file_path] = {
                        "status": "failed",
                        "error": str(e),
                        "processed": False,
                    }

        processing_time = time.time() - start_time

        return {
            "parse_result": parse_result,
            "rag_results": rag_results,
            "total_processing_time": processing_time,
            "successful_rag_files": len(
                [r for r in rag_results.values() if r["processed"]]
            ),
            "failed_rag_files": len(
                [r for r in rag_results.values() if not r["processed"]]
            ),
        }



================================================
FILE: raganything/batch_parser.py
================================================
"""
Batch and Parallel Document Parsing

This module provides functionality for processing multiple documents in parallel,
with progress reporting and error handling.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import time

from tqdm import tqdm

from .parser import MineruParser, DoclingParser


@dataclass
class BatchProcessingResult:
    """Result of batch processing operation"""

    successful_files: List[str]
    failed_files: List[str]
    total_files: int
    processing_time: float
    errors: Dict[str, str]
    output_dir: str

    @property
    def success_rate(self) -> float:
        """Calculate success rate as percentage"""
        if self.total_files == 0:
            return 0.0
        return (len(self.successful_files) / self.total_files) * 100

    def summary(self) -> str:
        """Generate a summary of the batch processing results"""
        return (
            f"Batch Processing Summary:\n"
            f"  Total files: {self.total_files}\n"
            f"  Successful: {len(self.successful_files)} ({self.success_rate:.1f}%)\n"
            f"  Failed: {len(self.failed_files)}\n"
            f"  Processing time: {self.processing_time:.2f} seconds\n"
            f"  Output directory: {self.output_dir}"
        )


class BatchParser:
    """
    Batch document parser with parallel processing capabilities

    Supports processing multiple documents concurrently with progress tracking
    and comprehensive error handling.
    """

    def __init__(
        self,
        parser_type: str = "mineru",
        max_workers: int = 4,
        show_progress: bool = True,
        timeout_per_file: int = 300,
        skip_installation_check: bool = False,
    ):
        """
        Initialize batch parser

        Args:
            parser_type: Type of parser to use ("mineru" or "docling")
            max_workers: Maximum number of parallel workers
            show_progress: Whether to show progress bars
            timeout_per_file: Timeout in seconds for each file
            skip_installation_check: Skip parser installation check (useful for testing)
        """
        self.parser_type = parser_type
        self.max_workers = max_workers
        self.show_progress = show_progress
        self.timeout_per_file = timeout_per_file
        self.logger = logging.getLogger(__name__)

        # Initialize parser
        if parser_type == "mineru":
            self.parser = MineruParser()
        elif parser_type == "docling":
            self.parser = DoclingParser()
        else:
            raise ValueError(f"Unsupported parser type: {parser_type}")

        # Check parser installation (optional)
        if not skip_installation_check:
            if not self.parser.check_installation():
                self.logger.warning(
                    f"{parser_type.title()} parser installation check failed. "
                    f"This may be due to package conflicts. "
                    f"Use skip_installation_check=True to bypass this check."
                )
                # Don't raise an error, just warn - the parser might still work

    def get_supported_extensions(self) -> List[str]:
        """Get list of supported file extensions"""
        return list(
            self.parser.OFFICE_FORMATS
            | self.parser.IMAGE_FORMATS
            | self.parser.TEXT_FORMATS
            | {".pdf"}
        )

    def filter_supported_files(
        self, file_paths: List[str], recursive: bool = True
    ) -> List[str]:
        """
        Filter file paths to only include supported file types

        Args:
            file_paths: List of file paths or directories
            recursive: Whether to search directories recursively

        Returns:
            List of supported file paths
        """
        supported_extensions = set(self.get_supported_extensions())
        supported_files = []

        for path_str in file_paths:
            path = Path(path_str)

            if path.is_file():
                if path.suffix.lower() in supported_extensions:
                    supported_files.append(str(path))
                else:
                    self.logger.warning(f"Unsupported file type: {path}")

            elif path.is_dir():
                if recursive:
                    # Recursively find all files
                    for file_path in path.rglob("*"):
                        if (
                            file_path.is_file()
                            and file_path.suffix.lower() in supported_extensions
                        ):
                            supported_files.append(str(file_path))
                else:
                    # Only files in the directory (not subdirectories)
                    for file_path in path.glob("*"):
                        if (
                            file_path.is_file()
                            and file_path.suffix.lower() in supported_extensions
                        ):
                            supported_files.append(str(file_path))

            else:
                self.logger.warning(f"Path does not exist: {path}")

        return supported_files

    def process_single_file(
        self, file_path: str, output_dir: str, parse_method: str = "auto", **kwargs
    ) -> Tuple[bool, str, Optional[str]]:
        """
        Process a single file

        Args:
            file_path: Path to the file to process
            output_dir: Output directory
            parse_method: Parsing method
            **kwargs: Additional parser arguments

        Returns:
            Tuple of (success, file_path, error_message)
        """
        try:
            start_time = time.time()

            # Create file-specific output directory
            file_name = Path(file_path).stem
            file_output_dir = Path(output_dir) / file_name
            file_output_dir.mkdir(parents=True, exist_ok=True)

            # Parse the document
            content_list = self.parser.parse_document(
                file_path=file_path,
                output_dir=str(file_output_dir),
                method=parse_method,
                **kwargs,
            )

            processing_time = time.time() - start_time

            self.logger.info(
                f"Successfully processed {file_path} "
                f"({len(content_list)} content blocks, {processing_time:.2f}s)"
            )

            return True, file_path, None

        except Exception as e:
            error_msg = f"Failed to process {file_path}: {str(e)}"
            self.logger.error(error_msg)
            return False, file_path, error_msg

    def process_batch(
        self,
        file_paths: List[str],
        output_dir: str,
        parse_method: str = "auto",
        recursive: bool = True,
        **kwargs,
    ) -> BatchProcessingResult:
        """
        Process multiple files in parallel

        Args:
            file_paths: List of file paths or directories to process
            output_dir: Base output directory
            parse_method: Parsing method for all files
            recursive: Whether to search directories recursively
            **kwargs: Additional parser arguments

        Returns:
            BatchProcessingResult with processing statistics
        """
        start_time = time.time()

        # Filter to supported files
        supported_files = self.filter_supported_files(file_paths, recursive)

        if not supported_files:
            self.logger.warning("No supported files found to process")
            return BatchProcessingResult(
                successful_files=[],
                failed_files=[],
                total_files=0,
                processing_time=0.0,
                errors={},
                output_dir=output_dir,
            )

        self.logger.info(f"Found {len(supported_files)} files to process")

        # Create output directory
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)

        # Process files in parallel
        successful_files = []
        failed_files = []
        errors = {}

        # Create progress bar if requested
        pbar = None
        if self.show_progress:
            pbar = tqdm(
                total=len(supported_files),
                desc=f"Processing files ({self.parser_type})",
                unit="file",
            )

        try:
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all tasks
                future_to_file = {
                    executor.submit(
                        self.process_single_file,
                        file_path,
                        output_dir,
                        parse_method,
                        **kwargs,
                    ): file_path
                    for file_path in supported_files
                }

                # Process completed tasks
                for future in as_completed(
                    future_to_file, timeout=self.timeout_per_file
                ):
                    success, file_path, error_msg = future.result()

                    if success:
                        successful_files.append(file_path)
                    else:
                        failed_files.append(file_path)
                        errors[file_path] = error_msg

                    if pbar:
                        pbar.update(1)

        except Exception as e:
            self.logger.error(f"Batch processing failed: {str(e)}")
            # Mark remaining files as failed
            for future in future_to_file:
                if not future.done():
                    file_path = future_to_file[future]
                    failed_files.append(file_path)
                    errors[file_path] = f"Processing interrupted: {str(e)}"
                    if pbar:
                        pbar.update(1)

        finally:
            if pbar:
                pbar.close()

        processing_time = time.time() - start_time

        # Create result
        result = BatchProcessingResult(
            successful_files=successful_files,
            failed_files=failed_files,
            total_files=len(supported_files),
            processing_time=processing_time,
            errors=errors,
            output_dir=output_dir,
        )

        # Log summary
        self.logger.info(result.summary())

        return result

    async def process_batch_async(
        self,
        file_paths: List[str],
        output_dir: str,
        parse_method: str = "auto",
        recursive: bool = True,
        **kwargs,
    ) -> BatchProcessingResult:
        """
        Async version of batch processing

        Args:
            file_paths: List of file paths or directories to process
            output_dir: Base output directory
            parse_method: Parsing method for all files
            recursive: Whether to search directories recursively
            **kwargs: Additional parser arguments

        Returns:
            BatchProcessingResult with processing statistics
        """
        # Run the sync version in a thread pool
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            self.process_batch,
            file_paths,
            output_dir,
            parse_method,
            recursive,
            **kwargs,
        )


def main():
    """Command-line interface for batch parsing"""
    import argparse

    parser = argparse.ArgumentParser(description="Batch document parsing")
    parser.add_argument("paths", nargs="+", help="File paths or directories to process")
    parser.add_argument("--output", "-o", required=True, help="Output directory")
    parser.add_argument(
        "--parser",
        choices=["mineru", "docling"],
        default="mineru",
        help="Parser to use",
    )
    parser.add_argument(
        "--method",
        choices=["auto", "txt", "ocr"],
        default="auto",
        help="Parsing method",
    )
    parser.add_argument(
        "--workers", type=int, default=4, help="Number of parallel workers"
    )
    parser.add_argument(
        "--no-progress", action="store_true", help="Disable progress bar"
    )
    parser.add_argument(
        "--recursive",
        action="store_true",
        default=True,
        help="Search directories recursively",
    )
    parser.add_argument(
        "--timeout", type=int, default=300, help="Timeout per file (seconds)"
    )

    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    try:
        # Create batch parser
        batch_parser = BatchParser(
            parser_type=args.parser,
            max_workers=args.workers,
            show_progress=not args.no_progress,
            timeout_per_file=args.timeout,
        )

        # Process files
        result = batch_parser.process_batch(
            file_paths=args.paths,
            output_dir=args.output,
            parse_method=args.method,
            recursive=args.recursive,
        )

        # Print summary
        print("\n" + result.summary())

        # Exit with error code if any files failed
        if result.failed_files:
            return 1

        return 0

    except Exception as e:
        print(f"Error: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(main())



================================================
FILE: raganything/config.py
================================================
"""
Configuration classes for RAGAnything

Contains configuration dataclasses with environment variable support
"""

from dataclasses import dataclass, field
from typing import List
from lightrag.utils import get_env_value


@dataclass
class RAGAnythingConfig:
    """Configuration class for RAGAnything with environment variable support"""

    # Directory Configuration
    # ---
    working_dir: str = field(default=get_env_value("WORKING_DIR", "./rag_storage", str))
    """Directory where RAG storage and cache files are stored."""

    # Parser Configuration
    # ---
    parse_method: str = field(default=get_env_value("PARSE_METHOD", "auto", str))
    """Default parsing method for document parsing: 'auto', 'ocr', or 'txt'."""

    parser_output_dir: str = field(default=get_env_value("OUTPUT_DIR", "./output", str))
    """Default output directory for parsed content."""

    parser: str = field(default=get_env_value("PARSER", "mineru", str))
    """Parser selection: 'mineru' or 'docling'."""

    display_content_stats: bool = field(
        default=get_env_value("DISPLAY_CONTENT_STATS", True, bool)
    )
    """Whether to display content statistics during parsing."""

    # Multimodal Processing Configuration
    # ---
    enable_image_processing: bool = field(
        default=get_env_value("ENABLE_IMAGE_PROCESSING", True, bool)
    )
    """Enable image content processing."""

    enable_table_processing: bool = field(
        default=get_env_value("ENABLE_TABLE_PROCESSING", True, bool)
    )
    """Enable table content processing."""

    enable_equation_processing: bool = field(
        default=get_env_value("ENABLE_EQUATION_PROCESSING", True, bool)
    )
    """Enable equation content processing."""

    # Batch Processing Configuration
    # ---
    max_concurrent_files: int = field(
        default=get_env_value("MAX_CONCURRENT_FILES", 1, int)
    )
    """Maximum number of files to process concurrently."""

    supported_file_extensions: List[str] = field(
        default_factory=lambda: get_env_value(
            "SUPPORTED_FILE_EXTENSIONS",
            ".pdf,.jpg,.jpeg,.png,.bmp,.tiff,.tif,.gif,.webp,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.md",
            str,
        ).split(",")
    )
    """List of supported file extensions for batch processing."""

    recursive_folder_processing: bool = field(
        default=get_env_value("RECURSIVE_FOLDER_PROCESSING", True, bool)
    )
    """Whether to recursively process subfolders in batch mode."""

    # Context Extraction Configuration
    # ---
    context_window: int = field(default=get_env_value("CONTEXT_WINDOW", 1, int))
    """Number of pages/chunks to include before and after current item for context."""

    context_mode: str = field(default=get_env_value("CONTEXT_MODE", "page", str))
    """Context extraction mode: 'page' for page-based, 'chunk' for chunk-based."""

    max_context_tokens: int = field(
        default=get_env_value("MAX_CONTEXT_TOKENS", 2000, int)
    )
    """Maximum number of tokens in extracted context."""

    include_headers: bool = field(default=get_env_value("INCLUDE_HEADERS", True, bool))
    """Whether to include document headers and titles in context."""

    include_captions: bool = field(
        default=get_env_value("INCLUDE_CAPTIONS", True, bool)
    )
    """Whether to include image/table captions in context."""

    context_filter_content_types: List[str] = field(
        default_factory=lambda: get_env_value(
            "CONTEXT_FILTER_CONTENT_TYPES", "text", str
        ).split(",")
    )
    """Content types to include in context extraction (e.g., 'text', 'image', 'table')."""

    content_format: str = field(default=get_env_value("CONTENT_FORMAT", "minerU", str))
    """Default content format for context extraction when processing documents."""

    def __post_init__(self):
        """Post-initialization setup for backward compatibility"""
        # Support legacy environment variable names for backward compatibility
        legacy_parse_method = get_env_value("MINERU_PARSE_METHOD", None, str)
        if legacy_parse_method and not get_env_value("PARSE_METHOD", None, str):
            self.parse_method = legacy_parse_method
            import warnings

            warnings.warn(
                "MINERU_PARSE_METHOD is deprecated. Use PARSE_METHOD instead.",
                DeprecationWarning,
                stacklevel=2,
            )

    @property
    def mineru_parse_method(self) -> str:
        """
        Backward compatibility property for old code.

        .. deprecated::
           Use `parse_method` instead. This property will be removed in a future version.
        """
        import warnings

        warnings.warn(
            "mineru_parse_method is deprecated. Use parse_method instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        return self.parse_method

    @mineru_parse_method.setter
    def mineru_parse_method(self, value: str):
        """Setter for backward compatibility"""
        import warnings

        warnings.warn(
            "mineru_parse_method is deprecated. Use parse_method instead.",
            DeprecationWarning,
            stacklevel=2,
        )
        self.parse_method = value



================================================
FILE: raganything/enhanced_markdown.py
================================================
"""
Enhanced Markdown to PDF Conversion

This module provides improved Markdown to PDF conversion with:
- Better formatting and styling
- Image support
- Table support
- Code syntax highlighting
- Custom templates
- Multiple output formats
"""

import os
import logging
from pathlib import Path
from typing import Dict, Any, Optional
from dataclasses import dataclass
import tempfile
import subprocess

try:
    import markdown

    MARKDOWN_AVAILABLE = True
except ImportError:
    MARKDOWN_AVAILABLE = False

try:
    from weasyprint import HTML

    WEASYPRINT_AVAILABLE = True
except ImportError:
    WEASYPRINT_AVAILABLE = False

try:
    # Check if pandoc module exists (not used directly, just for detection)
    import importlib.util

    spec = importlib.util.find_spec("pandoc")
    PANDOC_AVAILABLE = spec is not None
except ImportError:
    PANDOC_AVAILABLE = False


@dataclass
class MarkdownConfig:
    """Configuration for Markdown to PDF conversion"""

    # Styling options
    css_file: Optional[str] = None
    template_file: Optional[str] = None
    page_size: str = "A4"
    margin: str = "1in"
    font_size: str = "12pt"
    line_height: str = "1.5"

    # Content options
    include_toc: bool = True
    syntax_highlighting: bool = True
    image_max_width: str = "100%"
    table_style: str = "border-collapse: collapse; width: 100%;"

    # Output options
    output_format: str = "pdf"  # pdf, html, docx
    output_dir: Optional[str] = None

    # Advanced options
    custom_css: Optional[str] = None
    metadata: Optional[Dict[str, str]] = None


class EnhancedMarkdownConverter:
    """
    Enhanced Markdown to PDF converter with multiple backends

    Supports multiple conversion methods:
    - WeasyPrint (recommended for HTML/CSS styling)
    - Pandoc (recommended for complex documents)
    - ReportLab (fallback, basic styling)
    """

    def __init__(self, config: Optional[MarkdownConfig] = None):
        """
        Initialize the converter

        Args:
            config: Configuration for conversion
        """
        self.config = config or MarkdownConfig()
        self.logger = logging.getLogger(__name__)

        # Check available backends
        self.available_backends = self._check_backends()
        self.logger.info(f"Available backends: {list(self.available_backends.keys())}")

    def _check_backends(self) -> Dict[str, bool]:
        """Check which conversion backends are available"""
        backends = {
            "weasyprint": WEASYPRINT_AVAILABLE,
            "pandoc": PANDOC_AVAILABLE,
            "markdown": MARKDOWN_AVAILABLE,
        }

        # Check if pandoc is installed on system
        try:
            subprocess.run(["pandoc", "--version"], capture_output=True, check=True)
            backends["pandoc_system"] = True
        except (subprocess.CalledProcessError, FileNotFoundError):
            backends["pandoc_system"] = False

        return backends

    def _get_default_css(self) -> str:
        """Get default CSS styling"""
        return """
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }

        h1, h2, h3, h4, h5, h6 {
            color: #2c3e50;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
        }

        h1 { font-size: 2em; border-bottom: 2px solid #3498db; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #bdc3c7; padding-bottom: 0.2em; }
        h3 { font-size: 1.3em; }
        h4 { font-size: 1.1em; }

        p { margin-bottom: 1em; }

        code {
            background-color: #f8f9fa;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }

        pre {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #3498db;
        }

        pre code {
            background-color: transparent;
            padding: 0;
        }

        blockquote {
            border-left: 4px solid #3498db;
            margin: 0;
            padding-left: 20px;
            color: #7f8c8d;
        }

        table {
            border-collapse: collapse;
            width: 100%;
            margin: 1em 0;
        }

        th, td {
            border: 1px solid #ddd;
            padding: 8px 12px;
            text-align: left;
        }

        th {
            background-color: #f2f2f2;
            font-weight: bold;
        }

        img {
            max-width: 100%;
            height: auto;
            display: block;
            margin: 1em auto;
        }

        ul, ol {
            margin-bottom: 1em;
        }

        li {
            margin-bottom: 0.5em;
        }

        a {
            color: #3498db;
            text-decoration: none;
        }

        a:hover {
            text-decoration: underline;
        }

        .toc {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 2em;
        }

        .toc ul {
            list-style-type: none;
            padding-left: 0;
        }

        .toc li {
            margin-bottom: 0.3em;
        }

        .toc a {
            color: #2c3e50;
        }
        """

    def _process_markdown_content(self, content: str) -> str:
        """Process Markdown content with extensions"""
        if not MARKDOWN_AVAILABLE:
            raise RuntimeError(
                "Markdown library not available. Install with: pip install markdown"
            )

        # Configure Markdown extensions
        extensions = [
            "markdown.extensions.tables",
            "markdown.extensions.fenced_code",
            "markdown.extensions.codehilite",
            "markdown.extensions.toc",
            "markdown.extensions.attr_list",
            "markdown.extensions.def_list",
            "markdown.extensions.footnotes",
        ]

        extension_configs = {
            "codehilite": {
                "css_class": "highlight",
                "use_pygments": True,
            },
            "toc": {
                "title": "Table of Contents",
                "permalink": True,
            },
        }

        # Convert Markdown to HTML
        md = markdown.Markdown(
            extensions=extensions, extension_configs=extension_configs
        )

        html_content = md.convert(content)

        # Add CSS styling
        css = self.config.custom_css or self._get_default_css()

        # Create complete HTML document
        html_doc = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Converted Document</title>
            <style>
                {css}
            </style>
        </head>
        <body>
            {html_content}
        </body>
        </html>
        """

        return html_doc

    def convert_with_weasyprint(self, markdown_content: str, output_path: str) -> bool:
        """Convert using WeasyPrint (best for styling)"""
        if not WEASYPRINT_AVAILABLE:
            raise RuntimeError(
                "WeasyPrint not available. Install with: pip install weasyprint"
            )

        try:
            # Process Markdown to HTML
            html_content = self._process_markdown_content(markdown_content)

            # Convert HTML to PDF
            html = HTML(string=html_content)
            html.write_pdf(output_path)

            self.logger.info(
                f"Successfully converted to PDF using WeasyPrint: {output_path}"
            )
            return True

        except Exception as e:
            self.logger.error(f"WeasyPrint conversion failed: {str(e)}")
            return False

    def convert_with_pandoc(
        self, markdown_content: str, output_path: str, use_system_pandoc: bool = False
    ) -> bool:
        """Convert using Pandoc (best for complex documents)"""
        if (
            not self.available_backends.get("pandoc_system", False)
            and not use_system_pandoc
        ):
            raise RuntimeError(
                "Pandoc not available. Install from: https://pandoc.org/installing.html"
            )

        temp_md_path = None
        try:
            import subprocess

            # Create temporary markdown file
            with tempfile.NamedTemporaryFile(
                mode="w", suffix=".md", delete=False
            ) as temp_file:
                temp_file.write(markdown_content)
                temp_md_path = temp_file.name

            # Build pandoc command with wkhtmltopdf engine
            cmd = [
                "pandoc",
                temp_md_path,
                "-o",
                output_path,
                "--pdf-engine=wkhtmltopdf",
                "--standalone",
                "--toc",
                "--number-sections",
            ]

            # Run pandoc
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)

            if result.returncode == 0:
                self.logger.info(
                    f"Successfully converted to PDF using Pandoc: {output_path}"
                )
                return True
            else:
                self.logger.error(f"Pandoc conversion failed: {result.stderr}")
                return False

        except Exception as e:
            self.logger.error(f"Pandoc conversion failed: {str(e)}")
            return False

        finally:
            if temp_md_path and os.path.exists(temp_md_path):
                try:
                    os.unlink(temp_md_path)
                except OSError as e:
                    self.logger.error(
                        f"Failed to clean up temp file {temp_md_path}: {str(e)}"
                    )

    def convert_markdown_to_pdf(
        self, markdown_content: str, output_path: str, method: str = "auto"
    ) -> bool:
        """
        Convert markdown content to PDF

        Args:
            markdown_content: Markdown content to convert
            output_path: Output PDF file path
            method: Conversion method ("auto", "weasyprint", "pandoc", "pandoc_system")

        Returns:
            True if conversion successful, False otherwise
        """
        if method == "auto":
            method = self._get_recommended_backend()

        try:
            if method == "weasyprint":
                return self.convert_with_weasyprint(markdown_content, output_path)
            elif method == "pandoc":
                return self.convert_with_pandoc(markdown_content, output_path)
            elif method == "pandoc_system":
                return self.convert_with_pandoc(
                    markdown_content, output_path, use_system_pandoc=True
                )
            else:
                raise ValueError(f"Unknown conversion method: {method}")

        except Exception as e:
            self.logger.error(f"{method.title()} conversion failed: {str(e)}")
            return False

    def convert_file_to_pdf(
        self, input_path: str, output_path: Optional[str] = None, method: str = "auto"
    ) -> bool:
        """
        Convert Markdown file to PDF

        Args:
            input_path: Input Markdown file path
            output_path: Output PDF file path (optional)
            method: Conversion method

        Returns:
            bool: True if conversion successful
        """
        input_path_obj = Path(input_path)

        if not input_path_obj.exists():
            raise FileNotFoundError(f"Input file not found: {input_path}")

        # Read markdown content
        try:
            with open(input_path_obj, "r", encoding="utf-8") as f:
                markdown_content = f.read()
        except UnicodeDecodeError:
            # Try with different encodings
            for encoding in ["gbk", "latin-1", "cp1252"]:
                try:
                    with open(input_path_obj, "r", encoding=encoding) as f:
                        markdown_content = f.read()
                    break
                except UnicodeDecodeError:
                    continue
            else:
                raise RuntimeError(
                    f"Could not decode file {input_path} with any supported encoding"
                )

        # Determine output path
        if output_path is None:
            output_path = str(input_path_obj.with_suffix(".pdf"))

        return self.convert_markdown_to_pdf(markdown_content, output_path, method)

    def get_backend_info(self) -> Dict[str, Any]:
        """Get information about available backends"""
        return {
            "available_backends": self.available_backends,
            "recommended_backend": self._get_recommended_backend(),
            "config": {
                "page_size": self.config.page_size,
                "margin": self.config.margin,
                "font_size": self.config.font_size,
                "include_toc": self.config.include_toc,
                "syntax_highlighting": self.config.syntax_highlighting,
            },
        }

    def _get_recommended_backend(self) -> str:
        """Get recommended backend based on availability"""
        if self.available_backends.get("pandoc_system", False):
            return "pandoc"
        elif self.available_backends.get("weasyprint", False):
            return "weasyprint"
        else:
            return "none"


def main():
    """Command-line interface for enhanced markdown conversion"""
    import argparse

    parser = argparse.ArgumentParser(description="Enhanced Markdown to PDF conversion")
    parser.add_argument("input", nargs="?", help="Input markdown file")
    parser.add_argument("--output", "-o", help="Output PDF file")
    parser.add_argument(
        "--method",
        choices=["auto", "weasyprint", "pandoc", "pandoc_system"],
        default="auto",
        help="Conversion method",
    )
    parser.add_argument("--css", help="Custom CSS file")
    parser.add_argument("--info", action="store_true", help="Show backend information")

    args = parser.parse_args()

    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )

    # Create converter
    config = MarkdownConfig()
    if args.css:
        config.css_file = args.css

    converter = EnhancedMarkdownConverter(config)

    # Show backend info if requested
    if args.info:
        info = converter.get_backend_info()
        print("Backend Information:")
        for backend, available in info["available_backends"].items():
            status = "✅" if available else "❌"
            print(f"  {status} {backend}")
        print(f"Recommended backend: {info['recommended_backend']}")
        return 0

    # Check if input file is provided
    if not args.input:
        parser.error("Input file is required when not using --info")

    # Convert file
    try:
        success = converter.convert_file_to_pdf(
            input_path=args.input, output_path=args.output, method=args.method
        )

        if success:
            print(f"✅ Successfully converted {args.input} to PDF")
            return 0
        else:
            print("❌ Conversion failed")
            return 1

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return 1


if __name__ == "__main__":
    exit(main())



================================================
FILE: raganything/prompt.py
================================================
"""
Prompt templates for multimodal content processing

Contains all prompt templates used in modal processors for analyzing
different types of content (images, tables, equations, etc.)
"""

from __future__ import annotations
from typing import Any


PROMPTS: dict[str, Any] = {}

# System prompts for different analysis types
PROMPTS["IMAGE_ANALYSIS_SYSTEM"] = (
    "You are an expert image analyst. Provide detailed, accurate descriptions."
)
PROMPTS["IMAGE_ANALYSIS_FALLBACK_SYSTEM"] = (
    "You are an expert image analyst. Provide detailed analysis based on available information."
)
PROMPTS["TABLE_ANALYSIS_SYSTEM"] = (
    "You are an expert data analyst. Provide detailed table analysis with specific insights."
)
PROMPTS["EQUATION_ANALYSIS_SYSTEM"] = (
    "You are an expert mathematician. Provide detailed mathematical analysis."
)
PROMPTS["GENERIC_ANALYSIS_SYSTEM"] = (
    "You are an expert content analyst specializing in {content_type} content."
)

# Image analysis prompt template
PROMPTS[
    "vision_prompt"
] = """Please analyze this image in detail and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive and detailed visual description of the image following these guidelines:
    - Describe the overall composition and layout
    - Identify all objects, people, text, and visual elements
    - Explain relationships between elements
    - Note colors, lighting, and visual style
    - Describe any actions or activities shown
    - Include technical details if relevant (charts, diagrams, etc.)
    - Always use specific names instead of pronouns",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "image",
        "summary": "concise summary of the image content and its significance (max 100 words)"
    }}
}}

Additional context:
- Image Path: {image_path}
- Captions: {captions}
- Footnotes: {footnotes}

Focus on providing accurate, detailed visual analysis that would be useful for knowledge retrieval."""

# Image analysis prompt with context support
PROMPTS[
    "vision_prompt_with_context"
] = """Please analyze this image in detail, considering the surrounding context. Provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive and detailed visual description of the image following these guidelines:
    - Describe the overall composition and layout
    - Identify all objects, people, text, and visual elements
    - Explain relationships between elements and how they relate to the surrounding context
    - Note colors, lighting, and visual style
    - Describe any actions or activities shown
    - Include technical details if relevant (charts, diagrams, etc.)
    - Reference connections to the surrounding content when relevant
    - Always use specific names instead of pronouns",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "image",
        "summary": "concise summary of the image content, its significance, and relationship to surrounding content (max 100 words)"
    }}
}}

Context from surrounding content:
{context}

Image details:
- Image Path: {image_path}
- Captions: {captions}
- Footnotes: {footnotes}

Focus on providing accurate, detailed visual analysis that incorporates the context and would be useful for knowledge retrieval."""

# Image analysis prompt with text fallback
PROMPTS["text_prompt"] = """Based on the following image information, provide analysis:

Image Path: {image_path}
Captions: {captions}
Footnotes: {footnotes}

{vision_prompt}"""

# Table analysis prompt template
PROMPTS[
    "table_prompt"
] = """Please analyze this table content and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive analysis of the table including:
    - Table structure and organization
    - Column headers and their meanings
    - Key data points and patterns
    - Statistical insights and trends
    - Relationships between data elements
    - Significance of the data presented
    Always use specific names and values instead of general references.",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "table",
        "summary": "concise summary of the table's purpose and key findings (max 100 words)"
    }}
}}

Table Information:
Image Path: {table_img_path}
Caption: {table_caption}
Body: {table_body}
Footnotes: {table_footnote}

Focus on extracting meaningful insights and relationships from the tabular data."""

# Table analysis prompt with context support
PROMPTS[
    "table_prompt_with_context"
] = """Please analyze this table content considering the surrounding context, and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive analysis of the table including:
    - Table structure and organization
    - Column headers and their meanings
    - Key data points and patterns
    - Statistical insights and trends
    - Relationships between data elements
    - Significance of the data presented in relation to surrounding context
    - How the table supports or illustrates concepts from the surrounding content
    Always use specific names and values instead of general references.",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "table",
        "summary": "concise summary of the table's purpose, key findings, and relationship to surrounding content (max 100 words)"
    }}
}}

Context from surrounding content:
{context}

Table Information:
Image Path: {table_img_path}
Caption: {table_caption}
Body: {table_body}
Footnotes: {table_footnote}

Focus on extracting meaningful insights and relationships from the tabular data in the context of the surrounding content."""

# Equation analysis prompt template
PROMPTS[
    "equation_prompt"
] = """Please analyze this mathematical equation and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive analysis of the equation including:
    - Mathematical meaning and interpretation
    - Variables and their definitions
    - Mathematical operations and functions used
    - Application domain and context
    - Physical or theoretical significance
    - Relationship to other mathematical concepts
    - Practical applications or use cases
    Always use specific mathematical terminology.",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "equation",
        "summary": "concise summary of the equation's purpose and significance (max 100 words)"
    }}
}}

Equation Information:
Equation: {equation_text}
Format: {equation_format}

Focus on providing mathematical insights and explaining the equation's significance."""

# Equation analysis prompt with context support
PROMPTS[
    "equation_prompt_with_context"
] = """Please analyze this mathematical equation considering the surrounding context, and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive analysis of the equation including:
    - Mathematical meaning and interpretation
    - Variables and their definitions in the context of surrounding content
    - Mathematical operations and functions used
    - Application domain and context based on surrounding material
    - Physical or theoretical significance
    - Relationship to other mathematical concepts mentioned in the context
    - Practical applications or use cases
    - How the equation relates to the broader discussion or framework
    Always use specific mathematical terminology.",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "equation",
        "summary": "concise summary of the equation's purpose, significance, and role in the surrounding context (max 100 words)"
    }}
}}

Context from surrounding content:
{context}

Equation Information:
Equation: {equation_text}
Format: {equation_format}

Focus on providing mathematical insights and explaining the equation's significance within the broader context."""

# Generic content analysis prompt template
PROMPTS[
    "generic_prompt"
] = """Please analyze this {content_type} content and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive analysis of the content including:
    - Content structure and organization
    - Key information and elements
    - Relationships between components
    - Context and significance
    - Relevant details for knowledge retrieval
    Always use specific terminology appropriate for {content_type} content.",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "{content_type}",
        "summary": "concise summary of the content's purpose and key points (max 100 words)"
    }}
}}

Content: {content}

Focus on extracting meaningful information that would be useful for knowledge retrieval."""

# Generic content analysis prompt with context support
PROMPTS[
    "generic_prompt_with_context"
] = """Please analyze this {content_type} content considering the surrounding context, and provide a JSON response with the following structure:

{{
    "detailed_description": "A comprehensive analysis of the content including:
    - Content structure and organization
    - Key information and elements
    - Relationships between components
    - Context and significance in relation to surrounding content
    - How this content connects to or supports the broader discussion
    - Relevant details for knowledge retrieval
    Always use specific terminology appropriate for {content_type} content.",
    "entity_info": {{
        "entity_name": "{entity_name}",
        "entity_type": "{content_type}",
        "summary": "concise summary of the content's purpose, key points, and relationship to surrounding context (max 100 words)"
    }}
}}

Context from surrounding content:
{context}

Content: {content}

Focus on extracting meaningful information that would be useful for knowledge retrieval and understanding the content's role in the broader context."""

# Modal chunk templates
PROMPTS["image_chunk"] = """
Image Content Analysis:
Image Path: {image_path}
Captions: {captions}
Footnotes: {footnotes}

Visual Analysis: {enhanced_caption}"""

PROMPTS["table_chunk"] = """Table Analysis:
Image Path: {table_img_path}
Caption: {table_caption}
Structure: {table_body}
Footnotes: {table_footnote}

Analysis: {enhanced_caption}"""

PROMPTS["equation_chunk"] = """Mathematical Equation Analysis:
Equation: {equation_text}
Format: {equation_format}

Mathematical Analysis: {enhanced_caption}"""

PROMPTS["generic_chunk"] = """{content_type} Content Analysis:
Content: {content}

Analysis: {enhanced_caption}"""

# Query-related prompts
PROMPTS["QUERY_IMAGE_DESCRIPTION"] = (
    "Please briefly describe the main content, key elements, and important information in this image."
)

PROMPTS["QUERY_IMAGE_ANALYST_SYSTEM"] = (
    "You are a professional image analyst who can accurately describe image content."
)

PROMPTS[
    "QUERY_TABLE_ANALYSIS"
] = """Please analyze the main content, structure, and key information of the following table data:

Table data:
{table_data}

Table caption: {table_caption}

Please briefly summarize the main content, data characteristics, and important findings of the table."""

PROMPTS["QUERY_TABLE_ANALYST_SYSTEM"] = (
    "You are a professional data analyst who can accurately analyze table data."
)

PROMPTS[
    "QUERY_EQUATION_ANALYSIS"
] = """Please explain the meaning and purpose of the following mathematical formula:

LaTeX formula: {latex}
Formula caption: {equation_caption}

Please briefly explain the mathematical meaning, application scenarios, and importance of this formula."""

PROMPTS["QUERY_EQUATION_ANALYST_SYSTEM"] = (
    "You are a mathematics expert who can clearly explain mathematical formulas."
)

PROMPTS[
    "QUERY_GENERIC_ANALYSIS"
] = """Please analyze the following {content_type} type content and extract its main information and key features:

Content: {content_str}

Please briefly summarize the main characteristics and important information of this content."""

PROMPTS["QUERY_GENERIC_ANALYST_SYSTEM"] = (
    "You are a professional content analyst who can accurately analyze {content_type} type content."
)

PROMPTS["QUERY_ENHANCEMENT_SUFFIX"] = (
    "\n\nPlease provide a comprehensive answer based on the user query and the provided multimodal content information."
)



================================================
FILE: raganything/query.py
================================================
"""
Query functionality for RAGAnything

Contains all query-related methods for both text and multimodal queries
"""

import json
import hashlib
import re
from typing import Dict, List, Any
from pathlib import Path
from lightrag import QueryParam
from lightrag.utils import always_get_an_event_loop
from raganything.prompt import PROMPTS
from raganything.utils import (
    get_processor_for_type,
    encode_image_to_base64,
    validate_image_file,
)


class QueryMixin:
    """QueryMixin class containing query functionality for RAGAnything"""

    def _generate_multimodal_cache_key(
        self, query: str, multimodal_content: List[Dict[str, Any]], mode: str, **kwargs
    ) -> str:
        """
        Generate cache key for multimodal query

        Args:
            query: Base query text
            multimodal_content: List of multimodal content
            mode: Query mode
            **kwargs: Additional parameters

        Returns:
            str: Cache key hash
        """
        # Create a normalized representation of the query parameters
        cache_data = {
            "query": query.strip(),
            "mode": mode,
        }

        # Normalize multimodal content for stable caching
        normalized_content = []
        if multimodal_content:
            for item in multimodal_content:
                if isinstance(item, dict):
                    normalized_item = {}
                    for key, value in item.items():
                        # For file paths, use basename to make cache more portable
                        if key in [
                            "img_path",
                            "image_path",
                            "file_path",
                        ] and isinstance(value, str):
                            normalized_item[key] = Path(value).name
                        # For large content, create a hash instead of storing directly
                        elif (
                            key in ["table_data", "table_body"]
                            and isinstance(value, str)
                            and len(value) > 200
                        ):
                            normalized_item[f"{key}_hash"] = hashlib.md5(
                                value.encode()
                            ).hexdigest()
                        else:
                            normalized_item[key] = value
                    normalized_content.append(normalized_item)
                else:
                    normalized_content.append(item)

        cache_data["multimodal_content"] = normalized_content

        # Add relevant kwargs to cache data
        relevant_kwargs = {
            k: v
            for k, v in kwargs.items()
            if k
            in [
                "stream",
                "response_type",
                "top_k",
                "max_tokens",
                "temperature",
                # "only_need_context",
                # "only_need_prompt",
            ]
        }
        cache_data.update(relevant_kwargs)

        # Generate hash from the cache data
        cache_str = json.dumps(cache_data, sort_keys=True, ensure_ascii=False)
        cache_hash = hashlib.md5(cache_str.encode()).hexdigest()

        return f"multimodal_query:{cache_hash}"

    async def aquery(self, query: str, mode: str = "mix", **kwargs) -> str:
        """
        Pure text query - directly calls LightRAG's query functionality

        Args:
            query: Query text
            mode: Query mode ("local", "global", "hybrid", "naive", "mix", "bypass")
            **kwargs: Other query parameters, will be passed to QueryParam
                - vlm_enhanced: bool, default True when vision_model_func is available.
                  If True, will parse image paths in retrieved context and replace them
                  with base64 encoded images for VLM processing.

        Returns:
            str: Query result
        """
        if self.lightrag is None:
            raise ValueError(
                "No LightRAG instance available. Please process documents first or provide a pre-initialized LightRAG instance."
            )

        # Check if VLM enhanced query should be used
        vlm_enhanced = kwargs.pop("vlm_enhanced", None)

        # Auto-determine VLM enhanced based on availability
        if vlm_enhanced is None:
            vlm_enhanced = (
                hasattr(self, "vision_model_func")
                and self.vision_model_func is not None
            )

        # Use VLM enhanced query if enabled and available
        if (
            vlm_enhanced
            and hasattr(self, "vision_model_func")
            and self.vision_model_func
        ):
            return await self.aquery_vlm_enhanced(query, mode=mode, **kwargs)
        elif vlm_enhanced and (
            not hasattr(self, "vision_model_func") or not self.vision_model_func
        ):
            self.logger.warning(
                "VLM enhanced query requested but vision_model_func is not available, falling back to normal query"
            )

        # Create query parameters
        query_param = QueryParam(mode=mode, **kwargs)

        self.logger.info(f"Executing text query: {query[:100]}...")
        self.logger.info(f"Query mode: {mode}")

        # Call LightRAG's query method
        result = await self.lightrag.aquery(query, param=query_param)

        self.logger.info("Text query completed")
        return result

    async def aquery_with_multimodal(
        self,
        query: str,
        multimodal_content: List[Dict[str, Any]] = None,
        mode: str = "mix",
        **kwargs,
    ) -> str:
        """
        Multimodal query - combines text and multimodal content for querying

        Args:
            query: Base query text
            multimodal_content: List of multimodal content, each element contains:
                - type: Content type ("image", "table", "equation", etc.)
                - Other fields depend on type (e.g., img_path, table_data, latex, etc.)
            mode: Query mode ("local", "global", "hybrid", "naive", "mix", "bypass")
            **kwargs: Other query parameters, will be passed to QueryParam

        Returns:
            str: Query result

        Examples:
            # Pure text query
            result = await rag.query_with_multimodal("What is machine learning?")

            # Image query
            result = await rag.query_with_multimodal(
                "Analyze the content in this image",
                multimodal_content=[{
                    "type": "image",
                    "img_path": "./image.jpg"
                }]
            )

            # Table query
            result = await rag.query_with_multimodal(
                "Analyze the data trends in this table",
                multimodal_content=[{
                    "type": "table",
                    "table_data": "Name,Age\nAlice,25\nBob,30"
                }]
            )
        """
        # Ensure LightRAG is initialized
        await self._ensure_lightrag_initialized()

        self.logger.info(f"Executing multimodal query: {query[:100]}...")
        self.logger.info(f"Query mode: {mode}")

        # If no multimodal content, fallback to pure text query
        if not multimodal_content:
            self.logger.info("No multimodal content provided, executing text query")
            return await self.aquery(query, mode=mode, **kwargs)

        # Generate cache key for multimodal query
        cache_key = self._generate_multimodal_cache_key(
            query, multimodal_content, mode, **kwargs
        )

        # Check cache if available and enabled
        cached_result = None
        if (
            hasattr(self, "lightrag")
            and self.lightrag
            and hasattr(self.lightrag, "llm_response_cache")
            and self.lightrag.llm_response_cache
        ):
            if self.lightrag.llm_response_cache.global_config.get(
                "enable_llm_cache", True
            ):
                try:
                    cached_result = await self.lightrag.llm_response_cache.get_by_id(
                        cache_key
                    )
                    if cached_result and isinstance(cached_result, dict):
                        result_content = cached_result.get("return")
                        if result_content:
                            self.logger.info(
                                f"Multimodal query cache hit: {cache_key[:16]}..."
                            )
                            return result_content
                except Exception as e:
                    self.logger.debug(f"Error accessing multimodal query cache: {e}")

        # Process multimodal content to generate enhanced query text
        enhanced_query = await self._process_multimodal_query_content(
            query, multimodal_content
        )

        self.logger.info(
            f"Generated enhanced query length: {len(enhanced_query)} characters"
        )

        # Execute enhanced query
        result = await self.aquery(enhanced_query, mode=mode, **kwargs)

        # Save to cache if available and enabled
        if (
            hasattr(self, "lightrag")
            and self.lightrag
            and hasattr(self.lightrag, "llm_response_cache")
            and self.lightrag.llm_response_cache
        ):
            if self.lightrag.llm_response_cache.global_config.get(
                "enable_llm_cache", True
            ):
                try:
                    # Create cache entry for multimodal query
                    cache_entry = {
                        "return": result,
                        "cache_type": "multimodal_query",
                        "original_query": query,
                        "multimodal_content_count": len(multimodal_content),
                        "mode": mode,
                    }

                    await self.lightrag.llm_response_cache.upsert(
                        {cache_key: cache_entry}
                    )
                    self.logger.info(
                        f"Saved multimodal query result to cache: {cache_key[:16]}..."
                    )
                except Exception as e:
                    self.logger.debug(f"Error saving multimodal query to cache: {e}")

        # Ensure cache is persisted to disk
        if (
            hasattr(self, "lightrag")
            and self.lightrag
            and hasattr(self.lightrag, "llm_response_cache")
            and self.lightrag.llm_response_cache
        ):
            try:
                await self.lightrag.llm_response_cache.index_done_callback()
            except Exception as e:
                self.logger.debug(f"Error persisting multimodal query cache: {e}")

        self.logger.info("Multimodal query completed")
        return result

    async def aquery_vlm_enhanced(self, query: str, mode: str = "mix", **kwargs) -> str:
        """
        VLM enhanced query - replaces image paths in retrieved context with base64 encoded images for VLM processing

        Args:
            query: User query
            mode: Underlying LightRAG query mode
            **kwargs: Other query parameters

        Returns:
            str: VLM query result
        """
        # Ensure VLM is available
        if not hasattr(self, "vision_model_func") or not self.vision_model_func:
            raise ValueError(
                "VLM enhanced query requires vision_model_func. "
                "Please provide a vision model function when initializing RAGAnything."
            )

        # Ensure LightRAG is initialized
        await self._ensure_lightrag_initialized()

        self.logger.info(f"Executing VLM enhanced query: {query[:100]}...")

        # Clear previous image cache
        if hasattr(self, "_current_images_base64"):
            delattr(self, "_current_images_base64")

        # 1. Get original retrieval prompt (without generating final answer)
        query_param = QueryParam(mode=mode, only_need_prompt=True, **kwargs)
        raw_prompt = await self.lightrag.aquery(query, param=query_param)

        self.logger.debug("Retrieved raw prompt from LightRAG")

        # 2. Extract and process image paths
        enhanced_prompt, images_found = await self._process_image_paths_for_vlm(
            raw_prompt
        )

        if not images_found:
            self.logger.info("No valid images found, falling back to normal query")
            # Fallback to normal query
            query_param = QueryParam(mode=mode, **kwargs)
            return await self.lightrag.aquery(query, param=query_param)

        self.logger.info(f"Processed {images_found} images for VLM")

        # 3. Build VLM message format
        messages = self._build_vlm_messages_with_images(enhanced_prompt, query)

        # 4. Call VLM for question answering
        result = await self._call_vlm_with_multimodal_content(messages)

        self.logger.info("VLM enhanced query completed")
        return result

    async def _process_multimodal_query_content(
        self, base_query: str, multimodal_content: List[Dict[str, Any]]
    ) -> str:
        """
        Process multimodal query content to generate enhanced query text

        Args:
            base_query: Base query text
            multimodal_content: List of multimodal content

        Returns:
            str: Enhanced query text
        """
        self.logger.info("Starting multimodal query content processing...")

        enhanced_parts = [f"User query: {base_query}"]

        for i, content in enumerate(multimodal_content):
            content_type = content.get("type", "unknown")
            self.logger.info(
                f"Processing {i+1}/{len(multimodal_content)} multimodal content: {content_type}"
            )

            try:
                # Get appropriate processor
                processor = get_processor_for_type(self.modal_processors, content_type)

                if processor:
                    # Generate content description
                    description = await self._generate_query_content_description(
                        processor, content, content_type
                    )
                    enhanced_parts.append(
                        f"\nRelated {content_type} content: {description}"
                    )
                else:
                    # If no appropriate processor, use basic description
                    basic_desc = str(content)[:200]
                    enhanced_parts.append(
                        f"\nRelated {content_type} content: {basic_desc}"
                    )

            except Exception as e:
                self.logger.error(f"Error processing multimodal content: {str(e)}")
                # Continue processing other content
                continue

        enhanced_query = "\n".join(enhanced_parts)
        enhanced_query += PROMPTS["QUERY_ENHANCEMENT_SUFFIX"]

        self.logger.info("Multimodal query content processing completed")
        return enhanced_query

    async def _generate_query_content_description(
        self, processor, content: Dict[str, Any], content_type: str
    ) -> str:
        """
        Generate content description for query

        Args:
            processor: Multimodal processor
            content: Content data
            content_type: Content type

        Returns:
            str: Content description
        """
        try:
            if content_type == "image":
                return await self._describe_image_for_query(processor, content)
            elif content_type == "table":
                return await self._describe_table_for_query(processor, content)
            elif content_type == "equation":
                return await self._describe_equation_for_query(processor, content)
            else:
                return await self._describe_generic_for_query(
                    processor, content, content_type
                )

        except Exception as e:
            self.logger.error(f"Error generating {content_type} description: {str(e)}")
            return f"{content_type} content: {str(content)[:100]}"

    async def _describe_image_for_query(
        self, processor, content: Dict[str, Any]
    ) -> str:
        """Generate image description for query"""
        image_path = content.get("img_path")
        captions = content.get("img_caption", [])
        footnotes = content.get("img_footnote", [])

        if image_path and Path(image_path).exists():
            # If image exists, use vision model to generate description
            image_base64 = processor._encode_image_to_base64(image_path)
            if image_base64:
                prompt = PROMPTS["QUERY_IMAGE_DESCRIPTION"]
                description = await processor.modal_caption_func(
                    prompt,
                    image_data=image_base64,
                    system_prompt=PROMPTS["QUERY_IMAGE_ANALYST_SYSTEM"],
                )
                return description

        # If image doesn't exist or processing failed, use existing information
        parts = []
        if image_path:
            parts.append(f"Image path: {image_path}")
        if captions:
            parts.append(f"Image captions: {', '.join(captions)}")
        if footnotes:
            parts.append(f"Image footnotes: {', '.join(footnotes)}")

        return "; ".join(parts) if parts else "Image content information incomplete"

    async def _describe_table_for_query(
        self, processor, content: Dict[str, Any]
    ) -> str:
        """Generate table description for query"""
        table_data = content.get("table_data", "")
        table_caption = content.get("table_caption", "")

        prompt = PROMPTS["QUERY_TABLE_ANALYSIS"].format(
            table_data=table_data, table_caption=table_caption
        )

        description = await processor.modal_caption_func(
            prompt, system_prompt=PROMPTS["QUERY_TABLE_ANALYST_SYSTEM"]
        )

        return description

    async def _describe_equation_for_query(
        self, processor, content: Dict[str, Any]
    ) -> str:
        """Generate equation description for query"""
        latex = content.get("latex", "")
        equation_caption = content.get("equation_caption", "")

        prompt = PROMPTS["QUERY_EQUATION_ANALYSIS"].format(
            latex=latex, equation_caption=equation_caption
        )

        description = await processor.modal_caption_func(
            prompt, system_prompt=PROMPTS["QUERY_EQUATION_ANALYST_SYSTEM"]
        )

        return description

    async def _describe_generic_for_query(
        self, processor, content: Dict[str, Any], content_type: str
    ) -> str:
        """Generate generic content description for query"""
        content_str = str(content)

        prompt = PROMPTS["QUERY_GENERIC_ANALYSIS"].format(
            content_type=content_type, content_str=content_str
        )

        description = await processor.modal_caption_func(
            prompt,
            system_prompt=PROMPTS["QUERY_GENERIC_ANALYST_SYSTEM"].format(
                content_type=content_type
            ),
        )

        return description

    async def _process_image_paths_for_vlm(self, prompt: str) -> tuple[str, int]:
        """
        Process image paths in prompt, keeping original paths and adding VLM markers

        Args:
            prompt: Original prompt

        Returns:
            tuple: (processed prompt, image count)
        """
        enhanced_prompt = prompt
        images_processed = 0

        # Initialize image cache
        self._current_images_base64 = []

        # Enhanced regex pattern for matching image paths
        # Matches only the path ending with image file extensions
        image_path_pattern = (
            r"Image Path:\s*([^\r\n]*?\.(?:jpg|jpeg|png|gif|bmp|webp|tiff|tif))"
        )

        # First, let's see what matches we find
        matches = re.findall(image_path_pattern, prompt)
        self.logger.info(f"Found {len(matches)} image path matches in prompt")

        def replace_image_path(match):
            nonlocal images_processed

            image_path = match.group(1).strip()
            self.logger.debug(f"Processing image path: '{image_path}'")

            # Validate path format (basic check)
            if not image_path or len(image_path) < 3:
                self.logger.warning(f"Invalid image path format: {image_path}")
                return match.group(0)  # Keep original

            # Use utility function to validate image file
            self.logger.debug(f"Calling validate_image_file for: {image_path}")
            is_valid = validate_image_file(image_path)
            self.logger.debug(f"Validation result for {image_path}: {is_valid}")

            if not is_valid:
                self.logger.warning(f"Image validation failed for: {image_path}")
                return match.group(0)  # Keep original if validation fails

            try:
                # Encode image to base64 using utility function
                self.logger.debug(f"Attempting to encode image: {image_path}")
                image_base64 = encode_image_to_base64(image_path)
                if image_base64:
                    images_processed += 1
                    # Save base64 to instance variable for later use
                    self._current_images_base64.append(image_base64)

                    # Keep original path info and add VLM marker
                    result = f"Image Path: {image_path}\n[VLM_IMAGE_{images_processed}]"
                    self.logger.debug(
                        f"Successfully processed image {images_processed}: {image_path}"
                    )
                    return result
                else:
                    self.logger.error(f"Failed to encode image: {image_path}")
                    return match.group(0)  # Keep original if encoding failed

            except Exception as e:
                self.logger.error(f"Failed to process image {image_path}: {e}")
                return match.group(0)  # Keep original

        # Execute replacement
        enhanced_prompt = re.sub(
            image_path_pattern, replace_image_path, enhanced_prompt
        )

        return enhanced_prompt, images_processed

    def _build_vlm_messages_with_images(
        self, enhanced_prompt: str, user_query: str
    ) -> List[Dict]:
        """
        Build VLM message format, using markers to correspond images with text positions

        Args:
            enhanced_prompt: Enhanced prompt with image markers
            user_query: User query

        Returns:
            List[Dict]: VLM message format
        """
        images_base64 = getattr(self, "_current_images_base64", [])

        if not images_base64:
            # Pure text mode
            return [
                {
                    "role": "user",
                    "content": f"Context:\n{enhanced_prompt}\n\nUser Question: {user_query}",
                }
            ]

        # Build multimodal content
        content_parts = []

        # Split text at image markers and insert images
        text_parts = enhanced_prompt.split("[VLM_IMAGE_")

        for i, text_part in enumerate(text_parts):
            if i == 0:
                # First text part
                if text_part.strip():
                    content_parts.append({"type": "text", "text": text_part})
            else:
                # Find marker number and insert corresponding image
                marker_match = re.match(r"(\d+)\](.*)", text_part, re.DOTALL)
                if marker_match:
                    image_num = (
                        int(marker_match.group(1)) - 1
                    )  # Convert to 0-based index
                    remaining_text = marker_match.group(2)

                    # Insert corresponding image
                    if 0 <= image_num < len(images_base64):
                        content_parts.append(
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{images_base64[image_num]}"
                                },
                            }
                        )

                    # Insert remaining text
                    if remaining_text.strip():
                        content_parts.append({"type": "text", "text": remaining_text})

        # Add user question
        content_parts.append(
            {
                "type": "text",
                "text": f"\n\nUser Question: {user_query}\n\nPlease answer based on the context and images provided.",
            }
        )

        return [
            {
                "role": "system",
                "content": "You are a helpful assistant that can analyze both text and image content to provide comprehensive answers.",
            },
            {"role": "user", "content": content_parts},
        ]

    async def _call_vlm_with_multimodal_content(self, messages: List[Dict]) -> str:
        """
        Call VLM to process multimodal content

        Args:
            messages: VLM message format

        Returns:
            str: VLM response result
        """
        try:
            user_message = messages[1]
            content = user_message["content"]
            system_prompt = messages[0]["content"]

            if isinstance(content, str):
                # Pure text mode
                result = await self.vision_model_func(
                    content, system_prompt=system_prompt
                )
            else:
                # Multimodal mode - pass complete messages directly to VLM
                result = await self.vision_model_func(
                    "",  # Empty prompt since we're using messages format
                    messages=messages,
                )

            return result

        except Exception as e:
            self.logger.error(f"VLM call failed: {e}")
            raise

    # Synchronous versions of query methods
    def query(self, query: str, mode: str = "mix", **kwargs) -> str:
        """
        Synchronous version of pure text query

        Args:
            query: Query text
            mode: Query mode ("local", "global", "hybrid", "naive", "mix", "bypass")
            **kwargs: Other query parameters, will be passed to QueryParam
                - vlm_enhanced: bool, default True when vision_model_func is available.
                  If True, will parse image paths in retrieved context and replace them
                  with base64 encoded images for VLM processing.

        Returns:
            str: Query result
        """
        loop = always_get_an_event_loop()
        return loop.run_until_complete(self.aquery(query, mode=mode, **kwargs))

    def query_with_multimodal(
        self,
        query: str,
        multimodal_content: List[Dict[str, Any]] = None,
        mode: str = "mix",
        **kwargs,
    ) -> str:
        """
        Synchronous version of multimodal query

        Args:
            query: Base query text
            multimodal_content: List of multimodal content, each element contains:
                - type: Content type ("image", "table", "equation", etc.)
                - Other fields depend on type (e.g., img_path, table_data, latex, etc.)
            mode: Query mode ("local", "global", "hybrid", "naive", "mix", "bypass")
            **kwargs: Other query parameters, will be passed to QueryParam

        Returns:
            str: Query result
        """
        loop = always_get_an_event_loop()
        return loop.run_until_complete(
            self.aquery_with_multimodal(query, multimodal_content, mode=mode, **kwargs)
        )



================================================
FILE: raganything/raganything.py
================================================
"""
Complete document parsing + multimodal content insertion Pipeline

This script integrates:
1. Document parsing (using configurable parsers)
2. Pure text content LightRAG insertion
3. Specialized processing for multimodal content (using different processors)
"""

import os
from typing import Dict, Any, Optional, Callable
import sys
import asyncio
from dataclasses import dataclass, field
from pathlib import Path

# Add project root directory to Python path
sys.path.insert(0, str(Path(__file__).parent.parent))

from lightrag import LightRAG
from lightrag.utils import logger
from dotenv import load_dotenv

# Load environment variables from .env file
# The OS environment variables take precedence over the .env file
load_dotenv(dotenv_path=".env", override=False)

# Import configuration and modules
from raganything.config import RAGAnythingConfig
from raganything.query import QueryMixin
from raganything.processor import ProcessorMixin
from raganything.batch import BatchMixin
from raganything.utils import get_processor_supports
from raganything.parser import MineruParser, DoclingParser

# Import specialized processors
from raganything.modalprocessors import (
    ImageModalProcessor,
    TableModalProcessor,
    EquationModalProcessor,
    GenericModalProcessor,
    ContextExtractor,
    ContextConfig,
)


@dataclass
class RAGAnything(QueryMixin, ProcessorMixin, BatchMixin):
    """Multimodal Document Processing Pipeline - Complete document parsing and insertion pipeline"""

    # Core Components
    # ---
    lightrag: Optional[LightRAG] = field(default=None)
    """Optional pre-initialized LightRAG instance."""

    llm_model_func: Optional[Callable] = field(default=None)
    """LLM model function for text analysis."""

    vision_model_func: Optional[Callable] = field(default=None)
    """Vision model function for image analysis."""

    embedding_func: Optional[Callable] = field(default=None)
    """Embedding function for text vectorization."""

    config: Optional[RAGAnythingConfig] = field(default=None)
    """Configuration object, if None will create with environment variables."""

    # LightRAG Configuration
    # ---
    lightrag_kwargs: Dict[str, Any] = field(default_factory=dict)
    """Additional keyword arguments for LightRAG initialization when lightrag is not provided.
    This allows passing all LightRAG configuration parameters like:
    - kv_storage, vector_storage, graph_storage, doc_status_storage
    - top_k, chunk_top_k, max_entity_tokens, max_relation_tokens, max_total_tokens
    - cosine_threshold, related_chunk_number
    - chunk_token_size, chunk_overlap_token_size, tokenizer, tiktoken_model_name
    - embedding_batch_num, embedding_func_max_async, embedding_cache_config
    - llm_model_name, llm_model_max_token_size, llm_model_max_async, llm_model_kwargs
    - rerank_model_func, vector_db_storage_cls_kwargs, enable_llm_cache
    - max_parallel_insert, max_graph_nodes, addon_params, etc.
    """

    # Internal State
    # ---
    modal_processors: Dict[str, Any] = field(default_factory=dict, init=False)
    """Dictionary of multimodal processors."""

    context_extractor: Optional[ContextExtractor] = field(default=None, init=False)
    """Context extractor for providing surrounding content to modal processors."""

    parse_cache: Optional[Any] = field(default=None, init=False)
    """Parse result cache storage using LightRAG KV storage."""

    def __post_init__(self):
        """Post-initialization setup following LightRAG pattern"""
        # Initialize configuration if not provided
        if self.config is None:
            self.config = RAGAnythingConfig()

        # Set working directory
        self.working_dir = self.config.working_dir

        # Set up logger (use existing logger, don't configure it)
        self.logger = logger

        # Set up document parser
        self.doc_parser = (
            DoclingParser() if self.config.parser == "docling" else MineruParser()
        )

        # Create working directory if needed
        if not os.path.exists(self.working_dir):
            os.makedirs(self.working_dir)
            self.logger.info(f"Created working directory: {self.working_dir}")

        # Log configuration info
        self.logger.info("RAGAnything initialized with config:")
        self.logger.info(f"  Working directory: {self.config.working_dir}")
        self.logger.info(f"  Parser: {self.config.parser}")
        self.logger.info(f"  Parse method: {self.config.parse_method}")
        self.logger.info(
            f"  Multimodal processing - Image: {self.config.enable_image_processing}, "
            f"Table: {self.config.enable_table_processing}, "
            f"Equation: {self.config.enable_equation_processing}"
        )
        self.logger.info(f"  Max concurrent files: {self.config.max_concurrent_files}")

    def __del__(self):
        """Cleanup resources when object is destroyed"""
        try:
            import asyncio

            if asyncio.get_event_loop().is_running():
                # If we're in an async context, schedule cleanup
                asyncio.create_task(self.finalize_storages())
            else:
                # Run cleanup synchronously
                asyncio.run(self.finalize_storages())
        except Exception as e:
            # Use print instead of logger since logger might be cleaned up already
            print(f"Warning: Failed to finalize RAGAnything storages: {e}")

    def _create_context_config(self) -> ContextConfig:
        """Create context configuration from RAGAnything config"""
        return ContextConfig(
            context_window=self.config.context_window,
            context_mode=self.config.context_mode,
            max_context_tokens=self.config.max_context_tokens,
            include_headers=self.config.include_headers,
            include_captions=self.config.include_captions,
            filter_content_types=self.config.context_filter_content_types,
        )

    def _create_context_extractor(self) -> ContextExtractor:
        """Create context extractor with tokenizer from LightRAG"""
        if self.lightrag is None:
            raise ValueError(
                "LightRAG must be initialized before creating context extractor"
            )

        context_config = self._create_context_config()
        return ContextExtractor(
            config=context_config, tokenizer=self.lightrag.tokenizer
        )

    def _initialize_processors(self):
        """Initialize multimodal processors with appropriate model functions"""
        if self.lightrag is None:
            raise ValueError(
                "LightRAG instance must be initialized before creating processors"
            )

        # Create context extractor
        self.context_extractor = self._create_context_extractor()

        # Create different multimodal processors based on configuration
        self.modal_processors = {}

        if self.config.enable_image_processing:
            self.modal_processors["image"] = ImageModalProcessor(
                lightrag=self.lightrag,
                modal_caption_func=self.vision_model_func or self.llm_model_func,
                context_extractor=self.context_extractor,
            )

        if self.config.enable_table_processing:
            self.modal_processors["table"] = TableModalProcessor(
                lightrag=self.lightrag,
                modal_caption_func=self.llm_model_func,
                context_extractor=self.context_extractor,
            )

        if self.config.enable_equation_processing:
            self.modal_processors["equation"] = EquationModalProcessor(
                lightrag=self.lightrag,
                modal_caption_func=self.llm_model_func,
                context_extractor=self.context_extractor,
            )

        # Always include generic processor as fallback
        self.modal_processors["generic"] = GenericModalProcessor(
            lightrag=self.lightrag,
            modal_caption_func=self.llm_model_func,
            context_extractor=self.context_extractor,
        )

        self.logger.info("Multimodal processors initialized with context support")
        self.logger.info(f"Available processors: {list(self.modal_processors.keys())}")
        self.logger.info(f"Context configuration: {self._create_context_config()}")

    def update_config(self, **kwargs):
        """Update configuration with new values"""
        for key, value in kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                self.logger.debug(f"Updated config: {key} = {value}")
            else:
                self.logger.warning(f"Unknown config parameter: {key}")

    async def _ensure_lightrag_initialized(self):
        """Ensure LightRAG instance is initialized, create if necessary"""

        # Check parser installation first
        if not self.doc_parser.check_installation():
            raise RuntimeError(
                f"Parser '{self.config.parser}' is not properly installed. "
                "Please install it using pip install or uv pip install."
            )

        if self.lightrag is not None:
            # LightRAG was pre-provided, but we need to ensure it's properly initialized
            # and that parse_cache is set up

            # Ensure LightRAG storages are initialized
            if (
                not hasattr(self.lightrag, "_storages_status")
                or self.lightrag._storages_status.name != "INITIALIZED"
            ):
                self.logger.info(
                    "Initializing storages for pre-provided LightRAG instance"
                )
                await self.lightrag.initialize_storages()
                from lightrag.kg.shared_storage import initialize_pipeline_status

                await initialize_pipeline_status()

            # Initialize parse cache if not already done
            if self.parse_cache is None:
                self.logger.info(
                    "Initializing parse cache for pre-provided LightRAG instance"
                )
                self.parse_cache = self.lightrag.key_string_value_json_storage_cls(
                    namespace="parse_cache",
                    workspace=self.lightrag.workspace,
                    global_config=self.lightrag.__dict__,
                    embedding_func=self.embedding_func,
                )
                await self.parse_cache.initialize()

            # Initialize processors if not already done
            if not self.modal_processors:
                self._initialize_processors()

            return

        # Validate required functions for creating new LightRAG instance
        if self.llm_model_func is None:
            raise ValueError(
                "llm_model_func must be provided when LightRAG is not pre-initialized"
            )
        if self.embedding_func is None:
            raise ValueError(
                "embedding_func must be provided when LightRAG is not pre-initialized"
            )

        from lightrag.kg.shared_storage import initialize_pipeline_status

        # Prepare LightRAG initialization parameters
        lightrag_params = {
            "working_dir": self.working_dir,
            "llm_model_func": self.llm_model_func,
            "embedding_func": self.embedding_func,
        }

        # Merge user-provided lightrag_kwargs, which can override defaults
        lightrag_params.update(self.lightrag_kwargs)

        # Log the parameters being used for initialization (excluding sensitive data)
        log_params = {
            k: v
            for k, v in lightrag_params.items()
            if not callable(v)
            and k not in ["llm_model_kwargs", "vector_db_storage_cls_kwargs"]
        }
        self.logger.info(f"Initializing LightRAG with parameters: {log_params}")

        # Create LightRAG instance with merged parameters
        self.lightrag = LightRAG(**lightrag_params)

        await self.lightrag.initialize_storages()
        await initialize_pipeline_status()

        # Initialize parse cache storage using LightRAG's KV storage
        self.parse_cache = self.lightrag.key_string_value_json_storage_cls(
            namespace="parse_cache",
            workspace=self.lightrag.workspace,
            global_config=self.lightrag.__dict__,
            embedding_func=self.embedding_func,
        )
        await self.parse_cache.initialize()

        # Initialize processors after LightRAG is ready
        self._initialize_processors()

        self.logger.info("LightRAG, parse cache, and multimodal processors initialized")

    async def finalize_storages(self):
        """Finalize all storages including parse cache and LightRAG storages

        This method should be called when shutting down to properly clean up resources
        and persist any cached data. It will finalize both the parse cache and LightRAG's
        internal storages.

        Example usage:
            try:
                rag_anything = RAGAnything(...)
                await rag_anything.process_file("document.pdf")
                # ... other operations ...
            finally:
                # Always finalize storages to clean up resources
                if rag_anything:
                    await rag_anything.finalize_storages()

        Note:
            - This method is automatically called in __del__ when the object is destroyed
            - Manual calling is recommended in production environments
            - All finalization tasks run concurrently for better performance
        """
        try:
            tasks = []

            # Finalize parse cache if it exists
            if self.parse_cache is not None:
                tasks.append(self.parse_cache.finalize())
                self.logger.debug("Scheduled parse cache finalization")

            # Finalize LightRAG storages if LightRAG is initialized
            if self.lightrag is not None:
                tasks.append(self.lightrag.finalize_storages())
                self.logger.debug("Scheduled LightRAG storages finalization")

            # Run all finalization tasks concurrently
            if tasks:
                await asyncio.gather(*tasks)
                self.logger.info("Successfully finalized all RAGAnything storages")
            else:
                self.logger.debug("No storages to finalize")

        except Exception as e:
            self.logger.error(f"Error during storage finalization: {e}")
            raise

    def check_parser_installation(self) -> bool:
        """
        Check if the configured parser is properly installed

        Returns:
            bool: True if the configured parser is properly installed
        """
        return self.doc_parser.check_installation()

    def get_config_info(self) -> Dict[str, Any]:
        """Get current configuration information"""
        config_info = {
            "directory": {
                "working_dir": self.config.working_dir,
                "parser_output_dir": self.config.parser_output_dir,
            },
            "parsing": {
                "parser": self.config.parser,
                "parse_method": self.config.parse_method,
                "display_content_stats": self.config.display_content_stats,
            },
            "multimodal_processing": {
                "enable_image_processing": self.config.enable_image_processing,
                "enable_table_processing": self.config.enable_table_processing,
                "enable_equation_processing": self.config.enable_equation_processing,
            },
            "context_extraction": {
                "context_window": self.config.context_window,
                "context_mode": self.config.context_mode,
                "max_context_tokens": self.config.max_context_tokens,
                "include_headers": self.config.include_headers,
                "include_captions": self.config.include_captions,
                "filter_content_types": self.config.context_filter_content_types,
            },
            "batch_processing": {
                "max_concurrent_files": self.config.max_concurrent_files,
                "supported_file_extensions": self.config.supported_file_extensions,
                "recursive_folder_processing": self.config.recursive_folder_processing,
            },
            "logging": {
                "note": "Logging fields have been removed - configure logging externally",
            },
        }

        # Add LightRAG configuration if available
        if self.lightrag_kwargs:
            # Filter out sensitive data and callable objects for display
            safe_kwargs = {
                k: v
                for k, v in self.lightrag_kwargs.items()
                if not callable(v)
                and k not in ["llm_model_kwargs", "vector_db_storage_cls_kwargs"]
            }
            config_info["lightrag_config"] = {
                "custom_parameters": safe_kwargs,
                "note": "LightRAG will be initialized with these additional parameters",
            }
        else:
            config_info["lightrag_config"] = {
                "custom_parameters": {},
                "note": "Using default LightRAG parameters",
            }

        return config_info

    def set_content_source_for_context(
        self, content_source, content_format: str = "auto"
    ):
        """Set content source for context extraction in all modal processors

        Args:
            content_source: Source content for context extraction (e.g., MinerU content list)
            content_format: Format of content source ("minerU", "text_chunks", "auto")
        """
        if not self.modal_processors:
            self.logger.warning(
                "Modal processors not initialized. Content source will be set when processors are created."
            )
            return

        for processor_name, processor in self.modal_processors.items():
            try:
                processor.set_content_source(content_source, content_format)
                self.logger.debug(f"Set content source for {processor_name} processor")
            except Exception as e:
                self.logger.error(
                    f"Failed to set content source for {processor_name}: {e}"
                )

        self.logger.info(
            f"Content source set for context extraction (format: {content_format})"
        )

    def update_context_config(self, **context_kwargs):
        """Update context extraction configuration

        Args:
            **context_kwargs: Context configuration parameters to update
                (context_window, context_mode, max_context_tokens, etc.)
        """
        # Update the main config
        for key, value in context_kwargs.items():
            if hasattr(self.config, key):
                setattr(self.config, key, value)
                self.logger.debug(f"Updated context config: {key} = {value}")
            else:
                self.logger.warning(f"Unknown context config parameter: {key}")

        # Recreate context extractor with new config if processors are initialized
        if self.lightrag and self.modal_processors:
            try:
                self.context_extractor = self._create_context_extractor()
                # Update all processors with new context extractor
                for processor_name, processor in self.modal_processors.items():
                    processor.context_extractor = self.context_extractor

                self.logger.info(
                    "Context configuration updated and applied to all processors"
                )
                self.logger.info(
                    f"New context configuration: {self._create_context_config()}"
                )
            except Exception as e:
                self.logger.error(f"Failed to update context configuration: {e}")

    def get_processor_info(self) -> Dict[str, Any]:
        """Get processor information"""
        base_info = {
            "mineru_installed": MineruParser.check_installation(MineruParser()),
            "config": self.get_config_info(),
            "models": {
                "llm_model": "External function"
                if self.llm_model_func
                else "Not provided",
                "vision_model": "External function"
                if self.vision_model_func
                else "Not provided",
                "embedding_model": "External function"
                if self.embedding_func
                else "Not provided",
            },
        }

        if not self.modal_processors:
            base_info["status"] = "Not initialized"
            base_info["processors"] = {}
        else:
            base_info["status"] = "Initialized"
            base_info["processors"] = {}

            for proc_type, processor in self.modal_processors.items():
                base_info["processors"][proc_type] = {
                    "class": processor.__class__.__name__,
                    "supports": get_processor_supports(proc_type),
                    "enabled": True,
                }

        return base_info



================================================
FILE: raganything/utils.py
================================================
"""
Utility functions for RAGAnything

Contains helper functions for content separation, text insertion, and other utilities
"""

import base64
from typing import Dict, List, Any, Tuple
from pathlib import Path
from lightrag.utils import logger


def separate_content(
    content_list: List[Dict[str, Any]],
) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Separate text content and multimodal content

    Args:
        content_list: Content list from MinerU parsing

    Returns:
        (text_content, multimodal_items): Pure text content and multimodal items list
    """
    text_parts = []
    multimodal_items = []

    for item in content_list:
        content_type = item.get("type", "text")

        if content_type == "text":
            # Text content
            text = item.get("text", "")
            if text.strip():
                text_parts.append(text)
        else:
            # Multimodal content (image, table, equation, etc.)
            multimodal_items.append(item)

    # Merge all text content
    text_content = "\n\n".join(text_parts)

    logger.info("Content separation complete:")
    logger.info(f"  - Text content length: {len(text_content)} characters")
    logger.info(f"  - Multimodal items count: {len(multimodal_items)}")

    # Count multimodal types
    modal_types = {}
    for item in multimodal_items:
        modal_type = item.get("type", "unknown")
        modal_types[modal_type] = modal_types.get(modal_type, 0) + 1

    if modal_types:
        logger.info(f"  - Multimodal type distribution: {modal_types}")

    return text_content, multimodal_items


def encode_image_to_base64(image_path: str) -> str:
    """
    Encode image file to base64 string

    Args:
        image_path: Path to the image file

    Returns:
        str: Base64 encoded string, empty string if encoding fails
    """
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
        return encoded_string
    except Exception as e:
        logger.error(f"Failed to encode image {image_path}: {e}")
        return ""


def validate_image_file(image_path: str, max_size_mb: int = 50) -> bool:
    """
    Validate if a file is a valid image file

    Args:
        image_path: Path to the image file
        max_size_mb: Maximum file size in MB

    Returns:
        bool: True if valid, False otherwise
    """
    try:
        path = Path(image_path)

        logger.debug(f"Validating image path: {image_path}")
        logger.debug(f"Resolved path object: {path}")
        logger.debug(f"Path exists check: {path.exists()}")

        # Check if file exists
        if not path.exists():
            logger.warning(f"Image file not found: {image_path}")
            return False

        # Check file extension
        image_extensions = [
            ".jpg",
            ".jpeg",
            ".png",
            ".gif",
            ".bmp",
            ".webp",
            ".tiff",
            ".tif",
        ]

        path_lower = str(path).lower()
        has_valid_extension = any(path_lower.endswith(ext) for ext in image_extensions)
        logger.debug(
            f"File extension check - path: {path_lower}, valid: {has_valid_extension}"
        )

        if not has_valid_extension:
            logger.warning(f"File does not appear to be an image: {image_path}")
            return False

        # Check file size
        file_size = path.stat().st_size
        max_size = max_size_mb * 1024 * 1024
        logger.debug(
            f"File size check - size: {file_size} bytes, max: {max_size} bytes"
        )

        if file_size > max_size:
            logger.warning(f"Image file too large ({file_size} bytes): {image_path}")
            return False

        logger.debug(f"Image validation successful: {image_path}")
        return True

    except Exception as e:
        logger.error(f"Error validating image file {image_path}: {e}")
        return False


async def insert_text_content(
    lightrag,
    input: str | list[str],
    split_by_character: str | None = None,
    split_by_character_only: bool = False,
    ids: str | list[str] | None = None,
    file_paths: str | list[str] | None = None,
):
    """
    Insert pure text content into LightRAG

    Args:
        lightrag: LightRAG instance
        input: Single document string or list of document strings
        split_by_character: if split_by_character is not None, split the string by character, if chunk longer than
        chunk_token_size, it will be split again by token size.
        split_by_character_only: if split_by_character_only is True, split the string by character only, when
        split_by_character is None, this parameter is ignored.
        ids: single string of the document ID or list of unique document IDs, if not provided, MD5 hash IDs will be generated
        file_paths: single string of the file path or list of file paths, used for citation
    """
    logger.info("Starting text content insertion into LightRAG...")

    # Use LightRAG's insert method with all parameters
    await lightrag.ainsert(
        input=input,
        file_paths=file_paths,
        split_by_character=split_by_character,
        split_by_character_only=split_by_character_only,
        ids=ids,
    )

    logger.info("Text content insertion complete")


def get_processor_for_type(modal_processors: Dict[str, Any], content_type: str):
    """
    Get appropriate processor based on content type

    Args:
        modal_processors: Dictionary of available processors
        content_type: Content type

    Returns:
        Corresponding processor instance
    """
    # Direct mapping to corresponding processor
    if content_type == "image":
        return modal_processors.get("image")
    elif content_type == "table":
        return modal_processors.get("table")
    elif content_type == "equation":
        return modal_processors.get("equation")
    else:
        # For other types, use generic processor
        return modal_processors.get("generic")


def get_processor_supports(proc_type: str) -> List[str]:
    """Get processor supported features"""
    supports_map = {
        "image": [
            "Image content analysis",
            "Visual understanding",
            "Image description generation",
            "Image entity extraction",
        ],
        "table": [
            "Table structure analysis",
            "Data statistics",
            "Trend identification",
            "Table entity extraction",
        ],
        "equation": [
            "Mathematical formula parsing",
            "Variable identification",
            "Formula meaning explanation",
            "Formula entity extraction",
        ],
        "generic": [
            "General content analysis",
            "Structured processing",
            "Entity extraction",
        ],
    }
    return supports_map.get(proc_type, ["Basic processing"])



================================================
FILE: .github/dependabot.yml
================================================
# To get started with Dependabot version updates, you'll need to specify which
# package ecosystems to update and where the package manifests are located.
# Please see the documentation for all configuration options:
# https://docs.github.com/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file

version: 2
updates:
  - package-ecosystem: "pip" # See documentation for possible values
    directory: "/" # Location of package manifests
    schedule:
      interval: "weekly"



================================================
FILE: .github/pull_request_template.md
================================================
<!--
Thanks for contributing to RAGAnything!

Please ensure your pull request is ready for review before submitting.

About this template

This template helps contributors provide a clear and concise description of their changes. Feel free to adjust it as needed.
-->

## Description

[Briefly describe the changes made in this pull request.]

## Related Issues

[Reference any related issues or tasks addressed by this pull request.]

## Changes Made

[List the specific changes made in this pull request.]

## Checklist

- [ ] Changes tested locally
- [ ] Code reviewed
- [ ] Documentation updated (if necessary)
- [ ] Unit tests added (if applicable)

## Additional Notes

[Add any additional notes or context for the reviewer(s).]



================================================
FILE: .github/ISSUE_TEMPLATE/bug_report.yml
================================================
name: Bug Report
description: File a bug report
title: "[Bug]:"
labels: ["bug", "triage"]

body:
  - type: checkboxes
    id: existingcheck
    attributes:
      label: Do you need to file an issue?
      description: Please help us manage our time by avoiding duplicates and common bugs with the steps below.
      options:
        - label: I have searched the existing issues and this bug is not already filed.
        - label: I believe this is a legitimate bug, not just a question or feature request.
  - type: textarea
    id: description
    attributes:
      label: Describe the bug
      description: A clear and concise description of what the bug is.
      placeholder: What went wrong?
  - type: textarea
    id: reproduce
    attributes:
      label: Steps to reproduce
      description: Steps to reproduce the behavior.
      placeholder: How can we replicate the issue?
  - type: textarea
    id: expected_behavior
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen.
      placeholder: What should have happened?
  - type: textarea
    id: configused
    attributes:
      label: LightRAG Config Used
      description: The LightRAG configuration used for the run.
      placeholder: The settings content or LightRAG configuration
      value: |
        # Paste your config here
  - type: textarea
    id: screenshotslogs
    attributes:
      label: Logs and screenshots
      description: If applicable, add screenshots and logs to help explain your problem.
      placeholder: Add logs and screenshots here
  - type: textarea
    id: additional_information
    attributes:
      label: Additional Information
      description: |
        - LightRAG Version: e.g., v0.1.1
        - Operating System: e.g., Windows 10, Ubuntu 20.04
        - Python Version: e.g., 3.8
        - Related Issues: e.g., #1
        - Any other relevant information.
      value: |
        - LightRAG Version:
        - Operating System:
        - Python Version:
        - Related Issues:



================================================
FILE: .github/ISSUE_TEMPLATE/config.yml
================================================
blank_issues_enabled: false



================================================
FILE: .github/ISSUE_TEMPLATE/feature_request.yml
================================================
name: Feature Request
description: File a feature request
labels: ["enhancement"]
title: "[Feature Request]:"

body:
  - type: checkboxes
    id: existingcheck
    attributes:
      label: Do you need to file a feature request?
      description: Please help us manage our time by avoiding duplicates and common feature request with the steps below.
      options:
        - label: I have searched the existing feature request and this feature request is not already filed.
        - label: I believe this is a legitimate feature request, not just a question or bug.
  - type: textarea
    id: feature_request_description
    attributes:
      label: Feature Request Description
      description: A clear and concise description of the feature request you would like.
      placeholder: What this feature request add more or improve?
  - type: textarea
    id: additional_context
    attributes:
      label: Additional Context
      description: Add any other context or screenshots about the feature request here.
      placeholder: Any additional information



================================================
FILE: .github/ISSUE_TEMPLATE/question.yml
================================================
name: Question
description: Ask a general question
labels: ["question"]
title: "[Question]:"

body:
  - type: checkboxes
    id: existingcheck
    attributes:
      label: Do you need to ask a question?
      description: Please help us manage our time by avoiding duplicates and common questions with the steps below.
      options:
        - label: I have searched the existing question and discussions and this question is not already answered.
        - label: I believe this is a legitimate question, not just a bug or feature request.
  - type: textarea
    id: question
    attributes:
      label: Your Question
      description: A clear and concise description of your question.
      placeholder: What is your question?
  - type: textarea
    id: context
    attributes:
      label: Additional Context
      description: Provide any additional context or details that might help us understand your question better.
      placeholder: Add any relevant information here



================================================
FILE: .github/workflows/linting.yaml
================================================
name: Linting and Formatting

on:
    push:
        branches:
            - main
    pull_request:
        branches:
            - main

jobs:
    lint-and-format:
        runs-on: ubuntu-latest

        steps:
            - name: Checkout code
              uses: actions/checkout@v2

            - name: Set up Python
              uses: actions/setup-python@v2
              with:
                python-version: '3.x'

            - name: Install dependencies
              run: |
                python -m pip install --upgrade pip
                pip install pre-commit

            - name: Run pre-commit
              run: pre-commit run --all-files --show-diff-on-failure



================================================
FILE: .github/workflows/pypi-publish.yml
================================================
name: Upload RAGAnything Package

on:
  release:
    types: [published]

permissions:
  contents: read

jobs:
  release-build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.x"

      - name: Build release distributions
        run: |
          python -m pip install build
          python -m build

      - name: Upload distributions
        uses: actions/upload-artifact@v4
        with:
          name: release-dists
          path: dist/

  pypi-publish:
    runs-on: ubuntu-latest
    needs:
      - release-build
    permissions:
      id-token: write

    environment:
      name: pypi

    steps:
      - name: Retrieve release distributions
        uses: actions/download-artifact@v4
        with:
          name: release-dists
          path: dist/

      - name: Publish release distributions to PyPI
        uses: pypa/gh-action-pypi-publish@release/v1
        with:
          packages-dir: dist/


