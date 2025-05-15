// 이 파일을 /Users/d02088/Documents/GitHub/taggingmap_server/taggingmap_front/src/router/index.js에 추가
import { createRouter, createWebHistory } from 'vue-router'

const HomeView = {
  template: `
  <div>
    <h2>태깅맵 목록</h2>
    <div v-if="taggingMaps.length > 0">
      <div v-for="taggingMap in taggingMaps" :key="taggingMap._id" class="page-data">
        <div class="image-section">
          <h2>{{ getValue(taggingMap.eventParams, 'PAGETITLE') }}</h2>
          <img :src="getImageUrl(taggingMap.image)" alt="Captured Image" />
        </div>
        <table>
          <thead>
            <tr>
              <th>SHOT_NUMBER</th>
              <th>EVENTNAME</th>
              <th>PAGETITLE</th>
              <th>TIME</th>
              <th>LABEL_TEXT</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="data in taggingMap.eventParams" :key="data.SHOT_NUMBER">
              <td>{{ data.SHOT_NUMBER }}</td>
              <td>{{ data.EVENTNAME }}</td>
              <td>{{ data.PAGETITLE }}</td>
              <td>{{ data.TIME }}</td>
              <td>{{ data.LABEL_TEXT }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-else-if="error">
      <p>{{ error }}</p>
    </div>
    <div v-else>
      <p>Loading...</p>
    </div>
  </div>
  `,
  data() {
    return {
      taggingMaps: [],
      error: null,
    };
  },
  created() {
    this.fetchTaggingMaps();
  },
  methods: {
    async fetchTaggingMaps() {
      try {
        const baseUrl = process.env.VUE_APP_API_BASE_URL || '';
        const response = await fetch(`${baseUrl}/api/taggingMaps`);
        const data = await response.json();
        this.taggingMaps = data;
      } catch (error) {
        console.error('Error fetching taggingMaps:', error);
        this.error = 'Failed to load tagging maps. Please try again later.';
      }
    },
    getImageUrl(imagePath) {
      if (imagePath) {
        return `${imagePath}`;
      }
      return '';
    },
    getValue(dataArray, key) {
      if (Array.isArray(dataArray) && dataArray.length > 0) {
        return dataArray[0][key] || 'No Data';
      }
      return 'No Data';
    }
  }
}

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router