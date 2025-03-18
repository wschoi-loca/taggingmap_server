import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import EntryPage from '../EntryPage.vue';
import App from '../App.vue'; // 상세페이지 컴포넌트

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/entry',
    name: 'EntryPage',
    component: EntryPage
  },
  {
    path: '/event/:id',
    name: 'EventDetail',
    component: App,
    props: true
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;