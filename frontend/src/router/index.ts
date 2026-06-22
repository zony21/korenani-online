import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import JoinRoomView from '../views/JoinRoomView.vue';
import RoomWaitingView from '../views/RoomWaitingView.vue';
import GameView from '../views/GameView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'home', component: HomeView },
    { path: '/join/:roomCode', name: 'joinRoom', component: JoinRoomView },
    { path: '/room/:roomCode', name: 'roomWaiting', component: RoomWaitingView },
    { path: '/game/:roomCode', name: 'game', component: GameView },
  ],
});

export default router;
