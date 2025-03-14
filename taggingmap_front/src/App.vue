<template>
  <div id="app">
    <h1>Page Capture System</h1>
    <table>
      <thead>
        <tr>
          <th>Image</th>
          <th>SHOT_NUMBER</th>
          <th>EVENTNAME</th>
          <th>PAGEPATH</th>
          <th>PAGETITLE</th>
          <th>TIME</th>
          <th>LABEL_TEXT</th>
          <th>CONTENT_NM</th>
          <th>PAGE_MKT_CONTS_ID</th>
          <th>CATEGORY_DEPTH1</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="page in pages" :key="page._id">
          <td>
            <img :src="getImageUrl(page.image)" alt="Captured Image" width="100" />
          </td>
          <td>{{ getValue(page.jsonData, 'SHOT_NUMBER') }}</td>
          <td>{{ getValue(page.jsonData, 'EVENTNAME') }}</td>
          <td>{{ getValue(page.jsonData, 'PAGEPATH') }}</td>
          <td>{{ getValue(page.jsonData, 'PAGETITLE') }}</td>
          <td>{{ getValue(page.jsonData, 'TIME') }}</td>
          <td>{{ getValue(page.jsonData, 'ep_label_text') }}</td>
          <td>{{ getValue(page.jsonData, '콘텐츠명_ep_cd14_cts_nm') }}</td>
          <td>{{ getValue(page.jsonData, '콘텐츠ID_ep_cd42_cts_id') }}</td>
          <td>{{ getValue(page.jsonData, 'ep_category_depth1') }}</td>
        </tr>
      </tbody>
    </table>
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

table {
  margin: 0 auto;
  border-collapse: collapse;
  width: 90%;
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
  text-align: left;
}

img {
  max-width: 100px;
  height: auto;
}
</style>