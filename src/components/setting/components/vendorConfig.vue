<template>
  <div class="modelServe">
    <!-- 左侧供应商列表 -->
    <div class="modelList">
      <div class="listFooter">
        <t-button block theme="primary" @click="handleAddVendor">
          <template #icon><t-icon name="add" /></template>
          {{ $t("settings.vendor.addVendor") }}
        </t-button>
      </div>
      <div class="listContent" v-loading="loading">
        <t-menu v-model="activeVendorId" theme="light" v-if="vendorList.length > 0">
          <t-menu-item v-for="(item, index) in vendorList" :key="index" :value="item.id" @click="activeVendorId = item.id" style="position: relative">
            <template #icon v-if="isValidBase64(item.icon)">
              <t-avatar size="24px" shape="round" :image="item.icon" />
            </template>
            <span>{{ item.name }}</span>
            <t-switch
              v-model="item.enable"
              :customValue="[1, 0]"
              @click.stop
              @change="(val: any) => onChange(item, val)"
              style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); z-index: 10"></t-switch>
          </t-menu-item>
        </t-menu>

        <t-empty v-else :title="$t('settings.vendor.noVendor')" style="margin-top: 16px"></t-empty>
      </div>
    </div>
    <!-- 右侧配置面板 -->
    <div v-if="currentVendor" class="modelParameter">
      <div class="configuration">
        <t-form :data="currentVendor" labelAlign="top">
          <div class="infoBox ac jb">
            <span class="idBox">#{{ currentVendor.id }}</span>
            <span class="author">@{{ currentVendor.author }}</span>
          </div>
          <t-alert
            v-if="needsUpdate(currentVendor)"
            theme="warning"
            :message="$t('settings.vendor.msg.vendorNeedsUpdate')"
            style="margin-bottom: 12px" />
          <t-form-item name="name" :label="$t('settings.vendor.vendorName')">
            <t-input
              v-model="currentVendor.name"
              :placeholder="$t('settings.vendor.vendorNamePlaceholder')"
              clearable
              :disabled="renamingVendor"
              @blur="handleRenameVendor"
              @keyup.enter="handleRenameVendor">
              <template #prefix-icon>
                <t-icon name="edit-1" />
              </template>
            </t-input>
          </t-form-item>
          <t-form-item>
            <MdPreview v-model="currentVendor.description" :theme="themeSetting.mode" />
          </t-form-item>
          <t-form-item v-for="input in requiredInputs" :key="input.key" :name="input.key">
            <template #label>
              <span class="requiredLabel">
                {{ input.label }}
                <span class="requiredMark">*</span>
                <span class="requiredText">{{ $t("settings.vendor.required") }}</span>
              </span>
            </template>
            <t-select
              v-if="input.type === 'select'"
              v-model="currentVendor.inputValues[input.key]"
              :options="getSelectOptions(input)"
              clearable
              @change="onBlurFn" />
            <t-input v-else v-model="currentVendor.inputValues[input.key]" :type="input.type" clearable @blur="onBlurFn">
              <template #prefix-icon>
                <t-icon :name="getInputIcon(input.type)" />
              </template>
            </t-input>
            <template #help v-if="getInputPlaceholder(input)">
              <span class="inputHelp">{{ getInputPlaceholder(input) }}</span>
            </template>
          </t-form-item>

          <div v-if="optionalInputs.length > 0" class="optionalSection">
            <t-collapse>
              <t-collapse-panel value="optional-inputs" :header="$t('settings.vendor.optionalSection')">
                <t-form-item v-for="input in optionalInputs" :key="input.key" :name="input.key" :label="input.label">
                  <t-select
                    v-if="input.type === 'select'"
                    v-model="currentVendor.inputValues[input.key]"
                    :options="getSelectOptions(input)"
                    clearable
                    @change="onBlurFn" />
                  <t-input v-else v-model="currentVendor.inputValues[input.key]" :type="input.type" clearable @blur="onBlurFn">
                    <template #prefix-icon>
                      <t-icon :name="getInputIcon(input.type)" />
                    </template>
                  </t-input>
                  <template #help v-if="getInputPlaceholder(input)">
                    <span class="inputHelp">{{ getInputPlaceholder(input) }}</span>
                  </template>
                </t-form-item>
              </t-collapse-panel>
            </t-collapse>
          </div>

          <div class="jb ac">
            <h4 class="sectionTitle">{{ $t("settings.vendor.modelSettings") }}</h4>
            <t-button variant="outline" size="small" @click="handleAddModel">
              <template #icon><i-plus theme="outline" /></template>
              {{ $t("settings.vendor.addManually") }}
            </t-button>
          </div>
          <t-card v-for="(item, index) in vendorModels" :key="index" class="modelCard">
            <div class="topInfo jb ac">
              <div class="modelCardNameWrap">
                <t-avatar v-if="getModelLogo(item.modelName)" size="24px" shape="round" :image="getModelLogo(item.modelName)!" />
                <span class="modelCardName">{{ item.name }}</span>
              </div>
              <div class="actionBtns">
                <t-button size="small" variant="text" @click="handleTestModel(item)">
                  <template #icon><i-lightning theme="outline" /></template>
                  {{ $t("settings.vendor.testModel") }}
                </t-button>
                <t-button variant="text" size="small" @click="handleEditModel(item)">
                  <template #icon><i-pencil theme="outline" /></template>
                  {{ $t("settings.vendor.edit") }}
                </t-button>
                <t-button variant="text" size="small" theme="danger" @click="handleDeleteModel(item.modelName)">
                  <template #icon><i-delete theme="outline" /></template>
                  {{ $t("settings.vendor.delete") }}
                </t-button>
              </div>
            </div>
            <div class="tags">
              <t-tag theme="primary">{{ $t(getTypeLabel(item.type)) }}</t-tag>
              <t-tag v-if="item.type === 'text' && (item as any).think" variant="light">{{ $t("settings.vendor.think") }}</t-tag>
              <template v-for="(mode, mIdx) in (item as any).mode" :key="mIdx">
                <t-tag v-if="!Array.isArray(mode)" variant="light">{{ getModeLabel(mode, item.type) }}</t-tag>
                <t-tag v-else variant="light" v-for="(m, mmIdx) in mode" :key="mmIdx">
                  {{ getModeLabel(m, item.type) }}
                </t-tag>
              </template>
            </div>
          </t-card>
        </t-form>
        <div class="updateAction">
          <t-button theme="danger" :loading="updating" @click="handleDeleteVendor">{{ $t("settings.vendor.deleteVendor") }}</t-button>
          <t-button theme="default" :loading="updating" @click="handleEditVendorCode">{{ $t("settings.vendor.editCode") }}</t-button>
          <!-- <t-button theme="primary" :loading="updating" @click="handleUpdateVendor">{{ $t("settings.vendor.updateConfig") }}</t-button> -->
        </div>
      </div>
    </div>

    <!-- 添加模型弹窗 -->
    <t-dialog
      placement="center"
      width="40vw"
      v-model:visible="modelDialogVisible"
      :header="editingModelIndex === null ? $t('settings.vendor.addModel') : $t('settings.vendor.editModel')"
      :maskClosable="false"
      @confirm="handleConfirmModel">
      <div class="addBox">
        <t-form :data="modelFormData" labelAlign="top">
          <t-form-item name="name" :label="$t('settings.vendor.displayName')">
            <t-input v-model="modelFormData.name" :placeholder="$t('settings.vendor.displayNamePlaceholder')" clearable />
          </t-form-item>

          <t-form-item name="modelName" :label="$t('settings.vendor.modelId')">
            <t-input v-model="modelFormData.modelName" :placeholder="$t('settings.vendor.modelIdPlaceholder')" clearable />
          </t-form-item>

          <t-form-item name="type" :label="$t('settings.vendor.modelType')">
            <t-select v-model="modelFormData.type">
              <t-option v-for="item in modelTypeOptions" :key="item.value" :value="item.value">{{ $t(item.label) }}</t-option>
            </t-select>
          </t-form-item>
          <template v-if="modelFormData.type === 'text'">
            <t-form-item name="think" :label="$t('settings.vendor.think')">
              <t-radio-group v-model="modelFormData.think">
                <t-radio :value="true">{{ $t("settings.vendor.supported") }}</t-radio>
                <t-radio :value="false">{{ $t("settings.vendor.notSupported") }}</t-radio>
              </t-radio-group>
            </t-form-item>
          </template>

          <template v-if="modelFormData.type === 'image'">
            <t-form-item name="mode" :label="$t('settings.vendor.imageMode')">
              <t-checkbox-group v-model="modelFormData.mode">
                <t-checkbox v-for="opt in imageModeOptions" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</t-checkbox>
              </t-checkbox-group>
            </t-form-item>
          </template>

          <template v-if="modelFormData.type === 'video'">
            <t-form-item name="mode" :label="$t('settings.vendor.videoMode')">
              <div style="display: flex; flex-direction: column; align-items: flex-start; gap: 0">
                <t-checkbox-group v-model="modelFormData.mode">
                  <t-checkbox v-for="opt in videoModeOptions" :key="opt.value" :value="opt.value">{{ $t(opt.label) }}</t-checkbox>
                </t-checkbox-group>
                <div
                  v-if="modelFormData.mode.includes('multiReference')"
                  style="border: 1px solid #ddd; border-radius: 6px; padding: 6px 12px; margin-top: 6px">
                  <t-checkbox-group
                    v-model="modelFormData.mixedMode"
                    style="display: flex; flex-direction: row; gap: 8px; flex-wrap: wrap; align-items: center">
                    <template v-for="opt in referenceOptions" :key="opt.value">
                      <t-checkbox :value="opt.value">{{ $t(opt.label) }}</t-checkbox>
                      <t-input-number
                        v-if="modelFormData.mixedMode.includes(opt.value)"
                        v-model="modelFormData.mixedModeCount[opt.value]"
                        :min="1"
                        :max="99"
                        size="small"
                        style="width: 80px"
                        :placeholder="$t('settings.vendor.count')" />
                    </template>
                  </t-checkbox-group>
                </div>
              </div>
            </t-form-item>
            <t-form-item name="audio" :label="$t('settings.vendor.audioOutput')">
              <t-radio-group v-model="modelFormData.audio">
                <t-radio v-for="item in audioOptions" :key="String(item.value)" :value="item.value">{{ $t(item.label) }}</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item name="durationResolutionMap" :label="$t('settings.vendor.durationResolution')">
              <div class="drmEditor">
                <div class="drmHeader">
                  <div class="drmHeaderIndex"></div>
                  <div class="drmHeaderLabel">{{ $t("settings.vendor.durationSec") }}</div>
                  <div class="drmHeaderArrow"></div>
                  <div class="drmHeaderLabel">{{ $t("settings.vendor.resolution") }}</div>
                  <div class="drmHeaderAction"></div>
                </div>
                <div v-for="(row, rowIndex) in modelFormData.durationResolutionMap" :key="rowIndex" class="drmRow">
                  <div class="drmRowIndex">{{ rowIndex + 1 }}</div>
                  <t-tag-input v-model="row.duration" :placeholder="$t('settings.vendor.enterAndPress')" class="drmInput" />
                  <div class="drmArrow">→</div>
                  <t-tag-input v-model="row.resolution" :placeholder="$t('settings.vendor.enterAndPress')" class="drmInput" />
                  <t-button
                    variant="text"
                    theme="danger"
                    size="small"
                    :disabled="modelFormData.durationResolutionMap.length === 1"
                    @click="modelFormData.durationResolutionMap.splice(rowIndex, 1)">
                    <template #icon><i-delete theme="outline" /></template>
                  </t-button>
                </div>
                <t-button
                  style="margin-top: 16px"
                  variant="dashed"
                  block
                  @click="modelFormData.durationResolutionMap.push({ duration: [], resolution: [] })">
                  <template #icon><i-plus theme="outline" /></template>
                  {{ $t("settings.vendor.addDurationResolution") }}
                </t-button>
              </div>
            </t-form-item>
          </template>
        </t-form>
      </div>
    </t-dialog>

    <!-- 文本模型测试弹窗 -->
    <TextModelTest
      v-if="testingModel?.type === 'text' && textTestVisible"
      v-model:modelVisible="textTestVisible"
      :vendorId="currentVendor!.id"
      :modelName="testingModel.modelName" />

    <!-- 图像模型测试弹窗 -->
    <ImageModelTest
      v-if="testingModel?.type === 'image' && imageTestVisible"
      v-model:modelVisible="imageTestVisible"
      :vendorId="currentVendor!.id"
      :modelName="testingModel.modelName"
      :supportedModes="(testingModel as any).mode || []" />

    <!-- 视频模型测试弹窗 -->
    <VideoModelTest
      v-if="testingModel?.type === 'video' && videoTestVisible"
      v-model:modelVisible="videoTestVisible"
      :vendorId="currentVendor!.id"
      :modelName="testingModel.modelName"
      :rawModes="(testingModel as any).mode || []" />

    <!-- 添加供应商弹窗 -->
    <t-dialog
      width="56vw"
      placement="center"
      top="10vh"
      :footer="false"
      v-model:visible="vendorDialogVisible"
      :header="$t('settings.vendor.addVendorDialog')"
      :maskClosable="false">
      <div class="data">
        <t-radio-group variant="default-filled" v-model="addMode">
          <t-radio-button value="quickAdd">快速添加</t-radio-button>
          <t-radio-button value="importAdd">通过文件导入</t-radio-button>
          <t-radio-button value="linkAdd">通过链接添加</t-radio-button>
          <t-radio-button value="codeAdd">通过代码添加</t-radio-button>
        </t-radio-group>
        <div class="quickAdd" v-if="addMode == 'quickAdd'">
          <t-alert theme="info" style="margin-bottom: 16px">
            选择接口类型后填写基础信息即可创建供应商。添加后仍可在右侧继续修改 API Key、Base URL 和模型列表。
          </t-alert>
          <t-form :data="quickVendorForm" labelAlign="top">
            <div class="quickGrid">
              <t-form-item label="接口类型">
                <t-select v-model="quickVendorForm.providerType">
                  <t-option value="openaiCompatible">OpenAI 兼容接口</t-option>
                  <t-option value="volcengineArk">火山引擎 Ark 接口</t-option>
                </t-select>
              </t-form-item>
              <t-form-item label="供应商名称">
                <t-input v-model="quickVendorForm.name" placeholder="例如：我的中转站 / 火山引擎" clearable />
              </t-form-item>
              <t-form-item label="供应商 ID">
                <t-input
                  v-model="quickVendorForm.vendorId"
                  placeholder="英文、数字、下划线或短横线，例如 my_openai"
                  clearable
                  @blur="quickVendorForm.vendorId = normalizeQuickVendorId(quickVendorForm.vendorId)" />
              </t-form-item>
              <t-form-item label="请求地址">
                <t-input v-model="quickVendorForm.baseUrl" placeholder="例如：https://api.openai.com/v1" clearable />
              </t-form-item>
            </div>
            <t-form-item label="API Key">
              <t-input v-model="quickVendorForm.apiKey" type="password" placeholder="可先留空，添加后在右侧配置中填写" clearable />
            </t-form-item>
            <div class="quickGrid">
              <t-form-item label="文本模型">
                <t-textarea v-model="quickVendorForm.textModels" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="一行一个：显示名=模型ID；只填模型ID也可以" />
              </t-form-item>
              <t-form-item label="图片模型">
                <t-textarea v-model="quickVendorForm.imageModels" :autosize="{ minRows: 2, maxRows: 4 }" placeholder="一行一个：显示名=模型ID；不需要图片模型可留空" />
              </t-form-item>
            </div>
            <t-form-item v-if="quickVendorForm.providerType === 'volcengineArk'" label="视频模型">
              <t-textarea
                v-model="quickVendorForm.videoModels"
                :autosize="{ minRows: 2, maxRows: 4 }"
                placeholder="一行一个：显示名=模型ID；不需要视频模型可留空" />
            </t-form-item>
            <t-form-item v-if="quickVendorForm.providerType === 'openaiCompatible'" label="图片参考图传输方式">
              <t-radio-group v-model="quickVendorForm.imageReferenceTransport">
                <t-radio value="multipart">文件上传 multipart</t-radio>
                <t-radio value="publicUrlJson">公开 URL JSON</t-radio>
                <t-radio value="publicUrlForm">公开 URL 表单</t-radio>
              </t-radio-group>
            </t-form-item>
            <t-form-item v-if="quickVendorForm.providerType === 'openaiCompatible'" label="GPT Image 质量">
              <t-select v-model="quickVendorForm.imageQuality">
                <t-option value="default">默认/不传</t-option>
                <t-option value="auto">自动 auto</t-option>
                <t-option value="low">低 low</t-option>
                <t-option value="medium">中 medium</t-option>
                <t-option value="high">高 high</t-option>
              </t-select>
            </t-form-item>
          </t-form>
          <div class="quickActions">
            <t-button variant="outline" @click="handlePreviewQuickVendor">
              <template #icon><t-icon name="code" /></template>
              预览代码
            </t-button>
            <t-button theme="primary" @click="handleQuickAddVendor">
              <template #icon><t-icon name="add" /></template>
              添加供应商
            </t-button>
          </div>
        </div>
        <div class="linkAdd" v-if="addMode == 'linkAdd'">
          <t-alert theme="warning" style="margin-bottom: 20px">
            请填写 TypeScript 代码文件的链接（.ts 文件），不要填 API 地址或其他无关链接。 确认后 Toonflow 会自动加载该代码，请确保链接来源可信。
          </t-alert>
          <t-input v-model="link" :placeholder="$t('settings.vendor.linkAddPlaceholder')"></t-input>
          <div style="margin-top: 10px; text-align: right; width: 100%">
            <t-button :loading="linkReading" :disabled="!link.trim()" @click="linkRead">{{ $t("settings.vendor.linkAdd") }}</t-button>
          </div>
        </div>
        <div class="importAdd" v-if="addMode == 'importAdd'">
          <div class="uploadArea" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
            <t-upload
              ref="uploadRef"
              v-model="fileList"
              theme="file"
              :multiple="false"
              :max="1"
              accept=".ts"
              :before-upload="handleBeforeUpload"
              :request-method="requestMethod"
              style="display: none" />
            <div class="dragIcon">
              <i-upload-one theme="outline" size="32" fill="var(--td-brand-color)" />
            </div>
            <p class="uploadText">{{ $t("workbench.novel.import.importAdd") }}</p>
            <p class="uploadHint">{{ $t("workbench.novel.import.limit") }}</p>
          </div>
        </div>
        <div class="codeAdd" v-if="addMode == 'codeAdd'"></div>
      </div>
    </t-dialog>
    <t-dialog
      width="70vw"
      placement="center"
      top="10vh"
      v-model:visible="codeDialogVisible"
      :header="$t('settings.vendor.code')"
      :maskClosable="false"
      @confirm="handleConfirmVendor">
      <div class="editorToolbar">
        <div class="editorInfo">
          <t-icon name="info-circle" size="16px" />
          <span>{{ $t("settings.vendor.codeEditorInfo") }}</span>
        </div>
        <div class="editorActions">
          <t-button variant="text" size="small" @click="vendorCode = VENDOR_CODE_TEMPLATE">
            <template #icon><t-icon name="rollback" /></template>
            {{ $t("settings.vendor.reset") }}
          </t-button>
          <t-button variant="outline" size="small" @click="fileInputRef?.click()">
            <template #icon><t-icon name="upload" /></template>
            {{ $t("settings.vendor.importFile") }}
          </t-button>
          <input ref="fileInputRef" type="file" accept=".ts,.js,.txt,.json" style="display: none" @change="handleFileChange" />
        </div>
      </div>
      <div class="editorWrapper">
        <CodeEditor v-model:value="vendorCode" language="typescript" theme="vs-dark" :height="600" :options="editorOptions" />
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import { MdPreview } from "md-editor-v3";
import { CodeEditor } from "monaco-editor-vue3";
import { DialogPlugin } from "tdesign-vue-next";
import axios from "@/utils/axios";
import VENDOR_CODE_TEMPLATE from "@/lib/vendorTemplate.ts?raw";
import { providersLogo, modelProviderRules } from "@/utils/providersLogo";
import type { UploadFile } from "tdesign-vue-next";
import { LoadingPlugin } from "tdesign-vue-next";
import settingStore from "@/stores/setting";
import TextModelTest from "./vendorTest/TextModelTest.vue";
import ImageModelTest from "./vendorTest/ImageModelTest.vue";
import VideoModelTest from "./vendorTest/VideoModelTest.vue";
const { themeSetting } = storeToRefs(settingStore());

// ── 类型 ──
interface TextModel {
  name: string;
  modelName: string;
  type: "text";
  think: boolean;
}

interface ImageModel {
  name: string;
  modelName: string;
  type: "image";
  mode: ("text" | "singleImage" | "multiReference")[];
}

interface VideoModel {
  name: string;
  modelName: string;
  type: "video";
  mode: (
    | "singleImage"
    | "startEndRequired"
    | "endFrameOptional"
    | "startFrameOptional"
    | "text"
    | (`videoReference:${number}` | `imageReference:${number}` | `audioReference:${number}`)[]
  )[];
  audio: "optional" | false | true;
  durationResolutionMap: { duration: number[]; resolution: string[] }[];
}

type VendorModel = TextModel | ImageModel | VideoModel;

interface VendorInput {
  key: string;
  label: string;
  type: "text" | "password" | "url" | "select";
  required: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

interface VendorItem {
  id: string; //供应商唯一标识，必须全局唯一
  author: string;
  description?: string; //md5格式
  name: string;
  icon?: string; //仅支持base64格式
  code: string;
  inputs: VendorInput[];
  inputValues: Record<string, string>;
  enabled?: boolean;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  model?: VendorModel[];
  models?: VendorModel[];
  enable: number; //1启用 0禁用
  version?: string;
}

// ── 常量 ──
const TYPE_LABEL_MAP: Record<string, string> = {
  text: "settings.vendor.textModel",
  image: "settings.vendor.imageModel",
  video: "settings.vendor.videoModel",
};

const MODE_LABEL_MAP: Record<string, string> = {
  singleImage: "settings.vendor.singleImage",
  multiReference: "settings.vendor.multiReference",
  startEndRequired: "settings.vendor.startEndRequired",
  endFrameOptional: "settings.vendor.endFrameOptional",
  startFrameOptional: "settings.vendor.startFrameOptional",
  audioReference: "settings.vendor.audioRef",
  videoReference: "settings.vendor.videoRef",
  imageReference: "settings.vendor.imageRef",
};

function getTypeLabel(type: string) {
  return TYPE_LABEL_MAP[type] || type;
}

function getModeLabel(mode: string, type: string) {
  if (mode === "text") return $t(type === "image" ? "settings.vendor.textToImage" : "settings.vendor.textToVideo");
  // Handle reference:number format like "videoReference:2"
  const refMatch = String(mode).match(/^(videoReference|imageReference|audioReference):(\d+)$/);
  if (refMatch) {
    const label = MODE_LABEL_MAP[refMatch[1]];
    return label ? `${$t(label)} ×${refMatch[2]}` : mode;
  }
  return MODE_LABEL_MAP[mode] ? $t(MODE_LABEL_MAP[mode]) : mode;
}

const editorOptions = {
  fontSize: 14,
  automaticLayout: true,
  tabSize: 2,
  scrollBeyondLastLine: false,
  formatOnPaste: true,
  formatOnType: true,
};

const modelTypeOptions = [
  { value: "text", label: "settings.vendor.textModel" },
  { value: "image", label: "settings.vendor.imageModel" },
  { value: "video", label: "settings.vendor.videoModel" },
];

const imageModeOptions = [
  { label: "settings.vendor.textToImage", value: "text" },
  { label: "settings.vendor.singleImage", value: "singleImage" },
  { label: "settings.vendor.multiReference", value: "multiReference" },
];

const videoModeOptions = [
  { label: "settings.vendor.singleImage", value: "singleImage" },
  { label: "settings.vendor.startEndRequired", value: "startEndRequired" },
  { label: "settings.vendor.endFrameOptional", value: "endFrameOptional" },
  { label: "settings.vendor.startFrameOptional", value: "startFrameOptional" },
  { label: "settings.vendor.textToVideo", value: "text" },
  { label: "settings.vendor.multiReferenceMode", value: "multiReference" },
];
const referenceOptions = [
  { label: "settings.vendor.videoRef", value: "videoReference" },
  { label: "settings.vendor.imageRef", value: "imageReference" },
  { label: "settings.vendor.audioRef", value: "audioReference" },
];

const audioOptions: { label: string; value: "optional" | false | true }[] = [
  { label: "settings.vendor.audioOptional", value: "optional" },
  { label: "settings.vendor.audioOnly", value: true },
  { label: "settings.vendor.noAudio", value: false },
];

type QuickProviderType = "openaiCompatible" | "volcengineArk";

interface QuickVendorDefaults {
  name: string;
  vendorId: string;
  baseUrl: string;
  textModels: string;
  imageModels: string;
  videoModels: string;
}

const quickVendorDefaults: Record<QuickProviderType, QuickVendorDefaults> = {
  openaiCompatible: {
    name: "OpenAI 兼容供应商",
    vendorId: "my_openai",
    baseUrl: "https://api.openai.com/v1",
    textModels: "GPT-4.1=gpt-4.1",
    imageModels: "GPT Image 2=gpt-image-2",
    videoModels: "",
  },
  volcengineArk: {
    name: "火山引擎 Ark",
    vendorId: "my_volcengine",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    textModels: "Doubao Seed 2.0 Pro=doubao-seed-2-0-pro-260215",
    imageModels: "Seedream 5.0=doubao-seedream-5-0-260128",
    videoModels: "Seedance 2.0=doubao-seedance-2-0-260128",
  },
};

const quickVendorForm = ref({
  providerType: "openaiCompatible" as QuickProviderType,
  name: quickVendorDefaults.openaiCompatible.name,
  vendorId: quickVendorDefaults.openaiCompatible.vendorId,
  baseUrl: quickVendorDefaults.openaiCompatible.baseUrl,
  apiKey: "",
  textModels: quickVendorDefaults.openaiCompatible.textModels,
  imageModels: quickVendorDefaults.openaiCompatible.imageModels,
  videoModels: quickVendorDefaults.openaiCompatible.videoModels,
  imageQuality: "default",
  imageReferenceTransport: "multipart",
});

// ── 供应商列表 ──
const vendorList = ref<VendorItem[]>([]);

const loading = ref(false);
async function getVendorList() {
  loading.value = true;
  try {
    const res = await axios.post("/setting/vendorConfig/getVendorList");
    vendorList.value = res.data.map((item: any) => {
      return {
        ...item,
        enable: item.enable,
      };
    });

    if (vendorList.value.length && !vendorList.value.some((v) => v.id === activeVendorId.value)) {
      activeVendorId.value = vendorList.value[0].id;
    }
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.getVendorListFailed")}${err.message}`);
  } finally {
    loading.value = false;
    nextTick(() => {
      lastSavedSnapshot.value = currentVendorSnapshot.value;
      autoSaveReady.value = true;
    });
  }
}

onMounted(() => {
  getVendorList();
});

const activeVendorId = ref<string>();
const currentVendor = computed(() => vendorList.value.find((v) => v.id === activeVendorId.value));
const vendorModels = computed(() => currentVendor.value?.models || currentVendor.value?.model || []);
const requiredInputs = computed(() => currentVendor.value?.inputs?.filter((input) => input.required) || []);
const optionalInputs = computed(() => currentVendor.value?.inputs?.filter((input) => !input.required) || []);

// ── 供应商弹窗 ──
const vendorDialogVisible = ref(false);
const codeDialogVisible = ref(false);
const vendorCode = ref(VENDOR_CODE_TEMPLATE);
const fileInputRef = ref<HTMLInputElement | null>(null);
const updating = ref(false);
const autoUpdating = ref(false);
const renamingVendor = ref(false);
const autoSaveReady = ref(false);
const lastSavedSnapshot = ref("");
const AUTO_SAVE_DELAY = 700;
let autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingAutoSave = false;

// ── 测试弹窗状态 ──
const testingModel = ref<VendorModel | null>(null);
const textTestVisible = ref(false);
const imageTestVisible = ref(false);
const videoTestVisible = ref(false);

function getInputIcon(type: VendorInput["type"]) {
  if (type === "password") return "secured";
  if (type === "url") return "link";
  if (type === "select") return "list";
  return "edit-1";
}

function getInputPlaceholder(input: VendorInput) {
  return input.placeholder?.trim() || "";
}

function getSelectOptions(input: VendorInput) {
  return (input.options ?? []).map((option) => ({
    label: option.label,
    value: option.value,
  }));
}

/**
 * 检查字符串是否是有效的 base64 格式
 */
function isValidBase64(str?: string): boolean {
  if (!str) return false;
  // 检查是否是 base64 数据 URI 或纯 base64 字符串
  const base64Regex = /^(?:data:[^;]+;base64,)?[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str) && str.length > 0;
}

function needsUpdate(vendor: VendorItem): boolean {
  if (!vendor.version) return true;
  const ver = parseFloat(vendor.version);
  return isNaN(ver) || ver < 2.0;
}

function getModelLogo(modelName: string): string | null {
  if (!modelName) return null;
  const rule = modelProviderRules.find((r) => r.pattern.test(modelName));
  return rule ? providersLogo[rule.provider] : null;
}

function buildVendorUpdatePayload(vendor: VendorItem) {
  return {
    id: vendor.id,
    inputValues: vendor.inputValues,
  };
}

const currentVendorSnapshot = computed(() => {
  if (!currentVendor.value) return "";
  return JSON.stringify(buildVendorUpdatePayload(currentVendor.value));
});

function scheduleAutoSave() {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  autoSaveTimer = setTimeout(() => {
    void handleAutoUpdateVendor();
  }, AUTO_SAVE_DELAY);
}

async function handleAutoUpdateVendor() {
  if (!currentVendor.value || !autoSaveReady.value || loading.value) return;

  const snapshot = currentVendorSnapshot.value;
  if (!snapshot || snapshot === lastSavedSnapshot.value) return;

  if (autoUpdating.value) {
    pendingAutoSave = true;
    return;
  }

  autoUpdating.value = true;
  try {
    await axios.post("/setting/vendorConfig/updateVendorInputs", buildVendorUpdatePayload(currentVendor.value));
    lastSavedSnapshot.value = snapshot;
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
  } finally {
    autoUpdating.value = false;
    if (pendingAutoSave) {
      pendingAutoSave = false;
      scheduleAutoSave();
    }
  }
}

async function handleRenameVendor() {
  const vendor = currentVendor.value;
  const nextName = vendor?.name?.trim();
  if (!vendor || !nextName) {
    window.$message.warning($t("settings.vendor.msg.fillDisplayName"));
    getVendorList();
    return;
  }

  renamingVendor.value = true;
  try {
    await axios.post("/setting/vendorConfig/updateVendorName", {
      id: vendor.id,
      name: nextName,
    });
    vendor.name = nextName;
    window.$message.success($t("settings.vendor.msg.vendorNameUpdated"));
    getVendorList();
  } catch (err: any) {
    window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
    getVendorList();
  } finally {
    renamingVendor.value = false;
  }
}

watch(
  currentVendorSnapshot,
  (snapshot) => {
    if (!snapshot || !autoSaveReady.value || loading.value) return;
    if (snapshot === lastSavedSnapshot.value) return;
    scheduleAutoSave();
  },
  { flush: "post" },
);

watch(
  activeVendorId,
  () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
      autoSaveTimer = null;
    }
    pendingAutoSave = false;
    nextTick(() => {
      lastSavedSnapshot.value = currentVendorSnapshot.value;
    });
  },
  { flush: "post" },
);

function normalizeQuickVendorId(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64);
}

function resetQuickVendorForm(type: QuickProviderType = "openaiCompatible") {
  const defaults = quickVendorDefaults[type];
  quickVendorForm.value = {
    providerType: type,
    name: defaults.name,
    vendorId: defaults.vendorId,
    baseUrl: defaults.baseUrl,
    apiKey: "",
    textModels: defaults.textModels,
    imageModels: defaults.imageModels,
    videoModels: defaults.videoModels,
    imageQuality: "default",
    imageReferenceTransport: "multipart",
  };
}

watch(
  () => quickVendorForm.value.providerType,
  (type) => {
    const defaults = quickVendorDefaults[type];
    quickVendorForm.value.name = defaults.name;
    quickVendorForm.value.vendorId = defaults.vendorId;
    quickVendorForm.value.baseUrl = defaults.baseUrl;
    quickVendorForm.value.textModels = defaults.textModels;
    quickVendorForm.value.imageModels = defaults.imageModels;
    quickVendorForm.value.videoModels = defaults.videoModels;
  },
);

function parseQuickModelRows(raw: string) {
  return String(raw || "")
    .split(/[\n,，]+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const splitIndex = line.search(/[=＝]/);
      if (splitIndex > 0) {
        const name = line.slice(0, splitIndex).trim();
        const modelName = line.slice(splitIndex + 1).trim();
        return { name: name || modelName, modelName };
      }
      return { name: line, modelName: line };
    })
    .filter((item) => item.modelName);
}

function buildQuickOpenAiAdapterCode() {
  return String.raw`
const getApiKey = () => {
  const apiKey = String(vendor.inputValues.apiKey || "").replace(/^Bearer\s+/i, "");
  if (!apiKey) throw new Error("缺少API Key");
  return apiKey;
};

const getBaseUrl = () => String(vendor.inputValues.baseUrl || "").replace(/\/+$/, "");

const textRequest = (model) => {
  const client = createOpenAICompatible({
    baseURL: getBaseUrl(),
    apiKey: getApiKey(),
  });
  return client.chatModel ? client.chatModel(model.modelName) : client.chat(model.modelName);
};

const imageRequest = async (config, model) => {
  const apiKey = getApiKey();
  const baseUrl = getBaseUrl();
  const imageBase64List = (config.referenceList || []).map((ref) => ref.base64).filter(Boolean);
  const sizeMap = {
    "1:1": { "1K": "1024x1024", "2K": "2048x2048", "4K": "2880x2880" },
    "16:9": { "1K": "1536x864", "2K": "2048x1152", "4K": "3840x2160" },
    "9:16": { "1K": "864x1536", "2K": "1152x2048", "4K": "2160x3840" },
  };
  const resolvedSize = sizeMap[config.aspectRatio]?.[config.size] || (config.aspectRatio === "9:16" ? "1024x1536" : "1536x1024");
  const qualityValue = String(vendor.inputValues.imageQuality || "default").trim().toLowerCase();
  const shouldSendQuality = ["low", "medium", "high", "auto"].includes(qualityValue);
  const referenceTransport = String(vendor.inputValues.imageReferenceTransport || "multipart");

  const pickImageResult = (data) => {
    const first = data?.data?.[0] || data?.data || data;
    return first?.b64_json || first?.base64 || first?.url || first?.image_url || data?.b64_json || data?.base64 || data?.url;
  };

  const normalizeImageResult = async (raw) => {
    if (raw.startsWith("http")) return await urlToBase64(raw);
    if (raw.startsWith("data:image/")) return raw;
    return "data:image/png;base64," + raw;
  };

  const parseDataUrlImage = (base64, index) => {
    const match = String(base64).match(/^data:(image\/[-+.\w]+);base64,(.+)$/);
    const mime = match?.[1] || "image/png";
    const payload = match?.[2] || String(base64).replace(/^data:[^;]+;base64,/, "");
    const ext = mime.includes("jpeg") ? "jpg" : (mime.split("/")[1] || "png").replace(/\W+/g, "");
    return {
      buffer: Buffer.from(payload, "base64"),
      filename: "reference-" + (index + 1) + "." + ext,
      contentType: mime,
    };
  };

  const parseAxiosResponse = async (response, endpoint) => {
    if (response.status < 200 || response.status >= 300) {
      throw new Error("图片请求失败，接口: " + endpoint + ", 状态码: " + response.status + ", 错误信息: " + (typeof response.data === "string" ? response.data : JSON.stringify(response.data)));
    }
    const raw = pickImageResult(response.data);
    if (!raw || typeof raw !== "string") {
      throw new Error("图片响应中未找到图片URL/base64: " + JSON.stringify(response.data).slice(0, 800));
    }
    return await normalizeImageResult(raw);
  };

  if (imageBase64List.length && referenceTransport === "publicUrlJson") {
    const imageUrls = await Promise.all(imageBase64List.map((base64) => base64ToPublicUrl(base64, "image", vendor.inputValues.publicOssBaseUrl || "")));
    const body = {
      model: model.modelName,
      prompt: config.prompt,
      size: resolvedSize,
      n: 1,
      images: imageUrls.map((imageUrl) => ({ image_url: imageUrl })),
    };
    if (shouldSendQuality) body.quality = qualityValue;
    logger("[quick openai imageRequest] POST /images/edits refs=" + imageUrls.length + " transport=publicUrlJson");
    const response = await axios.post(baseUrl + "/images/edits", body, {
      headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });
    return await parseAxiosResponse(response, "/images/edits");
  }

  if (imageBase64List.length && referenceTransport === "publicUrlForm") {
    const imageUrls = await Promise.all(imageBase64List.map((base64) => base64ToPublicUrl(base64, "image", vendor.inputValues.publicOssBaseUrl || "")));
    const form = new FormData();
    form.append("model", model.modelName);
    form.append("prompt", config.prompt);
    form.append("size", resolvedSize);
    form.append("n", "1");
    if (shouldSendQuality) form.append("quality", qualityValue);
    imageUrls.forEach((imageUrl) => form.append("image[]", imageUrl));
    logger("[quick openai imageRequest] POST /images/edits refs=" + imageUrls.length + " transport=publicUrlForm");
    const response = await axios.post(baseUrl + "/images/edits", form, {
      headers: { Authorization: "Bearer " + apiKey, ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });
    return await parseAxiosResponse(response, "/images/edits");
  }

  if (imageBase64List.length) {
    const form = new FormData();
    form.append("model", model.modelName);
    form.append("prompt", config.prompt);
    form.append("size", resolvedSize);
    form.append("n", "1");
    if (shouldSendQuality) form.append("quality", qualityValue);
    imageBase64List.forEach((base64, index) => {
      const imageFile = parseDataUrlImage(base64, index);
      form.append("image[]", imageFile.buffer, { filename: imageFile.filename, contentType: imageFile.contentType });
    });
    logger("[quick openai imageRequest] POST /images/edits refs=" + imageBase64List.length + " transport=multipart");
    const response = await axios.post(baseUrl + "/images/edits", form, {
      headers: { Authorization: "Bearer " + apiKey, ...form.getHeaders() },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });
    return await parseAxiosResponse(response, "/images/edits");
  }

  const body = {
    model: model.modelName,
    prompt: config.prompt,
    size: resolvedSize,
    n: 1,
  };
  if (shouldSendQuality) body.quality = qualityValue;
  logger("[quick openai imageRequest] POST /images/generations refs=0");
  const response = await axios.post(baseUrl + "/images/generations", body, {
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    validateStatus: () => true,
  });
  return await parseAxiosResponse(response, "/images/generations");
};

const videoRequest = async () => "";

const ttsRequest = async () => "";
`;
}

function buildQuickVolcengineAdapterCode() {
  return String.raw`
const getApiKey = () => {
  const apiKey = String(vendor.inputValues.apiKey || "").replace(/^Bearer\s+/i, "");
  if (!apiKey) throw new Error("缺少API Key");
  return apiKey;
};

const getBaseUrl = () => String(vendor.inputValues.baseUrl || "").replace(/\/+$/, "");

const getHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: "Bearer " + getApiKey(),
});

const textRequest = (model, think, thinkLevel) => {
  const effortMap = {
    0: "minimal",
    1: "low",
    2: "medium",
    3: "high",
  };
  const client = createOpenAICompatible({
    name: "volcengine",
    baseURL: getBaseUrl(),
    apiKey: getApiKey(),
    fetch: async (url, options) => {
      const rawBody = JSON.parse((options?.body) || "{}");
      const modifiedBody = {
        ...rawBody,
        thinking: { type: think ? "enabled" : "disabled" },
        reasoning_effort: effortMap[thinkLevel] || "medium",
      };
      return await fetch(url, { ...options, body: JSON.stringify(modifiedBody) });
    },
  });
  return client.chatModel ? client.chatModel(model.modelName) : client.chat(model.modelName);
};

const imageRequest = async (config, model) => {
  const body = {
    model: model.modelName,
    prompt: config.prompt || "",
    response_format: "url",
    watermark: false,
  };

  const isOldModel = model.modelName.includes("seedream-3-0");
  const is5Lite = model.modelName.includes("seedream-5-0-lite");

  if (!isOldModel) {
    body.sequential_image_generation = "disabled";
  }

  if (!isOldModel && config.referenceList && config.referenceList.length > 0) {
    const images = config.referenceList.map((ref) => ref.base64);
    body.image = images.length === 1 ? images[0] : images;
  }

  const sizeTable = {
    "1K": {
      "1:1": "1024x1024",
      "4:3": "1152x864",
      "3:4": "864x1152",
      "16:9": "1280x720",
      "9:16": "720x1280",
      "3:2": "1248x832",
      "2:3": "832x1248",
      "21:9": "1512x648",
    },
    "2K": {
      "1:1": "2048x2048",
      "4:3": "2304x1728",
      "3:4": "1728x2304",
      "16:9": "2848x1600",
      "9:16": "1600x2848",
      "3:2": "2496x1664",
      "2:3": "1664x2496",
      "21:9": "3136x1344",
    },
    "4K": {
      "1:1": "4096x4096",
      "4:3": "4704x3520",
      "3:4": "3520x4704",
      "16:9": "5504x3040",
      "9:16": "3040x5504",
      "3:2": "4992x3328",
      "2:3": "3328x4992",
      "21:9": "6240x2656",
    },
  };

  const sizeKey = config.size || "2K";
  const ratioKey = config.aspectRatio;
  const table = sizeTable[sizeKey];

  if (table && table[ratioKey]) {
    const [pw, ph] = table[ratioKey].split("x").map(Number);
    const totalPixels = pw * ph;
    if (isOldModel) {
      body.size = table[ratioKey];
    } else if (totalPixels < 3686400) {
      body.size = "2K";
    } else if (is5Lite && totalPixels > 10404496) {
      body.size = "2K";
    } else {
      body.size = table[ratioKey];
    }
  } else {
    body.size = is5Lite && sizeKey === "4K" ? "3K" : sizeKey === "1K" ? "2K" : sizeKey;
  }

  logger("[quick volcengine imageRequest] POST /images/generations model=" + model.modelName + " size=" + body.size);
  const response = await axios.post(getBaseUrl() + "/images/generations", body, { headers: getHeaders() });
  const data = response.data;

  if (data?.error) {
    throw new Error("图片生成失败：" + (data.error.message || data.error.code));
  }

  if (data?.data && data.data.length > 0) {
    for (const item of data.data) {
      if (item.url) return await urlToBase64(item.url);
      if (item.b64_json) return item.b64_json.startsWith("data:image/") ? item.b64_json : "data:image/png;base64," + item.b64_json;
      if (item.error) throw new Error("图片生成失败：" + (item.error.message || item.error.code));
    }
  }

  throw new Error("图片生成失败：未返回有效结果");
};

const videoRequest = async (config, model) => {
  const content = [];

  if (config.prompt) {
    content.push({ type: "text", text: config.prompt });
  }

  if (typeof config.mode === "string") {
    const images = (config.referenceList || []).filter((ref) => ref.type === "image");
    if (config.mode === "singleImage" && images[0]) {
      content.push({ type: "image_url", image_url: { url: images[0].base64 }, role: "first_frame" });
    }
    if ((config.mode === "startFrameOptional" || config.mode === "endFrameOptional") && images[0]) {
      content.push({ type: "image_url", image_url: { url: images[0].base64 }, role: "first_frame" });
      if (images[1]) content.push({ type: "image_url", image_url: { url: images[1].base64 }, role: "last_frame" });
    }
    if (config.mode === "startEndRequired") {
      if (!images[0] || !images[1]) throw new Error("首尾帧模式需要至少两张图片参考");
      content.push({ type: "image_url", image_url: { url: images[0].base64 }, role: "first_frame" });
      content.push({ type: "image_url", image_url: { url: images[1].base64 }, role: "last_frame" });
    }
  } else if (Array.isArray(config.mode)) {
    const imageRefs = (config.referenceList || []).filter((ref) => ref.type === "image");
    const videoRefs = (config.referenceList || []).filter((ref) => ref.type === "video");
    const audioRefs = (config.referenceList || []).filter((ref) => ref.type === "audio");
    for (const refDef of config.mode) {
      if (typeof refDef !== "string") continue;
      if (refDef.startsWith("imageReference:")) {
        const maxCount = parseInt(refDef.split(":")[1], 10);
        for (const ref of imageRefs.slice(0, maxCount)) {
          content.push({ type: "image_url", image_url: { url: ref.base64 }, role: "reference_image" });
        }
      }
      if (refDef.startsWith("videoReference:")) {
        const maxCount = parseInt(refDef.split(":")[1], 10);
        for (const ref of videoRefs.slice(0, maxCount)) {
          content.push({ type: "video_url", video_url: { url: ref.base64 }, role: "reference_video" });
        }
      }
      if (refDef.startsWith("audioReference:")) {
        const maxCount = parseInt(refDef.split(":")[1], 10);
        for (const ref of audioRefs.slice(0, maxCount)) {
          content.push({ type: "audio_url", audio_url: { url: ref.base64 }, role: "reference_audio" });
        }
      }
    }
  }

  const body = {
    model: model.modelName,
    content,
    ratio: config.aspectRatio,
    duration: config.duration,
    resolution: config.resolution || "720p",
    watermark: false,
  };

  if (model.audio === "optional") {
    body.generate_audio = config.audio !== false;
  } else {
    body.generate_audio = Boolean(model.audio);
  }

  logger("[quick volcengine videoRequest] create task model=" + model.modelName + " duration=" + config.duration + "s");
  const createResponse = await axios.post(getBaseUrl() + "/contents/generations/tasks", body, { headers: getHeaders() });
  const taskId = createResponse.data?.id;
  if (!taskId) {
    throw new Error("视频生成任务创建失败：未返回任务ID");
  }

  const result = await pollTask(
    async () => {
      const queryResponse = await axios.get(getBaseUrl() + "/contents/generations/tasks/" + taskId, { headers: getHeaders() });
      const task = queryResponse.data;
      logger("[quick volcengine videoRequest] task status=" + task.status);
      if (task.status === "succeeded") {
        if (task.content?.video_url) return { completed: true, data: task.content.video_url };
        return { completed: true, error: "任务成功但未返回视频URL" };
      }
      if (task.status === "failed") return { completed: true, error: task.error?.message || "视频生成失败" };
      if (task.status === "expired") return { completed: true, error: "视频生成任务超时" };
      if (task.status === "cancelled") return { completed: true, error: "视频生成任务已取消" };
      return { completed: false };
    },
    10000,
    1800000,
  );

  if (result.error) throw new Error(result.error);
  return await urlToBase64(result.data);
};

const ttsRequest = async () => "";
`;
}

function buildQuickVendorCode() {
  const providerType = quickVendorForm.value.providerType;
  const vendorId = normalizeQuickVendorId(quickVendorForm.value.vendorId);
  const name = quickVendorForm.value.name.trim();
  const baseUrl = quickVendorForm.value.baseUrl.trim().replace(/\/+$/, "");

  quickVendorForm.value.vendorId = vendorId;

  if (!vendorId) {
    window.$message.error("请填写供应商 ID");
    return "";
  }
  if (vendorList.value.some((vendor) => vendor.id === vendorId)) {
    window.$message.error("供应商 ID 已存在，请换一个 ID");
    return "";
  }
  if (!name) {
    window.$message.error("请填写供应商名称");
    return "";
  }
  if (!baseUrl) {
    window.$message.error("请填写请求地址");
    return "";
  }

  const models: any[] = [];
  for (const item of parseQuickModelRows(quickVendorForm.value.textModels)) {
    models.push({
      name: item.name,
      modelName: item.modelName,
      type: "text",
      think: providerType === "volcengineArk",
    });
  }
  for (const item of parseQuickModelRows(quickVendorForm.value.imageModels)) {
    models.push({
      name: item.name,
      modelName: item.modelName,
      type: "image",
      mode: ["text", "singleImage", "multiReference"],
    });
  }
  if (providerType === "volcengineArk") {
    for (const item of parseQuickModelRows(quickVendorForm.value.videoModels)) {
      models.push({
        name: item.name,
        modelName: item.modelName,
        type: "video",
        mode: ["text", "startFrameOptional", ["imageReference:9", "videoReference:3", "audioReference:3"]],
        audio: "optional",
        durationResolutionMap: [{ duration: [4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], resolution: ["480p", "720p"] }],
      });
    }
  }

  if (models.length === 0) {
    window.$message.error("请至少填写一个模型");
    return "";
  }

  const isOpenAi = providerType === "openaiCompatible";
  const vendor = {
    id: vendorId,
    version: "2.0",
    author: "Toonflow",
    name,
    description: isOpenAi
      ? "## OpenAI 兼容接口供应商\n\n由设置页快速添加生成，支持文本模型和 GPT Image 兼容图片接口。"
      : "## 火山引擎 Ark 接口供应商\n\n由设置页快速添加生成，支持 Ark 文本、Seedream 图片和 Seedance 视频接口。",
    icon: "",
    inputs: isOpenAi
      ? [
          { key: "apiKey", label: "API密钥", type: "password", required: true },
          { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "示例：https://api.openai.com/v1" },
          {
            key: "imageQuality",
            label: "GPT Image 质量",
            type: "select",
            required: false,
            placeholder: "OpenAI 兼容 GPT Image：auto / low / medium / high",
            options: [
              { label: "默认/不传", value: "default" },
              { label: "自动 auto", value: "auto" },
              { label: "低 low", value: "low" },
              { label: "中 medium", value: "medium" },
              { label: "高 high", value: "high" },
            ],
          },
          {
            key: "imageReferenceTransport",
            label: "参考图传输方式",
            type: "select",
            required: false,
            placeholder: "中转站要求公网图链时选择公开 URL",
            options: [
              { label: "文件上传 multipart", value: "multipart" },
              { label: "公开 URL JSON", value: "publicUrlJson" },
              { label: "公开 URL 表单", value: "publicUrlForm" },
            ],
          },
          { key: "publicOssBaseUrl", label: "公开资源地址", type: "url", required: false, placeholder: "示例：http://你的域名或IP:10588" },
        ]
      : [
          { key: "apiKey", label: "API密钥", type: "password", required: true, placeholder: "火山引擎 API Key" },
          { key: "baseUrl", label: "请求地址", type: "url", required: true, placeholder: "以 v3 结束，示例：https://ark.cn-beijing.volces.com/api/v3" },
        ],
    inputValues: isOpenAi
      ? {
          apiKey: quickVendorForm.value.apiKey.trim(),
          baseUrl,
          imageQuality: quickVendorForm.value.imageQuality,
          imageReferenceTransport: quickVendorForm.value.imageReferenceTransport,
          publicOssBaseUrl: "",
        }
      : {
          apiKey: quickVendorForm.value.apiKey.trim(),
          baseUrl,
        },
    models,
  };

  const adapterCode = isOpenAi ? buildQuickOpenAiAdapterCode() : buildQuickVolcengineAdapterCode();
  return `/**
 * Toonflow quick vendor
 * Generated by settings quick add.
 */

const vendor = ${JSON.stringify(vendor, null, 2)};
${adapterCode}
exports.vendor = vendor;
exports.textRequest = textRequest;
exports.imageRequest = imageRequest;
exports.videoRequest = videoRequest;
exports.ttsRequest = ttsRequest;

export {};
`;
}

function handlePreviewQuickVendor() {
  const code = buildQuickVendorCode();
  if (!code) return;
  id.value = undefined;
  vendorCode.value = code;
  codeDialogVisible.value = true;
}

function handleQuickAddVendor() {
  const code = buildQuickVendorCode();
  if (!code) return;
  id.value = undefined;
  vendorCode.value = code;
  handleConfirmVendor();
}

const id = ref<string>();
function handleAddVendor() {
  addMode.value = "quickAdd";
  id.value = undefined;
  vendorCode.value = VENDOR_CODE_TEMPLATE;
  resetQuickVendorForm();
  vendorDialogVisible.value = true;
  codeDialogVisible.value = false;
}
function handleConfirmVendor() {
  if (!id.value) {
    const firstConfirm = DialogPlugin.confirm({
      theme: "danger",
      header: $t("settings.vendor.msg.highRiskConfirm"),
      body: $t("settings.vendor.msg.addVendorRiskBody"),
      confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
      cancelBtn: $t("settings.vendor.msg.cancel"),
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.confirmAgain"),
          body: $t("settings.vendor.msg.addVendorConfirmBody"),
          confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.goBackCheck"),
          onConfirm: async () => {
            axios
              .post("/setting/vendorConfig/addVendor", { tsCode: vendorCode.value })
              .then((res) => {
                window.$message.success($t("settings.vendor.msg.vendorAdded"));
                vendorDialogVisible.value = false;
                codeDialogVisible.value = false;
                getVendorList();
              })
              .catch((err) => {
                window.$message.error(err.message ?? `${$t("settings.vendor.msg.addFailed")}`);
              })
              .finally(() => {
                secondConfirm.destroy();
              });
          },
          onClose: () => secondConfirm.hide(),
        });
      },
      onClose: () => firstConfirm.hide(),
    });
  } else {
    const firstConfirm = DialogPlugin.confirm({
      theme: "danger",
      header: $t("settings.vendor.msg.highRiskConfirm"),
      body: $t("settings.vendor.msg.updateVendorRiskBody"),
      confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
      cancelBtn: $t("settings.vendor.msg.cancel"),
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.confirmAgain"),
          body: $t("settings.vendor.msg.updateVendorConfirmBody"),
          confirmBtn: { content: $t("settings.vendor.msg.confirmAndUpdate"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.goBackCheck"),
          onConfirm: async () => {
            axios
              .post("/setting/vendorConfig/updateCode", {
                id: id.value,
                tsCode: vendorCode.value,
              })
              .then((res) => {
                window.$message.success($t("settings.vendor.msg.updateSuccess"));
                vendorDialogVisible.value = false;
                codeDialogVisible.value = false;
                getVendorList();
              })
              .catch((err) => {
                window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
              })
              .finally(() => {
                secondConfirm.destroy();
              });
          },
          onClose: () => secondConfirm.hide(),
        });
      },
      onClose: () => firstConfirm.hide(),
    });
  }
}
// ── 模型弹窗 ──
const modelDialogVisible = ref(false);
const editingModelIndex = ref<number | null>(null);
const editingModelName = ref<string | null>(null);
interface DrmRow {
  duration: string[];
  resolution: string[];
}

const modelFormData = ref({
  name: "",
  modelName: "",
  type: "text" as "text" | "image" | "video",
  think: false,
  mode: [] as string[],
  mixedMode: [] as string[], // referenceOptions 选中项，单独存放，构建时作为数组元素加入 mode
  mixedModeCount: {} as Record<string, number>, // 每个 reference 的数量限制
  audio: "optional" as "optional" | false | true,
  durationResolutionMap: [{ duration: [] as string[], resolution: [] as string[] }] as DrmRow[],
});

function resetModelForm(type: "text" | "image" | "video" = "text") {
  modelFormData.value = {
    name: "",
    modelName: "",
    type,
    think: false,
    mode: [],
    mixedMode: [],
    mixedModeCount: {},
    audio: "optional",
    durationResolutionMap: [{ duration: [], resolution: [] }],
  };
}

function ensureVendorModels(): VendorModel[] {
  if (!currentVendor.value) return [];
  if (!Array.isArray(currentVendor.value.models)) {
    currentVendor.value.models = Array.isArray(currentVendor.value.model) ? [...currentVendor.value.model] : [];
  }
  currentVendor.value.model = currentVendor.value.models;
  return currentVendor.value.models;
}
function buildModelFromForm(): VendorModel | null {
  const name = modelFormData.value.name.trim();
  const modelName = modelFormData.value.modelName.trim();
  if (!name) {
    window.$message.error($t("settings.vendor.msg.fillDisplayName"));
    return null;
  }
  if (!modelName) {
    window.$message.error($t("settings.vendor.msg.fillModelId"));
    return null;
  }

  if (modelFormData.value.type === "text") {
    return {
      name,
      modelName,
      type: "text",
      think: modelFormData.value.think,
    };
  }

  if (modelFormData.value.type === "image") {
    const mode = modelFormData.value.mode as ImageModel["mode"];
    if (!mode.length) {
      window.$message.error($t("settings.vendor.msg.selectImageMode"));
      return null;
    }
    return {
      name,
      modelName,
      type: "image",
      mode,
    };
  }

  // 把 mixedMode（referenceOptions 选中项）作为带数量的数组元素追加到 mode
  const mode = [...modelFormData.value.mode].filter((m) => m !== "multiReference") as VideoModel["mode"];
  if (modelFormData.value.mixedMode.length > 0) {
    const refs = modelFormData.value.mixedMode.map((ref) => {
      const count = modelFormData.value.mixedModeCount[ref] ?? 1;
      return `${ref}:${count}`;
    });
    (mode as any[]).push(refs);
  }
  if (!mode.length) {
    window.$message.error($t("settings.vendor.msg.selectVideoMode"));
    return null;
  }

  const durationResolutionMap: VideoModel["durationResolutionMap"] = [];
  for (let i = 0; i < modelFormData.value.durationResolutionMap.length; i++) {
    const row = modelFormData.value.durationResolutionMap[i];
    const duration = row.duration.map(Number).filter((n) => Number.isFinite(n) && n > 0);
    const resolution = row.resolution.filter(Boolean);
    if (!duration.length) {
      window.$message.error(`${$t("settings.vendor.msg.groupPrefix", { n: i + 1 })}${$t("settings.vendor.msg.addDuration")}`);
      return null;
    }
    if (!resolution.length) {
      window.$message.error(`${$t("settings.vendor.msg.groupPrefix", { n: i + 1 })}${$t("settings.vendor.msg.addResolution")}`);
      return null;
    }
    durationResolutionMap.push({ duration, resolution });
  }

  return {
    name,
    modelName,
    type: "video",
    mode,
    audio: modelFormData.value.audio,
    durationResolutionMap,
  };
}

function handleAddModel() {
  if (!currentVendor.value) {
    window.$message.error($t("settings.vendor.msg.selectVendorFirst"));
    return;
  }
  editingModelIndex.value = null;
  resetModelForm("text");
  modelDialogVisible.value = true;
}

async function handleConfirmModel() {
  const list = ensureVendorModels();
  if (!list.length && !currentVendor.value) return;

  const model = buildModelFromForm();
  if (!model) return;

  const duplicateIndex = list.findIndex((item, index) => {
    if (editingModelIndex.value !== null && index === editingModelIndex.value) {
      return false;
    }
    return item.modelName === model.modelName;
  });
  if (duplicateIndex !== -1) {
    window.$message.error($t("settings.vendor.msg.modelIdExists"));
    return;
  }

  if (editingModelIndex.value === null) {
    try {
      await axios.post("/setting/vendorConfig/addVendorModel", {
        id: currentVendor.value!.id,
        model,
      });
      window.$message.success($t("settings.vendor.msg.modelAdded"));
      modelDialogVisible.value = false;
      getVendorList();
    } catch (err: any) {
      window.$message.error(err.message ?? $t("settings.vendor.msg.operationFailed"));
    }
    return;
  }
  if (editingModelIndex.value !== null) {
    try {
      await axios.post("/setting/vendorConfig/upVendorModel", {
        id: currentVendor.value!.id,
        modelName: editingModelName.value,
        model,
      });
      window.$message.success($t("settings.vendor.msg.modelUpdated"));
      modelDialogVisible.value = false;
      getVendorList();
    } catch (err: any) {
      window.$message.error(err.message ?? $t("settings.vendor.msg.operationFailed"));
    }
  }
}

function handleEditModel(model: VendorModel) {
  const list = ensureVendorModels();
  editingModelIndex.value = list.findIndex((item) => item.modelName === model.modelName);
  editingModelName.value = model.modelName;

  if (model.type === "text") {
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "text",
      think: model.think,
      mode: [],
      mixedMode: [],
      mixedModeCount: {},
      audio: "optional",
      durationResolutionMap: [{ duration: [], resolution: [] }],
    };
  }

  if (model.type === "image") {
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "image",
      think: false,
      mode: [...model.mode],
      mixedMode: [],
      mixedModeCount: {},
      audio: "optional",
      durationResolutionMap: [{ duration: [], resolution: [] }],
    };
  }

  if (model.type === "video") {
    const rows: DrmRow[] =
      model.durationResolutionMap?.length > 0
        ? model.durationResolutionMap.map((map) => ({
            duration: map.duration.map(String),
            resolution: [...map.resolution],
          }))
        : [{ duration: [], resolution: [] }];
    // 反解：把 mode 中数组类型的元素提取为 mixedMode，其余为普通 mode
    const flatMode: string[] = [];
    let mixedMode: string[] = [];
    const mixedModeCount: Record<string, number> = {};
    for (const m of model.mode) {
      if (Array.isArray(m)) {
        for (const ref of m) {
          const match = String(ref).match(/^(videoReference|imageReference|audioReference):(\d+)$/);
          if (match) {
            mixedMode.push(match[1]);
            mixedModeCount[match[1]] = Number(match[2]);
          }
        }
      } else {
        flatMode.push(m);
      }
    }
    modelFormData.value = {
      name: model.name,
      modelName: model.modelName,
      type: "video",
      think: false,
      mode: mixedMode.length > 0 ? [...flatMode, "multiReference"] : flatMode,
      mixedMode,
      mixedModeCount,
      audio: model.audio,
      durationResolutionMap: rows,
    };
  }

  modelDialogVisible.value = true;
}

function handleTestModel(item: (typeof vendorModels.value)[number]) {
  testingModel.value = item;
  if (item.type === "text") {
    textTestVisible.value = true;
  } else if (item.type === "image") {
    imageTestVisible.value = true;
  } else if (item.type === "video") {
    videoTestVisible.value = true;
  }
}

function handleDeleteModel(modelName: string) {
  if (!currentVendor.value) return;
  const confirmDialog = DialogPlugin.confirm({
    theme: "danger",
    header: $t("settings.vendor.msg.deleteModelConfirm"),
    body: `${$t("settings.vendor.msg.deleteModelBody", { name: modelName })}`,
    confirmBtn: { content: $t("settings.vendor.msg.confirmDelete"), theme: "danger" },
    cancelBtn: $t("settings.vendor.msg.cancel"),
    onConfirm: async () => {
      try {
        await axios.post("/setting/vendorConfig/delVendorModel", {
          id: currentVendor.value!.id,
          modelName,
        });
        window.$message.success($t("settings.vendor.msg.modelDeleted"));
        getVendorList();
      } catch (err: any) {
        window.$message.error(err.message ?? $t("settings.vendor.msg.operationFailed"));
      } finally {
        confirmDialog.destroy();
      }
    },
  });
}
function handleEditVendorCode() {
  if (!currentVendor.value) return;
  id.value = currentVendor.value.id;
  vendorCode.value = currentVendor.value.code;
  codeDialogVisible.value = true;
}
function handleDeleteVendor() {
  if (!currentVendor.value) return;
  const confirmDialog = DialogPlugin.confirm({
    theme: "danger",
    header: $t("settings.vendor.msg.deleteVendorConfirm"),
    body: `${$t("settings.vendor.msg.deleteVendorBody", { name: currentVendor.value.name })}`,
    confirmBtn: { content: $t("settings.vendor.msg.confirmDelete"), theme: "danger" },
    cancelBtn: $t("settings.vendor.msg.cancel"),
    onConfirm: () => {
      axios
        .post("/setting/vendorConfig/deleteVendor", { id: currentVendor.value?.id })
        .then(() => {
          window.$message.success($t("settings.vendor.msg.vendorDeleted"));
          if (activeVendorId.value === currentVendor.value?.id) {
            activeVendorId.value = undefined;
          }
          getVendorList();
          confirmDialog.destroy();
        })
        .catch((err) => {
          window.$message.error(`${$t("settings.vendor.msg.deleteFailed")}${err.message}`);
        });
    },
  });
}
function onBlurFn() {
  axios
    .post("/setting/vendorConfig/updateVendorInputs", {
      id: currentVendor.value?.id,
      inputValues: currentVendor.value?.inputValues,
    })
    .then(() => {
      window.$message.success($t("settings.vendor.msg.vendorConfigUpdated"));
      getVendorList();
    })
    .catch((err) => {
      window.$message.error(`${$t("settings.vendor.msg.updateFailed")}${err.message}`);
    });
}
//是否启用供应商
function onChange(item: any, val: number) {
  const prevEnable = val === 1 ? 0 : 1;
  axios
    .post("/setting/vendorConfig/enableVendor", {
      id: item.id,
      enable: val,
    })
    .then(() => {})
    .catch((err) => {
      item.enable = prevEnable;
    });
}
const addMode = ref("importAdd");
const link = ref("");
const linkReading = ref(false);

watch(addMode, (val) => {
  if (val == "codeAdd") codeDialogVisible.value = true;
  else codeDialogVisible.value = false;
});

//链接读取
function linkRead() {
  if (linkReading.value) return;
  const firstConfirm = DialogPlugin.confirm({
    theme: "danger",
    header: $t("settings.vendor.msg.highRiskConfirm"),
    body: $t("settings.vendor.msg.linkAddVendorRiskBody"),
    confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
    cancelBtn: $t("settings.vendor.msg.cancel"),
    onConfirm: () => {
      firstConfirm.destroy();
      const secondConfirm = DialogPlugin.confirm({
        theme: "danger",
        header: $t("settings.vendor.msg.confirmAgain"),
        body: $t("settings.vendor.msg.addVendorConfirmBody"),
        confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
        cancelBtn: $t("settings.vendor.msg.goBackCheck"),
        onConfirm: async () => {
          const instance = LoadingPlugin({
            fullscreen: true,
            attach: "body",
            preventScrollThrough: false,
          });
          const timer = setTimeout(() => {
            instance.hide();
            clearTimeout(timer);
          }, 1000);
          linkReading.value = true;
          try {
            const { data } = await axios.post("/setting/vendorConfig/getCodeByLink", { link: link.value });
            if (!data.includes("vendor")) {
              let alertBox: any = null;
              if (data.includes("<html>")) {
                alertBox = DialogPlugin.alert({
                  theme: "danger",
                  header: "链接返回了一个网页，添加供应商需要返回TS代码，请确认链接是否正确",
                  body: "请勿输入中转站地址，如需使用中转站请修改OpenAI标准接口的baseUrl使用中转站地址",
                  onConfirm: ({ e }) => {
                    alertBox.hide();
                  },
                });
              } else {
                DialogPlugin.alert({
                  theme: "danger",
                  header: "链接返回的内容不正确，添加供应商需要返回TS代码，请确认链接是否正确",
                  onConfirm: ({ e }) => {
                    alertBox.hide();
                  },
                });
              }
              return;
            }
            if (data) {
              axios.post("/setting/vendorConfig/addVendor", { tsCode: data });
              window.$message.success($t("settings.vendor.msg.vendorAdded"));
              vendorDialogVisible.value = false;
              codeDialogVisible.value = false;
              getVendorList();
            } else {
              window.$message.error($t("settings.vendor.msg.linkAddFailed"));
              codeDialogVisible.value = false;
            }
          } catch (err: any) {
            window.$message.error(`${$t("settings.vendor.msg.addFailed")}${err.message}`);
          } finally {
            clearTimeout(timer);
            instance.hide();
            linkReading.value = false;
            secondConfirm.destroy();
          }
        },
        onClose: () => secondConfirm.hide(),
      });
    },
    onClose: () => firstConfirm.hide(),
  });
}
const uploadRef = ref();
// 上传前校验并解析
async function handleBeforeUpload(file: UploadFile) {
  const rawFile = file.raw;
  if (!rawFile) {
    window.$message.error($t("workbench.novel.import.msg.selectFile"));
    return false;
  }
  LoadingPlugin(true);
  try {
    const firstConfirm = DialogPlugin.confirm({
      theme: "danger",
      header: $t("settings.vendor.msg.highRiskConfirm"),
      body: $t("settings.vendor.msg.importAdd"),
      confirmBtn: { content: $t("settings.vendor.msg.iKnowRisk"), theme: "danger" },
      cancelBtn: $t("settings.vendor.msg.cancel"),
      onConfirm: () => {
        firstConfirm.destroy();
        const secondConfirm = DialogPlugin.confirm({
          theme: "danger",
          header: $t("settings.vendor.msg.confirmAgain"),
          body: $t("settings.vendor.msg.addVendorConfirmBody"),
          confirmBtn: { content: $t("settings.vendor.msg.confirmAndAdd"), theme: "danger" },
          cancelBtn: $t("settings.vendor.msg.goBackCheck"),
          onConfirm: async () => {
            //拿到上传的数据
            const fileReader = new FileReader();
            fileReader.readAsText(rawFile);
            fileReader.onload = () => {
              const content = fileReader.result;
              axios
                .post("/setting/vendorConfig/addVendor", { tsCode: content })
                .then((res) => {
                  window.$message.success($t("settings.vendor.msg.vendorAdded"));
                  vendorDialogVisible.value = false;
                  codeDialogVisible.value = false;
                  getVendorList();
                })
                .catch((err) => {
                  window.$message.error(err.message ?? `${$t("settings.vendor.msg.addFailed")}`);
                })
                .finally(() => {
                  secondConfirm.destroy();
                });
            };
          },
          onClose: () => secondConfirm.hide(),
        });
      },
      onClose: () => firstConfirm.hide(),
    });
  } catch {
    window.$message.error($t("workbench.novel.import.msg.parseFailed"));
  } finally {
    LoadingPlugin(false);
  }
  return false;
}
const fileList = ref<any[]>([]);
// 触发上传
function triggerUpload() {
  uploadRef.value?.triggerUpload();
}
function requestMethod() {
  return Promise.resolve({
    response: {},
    status: "success",
  } as const);
}
// 处理拖拽上传
async function handleDrop(e: DragEvent) {
  const files = e.dataTransfer?.files;
  if (files && files.length > 0) {
    await handleBeforeUpload({ raw: files[0] });
  }
}
function handleFileChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    vendorCode.value = (ev.target?.result as string) || "";
  };
  reader.readAsText(file);
  input.value = "";
}
</script>

<style lang="scss" scoped>
.modelServe {
  width: 100%;
  height: 100%;
  display: flex;
  .modelList {
    width: 300px;
    height: 90%;
    min-height: 0;
    .listContent {
      flex: 1;
      min-height: 0;
      overflow: auto;
      height: 100%;
    }

    .listFooter {
      padding: 0 10px 10px;
      margin-right: 6px;
    }
  }

  .modelParameter {
    width: 100%;
    height: 100%;
    .infoBox {
      font-size: 12px;
      opacity: 0.6;
    }
    .configuration {
      height: 95%;
      padding-right: 10px;
      overflow-y: auto;
      .modelCard {
        width: 100%;
        margin-top: 10px;
        .topInfo {
          margin-left: 4px;
          margin-right: 4px;
          .modelCardNameWrap {
            display: flex;
            align-items: center;
            gap: 8px;
          }
          .modelCardName {
            font-size: 15px;
            font-weight: 900;
          }
        }
        .tags {
          margin-top: 16px;
          & > * {
            margin-left: 4px;
            margin-right: 4px;
          }
        }
      }
    }

    .updateAction {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
      & > * {
        margin-left: 8px;
      }
    }

    .requiredLabel {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 600;
    }

    .requiredMark {
      color: #d54941;
      font-size: 16px;
      line-height: 1;
    }

    .requiredText {
      color: #d54941;
      font-size: 12px;
      font-weight: 700;
    }

    .inputHelp {
      color: #666;
    }

    .optionalSection {
      margin-bottom: 12px;
    }
  }

  :deep(.t-default-menu) {
    width: 100% !important;
  }

  .editorToolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;

    .editorInfo {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #666;
      font-size: 13px;
    }

    .editorActions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  .editorWrapper {
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid #e5e5e5;
  }

  .testResult {
    .resultContent {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
      background: #f5f5f5;
      border-radius: 8px;
      padding: 20px;

      img,
      video {
        max-width: 100%;
        max-height: 70vh;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
    }
  }
  .linkAdd,
  .importAdd,
  .codeAdd,
  .quickAdd {
    margin-top: 20px;

    .quickGrid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0 16px;
    }

    .quickActions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 4px;
    }

    .uploadArea {
      margin-top: 20px;
      padding: 42px 20px;
      border: 2px dashed #969494;
      border-radius: 8px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      &:hover {
        border-color: #000000;
      }

      .dragIcon {
        margin-bottom: 12px;
      }

      .uploadText {
        font-size: 14px;
        margin: 0 0 8px;
      }

      .uploadHint {
        font-size: 12px;
        margin: 0;
      }
    }
  }

  @media (max-width: 900px) {
    .quickAdd .quickGrid {
      grid-template-columns: 1fr;
    }
  }
}
.addBox {
  padding-left: 16px;
  padding-right: 16px;
  overflow-x: hidden;
  overflow-y: auto;
  scrollbar-gutter: stable;
  max-height: 70vh;
  .drmEditor {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 6px;
    border: 1px solid var(--td-component-border, #e5e5e5);
    border-radius: 6px;
    padding: 10px 12px;

    .drmHeader {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-bottom: 4px;
      border-bottom: 1px solid var(--td-component-border, #e5e5e5);
      margin-bottom: 2px;

      .drmHeaderIndex {
        width: 20px;
        flex-shrink: 0;
      }

      .drmHeaderLabel {
        flex: 1;
        font-size: 12px;
        color: var(--td-text-color-secondary, #888);
        font-weight: 600;
      }

      .drmHeaderArrow {
        width: 20px;
        flex-shrink: 0;
      }

      .drmHeaderAction {
        width: 28px;
        flex-shrink: 0;
      }
    }

    .drmRow {
      display: flex;
      align-items: flex-start;
      gap: 6px;

      .drmRowIndex {
        width: 20px;
        text-align: center;
        color: #999;
        font-size: 12px;
        flex-shrink: 0;
        padding-top: 6px;
      }

      .drmInput {
        flex: 1;
      }

      .drmArrow {
        color: #bbb;
        flex-shrink: 0;
        padding-top: 6px;
        font-size: 16px;
      }

      .t-button {
        margin-top: 2px;
        flex-shrink: 0;
      }
    }
  }
}
</style>
