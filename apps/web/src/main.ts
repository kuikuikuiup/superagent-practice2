import { createApp } from 'vue';
// Full import：保证全部组件可用且默认 locale 为 zh-CN；
// 图标库需单独注册（ArcoVue 主插件不包含 Icon* 组件）。
import ArcoVue from '@arco-design/web-vue';
import ArcoVueIcon from '@arco-design/web-vue/es/icon';
import '@arco-design/web-vue/dist/arco.css';
import App from './App.vue';
import './styles.css';

createApp(App).use(ArcoVue).use(ArcoVueIcon).mount('#app');
