import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import JoinRoomView from '../views/JoinRoomView.vue';
import RoomWaitingView from '../views/RoomWaitingView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/join/:roomCode', name: 'joinRoom', component: JoinRoomView },
    { path: '/room/:roomCode', name: 'roomWaiting', component: RoomWaitingView },
  ],
});

export default router;
