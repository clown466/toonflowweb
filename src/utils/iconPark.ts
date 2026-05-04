import type { App, Component } from "vue";
import Api from "@icon-park/vue-next/es/icons/Api";
import ApplicationMenu from "@icon-park/vue-next/es/icons/ApplicationMenu";
import AudioFile from "@icon-park/vue-next/es/icons/AudioFile";
import Blackboard from "@icon-park/vue-next/es/icons/Blackboard";
import Brightness from "@icon-park/vue-next/es/icons/Brightness";
import CameraOne from "@icon-park/vue-next/es/icons/CameraOne";
import ColorFilter from "@icon-park/vue-next/es/icons/ColorFilter";
import Computer from "@icon-park/vue-next/es/icons/Computer";
import ContrastView from "@icon-park/vue-next/es/icons/ContrastView";
import DarkMode from "@icon-park/vue-next/es/icons/DarkMode";
import Data from "@icon-park/vue-next/es/icons/Data";
import DocumentFolder from "@icon-park/vue-next/es/icons/DocumentFolder";
import Editing from "@icon-park/vue-next/es/icons/Editing";
import Editor from "@icon-park/vue-next/es/icons/Editor";
import EmotionHappy from "@icon-park/vue-next/es/icons/EmotionHappy";
import Erase from "@icon-park/vue-next/es/icons/Erase";
import Exchange from "@icon-park/vue-next/es/icons/Exchange";
import FileText from "@icon-park/vue-next/es/icons/FileText";
import Film from "@icon-park/vue-next/es/icons/Film";
import Filter from "@icon-park/vue-next/es/icons/Filter";
import Fire from "@icon-park/vue-next/es/icons/Fire";
import Flashlamp from "@icon-park/vue-next/es/icons/Flashlamp";
import Flask from "@icon-park/vue-next/es/icons/Flask";
import Fog from "@icon-park/vue-next/es/icons/Fog";
import FolderClose from "@icon-park/vue-next/es/icons/FolderClose";
import Ghost from "@icon-park/vue-next/es/icons/Ghost";
import HardDisk from "@icon-park/vue-next/es/icons/HardDisk";
import Heartbeat from "@icon-park/vue-next/es/icons/Heartbeat";
import Info from "@icon-park/vue-next/es/icons/Info";
import Landscape from "@icon-park/vue-next/es/icons/Landscape";
import Lock from "@icon-park/vue-next/es/icons/Lock";
import Logout from "@icon-park/vue-next/es/icons/Logout";
import Magic from "@icon-park/vue-next/es/icons/Magic";
import MemoryCardOne from "@icon-park/vue-next/es/icons/MemoryCardOne";
import Moon from "@icon-park/vue-next/es/icons/Moon";
import Movie from "@icon-park/vue-next/es/icons/Movie";
import Music from "@icon-park/vue-next/es/icons/Music";
import Notebook from "@icon-park/vue-next/es/icons/Notebook";
import Pause from "@icon-park/vue-next/es/icons/Pause";
import PeoplesTwo from "@icon-park/vue-next/es/icons/PeoplesTwo";
import Permissions from "@icon-park/vue-next/es/icons/Permissions";
import Pic from "@icon-park/vue-next/es/icons/Pic";
import Platte from "@icon-park/vue-next/es/icons/Platte";
import Play from "@icon-park/vue-next/es/icons/Play";
import PlaybackProgress from "@icon-park/vue-next/es/icons/PlaybackProgress";
import Receive from "@icon-park/vue-next/es/icons/Receive";
import Redo from "@icon-park/vue-next/es/icons/Redo";
import ReverseRotation from "@icon-park/vue-next/es/icons/ReverseRotation";
import Right from "@icon-park/vue-next/es/icons/Right";
import Ring from "@icon-park/vue-next/es/icons/Ring";
import Round from "@icon-park/vue-next/es/icons/Round";
import Shake from "@icon-park/vue-next/es/icons/Shake";
import Snowflake from "@icon-park/vue-next/es/icons/Snowflake";
import Star from "@icon-park/vue-next/es/icons/Star";
import SunOne from "@icon-park/vue-next/es/icons/SunOne";
import SwitchThemes from "@icon-park/vue-next/es/icons/SwitchThemes";
import Text from "@icon-park/vue-next/es/icons/Text";
import Theme from "@icon-park/vue-next/es/icons/Theme";
import Tips from "@icon-park/vue-next/es/icons/Tips";
import Tool from "@icon-park/vue-next/es/icons/Tool";
import Translate from "@icon-park/vue-next/es/icons/Translate";
import Video from "@icon-park/vue-next/es/icons/Video";
import VideoFile from "@icon-park/vue-next/es/icons/VideoFile";
import ViewList from "@icon-park/vue-next/es/icons/ViewList";
import ZoomIn from "@icon-park/vue-next/es/icons/ZoomIn";
import ZoomOut from "@icon-park/vue-next/es/icons/ZoomOut";

const dynamicIcons: Record<string, Component> = {
  "i-api": Api,
  "i-application-menu": ApplicationMenu,
  "i-audio-file": AudioFile,
  "i-blackboard": Blackboard,
  "i-brightness": Brightness,
  "i-camera-one": CameraOne,
  "i-color-filter": ColorFilter,
  "i-computer": Computer,
  "i-contrast-view": ContrastView,
  "i-dark-mode": DarkMode,
  "i-data": Data,
  "i-document-folder": DocumentFolder,
  "i-editing": Editing,
  "i-editor": Editor,
  "i-emotion-happy": EmotionHappy,
  "i-erase": Erase,
  "i-exchange": Exchange,
  "i-file-text": FileText,
  "i-film": Film,
  "i-filter": Filter,
  "i-fire": Fire,
  "i-flash": Flashlamp,
  "i-flashlamp": Flashlamp,
  "i-flask": Flask,
  "i-fog": Fog,
  "i-folder-close": FolderClose,
  "i-ghost": Ghost,
  "i-hard-disk": HardDisk,
  "i-heartbeat": Heartbeat,
  "i-info": Info,
  "i-landscape": Landscape,
  "i-lock": Lock,
  "i-logout": Logout,
  "i-magic": Magic,
  "i-memory-card-one": MemoryCardOne,
  "i-moon": Moon,
  "i-movie": Movie,
  "i-music": Music,
  "i-notebook": Notebook,
  "i-pause": Pause,
  "i-peoples-two": PeoplesTwo,
  "i-permissions": Permissions,
  "i-pic": Pic,
  "i-platte": Platte,
  "i-play": Play,
  "i-playback-progress": PlaybackProgress,
  "i-receive": Receive,
  "i-redo": Redo,
  "i-reverse-rotation": ReverseRotation,
  "i-right": Right,
  "i-ring": Ring,
  "i-round": Round,
  "i-shake": Shake,
  "i-snowflake": Snowflake,
  "i-star": Star,
  "i-sun-one": SunOne,
  "i-switch-themes": SwitchThemes,
  "i-text": Text,
  "i-theme": Theme,
  "i-tips": Tips,
  "i-tool": Tool,
  "i-translate": Translate,
  "i-video": Video,
  "i-video-file": VideoFile,
  "i-view-list": ViewList,
  "i-zoom-in": ZoomIn,
  "i-zoom-out": ZoomOut,
};

export function installDynamicIconParkIcons(app: App) {
  Object.entries(dynamicIcons).forEach(([name, component]) => {
    app.component(name, component);
  });
}
