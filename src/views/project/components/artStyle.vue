<template>
  <div class="artStyle">
    <t-dialog :visible.sync="artStyleShow" header="选择影片画风" :footer="false" width="90%" top="5vh" @close-btn-click="artStyleShow = false">
      <t-tabs v-model="artStyle" @change="changeFn">
        <t-tab-panel v-for="(item, index) in artStyleList" :key="index" :value="item.value" :label="item.label">
          <template v-if="artStyle === item.value">
            <div style="height: 600px; overflow-y: auto; margin-top: 20px">
              <div class="gridContainer">
                <div v-for="(item, index) in options" :key="index" class="gridItem" @click="selectArtStyle(item)">
                  <div class="imageWrapper">
                    <img :src="item.fileUrl" alt="artStyle" class="artImage" />
                    <div class="text">
                      <span>{{ item.label }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </t-tab-panel>
      </t-tabs>
    </t-dialog>
    <div class="customize">
      <t-dialog :visible.sync="visible" header="自定义影片画风" width="30%" top="20vh" @confirm="onClick" @cancel="visible = false" @close-btn-click="visible = false">
        <t-input v-model="customize" placeholder="请输入自定义影片画风名称" />
      </t-dialog>
    </div>
  </div>
</template>
<script setup lang="ts">
import { ref, watch } from "vue";
import axios from "@/utils/axios";
const artStyleShow = defineModel<boolean>("artStyleShow");
const artStyleData = defineModel<string>("artStyleData");

const artStyleList = ref([
  {
    label: "常用风格",
    value: "常用风格",
  },
  {
    label: "ip风格",
    value: "ip风格",
  },
  {
    label: "插画风格",
    value: "插画风格",
  },
  {
    label: "可爱Q版",
    value: "可爱Q版",
  },
  {
    label: "立体风格",
    value: "立体风格",
  },
  {
    label: "日系风格",
    value: "日系风格",
  },
  {
    label: "自定义风格",
    value: "自定义风格",
  },
]);
function selectArtStyle(item: { fileUrl: string; label: string }) {
  artStyleData.value = item.label;
  artStyleShow.value = false;
}
watch(artStyleShow, (newVal) => {
  if (newVal) {
    artStyle.value = "常用风格";
    customize.value = "";
    getArtStyleList();
  }
});
const visible = ref(false);
const artStyle = ref<string>("常用风格");
const options = ref<Array<{ fileUrl: string; label: string }>>([]);
function changeFn(e: any) {
  if (e === "自定义风格") {
    options.value = [];
    visible.value = true;
    return;
  } else {
    artStyle.value = e;
  }
  getArtStyleList();
}
//自定义风格确定按钮
const customize = ref<string>("");
function onClick() {
  if (!customize.value) return;
  artStyleData.value = customize.value;
  visible.value = false;
  artStyleShow.value = false;
  customize.value = "";
}
//获取时代画风列表
function getArtStyleList() {
  axios
    .post("/artStyle/getArtStyle", {
      name: artStyle.value,
    })
    .then(({ data }) => {
      options.value = data.map((item: any) => ({
        fileUrl: item.fileUrl,
        label: item.name,
      }));
    });
}
</script>

<style lang="scss" scoped>
.gridContainer {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 16px;
  .gridItem {
    cursor: pointer;
    transition: transform 0.3s ease;
    &:hover {
      transform: scale(1.05);
    }
    .imageWrapper {
      position: relative;
      overflow: hidden;
      border-radius: 4px;
      .artImage {
        width: 100%;
        object-fit: cover;
        display: block;
      }
      .text {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.5);
        color: #fff;
        text-align: center;
        padding: 8px;
        font-size: 12px;
      }
    }
  }
}
</style>
