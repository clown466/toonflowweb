import { MessagePlugin } from "tdesign-vue-next";

import i18n from "@/locales";
import { formatErrorMessage } from "@/utils/errorMessage";
const { t } = i18n.global;

declare global {
  interface Window {
    $message: typeof MessagePlugin;
    $port: string;
    $t: typeof t;
  }
}

const originalError = MessagePlugin.error.bind(MessagePlugin);
MessagePlugin.error = ((content: unknown, ...args: any[]) => originalError(formatErrorMessage(content), ...args)) as typeof MessagePlugin.error;

window.$message = MessagePlugin;


window.$t = t;
