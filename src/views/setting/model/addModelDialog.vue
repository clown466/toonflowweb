<template>
  <t-dialog v-model:visible="showConfigModal" :header="configModalTitle" :close-on-overlay-click="false" width="520px" :footer="false">
    <t-form :data="modelForm" label-align="left">
      <t-form-item label="模型名称">
        <t-input v-model="modelForm.model" placeholder="请输入模型标识" />
      </t-form-item>
      <t-form-item label="Base URL" v-if="modelForm.manufacturer !== 'runninghub'">
        <t-input v-model="modelForm.baseUrl" :placeholder="props.defaultPlaceHolder" />
      </t-form-item>
      <t-form-item label="API Key">
        <t-input v-model="modelForm.apiKey" type="password" placeholder="请输入 API Key" />
      </t-form-item>
      <t-form-item v-if="currentWebsite">
        <a :href="currentWebsite" target="_blank" rel="noopener noreferrer" style="font-size: 14px; color: #636464; font-weight: 900">
          点击获取 {{ manufacturerNames[modelForm.manufacturer] ?? modelForm.manufacturer }} API Key
        </a>
      </t-form-item>
      <t-form-item style="text-align: right; margin-bottom: 0">
        <t-space>
          <t-button variant="outline" @click="showConfigModal = false">取消</t-button>
          <t-button theme="primary" @click="keep">保存</t-button>
        </t-space>
      </t-form-item>
    </t-form>
  </t-dialog>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import { MessagePlugin } from "tdesign-vue-next";
import { ref, computed } from "vue";

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
}

const props = defineProps({
  currentWebsite: {
    type: String,
    default: "",
  },
  isCustomModel: {
    type: Boolean,
    default: false,
  },
  defaultPlaceHolder: {
    type: String,
    default: "",
  },
  manufacturerNames: {
    type: Object,
    default: {},
  },
});

const emit = defineEmits(["fetchModelList"]);

const showConfigModal = defineModel<boolean>({
  default: false,
});

const modelForm = defineModel<RowData>("modelForm", {
  default: () => ({
    manufacturer: "",
    model: "",
    baseUrl: "",
    apiKey: "",
    id: 0,
    type: "",
    modelType: "",
  }),
});

const configModalTitle = computed(() => {
  if (props.isCustomModel) {
    return "配置自定义模型";
  }
  return `配置 ${modelForm.value.model}`;
});

async function keep() {
  const { type, modelType, model, baseUrl, manufacturer, apiKey, id } = modelForm.value;

  // 验证必填项
  if (!model) {
    MessagePlugin.error("请输入模型标识");
    return;
  }
  if (!apiKey) {
    MessagePlugin.error("请输入 API Key");
    return;
  }
  if (manufacturer == "other" && baseUrl.trim() == "") {
    MessagePlugin.error("请输入 Base URL");
    return;
  }
  if (id == 0) {
    try {
      await axios.post("/setting/addModel", {
        modelType: modelType || "",
        type,
        model,
        baseUrl,
        manufacturer,
        apiKey,
      });
      MessagePlugin.success("新增成功");
      emit("fetchModelList");
    } catch (e) {
      MessagePlugin.error("新增失败");
    }
  } else {
    try {
      await axios.post("/setting/updateModel", {
        id,
        type,
        modelType: modelType || "",
        model,
        baseUrl,
        manufacturer,
        apiKey,
      });
      MessagePlugin.success("编辑成功");
      emit("fetchModelList");
    } catch (e) {
      MessagePlugin.error("编辑失败");
    }
  }

  showConfigModal.value = false; //关闭弹窗
}
</script>

<style lang="scss" scoped></style>
