<template>
  <div id="app">
    <h1>Page Capture System</h1>
    <table>
      <thead>
        <tr>
          <th>Image</th>
          <th>Title</th>
          <th>URL</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="page in pages" :key="page._id">
          <td>
            <img :src="`http://localhost:5000/${page.image}`" alt="Captured Image" width="100" />
          </td>
          <td>{{ page.jsonData.title }}</td>
          <td><a :href="page.jsonData.url" target="_blank">{{ page.jsonData.url }}</a></td>
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
}

th, td {
  border: 1px solid #ccc;
  padding: 10px;
}

img {
  max-width: 100px;
}
</style>