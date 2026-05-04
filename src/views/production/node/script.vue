<template>
  <t-card class="script">
    <div class="titleBar dragHandle pr">
      <div class="title c">{{ $t("workbench.production.node.script.title") }}</div>
      <t-button size="small" variant="text" @click="openEdit">{{ $t("workbench.production.edit") }}</t-button>
      <Handle :id="props.handleIds.source" type="source" :position="Position.Right" style="right: calc(-1 * var(--td-comp-paddingLR-xl))" />
    </div>
    <div class="content">
      <pre v-if="productionEmbedded" class="markdown-lite">{{ script || "暂无内容" }}</pre>
      <MdPreview v-else v-model="script" :theme="mdTheme" />
    </div>
    <Handle :id="props.handleIds.assets" type="source" :position="Position.Bottom" />
  </t-card>

  <t-dialog
    v-model:visible="dialogVisible"
    :header="$t('workbench.production.node.script.editDialog')"
    :width="'90vw'"
    :confirm-btn="$t('workbench.production.save')"
    :cancel-btn="$t('workbench.production.cancel')"
    @confirm="onConfirm"
    @cancel="onCancel"
    @close="onCancel"
    :close-on-overlay-click="false"
    placement="center"
    attach="body">
    <MdEditor
      v-if="dialogVisible"
      v-model="editContent"
      :theme="mdTheme"
      :toolbars="toolbars"
      :footers="[]"
      style="height: 72vh"
      @onUploadImg="() => {}"
      @drop.prevent
      @paste="onPaste" />
  </t-dialog>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, inject, ref, watchEffect } from "vue";
import { Handle, Position } from "@vue-flow/core";
import type { ToolbarNames } from "md-editor-v3";
import settingStore from "@/stores/setting";
import { ensureMdEditorLinkConfig } from "@/utils/mdEditorConfig";
const { themeSetting } = storeToRefs(settingStore());
const MdEditor = defineAsyncComponent(() => import("md-editor-v3").then((module) => module.MdEditor));
const MdPreview = defineAsyncComponent(() => import("md-editor-v3").then((module) => module.MdPreview));
const productionEmbedded = inject("productionEmbedded", false);
const mdTheme = computed(() => (themeSetting.value.mode === "auto" ? "light" : themeSetting.value.mode));

const props = defineProps<{
  id: string;
  handleIds: {
    assets: string;
    source: string;
  };
}>();

const script = defineModel<string>({ required: true });
const editContent = ref("");
const dialogVisible = ref(false);

watchEffect(() => {
  if (!productionEmbedded || dialogVisible.value) void ensureMdEditorLinkConfig();
});

const toolbars: ToolbarNames[] = [
  "bold",
  "underline",
  "italic",
  "strikeThrough",
  "-",
  "title",
  "sub",
  "sup",
  "quote",
  "unorderedList",
  "orderedList",
  "task",
  "-",
  "codeRow",
  "code",
  "table",
  "-",
  "revoke",
  "next",
  "=",
  "preview",
];

function openEdit() {
  editContent.value = script.value ?? "";
  dialogVisible.value = true;
}

function onConfirm() {
  script.value = editContent.value;
  dialogVisible.value = false;
}

function onCancel() {
  dialogVisible.value = false;
}

function onPaste(e: ClipboardEvent) {
  const items = e.clipboardData?.items;
  if (!items) return;
  for (const item of items) {
    if (item.type.startsWith("image/") || item.type.startsWith("video/")) {
      e.preventDefault();
      return;
    }
  }
}
</script>

<style lang="scss" scoped>
.script {
  max-width: 100vw;
  width: fit-content;
  min-width: 200px;
  user-select: text;
  cursor: default;

  .titleBar {
    cursor: grab;
    user-select: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .title {
    background-color: #000;
    width: fit-content;
    padding: 5px 10px;
    color: #fff;
    border-radius: 8px 0;
    font-size: 16px;
  }

  .content {
    margin-top: 8px;

    :deep(.md-editor) {
      border: none;
      box-shadow: none;
    }

    :deep(.md-editor-preview-wrapper) {
      padding: 0;
    }

    .markdown-lite {
      max-height: 260px;
      margin: 0;
      overflow: hidden;
      color: var(--td-text-color-secondary);
      font-family: inherit;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
  }
}
</style>
