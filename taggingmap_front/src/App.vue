```vue
<template>
  <div id="app">
    <h1>태깅맵</h1>
    <div v-for="page in pages" :key="page._id" class="page-data">
      <div class="image-section">
        <h2>{{ getValue(page.jsonData, 'PAGETITLE') }}</h2>
        <img :src="getImageUrl(page.image)" alt="Captured Image" />
      </div>
      <table>
        <thead>
          <tr>
            <th>SHOT_NUMBER</th>
            <th>EVENTNAME</th>
            <th>PAGEPATH</th>
            <th>PAGETITLE</th>
            <th>TIME</th>
            <th>LABEL_TEXT</th>
            <th>CONTENT_NM</th>
            <th>PAGE_MKT_CONTS_ID</th>
            <th>SUB_CONTENT_ID</th>
            <th>HORIZONTAL_INDEX</th>
            <th>VERTICAL_INDEX</th>
            <th>CATEGORY_DEPTH1</th>
            <th>CATEGORY_DEPTH2</th>
            <th>CATEGORY_DEPTH3</th>
            <th>CATEGORY_DEPTH4</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="data in page.jsonData" :key="data.SHOT_NUMBER">
            <td>{{ data.SHOT_NUMBER }}</td>
            <td>{{ data.EVENTNAME }}</td>
            <td>{{ data.PAGEPATH }}</td>
            <td>{{ data.PAGETITLE }}</td>
            <td>{{ data.TIME }}</td>
            <td>{{ data.LABEL_TEXT }}</td>
            <td>{{ data.CONTENT_NM }}</td>
            <td>{{ data.PAGE_MKT_CONTS_ID }}</td>
            <td>{{ data.SUB_CONTENT_ID }}</td>
            <td>{{ data.HORIZONTAL_INDEX }}</td>
            <td>{{ data.VERTICAL_INDEX }}</td>
            <td>{{ data.CATEGORY_DEPTH1 }}</td>
            <td>{{ data.CATEGORY_DEPTH2 }}</td>
            <td>{{ data.CATEGORY_DEPTH3 }}</td>
            <td>{{ data.CATEGORY_DEPTH4 }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'App',
  data() {
    return {
      pages: []
    };
  },
  created() {
    this.fetchPages();
  },
  methods: {
    async fetchPages() {
      try {
        const response = await axios.get('http://localhost:5000/api/pages');
        this.pages = response.data;
      } catch (error) {
        console.error('Error fetching pages:', error);
      }
    },
    getImageUrl(imagePath) {
      if (imagePath) {
        return `http://localhost:5000/${imagePath}`;
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
};
</script>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

.page-data {
  display: flex;
  align-items: flex-start;
  margin-bottom: 20px;
}

.image-section {
  margin-right: 20px;
}

table {
  border-collapse: collapse;
  width: 100%;
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

img {
  max-width: 300px;
  height: auto;
}
</style>
```