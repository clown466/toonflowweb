<template>
  <div class="addAssets">
    <t-dialog
      v-model:visible="addAssetsShow"
      :closable="false"
      width="48vw"
      :header="props.title"
      :maskClosable="false"
      @close-btn-click="handleCancel"
      @confirm="onConfirm"
      @cancel="handleCancel">
      <div class="data">
        <t-form :data="props.formData" :rules="rules" ref="formRef">
          <t-form-item :label="$t('workbench.assets.add.name')" name="name">
            <t-input v-model="props.formData.name" :placeholder="$t('workbench.assets.add.namePh')"></t-input>
          </t-form-item>
          <t-form-item :label="$t('workbench.assets.add.describe')" name="describe">
            <t-textarea v-model="props.formData.describe" :placeholder="$t('workbench.assets.add.describePh')"></t-textarea>
          </t-form-item>
          <t-form-item :label="$t('workbench.assets.add.remark')" name="remark">
            <t-input v-model="props.formData.remark" :placeholder="$t('workbench.assets.add.remarkPh')"></t-input>
          </t-form-item>
          <t-form-item :label="$t('workbench.assets.add.prompt')" name="prompt" v-if="props.type !== 'clip'">
            <t-textarea
              v-model="props.formData.prompt"
              :autosize="{ minRows: 3, maxRows: 5 }"
              :placeholder="$t('workbench.assets.add.promptPh')"></t-textarea>
          </t-form-item>
          <t-collapse v-if="props.type === 'role'" class="factCardCollapse" expandIconPlacement="right">
            <t-collapse-panel value="roleFactCard">
              <template #header>
                <div class="factCardHeader">
                  <span>{{ $t("workbench.assets.factCard.title") }}</span>
                  <t-tag size="small" variant="light-outline">{{ sourceTypeLabel }}</t-tag>
                  <t-tag size="small" variant="light-outline">{{ confidenceLabel }}</t-tag>
                </div>
              </template>
              <t-alert
                v-if="factCardFallback"
                theme="warning"
                :message="$t('workbench.assets.factCard.apiFallback')"
                class="factCardAlert" />
              <t-form-item :label="$t('workbench.assets.factCard.facts')" name="factCardFacts">
                <t-textarea
                  v-model="roleFactCard.facts"
                  :autosize="{ minRows: 4, maxRows: 8 }"
                  :placeholder="$t('workbench.assets.factCard.factsPh')" />
              </t-form-item>
              <t-form-item :label="$t('workbench.assets.factCard.negativeFacts')" name="factCardNegativeFacts">
                <t-textarea
                  v-model="roleFactCard.negativeFacts"
                  :autosize="{ minRows: 3, maxRows: 6 }"
                  :placeholder="$t('workbench.assets.factCard.negativeFactsPh')" />
              </t-form-item>
              <t-form-item :label="$t('workbench.assets.factCard.sourceType')" name="factCardSourceType">
                <t-tag variant="light-outline">{{ sourceTypeLabel }}</t-tag>
              </t-form-item>
              <t-form-item :label="$t('workbench.assets.factCard.confidence')" name="factCardConfidence">
                <t-tag variant="light-outline">{{ confidenceLabel }}</t-tag>
              </t-form-item>
            </t-collapse-panel>
          </t-collapse>
        </t-form>
      </div>
    </t-dialog>
  </div>
</template>

<script setup lang="ts">
import axios from "@/utils/axios";
import projectStore from "@/stores/project";
const { project } = storeToRefs(projectStore());

type RoleFactCard = {
  facts: string;
  negativeFacts: string;
  sourceType: string;
  confidence?: number | string;
};

const props = defineProps<{
  type: "role" | "tool" | "scene" | "clip" | "audio";
  title: string;
  formData: {
    id: number;
    name: string;
    describe: string;
    remark: string;
    prompt: string;
    factCard?: Partial<RoleFactCard> & { body?: string; conflictRules?: string };
  };
}>();
const addAssetsShow = defineModel<boolean>({
  default: false,
});
const rules = ref<{}>({
  name: [{ required: true, message: $t("workbench.assets.add.nameRequired"), trigger: "blur" }],
  describe: [{ required: true, message: $t("workbench.assets.add.describeRequired"), trigger: "blur" }],
});

const roleFactCard = reactive<RoleFactCard>({
  facts: "",
  negativeFacts: "",
  sourceType: "manual",
  confidence: "",
});
const factCardFallback = ref(false);

const sourceTypeLabel = computed(() => {
  const sourceType = roleFactCard.sourceType || "manual";
  return $t(`workbench.assets.factCard.sourceTypes.${sourceType}`, sourceType);
});

const confidenceLabel = computed(() => {
  const confidence = roleFactCard.confidence;
  if (confidence === undefined || confidence === null || confidence === "") return $t("workbench.assets.factCard.confidenceUnknown");
  return typeof confidence === "number" ? `${Math.round(confidence * 100)}%` : String(confidence);
});

function resetRoleFactCard() {
  roleFactCard.facts = props.formData.factCard?.facts ?? props.formData.factCard?.body ?? "";
  roleFactCard.negativeFacts = props.formData.factCard?.negativeFacts ?? props.formData.factCard?.conflictRules ?? "";
  roleFactCard.sourceType = props.formData.factCard?.sourceType ?? "manual";
  roleFactCard.confidence = props.formData.factCard?.confidence ?? "";
  factCardFallback.value = false;
}

async function fetchRoleFactCard() {
  if (props.type !== "role" || !props.formData.id) {
    resetRoleFactCard();
    return;
  }
  try {
    const { data } = await axios.post("/projectContext/listRoleFactCards", {
      projectId: project.value?.id,
      assetId: props.formData.id,
    });
    const card = Array.isArray(data) ? data[0] : data;
    roleFactCard.facts = card?.facts ?? card?.body ?? card?.content ?? "";
    roleFactCard.negativeFacts = card?.negativeFacts ?? card?.conflictRules ?? card?.rules ?? "";
    roleFactCard.sourceType = card?.sourceType ?? "manual";
    roleFactCard.confidence = card?.confidence ?? "";
    factCardFallback.value = false;
  } catch {
    resetRoleFactCard();
    factCardFallback.value = true;
  }
}

async function saveRoleFactCard(assetsId: number) {
  if (props.type !== "role" || !assetsId) return;
  if (!roleFactCard.facts.trim() && !roleFactCard.negativeFacts.trim()) return;
  try {
    const confidence = Number(roleFactCard.confidence);
    await axios.post("/projectContext/saveRoleFactCard", {
      projectId: project.value?.id,
      assetId: assetsId,
      roleName: props.formData.name,
      facts: roleFactCard.facts,
      negativeFacts: roleFactCard.negativeFacts,
      sourceType: roleFactCard.sourceType || "manual",
      confidence: Number.isFinite(confidence) ? confidence : 1,
    });
    factCardFallback.value = false;
  } catch {
    factCardFallback.value = true;
  }
}

function handleCancel() {
  addAssetsShow.value = false;
}
const formRef = ref();
const emit = defineEmits(["getFilteredData"]);
function onConfirm() {
  formRef.value?.validate().then(async (result: any) => {
    if (result == true) {
      if (props.formData.id !== 0) {
        await axios
          .post(`/assets/updateAssets`, {
            id: props.formData.id,
            name: props.formData.name,
            describe: props.formData.describe,
            remark: props.formData.remark,
            prompt: props.formData.prompt,
          })
          .then(async () => {
            await saveRoleFactCard(props.formData.id);
            window.$message.success($t("workbench.assets.add.updateSuccess"));
            emit("getFilteredData");
            addAssetsShow.value = false;
          });
      } else {
        await axios
          .post(`/assets/addAssets`, {
            name: props.formData.name,
            describe: props.formData.describe,
            remark: props.formData.remark,
            type: props.type,
            projectId: project.value?.id,
            prompt: props.formData.prompt,
          })
          .then(async ({ data }) => {
            const createdId = data?.id ?? data?.assetsId ?? data?.data?.id;
            if (createdId) await saveRoleFactCard(createdId);
            window.$message.success($t("workbench.assets.add.addSuccess"));
            emit("getFilteredData");
            addAssetsShow.value = false;
          });
      }
    }
  });
}

watch(
  () => addAssetsShow.value,
  (visible) => {
    if (visible) fetchRoleFactCard();
  },
);
</script>

<style lang="scss" scoped>
.addAssets {
  .modalHeader {
    background: var(--td-bg-color-container);
    width: 100%;
    :deep(.ant-typography) {
      color: var(--td-text-color-primary);
      margin: 0;
    }

    :deep(.ant-btn-text) {
      color: var(--td-brand-color);

      &:hover {
        background: var(--td-bg-color-component-hover);
        color: var(--td-brand-color-hover);
      }
    }
  }
  .data {
    width: 100%;
  }

  .factCardCollapse {
    margin-top: 8px;
  }

  .factCardHeader {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .factCardAlert {
    margin-bottom: 12px;
  }
}
</style>
