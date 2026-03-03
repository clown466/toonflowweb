<template>
  <div class="modelData">
    <t-dialog
      v-model:visible="modelDataShow"
      header="模型数据管理"
      width="90%"
      :confirm-btn="null"
      :cancel-btn="null"
      top="1vh"
      class="model-data-modal">
      <div class="data-container">
        <div class="toolbar">
          <div class="toolbar-left">
            <t-button theme="primary" size="large" @click="addModelBtn" class="add-btn">
              <template #icon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </template>
              新增模型
            </t-button>
          </div>
          <div class="toolbar-center">
            <t-input v-model="searchKeyword" placeholder="搜索模型名称..." size="large" clearable class="search-input">
              <template #prefix-icon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#8c8c8c">
                  <path
                    d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
                </svg>
              </template>
            </t-input>
          </div>
          <div class="toolbar-right">
            <t-badge :count="filteredTableData.length" :offset="[8, 0]">
              <div class="model-count">共 {{ filteredTableData.length }} 个模型</div>
            </t-badge>
          </div>
        </div>

        <div class="table-wrapper">
          <t-table
            ref="tableRef"
            :data="filteredTableData"
            :columns="columns"
            row-key="id"
            size="medium"
            class="custom-table"
            @row-click="handleRowClick">
            <template #manufacturer="{ row }">
              <t-tag theme="primary" variant="light" class="manufacturer-tag">{{ row.manufacturer }}</t-tag>
            </template>

            <template #type="{ row }">
              <t-tag v-if="row.type == 'text'" theme="success" variant="light" class="type-tag">📝 文本模型</t-tag>
              <t-tag v-if="row.type == 'image'" theme="warning" variant="light" class="type-tag">🖼️ 图像模型</t-tag>
              <t-tag v-if="row.type == 'video'" theme="danger" variant="light" class="type-tag">🎬 视频模型</t-tag>
            </template>

            <template #model="{ row }">
              <div class="model-name">
                <span class="model-text">{{ row.model }}</span>
              </div>
            </template>

            <template #baseUrl="{ row }">
              <div class="base-url">
                <span class="url-text">{{ row.baseUrl || "默认" }}</span>
              </div>
            </template>

            <template #apiKey="{ row }">
              <div class="api-key-cell">
                <div class="api-key-text">
                  {{ visibleMap[row.id] ? row.apiKey : "••••••••" }}
                </div>
                <t-button variant="text" size="small" class="toggle-btn" @click.stop="setVisible(row.id, !visibleMap[row.id])">
                  <i-preview-open v-if="!visibleMap[row.id]" theme="outline" size="18" fill="#8c8c8c" />
                  <i-preview-close v-else theme="outline" size="18" fill="#0052d9" />
                </t-button>
              </div>
            </template>

            <template #createTime="{ row }">
              <div class="create-time">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="margin-right: 6px">
                  <path
                    d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z" />
                </svg>
                {{ dayjs(row.createTime).format("YYYY-MM-DD HH:mm") }}
              </div>
            </template>

            <template #radio="{ row }">
              <t-radio :checked="selectedRowId === row.id" :disabled="row.type !== currentType" @click.stop="handleRadioChange(row)" />
            </template>

            <template #operation="{ row }">
              <div class="action-buttons">
                <t-tooltip content="测试连接">
                  <t-button theme="primary" size="small" :loading="row.load" @click.stop="testAi(row)" class="action-btn test-btn">
                    <template #icon v-if="!row.load">
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path
                          d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                      </svg>
                    </template>
                    测试
                  </t-button>
                </t-tooltip>
                <t-tooltip content="编辑模型">
                  <t-button variant="outline" size="small" @click.stop="editModelBtn(row)" class="action-btn edit-btn">
                    <template #icon>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path
                          d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                      </svg>
                    </template>
                    编辑
                  </t-button>
                </t-tooltip>
                <t-popconfirm content="确定要删除此模型吗？" theme="default" @confirm="delModelBtn(row)">
                  <t-tooltip content="删除模型">
                    <t-button theme="danger" variant="outline" size="small" class="action-btn delete-btn">
                      <template #icon>
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                          <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
                        </svg>
                      </template>
                      删除
                    </t-button>
                  </t-tooltip>
                </t-popconfirm>
              </div>
            </template>
          </t-table>
        </div>

        <div class="footer-actions">
          <t-space size="medium">
            <t-button size="large" @click="modelDataShow = false">取消</t-button>
            <t-button theme="primary" size="large" @click="confirmConfig" class="confirm-btn">
              <template #icon>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              </template>
              确认配置
            </t-button>
          </t-space>
        </div>
      </div>
    </t-dialog>

    <modeListDialog
      v-model:modelShow="modelShow"
      :typeList="['text', 'image']"
      v-model:modelForm="modelForm"
      :state="state"
      @fetchModelList="fetchModelList" />

    <addModelDialog
      v-model="editDialogVisible"
      v-model:modelForm="editModelForm"
      :currentWebsite="currentWebsite"
      :isCustomModel="false"
      :defaultPlaceHolder="defaultPlaceHolder"
      :manufacturerNames="manufacturerNames"
      @fetchModelList="fetchModelList" />

    <!-- 图像测试结果预览弹窗 -->
    <t-dialog v-model:visible="testImageModalVisible" header="图像生成测试成功" width="80%" top="1vh" class="test-result-modal">
      <template #header>
        <div class="result-modal-header">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#52c41a" style="margin-right: 8px">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>图像生成测试成功</span>
        </div>
      </template>
      <div class="test-result-content">
        <p class="test-result-tip">
          <t-tag theme="success" style="font-size: 14px">✅ 配置正确</t-tag>
          图像模型配置正确,以下是生成的测试图片:
        </p>
        <div class="test-image-wrapper">
          <t-image :src="testImageResult" :lazy="false" fit="contain" class="test-image-preview" />
        </div>
      </div>
    </t-dialog>
    <t-dialog v-model:visible="testVideoVisible" header="视频生成测试成功" width="80%" top="1vh" class="test-result-modal">
      <template #header>
        <div class="result-modal-header">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="#52c41a" style="margin-right: 8px">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
          </svg>
          <span>视频生成测试成功</span>
        </div>
      </template>
      <div class="test-result-content">
        <p class="test-result-tip">
          <t-tag theme="success" style="font-size: 14px">✅ 配置正确</t-tag>
          视频模型配置正确,以下是生成的测试视频:
        </p>
        <div class="test-video-wrapper">
          <video :src="testVideoResult" controls class="test-video-preview" />
        </div>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from "vue";
import dayjs from "dayjs";
import { MessagePlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import modeListDialog from "./modeListDialog.vue";
import addModelDialog from "./addModelDialog.vue";

const modelDataShow = defineModel("modelDataShow", {
  type: Boolean,
  required: true,
});

const props = defineProps({
  currentType: {
    type: String,
    default: "text",
  },
});

interface ModelType {
  id: number;
  model: string;
  name: string;
}

const configingModel = defineModel<ModelType>("configingModel");

interface RowData {
  id: number;
  name: string;
  type: string;
  modelType: string;
  model: string;
  baseUrl: string;
  manufacturer: string;
  createTime: number;
  apiKey: string;
  load?: boolean;
}

const tableRef = ref();
const state = ref("");
const modelShow = ref(false);
const tableData = ref<RowData[]>([]);
const searchKeyword = ref("");
const selectedRowId = ref<number | null>(null);

// 表格列配置
const columns = [
  {
    colKey: "radio",
    title: "选中",
    width: 60,
    align: "center" as const,
  },
  {
    colKey: "manufacturer",
    title: "厂商",
    width: 120,
    align: "center" as const,
  },
  {
    colKey: "type",
    title: "类型",
    width: 120,
    align: "center" as const,
  },
  {
    colKey: "model",
    title: "模型名称",
    width: 280,
  },
  {
    colKey: "baseUrl",
    title: "Base URL",
    minWidth: 200,
  },
  {
    colKey: "apiKey",
    title: "API Key",
    width: 180,
  },
  {
    colKey: "createTime",
    title: "创建时间",
    width: 180,
    align: "center" as const,
  },
  {
    colKey: "operation",
    title: "操作",
    width: 240,
    align: "center" as const,
    fixed: "right" as const,
  },
];

// 根据搜索关键词过滤表格数据
const filteredTableData = computed(() => {
  if (!searchKeyword.value) {
    return tableData.value;
  }
  const keyword = searchKeyword.value.toLowerCase().trim();
  return tableData.value.filter((item) => {
    return item.model.toLowerCase().includes(keyword);
  });
});

// 模型表单数据
const modelForm = ref<RowData>({
  id: 0,
  name: "",
  type: "",
  modelType: "",
  model: "",
  apiKey: "",
  baseUrl: "",
  manufacturer: "",
  createTime: 0,
  load: false,
});

// 新增模型
function addModelBtn() {
  state.value = "新增模型";
  modelForm.value = {
    id: 0,
    name: "",
    type: "",
    modelType: "",
    model: "",
    apiKey: "",
    baseUrl: "",
    manufacturer: "",
    createTime: 0,
  };
  modelShow.value = true;
}

// 处理单选框变化
function handleRadioChange(row: RowData) {
  if (row.type === props.currentType) {
    selectedRowId.value = row.id;
  }
}

// 处理行点击
function handleRowClick({ row }: { row: any }) {
  if (row.type === props.currentType) {
    selectedRowId.value = row.id;
  }
}

const visibleMap = reactive<Record<string | number, boolean>>({});

function setVisible(id: string | number, val: boolean) {
  visibleMap[id] = val;
}

const testImageResult = ref<string>("");
const testImageModalVisible = ref(false);

const testVideoVisible = ref(false);
const testVideoResult = ref<string>("");

// 编辑对话框相关
const editDialogVisible = ref(false);
const editModelForm = ref<RowData>({
  id: 0,
  name: "",
  type: "",
  modelType: "",
  model: "",
  apiKey: "",
  baseUrl: "",
  manufacturer: "",
  createTime: 0,
});

// 网站链接配置
const websites = ref<Record<string, string>>({
  deepSeek: "https://platform.deepseek.com",
  volcengine: "https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey",
  kling: "https://app.klingai.com/cn/dev/api-key",
  zhipu: "https://bigmodel.cn/usercenter/proj-mgmt/apikeys",
  qwen: "https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key",
  wan: "https://bailian.console.aliyun.com/cn-beijing/?tab=model#/api-key",
  openai: "",
  vidu: "https://platform.vidu.cn/api-keys",
  anthropic: "",
  runninghub: "https://www.runninghub.cn/enterprise-api/consumerApi",
  gemini: "https://ai.google.dev/gemini-api/docs/api-key?hl=zh-cn",
});

const currentWebsite = computed(() => {
  return websites.value[editModelForm.value.manufacturer] || "";
});

// 厂商名称映射
const manufacturerNames: Record<string, string> = {
  deepSeek: "DeepSeek",
  volcengine: "火山引擎",
  kling: "可灵",
  zhipu: "智谱",
  qwen: "阿里千问",
  wan: "阿里万相",
  openai: "OpenAI",
  vidu: "Vidu",
  anthropic: "Anthropic",
  runninghub: "RunningHUB",
  gemini: "Gemini",
  other: "其他",
};

// 厂商默认 BaseURL 配置
const manufacturerDefaultBaseUrls: Record<string, Record<string, string>> = {
  deepSeek: {
    text: "https://api.deepseek.com",
  },
  volcengine: {
    text: "https://ark.cn-beijing.volces.com/api/v3",
  },
  kling: {
    image: "https://api.klingai.com",
    video: "https://api.klingai.com",
  },
  zhipu: {
    text: "https://open.bigmodel.cn/api/paas/v4",
    image: "https://open.bigmodel.cn/api/paas/v4",
    video: "https://open.bigmodel.cn/api/paas/v4",
  },
  qwen: {
    text: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  },
  wan: {
    image: "https://dashscope.aliyuncs.com/api/v1/services/aigc/",
  },
  openai: {
    text: "https://api.openai.com/v1",
    image: "https://api.openai.com/v1",
  },
  vidu: {
    video: "https://api.vidu.studio/v1",
  },
  anthropic: {
    text: "https://api.anthropic.com",
  },
  gemini: {
    text: "https://generativelanguage.googleapis.com",
  },
};

// 获取默认 BaseURL 的 placeholder
const defaultPlaceHolder = computed((): string => {
  const { manufacturer, type } = editModelForm.value;
  if (!manufacturer || manufacturer === "runninghub") {
    return "请输入 Base URL";
  }

  if (type && manufacturerDefaultBaseUrls[manufacturer]) {
    const defaultUrl = manufacturerDefaultBaseUrls[manufacturer][type];
    return defaultUrl ? `默认: ${defaultUrl}` : "请输入 Base URL";
  }

  return "请输入 Base URL";
});

async function testAi(row: RowData) {
  const { model, apiKey, baseUrl, manufacturer } = row;

  if (!model) {
    MessagePlugin.warning("请先填写模型名称");
    return;
  }
  if (!apiKey) {
    MessagePlugin.warning("请先填写 API Key");
    return;
  }
  if (!manufacturer) {
    MessagePlugin.warning("请先选择厂商");
    return;
  }
  row.load = true;

  try {
    let queryUrl = "";
    if (row.type == "text") {
      queryUrl = "/other/testAI";
    } else if (row.type == "image") {
      queryUrl = "/other/testImage";
    } else if (row.type == "video") {
      queryUrl = "/other/testVideo";
    }
    if (!queryUrl) {
      row.load = false;
      return MessagePlugin.warning("type 错误");
    }
    const res = await axios.post(queryUrl, {
      modelName: model,
      apiKey: apiKey,
      baseURL: baseUrl || undefined,
      manufacturer,
    });

    if (row.type == "text") {
      MessagePlugin.success("连接成功！模型配置正确");
    }
    if (row.type == "image") {
      MessagePlugin.success("连接成功！图像模型配置正确");
      if (res.data) {
        testImageResult.value = res.data;
        testImageModalVisible.value = true;
      }
    }
    if (row.type == "video") {
      MessagePlugin.success("连接成功！视频模型配置正确");
      if (res.data) {
        testVideoResult.value = res.data;
        testVideoVisible.value = true;
      }
    }
  } catch (e: any) {
    MessagePlugin.error(`连接失败: ${e.message}`);
  } finally {
    row.load = false;
  }
}

// 编辑模型
function editModelBtn(row: RowData) {
  editModelForm.value = { ...row };
  editDialogVisible.value = true;
}

watch(
  () => modelDataShow.value,
  (val) => {
    if (val == true) {
      fetchModelList();
    }
  },
  { deep: true },
);

// 查询模型列表
async function fetchModelList() {
  const res = await axios.post("/setting/getSetting");
  tableData.value = res.data;
}

// 删除模型
function delModelBtn(row: RowData) {
  axios
    .post("/setting/delModel", { id: row.id })
    .then(() => {
      MessagePlugin.success("模型删除成功");
      fetchModelList();
      emit("modelList");
    })
    .catch(() => {
      MessagePlugin.error("模型删除失败");
    });
}

const emit = defineEmits(["modelList"]);

// 确认配置
async function confirmConfig() {
  if (!selectedRowId.value) {
    MessagePlugin.warning("请先选择一个模型");
    return;
  }
  try {
    await axios.post("/setting/configurationModel", {
      id: configingModel.value?.id,
      configId: selectedRowId.value,
    });

    MessagePlugin.success("配置成功");
    selectedRowId.value = null;
    modelDataShow.value = false;
    emit("modelList");
  } catch {
    MessagePlugin.error("配置失败，请重试");
  }
}
</script>

<style lang="scss" scoped>
.modelData {
  :deep(.model-data-modal) {
    .t-dialog__body {
      padding: 24px;
    }
  }
}

.data-container {
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;

  .toolbar-left {
    .add-btn {
      height: 40px;
      padding: 0 24px;
      font-size: 14px;
      font-weight: 500;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 82, 217, 0.2);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 82, 217, 0.3);
      }

      svg {
        margin-right: 6px;
      }
    }
  }

  .toolbar-center {
    flex: 1;
    max-width: 400px;
    margin: 0 24px;

    .search-input {
      width: 100%;
      height: 40px;
      border-radius: 8px;
      transition: all 0.3s ease;

      :deep(.t-input) {
        font-size: 14px;
        border-radius: 8px;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
        transition: all 0.3s ease;

        &:hover {
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        &:focus {
          box-shadow: 0 2px 8px rgba(0, 82, 217, 0.2);
        }
      }
    }
  }

  .toolbar-right {
    .model-count {
      padding: 8px 16px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }
  }
}

.table-wrapper {
  margin-bottom: 20px;
  border-radius: 8px;
  overflow: hidden;

  :deep(.custom-table) {
    font-size: 14px;

    .t-table__header {
      background: linear-gradient(to bottom, #fafafa, #f5f5f5);
      font-weight: 600;
    }

    .t-table__row {
      transition: all 0.2s ease;

      &:hover {
        background: #f0f7ff !important;
      }
    }

    .t-table__cell {
      padding: 12px 8px;
    }
  }

  .manufacturer-tag {
    font-weight: 500;
    border-radius: 6px;
    padding: 4px 12px;
    border: none;
  }

  .type-tag {
    font-weight: 500;
    border-radius: 6px;
    padding: 4px 12px;
    border: none;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .model-name {
    .model-text {
      font-weight: 500;
      font-family: "Consolas", "Monaco", monospace;
    }
  }

  .base-url {
    .url-text {
      font-size: 13px;
      font-family: "Consolas", "Monaco", monospace;
    }
  }

  .api-key-cell {
    display: flex;
    align-items: center;
    gap: 8px;

    .api-key-text {
      flex: 1;
      font-family: "Consolas", "Monaco", monospace;
      font-size: 13px;
    }

    .toggle-btn {
      padding: 4px;
      height: auto;
      transition: all 0.2s ease;

      &:hover {
        background: #f0f0f0;
        border-radius: 4px;
      }
    }
  }

  .create-time {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
  }

  .action-buttons {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;

    .action-btn {
      border-radius: 6px;
      font-weight: 500;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 4px;

      &:hover {
        transform: translateY(-1px);
      }

      &.test-btn {
        box-shadow: 0 2px 4px rgba(0, 82, 217, 0.2);

        &:hover {
          box-shadow: 0 4px 8px rgba(0, 82, 217, 0.3);
        }
      }

      &.edit-btn {
        border-color: #0052d9;

        &:hover {
          background: #e6f2ff;
        }
      }

      &.delete-btn {
        &:hover {
          transform: translateY(-1px);
          box-shadow: 0 2px 6px rgba(227, 77, 89, 0.3);
        }
      }
    }
  }
}

.footer-actions {
  display: flex;
  justify-content: flex-end;
  padding-top: 16px;

  .confirm-btn {
    height: 40px;
    padding: 0 32px;
    font-size: 14px;
    font-weight: 500;
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 82, 217, 0.2);
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 82, 217, 0.3);
    }

    svg {
      margin-right: 6px;
    }
  }
}

.result-modal-header {
  display: flex;
  align-items: center;
  font-size: 16px;
  font-weight: 600;
}

.test-result-content {
  .test-result-tip {
    margin-bottom: 20px;
    padding: 12px 16px;
    background: #f6ffed;
    border-left: 4px solid #52c41a;
    border-radius: 4px;
    font-size: 14px;
    line-height: 1.6;
  }

  .test-image-wrapper,
  .test-video-wrapper {
    display: flex;
    justify-content: center;
    padding: 16px;
    background: #fafafa;
    border-radius: 8px;
    border: 2px dashed #d9d9d9;
  }

  .test-image-preview {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .test-video-preview {
    max-width: 100%;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;

    .toolbar-left,
    .toolbar-right {
      width: 100%;
    }
  }

  .action-buttons {
    flex-direction: column;

    .action-btn {
      width: 100%;
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.data-container {
  animation: fadeIn 0.3s ease;
}
</style>
